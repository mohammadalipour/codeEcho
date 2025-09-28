package storage

import (
	"database/sql"
	"fmt"

	"codeecho/internal/model"

	_ "github.com/go-sql-driver/mysql"
)

// Storage handles database operations
type Storage struct {
	db *sql.DB
}

// NewStorage creates a new Storage instance and connects to the database
func NewStorage(dsn string) (*Storage, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Storage{db: db}, nil
}

// Close closes the database connection
func (s *Storage) Close() error {
	return s.db.Close()
}

// GetCommitsByProjectID retrieves all commits associated with a given project ID
func (s *Storage) GetCommitsByProjectID(projectID int) ([]model.Commit, error) {
	query := `
		SELECT id, project_id, hash, author, timestamp, message, created_at
		FROM commits 
		WHERE project_id = ?
		ORDER BY timestamp DESC
	`

	rows, err := s.db.Query(query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query commits for project %d: %w", projectID, err)
	}
	defer rows.Close()

	var commits []model.Commit
	for rows.Next() {
		var commit model.Commit
		err := rows.Scan(
			&commit.ID,
			&commit.ProjectID,
			&commit.Hash,
			&commit.Author,
			&commit.Timestamp,
			&commit.Message,
			&commit.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan commit: %w", err)
		}
		commits = append(commits, commit)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating commits: %w", err)
	}

	return commits, nil
}

// GetChangesByProjectID retrieves all changes associated with a given project ID
func (s *Storage) GetChangesByProjectID(projectID int) ([]model.Change, error) {
	query := `
		SELECT c.id, c.commit_id, c.file_path, c.lines_added, c.lines_deleted
		FROM changes c
		INNER JOIN commits cm ON c.commit_id = cm.id
		WHERE cm.project_id = ?
		ORDER BY cm.timestamp DESC
	`

	rows, err := s.db.Query(query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query changes for project %d: %w", projectID, err)
	}
	defer rows.Close()

	var changes []model.Change
	for rows.Next() {
		var change model.Change
		err := rows.Scan(
			&change.ID,
			&change.CommitID,
			&change.FilePath,
			&change.LinesAdded,
			&change.LinesDeleted,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan change: %w", err)
		}
		changes = append(changes, change)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating changes: %w", err)
	}

	return changes, nil
}
