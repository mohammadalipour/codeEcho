package ports

// GitService defines the interface for git operations
type GitService interface {
	// GetCommits retrieves commits from a git repository
	GetCommits(repoPath string) ([]*GitCommit, error)

	// GetCommitsSince retrieves commits since a specific hash
	GetCommitsSince(repoPath string, sinceHash string) ([]*GitCommit, error)

	// ValidateRepository checks if the path is a valid git repository
	ValidateRepository(repoPath string) error

	// GetCommitsWithAuth retrieves commits from a repository with authentication
	GetCommitsWithAuth(repoPath string, authConfig *GitAuthConfig) ([]*GitCommit, error)

	// GetCommitsSinceWithAuth retrieves commits since a specific hash with authentication
	GetCommitsSinceWithAuth(repoPath string, sinceHash string, authConfig *GitAuthConfig) ([]*GitCommit, error)

	// ValidateRepositoryWithAuth checks if the repository is accessible with given auth
	ValidateRepositoryWithAuth(repoPath string, authConfig *GitAuthConfig) error

	// ProcessLocalArchive extracts and processes an uploaded local directory archive
	ProcessLocalArchive(archivePath, extractPath string) (string, error)
}

// GitAuthConfig holds authentication configuration for private repositories
type GitAuthConfig struct {
	Username string `json:"username,omitempty"`
	Token    string `json:"token,omitempty"`
	SSHKey   string `json:"ssh_key,omitempty"`
}

// GitCommit represents a commit from the git repository
type GitCommit struct {
	Hash      string
	Author    string
	Timestamp string
	Message   string
	Changes   []*GitChange
}

// GitChange represents a file change in a commit
type GitChange struct {
	FilePath     string
	LinesAdded   int
	LinesDeleted int
}
