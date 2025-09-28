package main

import "time"

// Project represents a project in the database
type Project struct {
	ID               int       `json:"id" db:"id"`
	Name             string    `json:"name" db:"name"`
	RepoPath         string    `json:"repo_path" db:"repo_path"`
	LastAnalyzedHash *string   `json:"last_analyzed_hash" db:"last_analyzed_hash"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// Commit represents a commit in the database
type Commit struct {
	ID        int       `json:"id" db:"id"`
	ProjectID int       `json:"project_id" db:"project_id"`
	Hash      string    `json:"hash" db:"hash"`
	Author    string    `json:"author" db:"author"`
	Timestamp time.Time `json:"timestamp" db:"timestamp"`
	Message   *string   `json:"message" db:"message"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Change represents a file change in the database
type Change struct {
	ID           int    `json:"id" db:"id"`
	CommitID     int    `json:"commit_id" db:"commit_id"`
	FilePath     string `json:"file_path" db:"file_path"`
	LinesAdded   int    `json:"lines_added" db:"lines_added"`
	LinesDeleted int    `json:"lines_deleted" db:"lines_deleted"`
}
