package handlers

import (
	"net/http"
	"strconv"

	"codeecho/application/usecases/analysis"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/persistence/mysql"

	"github.com/gin-gonic/gin"
)

// AnalyzeProject analyzes a Git repository for the given project
func AnalyzeProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var request struct {
		RepoPath string `json:"repoPath" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Repository path is required"})
		return
	}

	// Initialize dependencies
	projectRepo := mysql.NewProjectRepository(database.DB)
	analysisUseCase := analysis.NewProjectAnalysisUseCase(projectRepo)

	// Validate repository path first
	if err := analysisUseCase.ValidateRepository(request.RepoPath); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "Invalid repository path",
			"detail": err.Error(),
		})
		return
	}

	// Start analysis in background (this can take a while)
	go func() {
		if err := analysisUseCase.AnalyzeRepository(id, request.RepoPath); err != nil {
			// Log error - in a real application, you might want to update a job status table
			// log.Printf("Analysis failed for project %d: %v", id, err)
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message":   "Repository analysis started",
		"projectId": id,
		"repoPath":  request.RepoPath,
	})
}

// GetProjectAnalysisStatus returns the analysis status of a project
func GetProjectAnalysisStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Initialize dependencies
	projectRepo := mysql.NewProjectRepository(database.DB)
	analysisUseCase := analysis.NewProjectAnalysisUseCase(projectRepo)

	// Get analysis status
	status, err := analysisUseCase.GetAnalysisStatus(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":  "Project not found",
			"detail": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, status)
}
