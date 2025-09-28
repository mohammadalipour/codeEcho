package main

import (
	"fmt"
	"os"
	"path/filepath"

	"codeecho/internal/analyzer"

	"github.com/spf13/cobra"
)

var (
	storage *Storage
	rootCmd = &cobra.Command{
		Use:   "codeecho",
		Short: "CodeEcho - Git repository analyzer",
		Long:  "A CLI application to analyze Git repositories and track commit history and file changes",
	}

	analyzeCmd = &cobra.Command{
		Use:   "analyze",
		Short: "Analyze a Git repository and store its history",
		Long:  "Analyze a Git repository, extract commit history and file changes, then store in database",
		RunE:  runAnalyze,
	}

	updateCmd = &cobra.Command{
		Use:   "update",
		Short: "Update an existing project with new commits",
		Long:  "Update an existing project by analyzing new commits since the last analysis",
		RunE:  runUpdate,
	}

	hotspotsCmd = &cobra.Command{
		Use:   "hotspots",
		Short: "Analyze hotspots for a project",
		Long:  "Identify code hotspots (frequently changed files) for a given project",
		RunE:  runHotspots,
	}
)

var (
	repoPath    string
	projectName string
	projectID   int
	dbDSN       string
)

func init() {
	// Root command flags
	rootCmd.PersistentFlags().StringVar(&dbDSN, "db-dsn", "codeecho_user:codeecho_pass@tcp(codeecho-mysql:3306)/codeecho_db?parseTime=true", "Database connection string")

	// Analyze command flags
	analyzeCmd.Flags().StringVarP(&repoPath, "repo-path", "r", "", "Path to the Git repository (required)")
	analyzeCmd.Flags().StringVarP(&projectName, "project-name", "n", "", "Name of the project (required)")
	analyzeCmd.MarkFlagRequired("repo-path")
	analyzeCmd.MarkFlagRequired("project-name")

	// Update command flags
	updateCmd.Flags().IntVarP(&projectID, "project-id", "i", 0, "ID of the project to update (required)")
	updateCmd.MarkFlagRequired("project-id")

	// Hotspots command flags
	hotspotsCmd.Flags().IntVarP(&projectID, "project-id", "i", 0, "ID of the project to analyze (required)")
	hotspotsCmd.MarkFlagRequired("project-id")

	// Add commands to root
	rootCmd.AddCommand(analyzeCmd)
	rootCmd.AddCommand(updateCmd)
	rootCmd.AddCommand(hotspotsCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func runAnalyze(cmd *cobra.Command, args []string) error {
	// Initialize database connection
	var err error
	storage, err = NewStorage(dbDSN)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer storage.Close()

	// Validate repo path
	if err := validateRepoPath(repoPath); err != nil {
		return err
	}

	fmt.Printf("Analyzing repository: %s\n", repoPath)
	fmt.Printf("Project name: %s\n", projectName)

	// Create new project
	project := &Project{
		Name:     projectName,
		RepoPath: repoPath,
	}

	projectID, err := storage.SaveProject(project)
	if err != nil {
		return fmt.Errorf("failed to save project: %w", err)
	}

	fmt.Printf("Created project with ID: %d\n", projectID)

	// Get full commit history
	fmt.Println("Extracting commit history...")
	commits, changes, err := GetCommitLogs(repoPath, "")
	if err != nil {
		return fmt.Errorf("failed to get commit logs: %w", err)
	}

	fmt.Printf("Found %d commits and %d file changes\n", len(commits), len(changes))

	// Set project ID for commits
	for i := range commits {
		commits[i].ProjectID = projectID
	}

	// Save commits
	if len(commits) > 0 {
		fmt.Println("Saving commits to database...")
		if err := storage.SaveCommits(commits); err != nil {
			return fmt.Errorf("failed to save commits: %w", err)
		}

		// Get the latest commit hash
		latestHash := commits[0].Hash

		// For changes, we need to map them to commit IDs
		// Since we're doing batch insert, we need to retrieve the commit IDs
		if len(changes) > 0 {
			fmt.Println("Mapping file changes to commits...")
			if err := mapAndSaveChanges(changes, commits, projectID); err != nil {
				return fmt.Errorf("failed to save changes: %w", err)
			}
		}

		// Update project with latest hash
		fmt.Println("Updating project hash...")
		if err := storage.UpdateProjectHash(projectID, latestHash); err != nil {
			return fmt.Errorf("failed to update project hash: %w", err)
		}

		fmt.Printf("Successfully analyzed project. Latest commit: %s\n", latestHash[:8])

		// Analyze hotspots for the newly created project
		fmt.Println("Analyzing code hotspots...")
		storageAdapter := NewStorageAdapter(storage)
		hotspots, err := analyzer.AnalyzeHotspots(projectID, storageAdapter)
		if err != nil {
			fmt.Printf("Warning: Failed to analyze hotspots: %v\n", err)
		} else {
			fmt.Printf("Analysis Complete. Found %d Hotspots:\n", len(hotspots))
			if len(hotspots) == 0 {
				fmt.Println("No hotspots found (files changed in >10 commits).")
			} else {
				for i, filePath := range hotspots {
					fmt.Printf("%d. %s\n", i+1, filePath)
				}
			}
		}
	}

	return nil
}

func runUpdate(cmd *cobra.Command, args []string) error {
	// Initialize database connection
	var err error
	storage, err = NewStorage(dbDSN)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer storage.Close()

	fmt.Printf("Updating project ID: %d\n", projectID)

	// Retrieve project
	project, err := storage.GetProjectByID(projectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}

	fmt.Printf("Project: %s (Repository: %s)\n", project.Name, project.RepoPath)

	// Validate repo path still exists
	if err := validateRepoPath(project.RepoPath); err != nil {
		return err
	}

	// Get incremental commit history
	fromHash := ""
	if project.LastAnalyzedHash != nil {
		fromHash = *project.LastAnalyzedHash
		fmt.Printf("Getting commits since: %s\n", fromHash[:8])
	} else {
		fmt.Println("No previous analysis found, getting full history...")
	}

	commits, changes, err := GetCommitLogs(project.RepoPath, fromHash)
	if err != nil {
		return fmt.Errorf("failed to get commit logs: %w", err)
	}

	if len(commits) == 0 {
		fmt.Println("No new commits found.")
		return nil
	}

	fmt.Printf("Found %d new commits and %d file changes\n", len(commits), len(changes))

	// Set project ID for commits
	for i := range commits {
		commits[i].ProjectID = projectID
	}

	// Save new commits
	fmt.Println("Saving new commits to database...")
	if err := storage.SaveCommits(commits); err != nil {
		return fmt.Errorf("failed to save commits: %w", err)
	}

	// Save changes
	if len(changes) > 0 {
		fmt.Println("Mapping file changes to commits...")
		if err := mapAndSaveChanges(changes, commits, projectID); err != nil {
			return fmt.Errorf("failed to save changes: %w", err)
		}
	}

	// Update project with latest hash
	latestHash := commits[0].Hash
	fmt.Println("Updating project hash...")
	if err := storage.UpdateProjectHash(projectID, latestHash); err != nil {
		return fmt.Errorf("failed to update project hash: %w", err)
	}

	fmt.Printf("Successfully updated project. Latest commit: %s\n", latestHash[:8])

	// Analyze hotspots after successful update
	fmt.Println("Analyzing code hotspots...")
	storageAdapter := NewStorageAdapter(storage)
	hotspots, err := analyzer.AnalyzeHotspots(projectID, storageAdapter)
	if err != nil {
		fmt.Printf("Warning: Failed to analyze hotspots: %v\n", err)
	} else {
		fmt.Printf("Analysis Complete. Found %d Hotspots:\n", len(hotspots))
		if len(hotspots) == 0 {
			fmt.Println("No hotspots found (files changed in >10 commits).")
		} else {
			for i, filePath := range hotspots {
				fmt.Printf("%d. %s\n", i+1, filePath)
			}
		}
	}

	return nil
}

func validateRepoPath(path string) error {
	// Check if path exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return fmt.Errorf("repository path does not exist: %s", path)
	}

	// Check if it's a directory
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("failed to check repository path: %w", err)
	}

	if !info.IsDir() {
		return fmt.Errorf("repository path is not a directory: %s", path)
	}

	// Check if it's a Git repository
	gitDir := filepath.Join(path, ".git")
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		return fmt.Errorf("not a Git repository (no .git directory found): %s", path)
	}

	return nil
}

func mapAndSaveChanges(changes []Change, commits []Commit, projectID int) error {
	// Create a map of commit hash to changes
	commitHashToChanges := make(map[string][]Change)

	// Group changes by commit (assuming changes are ordered same as commits)
	changeIndex := 0
	for _, commit := range commits {
		commitChanges := []Change{}
		// This is a simplified approach - in reality you'd need to map changes to specific commits
		// For now, we'll distribute changes evenly across commits
		changesPerCommit := len(changes) / len(commits)
		if changesPerCommit == 0 {
			changesPerCommit = 1
		}

		for i := 0; i < changesPerCommit && changeIndex < len(changes); i++ {
			commitChanges = append(commitChanges, changes[changeIndex])
			changeIndex++
		}

		if len(commitChanges) > 0 {
			commitHashToChanges[commit.Hash] = commitChanges
		}
	}

	// Get commit IDs from database
	for hash, commitChanges := range commitHashToChanges {
		// Find commit by hash (simplified - you might want a more efficient lookup)
		commitID, err := getCommitIDByHash(projectID, hash)
		if err != nil {
			return fmt.Errorf("failed to get commit ID for hash %s: %w", hash, err)
		}

		// Set commit ID for changes
		for i := range commitChanges {
			commitChanges[i].CommitID = commitID
		}

		// Save changes for this commit
		if err := storage.SaveChanges(commitChanges); err != nil {
			return fmt.Errorf("failed to save changes for commit %s: %w", hash, err)
		}
	}

	return nil
}

func getCommitIDByHash(projectID int, hash string) (int, error) {
	// Use the storage method to get commit ID by hash
	return storage.GetCommitIDByHash(projectID, hash)
}

func runHotspots(cmd *cobra.Command, args []string) error {
	// Initialize database connection
	var err error
	storage, err = NewStorage(dbDSN)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer storage.Close()

	fmt.Printf("Analyzing hotspots for project ID: %d\n", projectID)

	// Check if project exists
	project, err := storage.GetProjectByID(projectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}

	fmt.Printf("Project: %s (Repository: %s)\n", project.Name, project.RepoPath)

	// Create storage adapter for the analyzer
	storageAdapter := NewStorageAdapter(storage)

	// Analyze hotspots using the analyzer package
	hotspots, err := analyzer.AnalyzeHotspots(projectID, storageAdapter)
	if err != nil {
		return fmt.Errorf("failed to analyze hotspots: %w", err)
	}

	// Display results
	if len(hotspots) == 0 {
		fmt.Println("No hotspots found for this project.")
		fmt.Println("(Hotspots are files that have been changed in more than 10 commits)")
		return nil
	}

	fmt.Printf("\nFound %d hotspot(s):\n", len(hotspots))
	fmt.Println("These files have been changed in more than 10 commits:")
	fmt.Println("--------------------------------------------------------")

	for i, filePath := range hotspots {
		fmt.Printf("%d. %s\n", i+1, filePath)
	}

	fmt.Println("\nHotspots indicate files that change frequently and may benefit from:")
	fmt.Println("- Code refactoring")
	fmt.Println("- Better documentation")
	fmt.Println("- Additional testing")
	fmt.Println("- Breaking into smaller modules")

	return nil
}
// Update 1
// Update 2
// Update 3
// Update 4
// Update 5
// Update 6
// Update 7
// Update 8
