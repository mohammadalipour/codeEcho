package ports

import (
	"codeecho/internal/models"
	"time"
)

// AnalyticsRepository interface defines the contract for analytics data access
type AnalyticsRepository interface {
	GetProjectOverview(projectID int) (*models.ProjectOverview, error)
	GetFileOwnership(projectID int) ([]models.FileOwnership, error)
	GetAuthorHotspots(projectID int) ([]models.AuthorHotspot, error)
	// GetTemporalCoupling returns file pairs with filtering support
	// Optional date range: if startDate or endDate is empty string they are ignored.
	// minSharedCommits: minimum number of shared commits between file pairs
	// minCouplingScore: minimum coupling score threshold (0.0 to 1.0)
	// fileTypes: comma-separated file extensions like "php,js,py"
	GetTemporalCoupling(projectID int, limit int, startDate, endDate string, minSharedCommits int, minCouplingScore float64, fileTypes string) ([]models.TemporalCoupling, error)
	// GetProjectFileTypes returns available file extensions for a project
	GetProjectFileTypes(projectID int) ([]string, error)
	// GetBusFactorAnalysis returns bus factor data for all files in a project
	GetBusFactorAnalysis(projectID int, startDate, endDate *time.Time, repository, path string) ([]models.BusFactorData, error)
}
