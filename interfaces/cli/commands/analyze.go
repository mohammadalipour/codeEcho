package commands

import (
	"database/sql"
	"fmt"

	"codeecho/application/usecases/analysis"
	"codeecho/domain/entities"
	"codeecho/infrastructure/database"
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

	// Initialize use case
	analysisUseCase := analysis.NewProjectAnalysisUseCase(projectRepo)

	// Validate repository first
	fmt.Println("Validating repository...")
	if err := analysisUseCase.ValidateRepository(repoPath); err != nil {
		return fmt.Errorf("invalid repository: %w", err)
	}

	fmt.Println("Repository validation successful")

	// Create or get project
	fmt.Println("Setting up project...")
	project, err := projectRepo.GetByName(projectName)
	if err != nil {
		// Project doesn't exist, create it
		project = entities.NewProject(projectName, repoPath)
		if err := projectRepo.Create(project); err != nil {
			return fmt.Errorf("failed to create project: %w", err)
		}
		fmt.Printf("Created new project: %s (ID: %d)\n", project.Name, project.ID)
	} else {
		fmt.Printf("Using existing project: %s (ID: %d)\n", project.Name, project.ID)
	}

	// Perform analysis using the use case
	fmt.Println("Starting repository analysis...")
	if err := analysisUseCase.AnalyzeRepository(project.ID, repoPath); err != nil {
		return fmt.Errorf("analysis failed: %w", err)
	}

	fmt.Println("\nAnalysis completed successfully!")
	fmt.Printf("You can now view hotspots with: ./codeecho-cli hotspots --project-id %d\n", project.ID)

	return nil
}
