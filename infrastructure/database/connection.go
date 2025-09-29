package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

// DB holds the database connection
var DB *sql.DB

// InitDB initializes the database connection
func InitDB() error {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "codeecho_user:codeecho_pass@tcp(codeecho-mysql:3306)/codeecho_db?parseTime=true"
	}

	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connection established successfully")
	return nil
}

// CloseDB closes the database connection
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
