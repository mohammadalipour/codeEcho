package handlers

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// UploadProjectHandler handles project file uploads
type UploadProjectHandler struct {
	uploadDir string
}

// NewUploadProjectHandler creates a new upload handler
func NewUploadProjectHandler(uploadDir string) *UploadProjectHandler {
	return &UploadProjectHandler{
		uploadDir: uploadDir,
	}
}

// UploadProject handles the upload of a project as a zip file
func (h *UploadProjectHandler) UploadProject(c *gin.Context) {
	// Get project ID from URL
	projectIDStr := c.Param("id")
	projectID, err := strconv.ParseUint(projectIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Get the uploaded file
	file, header, err := c.Request.FormFile("project")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validate file type
	if !strings.HasSuffix(header.Filename, ".zip") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only ZIP files are supported"})
		return
	}

	// Create project directory
	projectDir := filepath.Join(h.uploadDir, fmt.Sprintf("project_%d", projectID))
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project directory"})
		return
	}

	// Save the uploaded file temporarily
	tempZipPath := filepath.Join(h.uploadDir, fmt.Sprintf("temp_%d.zip", projectID))
	tempFile, err := os.Create(tempZipPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
		return
	}
	defer tempFile.Close()
	defer os.Remove(tempZipPath) // Clean up temp file

	// Copy uploaded content to temp file
	if _, err := io.Copy(tempFile, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
		return
	}

	// Extract the zip file
	if err := h.extractZip(tempZipPath, projectDir); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to extract zip: %v", err)})
		return
	}

	// Find the actual git repository directory
	repoPath, err := h.findGitRepository(projectDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("No Git repository found in uploaded files: %v", err)})
		return
	}

	// Return the path where the project was extracted
	c.JSON(http.StatusOK, gin.H{
		"message":     "Project uploaded successfully",
		"projectPath": repoPath,
	})
}

// extractZip extracts a zip file to the specified destination
func (h *UploadProjectHandler) extractZip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	// Create destination directory
	os.MkdirAll(dest, 0755)

	// Extract files
	for _, f := range r.File {
		rc, err := f.Open()
		if err != nil {
			return err
		}
		defer rc.Close()

		// Construct the full path
		path := filepath.Join(dest, f.Name)

		// Check for ZipSlip vulnerability
		if !strings.HasPrefix(path, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path: %s", f.Name)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(path, f.FileInfo().Mode())
			continue
		}

		// Create the directories for this file
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		// Create the file
		outFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.FileInfo().Mode())
		if err != nil {
			return err
		}

		_, err = io.Copy(outFile, rc)
		outFile.Close()

		if err != nil {
			return err
		}
	}

	return nil
}

// findGitRepository searches for a .git directory within the uploaded project
func (h *UploadProjectHandler) findGitRepository(rootDir string) (string, error) {
	var gitDir string

	err := filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() && info.Name() == ".git" {
			gitDir = filepath.Dir(path)
			return filepath.SkipDir // Found it, stop searching
		}

		return nil
	})

	if err != nil {
		return "", err
	}

	if gitDir == "" {
		return "", fmt.Errorf("no .git directory found in uploaded files")
	}

	return gitDir, nil
}

// GetProjectPath returns the path where a project is stored
func (h *UploadProjectHandler) GetProjectPath(projectID uint) string {
	return filepath.Join(h.uploadDir, fmt.Sprintf("project_%d", projectID))
}
