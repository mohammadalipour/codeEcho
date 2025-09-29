package analytics

import (
	"codeecho/application/ports"
	"codeecho/internal/models"
)

// AnalyticsUseCase handles analytics-related business logic
type AnalyticsUseCase struct {
	repo ports.AnalyticsRepository
}

// NewAnalyticsUseCase creates a new analytics use case
func NewAnalyticsUseCase(repo ports.AnalyticsRepository) *AnalyticsUseCase {
	return &AnalyticsUseCase{
		repo: repo,
	}
}

// GetProjectOverview retrieves project overview with health trends and risk metrics
func (uc *AnalyticsUseCase) GetProjectOverview(projectID int) (*models.ProjectOverview, error) {
	overview, err := uc.repo.GetProjectOverview(projectID)
	if err != nil {
		return nil, err
	}

	// Add business logic if needed (e.g., risk calculations, trend analysis)
	uc.calculateRiskMetrics(overview)

	return overview, nil
}

// GetFileOwnership retrieves file ownership data for knowledge risk analysis
func (uc *AnalyticsUseCase) GetFileOwnership(projectID int) ([]models.FileOwnership, error) {
	ownership, err := uc.repo.GetFileOwnership(projectID)
	if err != nil {
		return nil, err
	}

	// Apply business rules for knowledge risk assessment
	uc.assessKnowledgeRisk(ownership)

	return ownership, nil
}

// GetAuthorHotspots retrieves author hotspot contribution data
func (uc *AnalyticsUseCase) GetAuthorHotspots(projectID int) ([]models.AuthorHotspot, error) {
	hotspots, err := uc.repo.GetAuthorHotspots(projectID)
	if err != nil {
		return nil, err
	}

	// Apply business rules for hotspot analysis
	uc.analyzeHotspots(hotspots)

	return hotspots, nil
}

// calculateRiskMetrics applies business logic for risk calculations
func (uc *AnalyticsUseCase) calculateRiskMetrics(overview *models.ProjectOverview) {
	// Calculate total hotspots based on high-risk components
	totalHotspots := 0
	highCouplingRisks := 0

	for _, snapshot := range overview.RiskSnapshots {
		if snapshot.Level == "High" || snapshot.Level == "Critical" {
			totalHotspots++
		}
		if snapshot.Changes > 15 { // Business rule for high coupling
			highCouplingRisks++
		}
	}

	overview.TotalHotspots = totalHotspots
	overview.HighCouplingRisks = highCouplingRisks
}

// assessKnowledgeRisk applies business rules for knowledge risk assessment
func (uc *AnalyticsUseCase) assessKnowledgeRisk(ownership []models.FileOwnership) {
	for i := range ownership {
		file := &ownership[i]

		// Update risk level based on ownership concentration
		if file.OwnershipPercentage > 90 {
			file.RiskLevel = "critical"
		} else if file.OwnershipPercentage > 70 {
			file.RiskLevel = "high"
		} else if file.OwnershipPercentage > 50 {
			file.RiskLevel = "medium"
		} else {
			file.RiskLevel = "low"
		}
	}
}

// analyzeHotspots applies business rules for hotspot analysis
func (uc *AnalyticsUseCase) analyzeHotspots(hotspots []models.AuthorHotspot) {
	for i := range hotspots {
		hotspot := &hotspots[i]

		// Calculate hotspots based on file activity concentration
		hotspot.Hotspots = int(hotspot.RiskScore / 10) // Business rule
		if hotspot.Hotspots > 20 {
			hotspot.Hotspots = 20 // Cap at 20
		}
	}
}
