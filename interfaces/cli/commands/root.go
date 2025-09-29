package commands

import (
	"github.com/spf13/cobra"
)

var (
	dbDSN string

	rootCmd = &cobra.Command{
		Use:   "codeecho-cli",
		Short: "CodeEcho CLI - Git repository analyzer",
		Long:  "A CLI application to analyze Git repositories and track commit history and file changes",
	}
)

func init() {
	// Global flags
	rootCmd.PersistentFlags().StringVar(&dbDSN, "db-dsn",
		"codeecho_user:codeecho_pass@tcp(codeecho-mysql:3306)/codeecho_db?parseTime=true",
		"Database connection string")

	// Add commands
	rootCmd.AddCommand(analyzeCmd)
	rootCmd.AddCommand(updateCmd)
	rootCmd.AddCommand(hotspotsCmd)
}

// Execute executes the root command
func Execute() error {
	return rootCmd.Execute()
}
