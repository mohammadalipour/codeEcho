package project

import (
	"codeecho/application/ports"
	"codeecho/domain/entities"
	"codeecho/domain/repositories"
	"fmt"
)

// CreateProjectUseCase handles the creation of new projects
type CreateProjectUseCase struct {
	projectRepo repositories.ProjectRepository
	gitService  ports.GitService
}

// NewCreateProjectUseCase creates a new use case for creating projects
func NewCreateProjectUseCase(
	projectRepo repositories.ProjectRepository,
	gitService ports.GitService,
) *CreateProjectUseCase {
	return &CreateProjectUseCase{
		projectRepo: projectRepo,
		gitService:  gitService,
	}
}

// CreateProjectRequest represents the input for creating a project
type CreateProjectRequest struct {
	Name     string
	RepoPath string
}

// CreateProjectResponse represents the output of creating a project
type CreateProjectResponse struct {
	ProjectID int
	Message   string
}

// Execute creates a new project
func (uc *CreateProjectUseCase) Execute(req *CreateProjectRequest) (*CreateProjectResponse, error) {
	// Validate repository path
	if err := uc.gitService.ValidateRepository(req.RepoPath); err != nil {
		return nil, fmt.Errorf("invalid repository path: %w", err)
	}

	// Check if project with same name already exists
	existingProject, _ := uc.projectRepo.GetByName(req.Name)
	if existingProject != nil {
		return nil, fmt.Errorf("project with name '%s' already exists", req.Name)
	}

	// Create new project entity
	project := entities.NewProject(req.Name, req.RepoPath)

	// Save to repository
	if err := uc.projectRepo.Create(project); err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return &CreateProjectResponse{
		ProjectID: project.ID,
		Message:   fmt.Sprintf("Project '%s' created successfully", req.Name),
	}, nil
}
