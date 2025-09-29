package ports

import "codeecho/internal/models"

// AnalyticsRepository interface defines the contract for analytics data access
type AnalyticsRepository interface {
	GetProjectOverview(projectID int) (*models.ProjectOverview, error)
	GetFileOwnership(projectID int) ([]models.FileOwnership, error)
	GetAuthorHotspots(projectID int) ([]models.AuthorHotspot, error)
}
