package repository

import (
	"codeecho/internal/models"
	"database/sql"
	"time"
)

type AnalyticsRepository struct {
	db *sql.DB
}

func NewAnalyticsRepository(db *sql.DB) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// GetProjectOverview returns overview statistics for a project
func (r *AnalyticsRepository) GetProjectOverview(projectID int) (*models.ProjectOverview, error) {
	overview := &models.ProjectOverview{}

	// Get project basic info
	err := r.db.QueryRow(`
		SELECT name FROM projects WHERE id = ?
	`, projectID).Scan(&overview.ProjectName)
	if err != nil {
		return nil, err
	}

	// Get total files count (distinct file_paths from changes)
	err = r.db.QueryRow(`
		SELECT COUNT(DISTINCT ch.file_path)
		FROM changes ch
		JOIN commits c ON ch.commit_id = c.id
		WHERE c.project_id = ?
	`, projectID).Scan(&overview.TotalFiles)
	if err != nil {
		return nil, err
	}

	// Get total commits count
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM commits WHERE project_id = ?
	`, projectID).Scan(&overview.TotalCommits)
	if err != nil {
		return nil, err
	}

	// Get total lines of code (sum of all lines added minus lines deleted)
	var totalLinesAdded, totalLinesDeleted int
	err = r.db.QueryRow(`
		SELECT COALESCE(SUM(ch.lines_added), 0), COALESCE(SUM(ch.lines_deleted), 0)
		FROM changes ch
		JOIN commits c ON ch.commit_id = c.id
		WHERE c.project_id = ?
	`, projectID).Scan(&totalLinesAdded, &totalLinesDeleted)
	if err != nil {
		return nil, err
	}
	overview.TotalLOC = totalLinesAdded - totalLinesDeleted

	// Get unique contributors count
	err = r.db.QueryRow(`
		SELECT COUNT(DISTINCT author) FROM commits WHERE project_id = ?
	`, projectID).Scan(&overview.Contributors)
	if err != nil {
		return nil, err
	}

	// Get technical debt trend (last 30 days)
	rows, err := r.db.Query(`
		SELECT DATE(c.timestamp) as date, 
		       SUM(ch.lines_added) as added,
		       SUM(ch.lines_deleted) as deleted
		FROM commits c
		JOIN changes ch ON c.id = ch.commit_id
		WHERE c.project_id = ? AND c.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
		GROUP BY DATE(c.timestamp)
		ORDER BY date DESC
		LIMIT 30
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	overview.TechnicalDebtTrend = []models.DebtTrendPoint{}
	for rows.Next() {
		var point models.DebtTrendPoint
		var dateStr string
		var added, deleted int
		err := rows.Scan(&dateStr, &added, &deleted)
		if err != nil {
			continue
		}
		point.Date = dateStr
		point.Value = float64(added) / float64(deleted+1) // Simple debt ratio
		overview.TechnicalDebtTrend = append(overview.TechnicalDebtTrend, point)
	}

	// Get risk snapshots (high-churn files)
	rows, err = r.db.Query(`
		SELECT ch.file_path, COUNT(*) as changes, 
		       SUM(ch.lines_added + ch.lines_deleted) as total_changes
		FROM changes ch
		JOIN commits c ON ch.commit_id = c.id
		WHERE c.project_id = ?
		GROUP BY ch.file_path
		HAVING changes > 5
		ORDER BY total_changes DESC
		LIMIT 10
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	overview.RiskSnapshots = []models.RiskSnapshot{}
	for rows.Next() {
		var snapshot models.RiskSnapshot
		var totalChanges int
		err := rows.Scan(&snapshot.Component, &snapshot.Changes, &totalChanges)
		if err != nil {
			continue
		}

		// Calculate risk level based on change frequency
		if snapshot.Changes > 20 {
			snapshot.Level = "High"
		} else if snapshot.Changes > 10 {
			snapshot.Level = "Medium"
		} else {
			snapshot.Level = "Low"
		}

		overview.RiskSnapshots = append(overview.RiskSnapshots, snapshot)
	}

	// Analysis status
	overview.AnalysisStatus = models.AnalysisStatus{
		LastAnalyzed: time.Now().Format("2006-01-02 15:04:05"),
		Status:       "Completed",
		FilesScanned: overview.TotalFiles,
	}

	return overview, nil
}

// GetFileOwnership returns file ownership data for knowledge risk analysis
func (r *AnalyticsRepository) GetFileOwnership(projectID int) ([]models.FileOwnership, error) {
	rows, err := r.db.Query(`
		SELECT 
			ch.file_path,
			c.author,
			COUNT(*) as commits,
			SUM(ch.lines_added + ch.lines_deleted) as total_changes,
			MAX(c.timestamp) as last_modified
		FROM changes ch
		JOIN commits c ON ch.commit_id = c.id
		WHERE c.project_id = ?
		GROUP BY ch.file_path, c.author
		ORDER BY ch.file_path, total_changes DESC
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ownershipMap := make(map[string][]models.AuthorContribution)
	for rows.Next() {
		var filePath, author, lastModified string
		var commits, totalChanges int

		err := rows.Scan(&filePath, &author, &commits, &totalChanges, &lastModified)
		if err != nil {
			continue
		}

		ownershipMap[filePath] = append(ownershipMap[filePath], models.AuthorContribution{
			Author:       author,
			Commits:      commits,
			Changes:      totalChanges,
			LastModified: lastModified,
		})
	}

	var fileOwnerships []models.FileOwnership
	for filePath, contributions := range ownershipMap {
		// Calculate total changes for the file
		totalChanges := 0
		for _, contrib := range contributions {
			totalChanges += contrib.Changes
		}

		// Calculate ownership percentages
		for i := range contributions {
			contributions[i].Percentage = float64(contributions[i].Changes) / float64(totalChanges) * 100
		}

		// Determine primary owner (highest percentage)
		primaryOwner := contributions[0].Author
		ownershipPercentage := contributions[0].Percentage

		// Calculate risk level
		riskLevel := "Low"
		if ownershipPercentage > 90 {
			riskLevel = "Critical"
		} else if ownershipPercentage > 70 {
			riskLevel = "High"
		} else if ownershipPercentage > 50 {
			riskLevel = "Medium"
		}

		fileOwnerships = append(fileOwnerships, models.FileOwnership{
			FilePath:            filePath,
			PrimaryOwner:        primaryOwner,
			OwnershipPercentage: ownershipPercentage,
			TotalContributors:   len(contributions),
			RiskLevel:           riskLevel,
			Contributors:        contributions,
		})
	}

	return fileOwnerships, nil
}

// GetAuthorHotspots returns author contribution data for hotspot analysis
func (r *AnalyticsRepository) GetAuthorHotspots(projectID int) ([]models.AuthorHotspot, error) {
	rows, err := r.db.Query(`
		SELECT 
			c.author,
			COUNT(DISTINCT ch.file_path) as files_touched,
			COUNT(*) as total_commits,
			SUM(ch.lines_added) as lines_added,
			SUM(ch.lines_deleted) as lines_deleted,
			MAX(c.timestamp) as last_activity
		FROM commits c
		JOIN changes ch ON c.id = ch.commit_id
		WHERE c.project_id = ?
		GROUP BY c.author
		ORDER BY total_commits DESC
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hotspots []models.AuthorHotspot
	for rows.Next() {
		var hotspot models.AuthorHotspot
		var lastActivity string

		err := rows.Scan(
			&hotspot.Author,
			&hotspot.FilesTouched,
			&hotspot.TotalCommits,
			&hotspot.LinesAdded,
			&hotspot.LinesDeleted,
			&lastActivity,
		)
		if err != nil {
			continue
		}

		hotspot.LastActivity = lastActivity

		// Calculate risk score based on activity concentration
		hotspot.RiskScore = float64(hotspot.TotalCommits)*0.4 +
			float64(hotspot.FilesTouched)*0.6

		hotspots = append(hotspots, hotspot)
	}

	return hotspots, nil
}
