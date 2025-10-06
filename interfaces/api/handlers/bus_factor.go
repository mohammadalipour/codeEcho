package handlers

import (
	"net/http"
	"strconv"
	"time"

	"codeecho/application/usecases/analytics"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/repository"
	"codeecho/internal/models"

	"github.com/gin-gonic/gin"
)

// BusFactorResult represents the bus factor analysis for a single file
type BusFactorResult struct {
	File                  string            `json:"file"`
	BusFactor             int               `json:"bus_factor"`
	TopAuthors            []AuthorOwnership `json:"top_authors"`
	OwnershipDistribution []AuthorOwnership `json:"ownership_distribution"`
	LastModified          *time.Time        `json:"last_modified"`
	RiskLevel             string            `json:"risk_level"`
	TotalCommits          int               `json:"total_commits"`
}

// AuthorOwnership represents an author's ownership percentage of a file
type AuthorOwnership struct {
	Author           string  `json:"author"`
	Commits          int     `json:"commits"`
	OwnershipPercent float64 `json:"ownership_percent"`
}

// BusFactorResponse represents the complete bus factor analysis response
type BusFactorResponse struct {
	Files         []BusFactorResult `json:"files"`
	Summary       BusFactorSummary  `json:"summary"`
	ProjectID     int               `json:"project_id"`
	DateRange     DateRange         `json:"date_range"`
	FilterApplied FilterInfo        `json:"filter_applied"`
}

// BusFactorSummary provides aggregate statistics
type BusFactorSummary struct {
	TotalFiles       int         `json:"total_files"`
	HighRiskFiles    int         `json:"high_risk_files"`
	MediumRiskFiles  int         `json:"medium_risk_files"`
	LowRiskFiles     int         `json:"low_risk_files"`
	Distribution     map[int]int `json:"distribution"` // bus_factor -> count
	AverageBusFactor float64     `json:"average_bus_factor"`
}

// DateRange represents the time period analyzed
type DateRange struct {
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
}

// FilterInfo shows what filters were applied
type FilterInfo struct {
	Repository string `json:"repository,omitempty"`
	Path       string `json:"path,omitempty"`
	RiskLevel  string `json:"risk_level,omitempty"`
}

// GetProjectBusFactor calculates and returns bus factor analysis for a project
func GetProjectBusFactor(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Parse query parameters
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	repositoryFilter := c.Query("repository")
	pathFilter := c.Query("path")
	riskLevel := c.Query("riskLevel")

	var startDate, endDate *time.Time
	if startDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", startDateStr); err == nil {
			startDate = &parsed
		}
	}
	if endDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", endDateStr); err == nil {
			endDate = &parsed
		}
	}

	// Initialize repository
	analyticsRepo := repository.NewAnalyticsRepository(database.DB)
	analyticsUseCase := analytics.NewAnalyticsUseCase(analyticsRepo)

	// Get bus factor data
	busFactorData, err := analyticsUseCase.GetBusFactorAnalysis(projectID, startDate, endDate, repositoryFilter, pathFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to calculate bus factor",
			"detail": err.Error(),
		})
		return
	}

	// Convert to API response format
	results := make([]BusFactorResult, 0, len(busFactorData))
	distribution := make(map[int]int)
	totalBusFactor := 0
	highRisk, mediumRisk, lowRisk := 0, 0, 0

	for _, data := range busFactorData {
		// Calculate bus factor for this file
		busFactor := calculateBusFactor(data.OwnershipDistribution)

		// Determine risk level
		riskLevelCalc := getRiskLevel(busFactor)

		// Filter by risk level if specified
		if riskLevel != "" && riskLevel != "all" && riskLevelCalc != riskLevel {
			continue
		}

		// Count risk levels
		switch riskLevelCalc {
		case "high":
			highRisk++
		case "medium":
			mediumRisk++
		case "low":
			lowRisk++
		}

		// Update distribution
		distribution[busFactor]++
		totalBusFactor += busFactor

		// Convert ownership data
		topAuthors := make([]AuthorOwnership, 0, 5) // Top 5 authors
		allOwnership := make([]AuthorOwnership, 0, len(data.OwnershipDistribution))

		for i, ownership := range data.OwnershipDistribution {
			authorOwnership := AuthorOwnership{
				Author:           ownership.Author,
				Commits:          ownership.Commits,
				OwnershipPercent: ownership.OwnershipPercent,
			}
			allOwnership = append(allOwnership, authorOwnership)

			// Add to top authors (first 5)
			if i < 5 {
				topAuthors = append(topAuthors, authorOwnership)
			}
		}

		result := BusFactorResult{
			File:                  data.FilePath,
			BusFactor:             busFactor,
			TopAuthors:            topAuthors,
			OwnershipDistribution: allOwnership,
			LastModified:          data.LastModified,
			RiskLevel:             riskLevelCalc,
			TotalCommits:          data.TotalCommits,
		}

		results = append(results, result)
	}

	// Calculate average
	avgBusFactor := 0.0
	if len(results) > 0 {
		avgBusFactor = float64(totalBusFactor) / float64(len(results))
	}

	// Build response
	response := BusFactorResponse{
		Files: results,
		Summary: BusFactorSummary{
			TotalFiles:       len(results),
			HighRiskFiles:    highRisk,
			MediumRiskFiles:  mediumRisk,
			LowRiskFiles:     lowRisk,
			Distribution:     distribution,
			AverageBusFactor: avgBusFactor,
		},
		ProjectID: projectID,
		DateRange: DateRange{
			StartDate: startDate,
			EndDate:   endDate,
		},
		FilterApplied: FilterInfo{
			Repository: repositoryFilter,
			Path:       pathFilter,
			RiskLevel:  riskLevel,
		},
	}

	c.JSON(http.StatusOK, response)
}

// calculateBusFactor determines the minimum number of developers needed for 50% knowledge coverage
func calculateBusFactor(ownership []models.AuthorOwnership) int {
	if len(ownership) == 0 {
		return 0
	}

	cumulativeOwnership := 0.0
	busFactor := 0

	for _, owner := range ownership {
		cumulativeOwnership += owner.OwnershipPercent
		busFactor++

		// Stop when we reach 50% coverage
		if cumulativeOwnership >= 50.0 {
			break
		}
	}

	return busFactor
}

// getRiskLevel categorizes risk based on bus factor
func getRiskLevel(busFactor int) string {
	switch busFactor {
	case 1:
		return "high"
	case 2:
		return "medium"
	default:
		return "low"
	}
}
