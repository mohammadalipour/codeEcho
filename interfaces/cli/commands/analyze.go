package commands

import (
	"database/sql"
	"fmt"

	"codeecho/application/usecases/analysis"
	"codeecho/infrastructure/analyzer"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/git"
	"codeecho/infrastructure/persistence/mysql"

	_ "github.com/go-sql-driver/mysql"
	"github.com/spf13/cobra"
)

var (
	projectName string
	repoPath    string

	analyzeCmd = &cobra.Command{
		Use:   "analyze",
		Short: "Analyze a Git repository and store its history",
		Long:  "Analyze a Git repository, extract commit history and file changes, then store in database",
		RunE:  runAnalyze,
	}
)

func init() {
	// Analyze command flags
	analyzeCmd.Flags().StringVarP(&projectName, "project-name", "n", "", "Name of the project (required)")
	analyzeCmd.Flags().StringVarP(&repoPath, "repo-path", "r", "", "Path to the Git repository (required)")
	analyzeCmd.MarkFlagRequired("project-name")
	analyzeCmd.MarkFlagRequired("repo-path")
}

func runAnalyze(cmd *cobra.Command, args []string) error {
	fmt.Printf("Analyzing repository: %s\n", repoPath)
	fmt.Printf("Project name: %s\n", projectName)
	fmt.Printf("Database DSN: %s\n", dbDSN)

	// Initialize database connection
	db, err := sql.Open("mysql", dbDSN)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	fmt.Println("Database connection established successfully")

	// Set up database connection for the package
	database.DB = db

	// Initialize repositories
	projectRepo := mysql.NewProjectRepository(db)
	commitRepo := mysql.NewCommitRepository(db)
	changeRepo := mysql.NewChangeRepository(db)

	// Initialize Git service
	gitService := git.NewGitService()

	// Initialize analyzer with all dependencies
	repositoryAnalyzer := analyzer.NewRepositoryAnalyzer(gitService, projectRepo, db)
	repositoryAnalyzer.SetCommitRepository(commitRepo)
	repositoryAnalyzer.SetChangeRepository(changeRepo)

	// Initialize use case
	analysisUseCase := analysis.NewProjectAnalysisUseCase(projectRepo)

	// Validate repository first
	fmt.Println("Validating repository...")
	if err := analysisUseCase.ValidateRepository(repoPath); err != nil {
		return fmt.Errorf("invalid repository: %w", err)
	}

	fmt.Println("Repository validation successful")

	// Perform analysis
	fmt.Println("Starting repository analysis...")
	result, err := repositoryAnalyzer.AnalyzeRepository(projectName, repoPath)
	if err != nil {
		return fmt.Errorf("analysis failed: %w", err)
	}

	// Display results
	fmt.Println("\n=== Analysis Results ===")
	fmt.Printf("Project: %s (ID: %d)\n", result.Project.Name, result.Project.ID)
	fmt.Printf("Repository Path: %s\n", result.Project.RepoPath)
	fmt.Printf("Commits Processed: %d\n", result.CommitCount)
	fmt.Printf("File Changes: %d\n", result.ChangeCount)
	fmt.Printf("Unique Files: %d\n", result.FileCount)
	if result.ErrorCount > 0 {
		fmt.Printf("Errors Encountered: %d\n", result.ErrorCount)
	}

	fmt.Println("\nAnalysis completed successfully!")
	fmt.Printf("You can now view hotspots with: ./codeecho-cli hotspots --project-id %d\n", result.Project.ID)

	return nil
}
