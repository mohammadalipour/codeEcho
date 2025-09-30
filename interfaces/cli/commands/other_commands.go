package commands

import (
	"database/sql"
	"fmt"

	"codeecho/infrastructure/analyzer"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/git"
	"codeecho/infrastructure/persistence/mysql"

	_ "github.com/go-sql-driver/mysql"
	"github.com/spf13/cobra"
)

var (
	projectID int

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

func init() {
	// Update command flags
	updateCmd.Flags().IntVarP(&projectID, "project-id", "i", 0, "ID of the project to update (required)")
	updateCmd.MarkFlagRequired("project-id")

	// Hotspots command flags
	hotspotsCmd.Flags().IntVarP(&projectID, "project-id", "i", 0, "ID of the project to analyze (required)")
	hotspotsCmd.MarkFlagRequired("project-id")
}

func runUpdate(cmd *cobra.Command, args []string) error {
	fmt.Printf("Updating project ID: %d\n", projectID)
	fmt.Printf("Database DSN: %s\n", dbDSN)

	// TODO: Implement the actual update logic using use cases

	return fmt.Errorf("update command not yet implemented in DDD structure")
}

func runHotspots(cmd *cobra.Command, args []string) error {
	fmt.Printf("Analyzing hotspots for project ID: %d\n", projectID)
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

	// Set up database connection for the package
	database.DB = db

	// Initialize repositories
	projectRepo := mysql.NewProjectRepository(db)
	changeRepo := mysql.NewChangeRepository(db)

	// Initialize Git service (even though we won't use it for hotspots)
	gitService := git.NewGitService()

	// Initialize analyzer
	repositoryAnalyzer := analyzer.NewRepositoryAnalyzer(gitService, projectRepo, db)
	repositoryAnalyzer.SetChangeRepository(changeRepo)

	// Get hotspots
	fmt.Println("Retrieving code hotspots...")
	hotspots, err := repositoryAnalyzer.GetHotspots(projectID, 20) // Top 20 hotspots
	if err != nil {
		return fmt.Errorf("failed to get hotspots: %w", err)
	}

	if len(hotspots) == 0 {
		fmt.Println("No hotspots found for this project.")
		return nil
	}

	// Display results
	fmt.Println("\n=== Code Hotspots (Top 20) ===")
	fmt.Printf("%-60s %10s %10s %10s\n", "File Path", "Changes", "Added", "Deleted")
	for i := 0; i < 100; i++ {
		fmt.Print("-")
	}
	fmt.Println()

	for i, hotspot := range hotspots {
		fmt.Printf("%2d. %-55s %8d %8d %8d\n",
			i+1,
			truncateString(hotspot.FilePath, 55),
			hotspot.ChangeCount,
			hotspot.TotalAdded,
			hotspot.TotalDeleted,
		)
	}

	fmt.Printf("\nTotal hotspots found: %d\n", len(hotspots))

	return nil
}

// truncateString truncates a string to the specified length
func truncateString(s string, length int) string {
	if len(s) <= length {
		return s
	}
	return s[:length-3] + "..."
}
