package entities

import (
	"codeecho/domain/values"
	"time"
)

// Project represents a project aggregate root in the domain
type Project struct {
	ID               int
	Name             string
	RepoPath         string
	LastAnalyzedHash *values.GitHash
	CreatedAt        time.Time
}

// NewProject creates a new project entity
func NewProject(name, repoPath string) *Project {
	return &Project{
		Name:      name,
		RepoPath:  repoPath,
		CreatedAt: time.Now(),
	}
}

// UpdateLastAnalyzedHash updates the last analyzed commit hash
func (p *Project) UpdateLastAnalyzedHash(hash *values.GitHash) {
	p.LastAnalyzedHash = hash
}

// IsAnalyzed checks if the project has been analyzed before
func (p *Project) IsAnalyzed() bool {
	return p.LastAnalyzedHash != nil
}

// CanBeUpdated checks if the project can be updated with new commits
func (p *Project) CanBeUpdated() bool {
	return p.IsAnalyzed() && p.RepoPath != ""
}
