package handlers

import (
	"net/http"

	"codeecho/application/ports"
	"codeecho/application/usecases/project"

	"github.com/gin-gonic/gin"
)

// ProjectHandler handles project-related HTTP requests
type ProjectHandler struct {
	createProjectUseCase *project.CreateProjectUseCase
}

// NewProjectHandler creates a new project handler
func NewProjectHandler(createProjectUseCase *project.CreateProjectUseCase) *ProjectHandler {
	return &ProjectHandler{
		createProjectUseCase: createProjectUseCase,
	}
}

// CreateProject handles project creation requests
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req project.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format: " + err.Error(),
		})
		return
	}

	// Validate required fields
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Project name is required",
		})
		return
	}

	if req.RepoPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Repository path is required",
		})
		return
	}

	// Execute use case
	response, err := h.createProjectUseCase.Execute(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"project_id": response.ProjectID,
		"message":    response.Message,
	})
}

// CreateProjectFromUpload handles creating a project from uploaded archive
func (h *ProjectHandler) CreateProjectFromUpload(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		UploadID string `json:"upload_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format: " + err.Error(),
		})
		return
	}

	// Create project request for local directory type
	projectReq := &project.CreateProjectRequest{
		Name:     req.Name,
		RepoPath: "/tmp/uploaded_projects/" + req.UploadID, // This will be the archive path
		RepoType: "local_dir",
	}

	// Execute use case
	response, err := h.createProjectUseCase.Execute(projectReq)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"project_id": response.ProjectID,
		"message":    response.Message,
	})
}

// CreatePrivateProject handles creating a project from private Git repository
func (h *ProjectHandler) CreatePrivateProject(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		RepoURL  string `json:"repo_url" binding:"required"`
		Username string `json:"username"`
		Token    string `json:"token"`
		SSHKey   string `json:"ssh_key"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format: " + err.Error(),
		})
		return
	}

	// Validate authentication is provided
	if req.Username == "" && req.Token == "" && req.SSHKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Authentication credentials are required for private repositories",
		})
		return
	}

	// Create auth config
	authConfig := &ports.GitAuthConfig{
		Username: req.Username,
		Token:    req.Token,
		SSHKey:   req.SSHKey,
	}

	// Create project request for private git type
	projectReq := &project.CreateProjectRequest{
		Name:       req.Name,
		RepoPath:   req.RepoURL,
		RepoType:   "private_git",
		AuthConfig: authConfig,
	}

	// Execute use case
	response, err := h.createProjectUseCase.Execute(projectReq)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"project_id": response.ProjectID,
		"message":    response.Message,
	})
}
