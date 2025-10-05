package handlers

import (
	"codeecho/infrastructure/database"
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetProjectRawCounts returns raw commit/change/file counts directly from DB for debugging
func GetProjectRawCounts(c *gin.Context) {
	id := c.Param("id")

	// Basic project info
	var name, repoPath string
	var lastAnalyzed *string
	projQuery := `SELECT name, repo_path, last_analyzed_hash FROM projects WHERE id = ?`
	var lastHash sql.NullString
	if err := database.DB.QueryRow(projQuery, id).Scan(&name, &repoPath, &lastHash); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found", "detail": err.Error()})
		return
	}
	if lastHash.Valid {
		tmp := lastHash.String
		lastAnalyzed = &tmp
	}

	// Counts
	var commitCount int
	if err := database.DB.QueryRow(`SELECT COUNT(*) FROM commits WHERE project_id = ?`, id).Scan(&commitCount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count commits", "detail": err.Error()})
		return
	}

	var changeCount int
	if err := database.DB.QueryRow(`SELECT COUNT(ch.id) FROM changes ch JOIN commits c ON ch.commit_id = c.id WHERE c.project_id = ?`, id).Scan(&changeCount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count changes", "detail": err.Error()})
		return
	}

	var fileCount int
	if err := database.DB.QueryRow(`SELECT COUNT(DISTINCT ch.file_path) FROM changes ch JOIN commits c ON ch.commit_id = c.id WHERE c.project_id = ?`, id).Scan(&fileCount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count files", "detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"project_id":         id,
		"name":               name,
		"repo_path":          repoPath,
		"last_analyzed_hash": lastAnalyzed,
		"raw_commits":        commitCount,
		"raw_changes":        changeCount,
		"raw_files":          fileCount,
	})
}
