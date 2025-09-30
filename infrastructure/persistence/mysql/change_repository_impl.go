package mysql

import (
	"database/sql"
	"fmt"

	"codeecho/domain/entities"
	"codeecho/domain/repositories"
	"codeecho/domain/values"
)

// ChangeRepository implements the change repository interface with MySQL
type ChangeRepository struct {
	db *sql.DB
}

// NewChangeRepository creates a new change repository
func NewChangeRepository(db *sql.DB) repositories.ChangeRepository {
	return &ChangeRepository{db: db}
}

// Create creates a new change
func (r *ChangeRepository) Create(change *entities.Change) error {
	query := `
		INSERT INTO changes (commit_id, file_path, lines_added, lines_deleted)
		VALUES (?, ?, ?, ?)
	`

	result, err := r.db.Exec(query,
		change.CommitID,
		change.FilePath.String(),
		change.LinesAdded,
		change.LinesDeleted,
	)

	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	change.ID = int(id)
	return nil
}

// GetByCommitID retrieves all changes for a specific commit
func (r *ChangeRepository) GetByCommitID(commitID int) ([]*entities.Change, error) {
	query := `
		SELECT id, commit_id, file_path, lines_added, lines_deleted
		FROM changes WHERE commit_id = ?
	`

	rows, err := r.db.Query(query, commitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var changes []*entities.Change

	for rows.Next() {
		var filePathStr string
		change := &entities.Change{}

		err := rows.Scan(
			&change.ID,
			&change.CommitID,
			&filePathStr,
			&change.LinesAdded,
			&change.LinesDeleted,
		)

		if err != nil {
			return nil, err
		}

		filePath, err := values.NewFilePath(filePathStr)
		if err != nil {
			continue // Skip invalid file paths
		}
		change.FilePath = filePath

		changes = append(changes, change)
	}

	return changes, rows.Err()
}

// GetByProjectID retrieves all changes for a project
func (r *ChangeRepository) GetByProjectID(projectID int) ([]*entities.Change, error) {
	query := `
		SELECT c.id, c.commit_id, c.file_path, c.lines_added, c.lines_deleted
		FROM changes c
		JOIN commits cm ON c.commit_id = cm.id
		WHERE cm.project_id = ?
	`

	rows, err := r.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var changes []*entities.Change

	for rows.Next() {
		var filePathStr string
		change := &entities.Change{}

		err := rows.Scan(
			&change.ID,
			&change.CommitID,
			&filePathStr,
			&change.LinesAdded,
			&change.LinesDeleted,
		)

		if err != nil {
			return nil, err
		}

		filePath, err := values.NewFilePath(filePathStr)
		if err != nil {
			continue // Skip invalid file paths
		}
		change.FilePath = filePath

		changes = append(changes, change)
	}

	return changes, rows.Err()
}

// GetByFilePath retrieves changes for a specific file across all commits in a project
func (r *ChangeRepository) GetByFilePath(projectID int, filePath string) ([]*entities.Change, error) {
	query := `
		SELECT c.id, c.commit_id, c.file_path, c.lines_added, c.lines_deleted
		FROM changes c
		JOIN commits cm ON c.commit_id = cm.id
		WHERE cm.project_id = ? AND c.file_path = ?
		ORDER BY cm.timestamp DESC
	`

	rows, err := r.db.Query(query, projectID, filePath)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var changes []*entities.Change

	for rows.Next() {
		var filePathStr string
		change := &entities.Change{}

		err := rows.Scan(
			&change.ID,
			&change.CommitID,
			&filePathStr,
			&change.LinesAdded,
			&change.LinesDeleted,
		)

		if err != nil {
			return nil, err
		}

		fp, err := values.NewFilePath(filePathStr)
		if err != nil {
			continue // Skip invalid file paths
		}
		change.FilePath = fp

		changes = append(changes, change)
	}

	return changes, rows.Err()
}

// CreateBatch creates multiple changes in a batch operation
func (r *ChangeRepository) CreateBatch(changes []*entities.Change) error {
	if len(changes) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO changes (commit_id, file_path, lines_added, lines_deleted)
		VALUES (?, ?, ?, ?)
	`

	stmt, err := tx.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, change := range changes {
		_, err := stmt.Exec(
			change.CommitID,
			change.FilePath.String(),
			change.LinesAdded,
			change.LinesDeleted,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetHotspots retrieves files that change frequently (hotspots)
func (r *ChangeRepository) GetHotspots(projectID int, limit int) ([]*repositories.FileChangeFrequency, error) {
	query := `
		SELECT 
			c.file_path,
			COUNT(*) as change_count,
			SUM(c.lines_added) as total_added,
			SUM(c.lines_deleted) as total_deleted
		FROM changes c
		JOIN commits cm ON c.commit_id = cm.id
		WHERE cm.project_id = ?
		GROUP BY c.file_path
		ORDER BY change_count DESC
	`

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := r.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hotspots []*repositories.FileChangeFrequency

	for rows.Next() {
		hotspot := &repositories.FileChangeFrequency{}

		err := rows.Scan(
			&hotspot.FilePath,
			&hotspot.ChangeCount,
			&hotspot.TotalAdded,
			&hotspot.TotalDeleted,
		)

		if err != nil {
			return nil, err
		}

		hotspots = append(hotspots, hotspot)
	}

	return hotspots, rows.Err()
}
