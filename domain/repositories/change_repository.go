package repositories

import "codeecho/domain/entities"

// ChangeRepository defines the interface for change persistence operations
type ChangeRepository interface {
	// Create creates a new change
	Create(change *entities.Change) error

	// GetByCommitID retrieves all changes for a specific commit
	GetByCommitID(commitID int) ([]*entities.Change, error)

	// GetByProjectID retrieves all changes for a project
	GetByProjectID(projectID int) ([]*entities.Change, error)

	// GetByFilePath retrieves changes for a specific file across all commits in a project
	GetByFilePath(projectID int, filePath string) ([]*entities.Change, error)

	// CreateBatch creates multiple changes in a batch operation
	CreateBatch(changes []*entities.Change) error

	// GetHotspots retrieves files that change frequently (hotspots)
	GetHotspots(projectID int, limit int) ([]*FileChangeFrequency, error)
}

// FileChangeFrequency represents the frequency of changes for a file
type FileChangeFrequency struct {
	FilePath     string
	ChangeCount  int
	TotalAdded   int
	TotalDeleted int
}
