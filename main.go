package main

import (
	"fmt"
	"os"
	"path/filepath"

	"codeecho/internal/analyzer"
	"codeecho/internal/git"
	"codeecho/internal/model"
	"codeecho/internal/storage"

	"github.com/spf13/cobra"
)

var (
	storageInstance *storage.Storage
	rootCmd         = &cobra.Command{
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
		Short: "Update a project with new commits",
		Long:  "Update an existing project by extracting new commits since the last analysis",
		RunE:  runUpdate,
	}

	hotspotsCmd = &cobra.Command{
		Use:   "hotspots",
		Short: "Analyze code hotspots",
		Long:  "Identify files that change frequently (hotspots) in a project",
		RunE:  runHotspots,
	}
)

var (
	dbDSN       string
	projectName string
	repoPath    string
	projectID   int
)

func init() {
	// Global flags
	rootCmd.PersistentFlags().StringVar(&dbDSN, "db-dsn", "codeecho_user:codeecho_pass@tcp(codeecho-mysql:3306)/codeecho_db?parseTime=true", "Database connection string")

	// Analyze command flags
	analyzeCmd.Flags().StringVarP(&projectName, "project-name", "n", "", "Name of the project (required)")
	analyzeCmd.Flags().StringVarP(&repoPath, "repo-path", "r", "", "Path to the Git repository (required)")
	analyzeCmd.MarkFlagRequired("project-name")
	analyzeCmd.MarkFlagRequired("repo-path")

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
	storageInstance, err = storage.NewStorage(dbDSN)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer storageInstance.Close()

	// Validate repo path
	if err := validateRepoPath(repoPath); err != nil {
		return err
	}

	fmt.Printf("Analyzing repository: %s\n", repoPath)
	fmt.Printf("Project name: %s\n", projectName)

	// Create new project
	project := &model.Project{
		Name:     projectName,
		RepoPath: repoPath,
	}

	projectID, err := storageInstance.SaveProject(project)
	if err != nil {
		return fmt.Errorf("failed to save project: %w", err)
	}

	fmt.Printf("Created project with ID: %d\n", projectID)

	// Get full commit history
	fmt.Println("Extracting commit history...")
	commits, changes, err := git.GetCommitLogs(repoPath, "")
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
		if err := storageInstance.SaveCommits(commits); err != nil {
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

		fmt.Println("Updating project hash...")
		if err := storageInstance.UpdateProjectHash(projectID, latestHash); err != nil {
			return fmt.Errorf("failed to update project hash: %w", err)
		}

		fmt.Printf("Successfully analyzed project. Latest commit: %.8s\n", latestHash)

		// Run hotspot analysis
		fmt.Println("Analyzing code hotspots...")
		storageAdapter := storage.NewStorageAdapter(storageInstance)
		hotspots, err := analyzer.AnalyzeHotspots(projectID, storageAdapter)
		if err != nil {
			return fmt.Errorf("failed to analyze hotspots: %w", err)
		}

		fmt.Printf("Analysis Complete. Found %d Hotspots:\n", len(hotspots))
		for i, hotspot := range hotspots {
			fmt.Printf("%d. %s\n", i+1, hotspot)
		}
	}

	return nil
}

func runUpdate(cmd *cobra.Command, args []string) error {
	// Initialize database connection
	var err error
	storageInstance, err = storage.NewStorage(dbDSN)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer storageInstance.Close()

	fmt.Printf("Updating project ID: %d\n", projectID)

	// Get project details
	project, err := storageInstance.GetProjectByID(projectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}

	fmt.Printf("Project: %s (Repository: %s)\n", project.Name, project.RepoPath)

	// Get commits since last analysis
	fromHash := ""
	if project.LastAnalyzedHash != nil {
		fromHash = *project.LastAnalyzedHash
		fmt.Printf("Getting commits since: %.8s\n", fromHash)
	} else {
		fmt.Println("No previous analysis found, getting all commits")
	}

	// Get new commits
	commits, changes, err := git.GetCommitLogs(project.RepoPath, fromHash)
	if err != nil {
		return fmt.Errorf("failed to get commit logs: %w", err)
	}

	fmt.Printf("Found %d new commits and %d file changes\n", len(commits), len(changes))

	if len(commits) == 0 {
		fmt.Println("No new commits found")
		return nil
	}

	// Set project ID for commits
	for i := range commits {
		commits[i].ProjectID = projectID
	}

	// Save new commits
	fmt.Println("Saving new commits to database...")
	if err := storageInstance.SaveCommits(commits); err != nil {
		return fmt.Errorf("failed to save commits: %w", err)
	}

	// Save changes
	if len(changes) > 0 {
		fmt.Println("Mapping file changes to commits...")
		if err := mapAndSaveChanges(changes, commits, projectID); err != nil {
			return fmt.Errorf("failed to save changes: %w", err)
		}
	}

	// Update project hash
	latestHash := commits[0].Hash
	if err := storageInstance.UpdateProjectHash(projectID, latestHash); err != nil {
		return fmt.Errorf("failed to update project hash: %w", err)
	}

	fmt.Printf("Successfully updated project. Latest commit: %.8s\n", latestHash)

	// Run hotspot analysis
	fmt.Println("Analyzing code hotspots...")
	storageAdapter := storage.NewStorageAdapter(storageInstance)
	hotspots, err := analyzer.AnalyzeHotspots(projectID, storageAdapter)
	if err != nil {
		return fmt.Errorf("failed to analyze hotspots: %w", err)
	}

	fmt.Printf("Update Complete. Found %d Hotspots:\n", len(hotspots))
	for i, hotspot := range hotspots {
		fmt.Printf("%d. %s\n", i+1, hotspot)
	}

	return nil
}

func validateRepoPath(path string) error {
	// Convert to absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("invalid repository path: %w", err)
	}

	// Check if directory exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return fmt.Errorf("repository path does not exist: %s", absPath)
	}

	// Check if it's a git repository (has .git directory)
	gitPath := filepath.Join(absPath, ".git")
	if _, err := os.Stat(gitPath); os.IsNotExist(err) {
		return fmt.Errorf("not a git repository (no .git directory found): %s", absPath)
	}

	return nil
}

func mapAndSaveChanges(changes []model.Change, commits []model.Commit, projectID int) error {
	// Create a map from commit hash to commit ID for efficient lookup
	hashToCommitID := make(map[string]int)

	// Since we just inserted commits, we need to get their IDs from the database
	for _, commit := range commits {
		commitID, err := getCommitIDByHash(projectID, commit.Hash)
		if err != nil {
			return fmt.Errorf("failed to get commit ID for hash %s: %w", commit.Hash, err)
		}
		hashToCommitID[commit.Hash] = commitID
	}

	// Group changes by commit hash and set their commit IDs
	commitChanges := make(map[string][]model.Change)
	for _, change := range changes {
		// Find the commit hash this change belongs to
		// We need to iterate through commits to find the matching one
		// This is based on the assumption that changes are ordered with their commits
		found := false
		for _, commit := range commits {
			if commitID, exists := hashToCommitID[commit.Hash]; exists {
				change.CommitID = commitID
				commitChanges[commit.Hash] = append(commitChanges[commit.Hash], change)
				found = true
				break
			}
		}

		if !found {
			return fmt.Errorf("could not find commit ID for change in file: %s", change.FilePath)
		}
	}

	// Save changes in batches by commit
	for _, changes := range commitChanges {
		if err := storageInstance.SaveChanges(changes); err != nil {
			return fmt.Errorf("failed to save changes: %w", err)
		}
	}

	return nil
}

func getCommitIDByHash(projectID int, hash string) (int, error) {
	return storageInstance.GetCommitIDByHash(projectID, hash)
}

func runHotspots(cmd *cobra.Command, args []string) error {
	// Initialize database connection
	var err error
	storageInstance, err = storage.NewStorage(dbDSN)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer storageInstance.Close()

	fmt.Printf("Analyzing hotspots for project ID: %d\n", projectID)

	// Get project details
	project, err := storageInstance.GetProjectByID(projectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}

	fmt.Printf("Project: %s (Repository: %s)\n", project.Name, project.RepoPath)

	// Run hotspot analysis
	storageAdapter := storage.NewStorageAdapter(storageInstance)
	hotspots, err := analyzer.AnalyzeHotspots(projectID, storageAdapter)
	if err != nil {
		return fmt.Errorf("failed to analyze hotspots: %w", err)
	}

	if len(hotspots) == 0 {
		fmt.Println("No hotspots found for this project.")
		fmt.Println("(Hotspots are files that have been changed in more than 5 commits)")
	} else {
		fmt.Printf("\nFound %d hotspot(s):\n", len(hotspots))
		fmt.Println("These files have been changed in more than 5 commits:")
		fmt.Println("--------------------------------------------------------")
		for i, filePath := range hotspots {
			fmt.Printf("%d. %s\n", i+1, filePath)
		}

		fmt.Println("\nHotspots indicate files that change frequently and may benefit from:")
		fmt.Println("- Code refactoring")
		fmt.Println("- Better documentation")
		fmt.Println("- Additional testing")
		fmt.Println("- Breaking into smaller modules")
	}

	return nil
}
