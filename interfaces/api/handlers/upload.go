package handlers

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

// UploadHandler handles file uploads for local directory projects
type UploadHandler struct {
	uploadDir string
}

// NewUploadHandler creates a new upload handler
func NewUploadHandler(uploadDir string) *UploadHandler {
	// Ensure upload directory exists
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("Warning: Failed to create upload directory %s: %v", uploadDir, err)
	}

	return &UploadHandler{
		uploadDir: uploadDir,
	}
}

// UploadArchive handles uploading project archives
func (h *UploadHandler) UploadArchive(c *gin.Context) {
	// Parse multipart form
	err := c.Request.ParseMultipartForm(100 << 20) // 100MB max
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to parse multipart form: " + err.Error(),
		})
		return
	}

	// Get uploaded file
	file, header, err := c.Request.FormFile("archive")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No archive file provided",
		})
		return
	}
	defer file.Close()

	// Generate unique upload ID
	uploadID := fmt.Sprintf("upload_%d_%s", time.Now().Unix(), header.Filename)
	uploadPath := filepath.Join(h.uploadDir, uploadID)

	// Create upload file
	dst, err := os.Create(uploadPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create upload file: " + err.Error(),
		})
		return
	}
	defer dst.Close()

	// Copy uploaded content
	if _, err := file.Seek(0, 0); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read uploaded file: " + err.Error(),
		})
		return
	}

	if _, err := dst.ReadFrom(file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save uploaded file: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"upload_id": uploadID,
		"filename":  header.Filename,
		"size":      header.Size,
		"message":   "Archive uploaded successfully",
	})
}

// GetUploadInfo returns information about an uploaded file
func (h *UploadHandler) GetUploadInfo(c *gin.Context) {
	uploadID := c.Param("id")
	uploadPath := filepath.Join(h.uploadDir, uploadID)

	// Check if file exists
	if _, err := os.Stat(uploadPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Upload not found",
		})
		return
	}

	// Get file info
	fileInfo, err := os.Stat(uploadPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get file info: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"upload_id":   uploadID,
		"size":        fileInfo.Size(),
		"uploaded_at": fileInfo.ModTime(),
		"path":        uploadPath,
	})
}

// CleanupUpload removes an uploaded file
func (h *UploadHandler) CleanupUpload(c *gin.Context) {
	uploadID := c.Param("id")
	uploadPath := filepath.Join(h.uploadDir, uploadID)

	// Remove file
	if err := os.Remove(uploadPath); err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Upload not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to cleanup upload: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Upload cleaned up successfully",
	})
}
