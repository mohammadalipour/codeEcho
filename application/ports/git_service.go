package ports

// GitService defines the interface for git operations
type GitService interface {
	// GetCommits retrieves commits from a git repository
	GetCommits(repoPath string) ([]*GitCommit, error)

	// GetCommitsSince retrieves commits since a specific hash
	GetCommitsSince(repoPath string, sinceHash string) ([]*GitCommit, error)

	// ValidateRepository checks if the path is a valid git repository
	ValidateRepository(repoPath string) error
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
