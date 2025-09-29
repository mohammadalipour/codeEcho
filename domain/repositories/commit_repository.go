package repositories

import "codeecho/domain/entities"

// CommitRepository defines the interface for commit persistence operations
type CommitRepository interface {
	// Create creates a new commit
	Create(commit *entities.Commit) error

	// GetByID retrieves a commit by its ID
	GetByID(id int) (*entities.Commit, error)

	// GetByHash retrieves a commit by its hash
	GetByHash(projectID int, hash string) (*entities.Commit, error)

	// GetByProjectID retrieves all commits for a project
	GetByProjectID(projectID int) ([]*entities.Commit, error)

	// GetByProjectIDSinceHash retrieves commits since a specific hash
	GetByProjectIDSinceHash(projectID int, sinceHash string) ([]*entities.Commit, error)

	// GetByAuthor retrieves commits by author for a project
	GetByAuthor(projectID int, author string) ([]*entities.Commit, error)

	// CreateBatch creates multiple commits in a batch operation
	CreateBatch(commits []*entities.Commit) error
}
