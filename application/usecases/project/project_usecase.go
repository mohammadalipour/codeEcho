package project

import (
	"fmt"

	"codeecho/domain/entities"
	"codeecho/domain/repositories"
)

// ProjectUseCase handles project-related business logic
type ProjectUseCase struct {
	projectRepo repositories.ProjectRepository
}

// NewProjectUseCase creates a new project use case
func NewProjectUseCase(projectRepo repositories.ProjectRepository) *ProjectUseCase {
	return &ProjectUseCase{
		projectRepo: projectRepo,
	}
}

// CreateProject creates a new project
func (uc *ProjectUseCase) CreateProject(name, repoPath string) (*entities.Project, error) {
	// Validate input
	if name == "" {
		return nil, fmt.Errorf("project name is required")
	}

	if repoPath == "" {
		return nil, fmt.Errorf("repository path is required")
	}

	// Check if project with same name already exists
	existingProject, _ := uc.projectRepo.GetByName(name)
	if existingProject != nil {
		return nil, fmt.Errorf("project with name '%s' already exists", name)
	}

	// Create new project entity
	project := entities.NewProject(name, repoPath)

	// Save to repository
	if err := uc.projectRepo.Create(project); err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return project, nil
}

// GetAllProjects retrieves all projects
func (uc *ProjectUseCase) GetAllProjects() ([]*entities.Project, error) {
	projects, err := uc.projectRepo.GetAll()
	if err != nil {
		return nil, fmt.Errorf("failed to get projects: %w", err)
	}
	return projects, nil
}

// GetProjectByID retrieves a project by its ID
func (uc *ProjectUseCase) GetProjectByID(id int) (*entities.Project, error) {
	project, err := uc.projectRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get project: %w", err)
	}
	return project, nil
}

// UpdateProject updates an existing project
func (uc *ProjectUseCase) UpdateProject(project *entities.Project) error {
	if err := uc.projectRepo.Update(project); err != nil {
		return fmt.Errorf("failed to update project: %w", err)
	}
	return nil
}

// DeleteProject deletes a project by ID
func (uc *ProjectUseCase) DeleteProject(id int) error {
	if err := uc.projectRepo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}
	return nil
}
