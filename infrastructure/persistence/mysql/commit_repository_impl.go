package mysql

import (
	"database/sql"
	"time"

	"codeecho/domain/entities"
	"codeecho/domain/repositories"
	"codeecho/domain/values"
)

// CommitRepository implements the commit repository interface with MySQL
type CommitRepository struct {
	db *sql.DB
}

// NewCommitRepository creates a new commit repository
func NewCommitRepository(db *sql.DB) repositories.CommitRepository {
	return &CommitRepository{db: db}
}

// Create creates a new commit
func (r *CommitRepository) Create(commit *entities.Commit) error {
	query := `
		INSERT INTO commits (project_id, hash, author, timestamp, message, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	result, err := r.db.Exec(query,
		commit.ProjectID,
		commit.Hash.String(),
		commit.Author,
		commit.Timestamp,
		commit.Message,
		commit.CreatedAt,
	)

	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	commit.ID = int(id)
	return nil
}

// GetByID retrieves a commit by its ID
func (r *CommitRepository) GetByID(id int) (*entities.Commit, error) {
	query := `
		SELECT id, project_id, hash, author, timestamp, message, created_at
		FROM commits WHERE id = ?
	`

	var hashStr string
	commit := &entities.Commit{}

	err := r.db.QueryRow(query, id).Scan(
		&commit.ID,
		&commit.ProjectID,
		&hashStr,
		&commit.Author,
		&commit.Timestamp,
		&commit.Message,
		&commit.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	hash, err := values.NewGitHash(hashStr)
	if err != nil {
		return nil, err
	}
	commit.Hash = hash

	return commit, nil
}

// GetByProjectID retrieves all commits for a specific project
func (r *CommitRepository) GetByProjectID(projectID int) ([]*entities.Commit, error) {
	query := `
		SELECT id, project_id, hash, author, timestamp, message, created_at
		FROM commits WHERE project_id = ?
		ORDER BY timestamp DESC
	`

	rows, err := r.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var commits []*entities.Commit

	for rows.Next() {
		var hashStr string
		commit := &entities.Commit{}

		err := rows.Scan(
			&commit.ID,
			&commit.ProjectID,
			&hashStr,
			&commit.Author,
			&commit.Timestamp,
			&commit.Message,
			&commit.CreatedAt,
		)

		if err != nil {
			return nil, err
		}

		hash, err := values.NewGitHash(hashStr)
		if err != nil {
			continue // Skip invalid hashes
		}
		commit.Hash = hash

		commits = append(commits, commit)
	}

	return commits, rows.Err()
}

// GetByHash retrieves a commit by its git hash
func (r *CommitRepository) GetByHash(projectID int, hash string) (*entities.Commit, error) {
	query := `
		SELECT id, project_id, hash, author, timestamp, message, created_at
		FROM commits WHERE project_id = ? AND hash = ?
	`

	var hashStr string
	commit := &entities.Commit{}

	err := r.db.QueryRow(query, projectID, hash).Scan(
		&commit.ID,
		&commit.ProjectID,
		&hashStr,
		&commit.Author,
		&commit.Timestamp,
		&commit.Message,
		&commit.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	retrievedHash, err := values.NewGitHash(hashStr)
	if err != nil {
		return nil, err
	}
	commit.Hash = retrievedHash

	return commit, nil
}

// GetByProjectIDSinceHash retrieves commits since a specific hash
func (r *CommitRepository) GetByProjectIDSinceHash(projectID int, sinceHash string) ([]*entities.Commit, error) {
	// For simplicity, we'll get all commits and filter.
	// In a real implementation, you'd want to use git log --since functionality
	query := `
		SELECT id, project_id, hash, author, timestamp, message, created_at
		FROM commits WHERE project_id = ?
		ORDER BY timestamp ASC
	`

	rows, err := r.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var commits []*entities.Commit
	foundSinceHash := false

	for rows.Next() {
		var hashStr string
		commit := &entities.Commit{}

		err := rows.Scan(
			&commit.ID,
			&commit.ProjectID,
			&hashStr,
			&commit.Author,
			&commit.Timestamp,
			&commit.Message,
			&commit.CreatedAt,
		)

		if err != nil {
			return nil, err
		}

		if hashStr == sinceHash {
			foundSinceHash = true
			continue // Skip the sinceHash commit itself
		}

		if foundSinceHash {
			hash, err := values.NewGitHash(hashStr)
			if err != nil {
				continue // Skip invalid hashes
			}
			commit.Hash = hash
			commits = append(commits, commit)
		}
	}

	return commits, rows.Err()
}

// GetByAuthor retrieves commits by author for a project
func (r *CommitRepository) GetByAuthor(projectID int, author string) ([]*entities.Commit, error) {
	query := `
		SELECT id, project_id, hash, author, timestamp, message, created_at
		FROM commits WHERE project_id = ? AND author = ?
		ORDER BY timestamp DESC
	`

	rows, err := r.db.Query(query, projectID, author)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var commits []*entities.Commit

	for rows.Next() {
		var hashStr string
		commit := &entities.Commit{}

		err := rows.Scan(
			&commit.ID,
			&commit.ProjectID,
			&hashStr,
			&commit.Author,
			&commit.Timestamp,
			&commit.Message,
			&commit.CreatedAt,
		)

		if err != nil {
			return nil, err
		}

		hash, err := values.NewGitHash(hashStr)
		if err != nil {
			continue // Skip invalid hashes
		}
		commit.Hash = hash

		commits = append(commits, commit)
	}

	return commits, rows.Err()
}

// CreateBatch creates multiple commits in a batch operation
func (r *CommitRepository) CreateBatch(commits []*entities.Commit) error {
	if len(commits) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO commits (project_id, hash, author, timestamp, message, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	stmt, err := tx.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, commit := range commits {
		_, err := stmt.Exec(
			commit.ProjectID,
			commit.Hash.String(),
			commit.Author,
			commit.Timestamp,
			commit.Message,
			time.Now(),
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
