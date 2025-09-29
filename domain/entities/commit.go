package entities

import (
	"codeecho/domain/values"
	"time"
)

// Commit represents a commit entity in the domain
type Commit struct {
	ID        int
	ProjectID int
	Hash      *values.GitHash
	Author    string
	Timestamp time.Time
	Message   string
	CreatedAt time.Time
}

// NewCommit creates a new commit entity
func NewCommit(projectID int, hash *values.GitHash, author string, timestamp time.Time, message string) *Commit {
	return &Commit{
		ProjectID: projectID,
		Hash:      hash,
		Author:    author,
		Timestamp: timestamp,
		Message:   message,
		CreatedAt: time.Now(),
	}
}

// GetShortHash returns a shortened version of the commit hash
func (c *Commit) GetShortHash() string {
	if c.Hash == nil {
		return ""
	}
	hashStr := c.Hash.String()
	if len(hashStr) >= 7 {
		return hashStr[:7]
	}
	return hashStr
}

// IsByAuthor checks if the commit was made by the specified author
func (c *Commit) IsByAuthor(author string) bool {
	return c.Author == author
}

// IsRecent checks if the commit was made within the specified duration
func (c *Commit) IsRecent(duration time.Duration) bool {
	return time.Since(c.Timestamp) <= duration
}
