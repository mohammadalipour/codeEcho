package models

import "time"

// ProjectModel represents a project in the database
type ProjectModel struct {
	ID               int       `db:"id"`
	Name             string    `db:"name"`
	RepoPath         string    `db:"repo_path"`
	LastAnalyzedHash *string   `db:"last_analyzed_hash"`
	CreatedAt        time.Time `db:"created_at"`
}

// CommitModel represents a commit in the database
type CommitModel struct {
	ID        int       `db:"id"`
	ProjectID int       `db:"project_id"`
	Hash      string    `db:"hash"`
	Author    string    `db:"author"`
	Timestamp time.Time `db:"timestamp"`
	Message   *string   `db:"message"`
	CreatedAt time.Time `db:"created_at"`
}

// ChangeModel represents a file change in the database
type ChangeModel struct {
	ID           int    `db:"id"`
	CommitID     int    `db:"commit_id"`
	FilePath     string `db:"file_path"`
	LinesAdded   int    `db:"lines_added"`
	LinesDeleted int    `db:"lines_deleted"`
}
