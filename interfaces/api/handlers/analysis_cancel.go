package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"codeecho/application/usecases/analysis"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/persistence/mysql"

	"github.com/gin-gonic/gin"
)

// CancelAnalysis cancels an ongoing analysis for a project
func CancelAnalysis(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Initialize dependencies
	projectRepo := mysql.NewProjectRepository(database.DB)
	analysisUseCase := analysis.NewProjectAnalysisUseCase(projectRepo)

	// Get the project to verify it exists
	_, err = projectRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":  "Project not found",
			"detail": err.Error(),
		})
		return
	}

	// Cancel the ongoing analysis
	if err := analysisUseCase.CancelAnalysis(id); err != nil {
		log.Printf("Failed to cancel analysis for project %d: %v", id, err)
		// If no active analysis found, return 404 instead of 500
		if strings.Contains(err.Error(), "no active analysis found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":  "No active analysis found",
				"detail": "No analysis is currently running for this project",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to cancel analysis",
			"detail": err.Error(),
		})
		return
	}

	log.Printf("Analysis cancelled for project %d", id)
	c.JSON(http.StatusOK, gin.H{
		"message":    "Analysis cancelled successfully",
		"project_id": id,
	})
}
