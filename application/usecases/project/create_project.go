package project

import (
	"codeecho/application/ports"
	"codeecho/domain/entities"
	"codeecho/domain/repositories"
	"fmt"
	"time"
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
	Name       string               `json:"name"`
	RepoPath   string               `json:"repo_path"`
	RepoType   string               `json:"repo_type"` // "git_url", "local_dir", "private_git", "local_path"
	AuthConfig *ports.GitAuthConfig `json:"auth_config,omitempty"`
}

// CreateProjectResponse represents the output of creating a project
type CreateProjectResponse struct {
	ProjectID int
	Message   string
}

// Execute creates a new project
func (uc *CreateProjectUseCase) Execute(req *CreateProjectRequest) (*CreateProjectResponse, error) {
	// Determine repository type
	repoType := entities.RepoTypeGitURL // Default
	if req.RepoType != "" {
		switch req.RepoType {
		case "local_dir":
			repoType = entities.RepoTypeLocalDir
		case "private_git":
			repoType = entities.RepoTypePrivateGit
		case "local_path":
			repoType = entities.RepoTypeLocalPath
		case "git_url":
			repoType = entities.RepoTypeGitURL
		default:
			return nil, fmt.Errorf("invalid repository type: %s", req.RepoType)
		}
	}

	// Validate repository based on type
	var err error
	if req.AuthConfig != nil {
		err = uc.gitService.ValidateRepositoryWithAuth(req.RepoPath, req.AuthConfig)
	} else if repoType == entities.RepoTypeLocalDir {
		// For local directories, we process the archive first
		if req.RepoPath == "" {
			return nil, fmt.Errorf("archive path is required for local directory projects")
		}

		// Extract archive to a temporary location
		extractPath := fmt.Sprintf("/tmp/codeecho-extracts/project_%s_%d", req.Name, time.Now().Unix())
		extractedPath, err := uc.gitService.ProcessLocalArchive(req.RepoPath, extractPath)
		if err != nil {
			return nil, fmt.Errorf("failed to process local archive: %w", err)
		}

		// Update repo path to the extracted location
		req.RepoPath = extractedPath
	} else if repoType == entities.RepoTypeLocalPath {
		// For local paths, validate the directory exists and contains a Git repository
		if req.RepoPath == "" {
			return nil, fmt.Errorf("local path is required for local path projects")
		}

		// Validate the local path directly (hybrid approach - no Docker volumes)
		err = uc.gitService.ValidateRepository(req.RepoPath)
	} else {
		err = uc.gitService.ValidateRepository(req.RepoPath)
	}

	if err != nil {
		return nil, fmt.Errorf("invalid repository: %w", err)
	}

	// Check if project with same name already exists
	existingProject, _ := uc.projectRepo.GetByName(req.Name)
	if existingProject != nil {
		return nil, fmt.Errorf("project with name '%s' already exists", req.Name)
	}

	// Create new project entity with proper type and auth
	var project *entities.Project
	if req.AuthConfig != nil {
		// Convert ports.GitAuthConfig to entities.GitAuthConfig
		entityAuthConfig := &entities.GitAuthConfig{
			Username: req.AuthConfig.Username,
			Token:    req.AuthConfig.Token,
			SSHKey:   req.AuthConfig.SSHKey,
		}
		project = entities.NewProjectWithAuth(req.Name, req.RepoPath, repoType, entityAuthConfig)
	} else {
		project = entities.NewProjectWithType(req.Name, req.RepoPath, repoType)
	}

	// Save to repository
	if err := uc.projectRepo.Create(project); err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return &CreateProjectResponse{
		ProjectID: project.ID,
		Message:   fmt.Sprintf("Project '%s' created successfully", req.Name),
	}, nil
}
