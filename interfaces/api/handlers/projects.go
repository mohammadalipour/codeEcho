package handlers

import (
	"net/http"
	"strconv"

	"codeecho/infrastructure/database"
	"codeecho/infrastructure/persistence/mysql"

	"github.com/gin-gonic/gin"
)

// HealthCheck returns the health status of the API
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"message": "CodeEcho API is running",
	})
}

// GetProjects returns all projects
func GetProjects(c *gin.Context) {
	projectRepo := mysql.NewProjectRepository(database.DB)

	projects, err := projectRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Convert to response format
	var response []gin.H
	for _, project := range projects {
		response = append(response, gin.H{
			"id":                 project.ID,
			"name":               project.Name,
			"repo_path":          project.RepoPath,
			"repo_type":          string(project.RepoType),
			"last_analyzed_hash": project.LastAnalyzedHash,
			"created_at":         project.CreatedAt,
			"is_analyzed":        project.IsAnalyzed(),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": response,
	})
}

// GetProject returns a specific project
func GetProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
		})
		return
	}

	projectRepo := mysql.NewProjectRepository(database.DB)
	project, err := projectRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Project not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 project.ID,
		"name":               project.Name,
		"repo_path":          project.RepoPath,
		"repo_type":          string(project.RepoType),
		"last_analyzed_hash": project.LastAnalyzedHash,
		"created_at":         project.CreatedAt,
		"is_analyzed":        project.IsAnalyzed(),
	})
}

// UpdateProject updates a specific project
func UpdateProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
		})
		return
	}

	var request struct {
		Name string `json:"name"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	projectRepo := mysql.NewProjectRepository(database.DB)
	project, err := projectRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Project not found",
		})
		return
	}

	// Update project name
	project.Name = request.Name
	if err := projectRepo.Update(project); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update project",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project updated successfully",
		"project": gin.H{
			"id":   project.ID,
			"name": project.Name,
		},
	})
}

// DeleteProject deletes a specific project
func DeleteProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
		})
		return
	}

	projectRepo := mysql.NewProjectRepository(database.DB)
	project, err := projectRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Project not found",
		})
		return
	}

	if err := projectRepo.Delete(project.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete project",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project deleted successfully",
	})
}
