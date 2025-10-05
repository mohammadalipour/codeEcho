package models

// ProjectOverview represents the project overview data for the dashboard
type ProjectOverview struct {
	ProjectID          int              `json:"projectId"`
	ProjectName        string           `json:"projectName"`
	TotalFiles         int              `json:"totalFiles"`
	TotalCommits       int              `json:"totalCommits"`
	TotalLOC           int              `json:"totalLOC"`
	Contributors       int              `json:"contributors"`
	TechnicalDebtTrend []DebtTrendPoint `json:"technicalDebtTrend"`
	RiskSnapshots      []RiskSnapshot   `json:"riskSnapshots"`
	TotalHotspots      int              `json:"totalHotspots"`
	HighCouplingRisks  int              `json:"highCouplingRisks"`
	LastAnalysisTime   string           `json:"lastAnalysisTime"`
	AnalysisStatus     AnalysisStatus   `json:"analysisStatus"`
}

// DebtTrendPoint represents a point in the technical debt trend
type DebtTrendPoint struct {
	Date  string  `json:"date"`
	Month string  `json:"month"`
	Score int     `json:"score"`
	Value float64 `json:"value"`
}

// RiskSnapshot represents a risk snapshot for a component
type RiskSnapshot struct {
	Component string `json:"component"`
	Level     string `json:"level"`
	Changes   int    `json:"changes"`
	Risk      string `json:"risk"`
}

// AnalysisStatus represents the status of project analysis
type AnalysisStatus struct {
	LastAnalyzed string `json:"lastAnalyzed"`
	Status       string `json:"status"`
	FilesScanned int    `json:"filesScanned"`
}

// FileOwnership represents file ownership data for knowledge risk analysis
type FileOwnership struct {
	FilePath            string               `json:"filePath"`
	PrimaryOwner        string               `json:"primaryOwner"`
	OwnershipPercentage float64              `json:"ownershipPercentage"`
	TotalContributors   int                  `json:"totalContributors"`
	TotalLines          int                  `json:"totalLines"`
	LastModified        string               `json:"lastModified"`
	RiskLevel           string               `json:"riskLevel"`
	Contributors        []AuthorContribution `json:"authors"`
}

// AuthorContribution represents an author's contribution to a file
type AuthorContribution struct {
	Author       string  `json:"name"`
	Commits      int     `json:"commits"`
	Changes      int     `json:"changes"`
	Contribution int     `json:"contribution"`
	Percentage   float64 `json:"percentage"`
	LastModified string  `json:"lastModified"`
}

// AuthorHotspot represents author hotspot data
type AuthorHotspot struct {
	Author       string  `json:"author"`
	Hotspots     int     `json:"hotspots"`
	FilesTouched int     `json:"filesTouched"`
	TotalCommits int     `json:"totalCommits"`
	LinesAdded   int     `json:"linesAdded"`
	LinesDeleted int     `json:"linesDeleted"`
	LastActivity string  `json:"lastActivity"`
	RiskScore    float64 `json:"riskScore"`
}

// TemporalCoupling represents a pair of files that frequently change together
type TemporalCoupling struct {
	FileA         string  `json:"file_a"`
	FileB         string  `json:"file_b"`
	SharedCommits int     `json:"shared_commits"`
	TotalCommitsA int     `json:"total_commits_a"`
	TotalCommitsB int     `json:"total_commits_b"`
	CouplingScore float64 `json:"coupling_score"`
	LastModified  string  `json:"last_modified"`
}
