package handlers
package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"code-echo/domain"
	"code-echo/shared/dto"
)

// MockAnalyticsUseCase is a mock implementation of the AnalyticsUseCase interface
type MockAnalyticsUseCase struct {
	mock.Mock
}

func (m *MockAnalyticsUseCase) GetFileOwnership(projectID string) ([]*domain.FileOwnership, error) {
	args := m.Called(projectID)
	return args.Get(0).([]*domain.FileOwnership), args.Error(1)
}

func (m *MockAnalyticsUseCase) GetAuthorHotspots(projectID string) ([]*domain.AuthorHotspot, error) {
	args := m.Called(projectID)
	return args.Get(0).([]*domain.AuthorHotspot), args.Error(1)
}

func TestGetProjectKnowledgeRisk(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	router := gin.Default()
	mockUseCase := new(MockAnalyticsUseCase)
	handler := NewAnalyticsHandler(mockUseCase)
	router.GET("/projects/:id/knowledge-risk", handler.GetProjectKnowledgeRisk)

	// Mock data
	projectID := "test-project"
	mockFileOwnership := []*domain.FileOwnership{
		{
			FilePath:    "file1.go",
			AuthorEmail: "author1@example.com",
			Lines:       100,
		},
		{
			FilePath:    "file1.go",
			AuthorEmail: "author2@example.com",
			Lines:       50,
		},
		{
			FilePath:    "file2.go",
			AuthorEmail: "author1@example.com",
			Lines:       200,
		},
	}
	mockAuthorHotspots := []*domain.AuthorHotspot{
		{
			AuthorEmail: "author1@example.com",
			Hotspots:    10,
		},
		{
			AuthorEmail: "author2@example.com",
			Hotspots:    5,
		},
	}

	// Mock UseCase methods
	mockUseCase.On("GetFileOwnership", projectID).Return(mockFileOwnership, nil)
	mockUseCase.On("GetAuthorHotspots", projectID).Return(mockAuthorHotspots, nil)

	// Request
	req, _ := http.NewRequest(http.MethodGet, "/projects/"+projectID+"/knowledge-risk", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var responseBody dto.KnowledgeRiskDTO
	err := json.Unmarshal(w.Body.Bytes(), &responseBody)
	assert.NoError(t, err)

	// Assert FileOwnership
	assert.Len(t, responseBody.FileOwnership, 2)
	for _, fo := range responseBody.FileOwnership {
		if fo.FilePath == "file1.go" {
			assert.Len(t, fo.Authors, 2)
			assert.Equal(t, 150, fo.TotalLines)
		} else if fo.FilePath == "file2.go" {
			assert.Len(t, fo.Authors, 1)
			assert.Equal(t, 200, fo.TotalLines)
		}
	}

	// Assert AuthorHotspots
	assert.Len(t, responseBody.AuthorHotspots, 2)
	assert.Equal(t, "author1@example.com", responseBody.AuthorHotspots[0].Author)
	assert.Equal(t, 10, responseBody.AuthorHotspots[0].Hotspots)

	// Assert Summary
	assert.Equal(t, 2, responseBody.Summary.TotalFiles)
	assert.Equal(t, 2, responseBody.Summary.TotalAuthors)
	assert.Equal(t, 1, responseBody.Summary.HighRiskFiles) // file2.go is 100% owned by one author
	assert.Equal(t, 15, responseBody.Summary.TotalHotspots)

	mockUseCase.AssertExpectations(t)
}
