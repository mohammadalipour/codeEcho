package storage

import (
	"database/sql"
	"fmt"
	"strings"

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

// SaveProject saves a new project and returns the project ID
func (s *Storage) SaveProject(project *model.Project) (int, error) {
	query := `
		INSERT INTO projects (name, repo_path, last_analyzed_hash) 
		VALUES (?, ?, ?)
	`

	result, err := s.db.Exec(query, project.Name, project.RepoPath, project.LastAnalyzedHash)
	if err != nil {
		return 0, fmt.Errorf("failed to save project: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to get last insert id: %w", err)
	}

	return int(id), nil
}

// GetProjectByID retrieves a project by its ID
func (s *Storage) GetProjectByID(id int) (*model.Project, error) {
	query := `
		SELECT id, name, repo_path, last_analyzed_hash, created_at 
		FROM projects 
		WHERE id = ?
	`

	var project model.Project
	row := s.db.QueryRow(query, id)

	err := row.Scan(
		&project.ID,
		&project.Name,
		&project.RepoPath,
		&project.LastAnalyzedHash,
		&project.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("project with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	return &project, nil
}

// SaveCommits saves multiple commits in a batch insert
func (s *Storage) SaveCommits(commits []model.Commit) error {
	if len(commits) == 0 {
		return nil
	}

	// Build bulk insert query
	valueStrings := make([]string, 0, len(commits))
	valueArgs := make([]interface{}, 0, len(commits)*6)

	for _, commit := range commits {
		valueStrings = append(valueStrings, "(?, ?, ?, ?, ?, ?)")
		valueArgs = append(valueArgs,
			commit.ProjectID,
			commit.Hash,
			commit.Author,
			commit.Timestamp,
			commit.Message,
			commit.CreatedAt,
		)
	}

	query := fmt.Sprintf(`
		INSERT INTO commits (project_id, hash, author, timestamp, message, created_at) 
		VALUES %s
	`, strings.Join(valueStrings, ","))

	_, err := s.db.Exec(query, valueArgs...)
	if err != nil {
		return fmt.Errorf("failed to save commits: %w", err)
	}

	return nil
}

// SaveChanges saves multiple file changes in a batch insert
func (s *Storage) SaveChanges(changes []model.Change) error {
	if len(changes) == 0 {
		return nil
	}

	// Build bulk insert query
	valueStrings := make([]string, 0, len(changes))
	valueArgs := make([]interface{}, 0, len(changes)*5)

	for _, change := range changes {
		valueStrings = append(valueStrings, "(?, ?, ?, ?)")
		valueArgs = append(valueArgs,
			change.CommitID,
			change.FilePath,
			change.LinesAdded,
			change.LinesDeleted,
		)
	}

	query := fmt.Sprintf(`
		INSERT INTO changes (commit_id, file_path, lines_added, lines_deleted) 
		VALUES %s
	`, strings.Join(valueStrings, ","))

	_, err := s.db.Exec(query, valueArgs...)
	if err != nil {
		return fmt.Errorf("failed to save changes: %w", err)
	}

	return nil
}

// UpdateProjectHash updates the last analyzed commit hash for a project
func (s *Storage) UpdateProjectHash(projectID int, newHash string) error {
	query := `
		UPDATE projects 
		SET last_analyzed_hash = ? 
		WHERE id = ?
	`

	result, err := s.db.Exec(query, newHash, projectID)
	if err != nil {
		return fmt.Errorf("failed to update project hash: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no project found with ID %d", projectID)
	}

	return nil
}

// GetCommitIDByHash retrieves the commit ID by project ID and commit hash
func (s *Storage) GetCommitIDByHash(projectID int, hash string) (int, error) {
	query := `
		SELECT id 
		FROM commits 
		WHERE project_id = ? AND hash = ?
	`

	var commitID int
	err := s.db.QueryRow(query, projectID, hash).Scan(&commitID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("commit with hash %s not found for project %d", hash, projectID)
		}
		return 0, fmt.Errorf("failed to get commit ID: %w", err)
	}

	return commitID, nil
}
