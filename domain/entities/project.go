package entities

import (
	"codeecho/domain/values"
	"time"
)

// RepositoryType defines the different types of repositories supported
type RepositoryType string

const (
	// RepoTypeGitURL represents a remote Git repository (public or private)
	RepoTypeGitURL RepositoryType = "git_url"
	// RepoTypeLocalDir represents a local directory uploaded as archive
	RepoTypeLocalDir RepositoryType = "local_dir"
	// RepoTypePrivateGit represents a private Git repository with authentication
	RepoTypePrivateGit RepositoryType = "private_git"
	// RepoTypeLocalPath represents a local directory path (hybrid approach)
	RepoTypeLocalPath RepositoryType = "local_path"
)

// Project represents a project aggregate root in the domain
type Project struct {
	ID               int
	Name             string
	RepoPath         string
	RepoType         RepositoryType
	AuthConfig       *GitAuthConfig
	LastAnalyzedHash *values.GitHash
	CreatedAt        time.Time
}

// GitAuthConfig holds authentication configuration for private repositories
type GitAuthConfig struct {
	Username string `json:"username,omitempty"`
	Token    string `json:"token,omitempty"`
	SSHKey   string `json:"ssh_key,omitempty"`
}

// NewProject creates a new project entity
func NewProject(name, repoPath string) *Project {
	return &Project{
		Name:      name,
		RepoPath:  repoPath,
		RepoType:  RepoTypeGitURL, // Default to public git URL
		CreatedAt: time.Now(),
	}
}

// NewProjectWithType creates a new project entity with specific repository type
func NewProjectWithType(name, repoPath string, repoType RepositoryType) *Project {
	return &Project{
		Name:      name,
		RepoPath:  repoPath,
		RepoType:  repoType,
		CreatedAt: time.Now(),
	}
}

// NewProjectWithAuth creates a new project entity with authentication
func NewProjectWithAuth(name, repoPath string, repoType RepositoryType, authConfig *GitAuthConfig) *Project {
	return &Project{
		Name:       name,
		RepoPath:   repoPath,
		RepoType:   repoType,
		AuthConfig: authConfig,
		CreatedAt:  time.Now(),
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
