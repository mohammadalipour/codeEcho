package repository

import (
	"codeecho/internal/models"
	"database/sql"
	"strings"
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

// GetTemporalCoupling returns pairs of files that frequently change together within a project.
// Coupling score heuristic: shared_commits / MIN(total_commits_a, total_commits_b)
// Results are ordered by coupling_score DESC then shared_commits DESC.
func (r *AnalyticsRepository) GetTemporalCoupling(projectID int, limit int, startDate, endDate string, minSharedCommits int, minCouplingScore float64, fileTypes string) ([]models.TemporalCoupling, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	if minSharedCommits <= 0 {
		minSharedCommits = 2 // default threshold
	}

	// Build optional date predicates
	dateFilter := ""
	args := []interface{}{projectID}
	if startDate != "" {
		dateFilter += " AND c.timestamp >= ?"
		args = append(args, startDate+" 00:00:00")
	}
	if endDate != "" {
		dateFilter += " AND c.timestamp <= ?"
		args = append(args, endDate+" 23:59:59")
	}

	// Build file type filter
	fileTypeFilter := ""
	if fileTypes != "" {
		fileTypesParts := strings.Split(fileTypes, ",")
		if len(fileTypesParts) > 0 {
			fileTypeConditions := make([]string, len(fileTypesParts))
			for i, ft := range fileTypesParts {
				fileTypeConditions[i] = "ch.file_path LIKE ?"
				args = append(args, "%."+strings.TrimSpace(ft))
			}
			fileTypeFilter = " AND (" + strings.Join(fileTypeConditions, " OR ") + ")"
		}
	}

	query := `
		WITH file_commits AS (
			SELECT ch.file_path AS file_path, c.id AS commit_id, c.timestamp
			FROM changes ch
			JOIN commits c ON ch.commit_id = c.id
			WHERE c.project_id = ?` + dateFilter + fileTypeFilter + `
		), file_commit_counts AS (
			SELECT file_path, COUNT(DISTINCT commit_id) AS total_commits, MAX(timestamp) AS last_modified
			FROM file_commits
			GROUP BY file_path
		), pair_commits AS (
			SELECT 
				LEAST(a.file_path, b.file_path) AS file_a,
				GREATEST(a.file_path, b.file_path) AS file_b,
				COUNT(DISTINCT a.commit_id) AS shared_commits,
				MAX(GREATEST(a.timestamp, b.timestamp)) AS last_modified
			FROM file_commits a
			JOIN file_commits b ON a.commit_id = b.commit_id AND a.file_path < b.file_path
			GROUP BY file_a, file_b
			HAVING shared_commits >= ?
		)
		SELECT 
			p.file_a,
			p.file_b,
			p.shared_commits,
			ca.total_commits AS total_commits_a,
			cb.total_commits AS total_commits_b,
			p.last_modified
		FROM pair_commits p
		JOIN file_commit_counts ca ON ca.file_path = p.file_a
		JOIN file_commit_counts cb ON cb.file_path = p.file_b
		WHERE (p.shared_commits / LEAST(ca.total_commits, cb.total_commits)) >= ?
		ORDER BY (p.shared_commits / LEAST(ca.total_commits, cb.total_commits)) DESC, p.shared_commits DESC
		LIMIT ?
	`

	// Append minSharedCommits, minCouplingScore, and limit arguments
	args = append(args, minSharedCommits, minCouplingScore, limit)
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]models.TemporalCoupling, 0)
	for rows.Next() {
		var tc models.TemporalCoupling
		var lastModified string
		err := rows.Scan(&tc.FileA, &tc.FileB, &tc.SharedCommits, &tc.TotalCommitsA, &tc.TotalCommitsB, &lastModified)
		if err != nil {
			continue
		}
		tc.LastModified = lastModified
		// CouplingScore = shared / min(totalA,totalB)
		minTotal := tc.TotalCommitsA
		if tc.TotalCommitsB < minTotal {
			minTotal = tc.TotalCommitsB
		}
		if minTotal > 0 {
			tc.CouplingScore = float64(tc.SharedCommits) / float64(minTotal)
		}
		results = append(results, tc)
	}

	return results, nil
}

// GetProjectFileTypes returns available file extensions for a project
func (r *AnalyticsRepository) GetProjectFileTypes(projectID int) ([]string, error) {
	query := `
		SELECT DISTINCT 
			SUBSTRING_INDEX(ch.file_path, '.', -1) AS extension
		FROM changes ch
		JOIN commits c ON ch.commit_id = c.id
		WHERE c.project_id = ? 
			AND ch.file_path LIKE '%.%'
			AND LENGTH(SUBSTRING_INDEX(ch.file_path, '.', -1)) <= 10
			AND LENGTH(SUBSTRING_INDEX(ch.file_path, '.', -1)) > 0
			AND SUBSTRING_INDEX(ch.file_path, '.', -1) NOT LIKE '%/%'
		ORDER BY extension
	`

	rows, err := r.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var fileTypes []string
	for rows.Next() {
		var ext string
		err := rows.Scan(&ext)
		if err != nil {
			continue
		}
		// Add extension directly to list (already cleaned by SQL query)
		if len(ext) > 0 && len(ext) <= 10 {
			fileTypes = append(fileTypes, ext)
		}
	}

	return fileTypes, nil
}
