package handlers

import (
	"net/http"
	"strconv"

	"codeecho/application/usecases/project"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/persistence/mysql"

	"github.com/gin-gonic/gin"
)

// HealthCheck returns the API health status
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "codeecho-api",
		"version": "1.0.0",
	})
}

// GetProjects returns all projects
func GetProjects(c *gin.Context) {
	// Initialize dependencies
	projectRepo := mysql.NewProjectRepository(database.DB)
	projectUseCase := project.NewProjectUseCase(projectRepo)

	// Get all projects
	projects, err := projectUseCase.GetAllProjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to retrieve projects",
			"detail": err.Error(),
		})
		return
	}

	// Convert to API response format
	projectsResponse := make([]gin.H, len(projects))
	for i, proj := range projects {
		var lastAnalyzedHash *string
		if proj.LastAnalyzedHash != nil {
			hash := proj.LastAnalyzedHash.String()
			lastAnalyzedHash = &hash
		}

		projectsResponse[i] = gin.H{
			"id":                 proj.ID,
			"name":               proj.Name,
			"repo_path":          proj.RepoPath,
			"last_analyzed_hash": lastAnalyzedHash,
			"created_at":         proj.CreatedAt.Format("2006-01-02T15:04:05Z"),
			"is_analyzed":        proj.IsAnalyzed(),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": projectsResponse,
	})
}

// CreateProject creates a new project
func CreateProject(c *gin.Context) {
	var request struct {
		Name        string `json:"name" binding:"required"`
		RepoPath    string `json:"repo_path" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "Invalid request data",
			"detail": err.Error(),
		})
		return
	}

	// Initialize dependencies
	projectRepo := mysql.NewProjectRepository(database.DB)
	projectUseCase := project.NewProjectUseCase(projectRepo)

	// Create project
	proj, err := projectUseCase.CreateProject(request.Name, request.RepoPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "Failed to create project",
			"detail": err.Error(),
		})
		return
	}

	// Return created project
	var lastAnalyzedHash *string
	if proj.LastAnalyzedHash != nil {
		hash := proj.LastAnalyzedHash.String()
		lastAnalyzedHash = &hash
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":                 proj.ID,
		"name":               proj.Name,
		"repo_path":          proj.RepoPath,
		"last_analyzed_hash": lastAnalyzedHash,
		"created_at":         proj.CreatedAt.Format("2006-01-02T15:04:05Z"),
		"is_analyzed":        proj.IsAnalyzed(),
	})
}

// GetProject returns a specific project
func GetProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Initialize dependencies
	projectRepo := mysql.NewProjectRepository(database.DB)
	projectUseCase := project.NewProjectUseCase(projectRepo)

	// Get project
	proj, err := projectUseCase.GetProjectByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":  "Project not found",
			"detail": err.Error(),
		})
		return
	}

	// Return project
	var lastAnalyzedHash *string
	if proj.LastAnalyzedHash != nil {
		hash := proj.LastAnalyzedHash.String()
		lastAnalyzedHash = &hash
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 proj.ID,
		"name":               proj.Name,
		"repo_path":          proj.RepoPath,
		"last_analyzed_hash": lastAnalyzedHash,
		"created_at":         proj.CreatedAt.Format("2006-01-02T15:04:05Z"),
		"is_analyzed":        proj.IsAnalyzed(),
	})
}

// UpdateProject updates an existing project
func UpdateProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Parse request body
	var request struct {
		Name     string `json:"name" binding:"required"`
		RepoPath string `json:"repo_path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "Invalid request data",
			"detail": err.Error(),
		})
		return
	}

	// Initialize dependencies
	projectRepo := mysql.NewProjectRepository(database.DB)
	projectUseCase := project.NewProjectUseCase(projectRepo)

	// Get existing project
	existingProject, err := projectUseCase.GetProjectByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":  "Project not found",
			"detail": err.Error(),
		})
		return
	}

	// Update project fields
	existingProject.Name = request.Name
	existingProject.RepoPath = request.RepoPath

	// Update project
	if err := projectUseCase.UpdateProject(existingProject); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to update project",
			"detail": err.Error(),
		})
		return
	}

	// Return updated project
	var lastAnalyzedHash *string
	if existingProject.LastAnalyzedHash != nil {
		hash := existingProject.LastAnalyzedHash.String()
		lastAnalyzedHash = &hash
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 existingProject.ID,
		"name":               existingProject.Name,
		"repo_path":          existingProject.RepoPath,
		"last_analyzed_hash": lastAnalyzedHash,
		"created_at":         existingProject.CreatedAt.Format("2006-01-02T15:04:05Z"),
		"is_analyzed":        existingProject.IsAnalyzed(),
	})
}

// DeleteProject deletes a project
func DeleteProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Initialize dependencies
	projectRepo := mysql.NewProjectRepository(database.DB)
	projectUseCase := project.NewProjectUseCase(projectRepo)

	// Check if project exists before deletion
	existingProject, err := projectUseCase.GetProjectByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":  "Project not found",
			"detail": err.Error(),
		})
		return
	}

	// Delete project (this will cascade delete related commits and changes)
	if err := projectUseCase.DeleteProject(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to delete project",
			"detail": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Project deleted successfully",
		"project_id": id,
		"name":       existingProject.Name,
	})
}
