package repositories

import "codeecho/domain/entities"

// ProjectRepository defines the interface for project persistence operations
type ProjectRepository interface {
	// Create creates a new project
	Create(project *entities.Project) error

	// GetByID retrieves a project by its ID
	GetByID(id int) (*entities.Project, error)

	// GetByName retrieves a project by its name
	GetByName(name string) (*entities.Project, error)

	// GetAll retrieves all projects
	GetAll() ([]*entities.Project, error)

	// Update updates an existing project
	Update(project *entities.Project) error

	// Delete deletes a project by ID
	Delete(id int) error

	// UpdateLastAnalyzedHash updates the last analyzed hash for a project
	UpdateLastAnalyzedHash(projectID int, hash string) error
}
