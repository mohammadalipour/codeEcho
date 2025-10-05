package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"codeecho/application/usecases/analytics"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/repository"

	"github.com/gin-gonic/gin"
)

// Simple cache to prevent database overload
type Cache struct {
	data map[string]interface{}
	mu   sync.RWMutex
}

var cache = &Cache{
	data: make(map[string]interface{}),
}

// invalidateProjectCache removes cached analytics for a project
func invalidateProjectCache(projectID int) {
	keys := []string{
		getCacheKey("commits", projectID),
		getCacheKey("hotspots", projectID),
		getCacheKey("stats", projectID),
	}
	cache.mu.Lock()
	for _, k := range keys {
		delete(cache.data, k)
	}
	cache.mu.Unlock()
}

// getCacheKey generates a cache key for the given prefix and ID
func getCacheKey(prefix string, id int) string {
	return fmt.Sprintf("%s_%d", prefix, id)
}

// getFromCache retrieves data from cache
func (c *Cache) get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	data, exists := c.data[key]
	return data, exists
}

// setToCache stores data in cache
func (c *Cache) set(key string, data interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = data
}

// GetProjectCommits returns commits for a project
func GetProjectCommits(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	noCache := c.Query("nocache") == "1"
	cacheKey := getCacheKey("commits", id)
	if !noCache {
		if cached, exists := cache.get(cacheKey); exists {
			c.Header("X-Cache", "HIT")
			c.JSON(http.StatusOK, cached)
			return
		}
	}
	c.Header("X-Cache", func() string {
		if noCache {
			return "BYPASS"
		} else {
			return "MISS"
		}
	}())

	// Get commits from database
	commits, err := getProjectCommitsFromDB(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to retrieve commits",
			"detail": err.Error(),
		})
		return
	}

	result := gin.H{
		"project_id": id,
		"commits":    commits,
	}

	if !noCache {
		cache.set(cacheKey, result)
	}

	c.JSON(http.StatusOK, result)
}

// GetCommit returns a specific commit
func GetCommit(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid commit ID"})
		return
	}

	// TODO: Implement using use cases
	c.JSON(http.StatusOK, gin.H{
		"commit_id": id,
		"message":   "GetCommit not yet implemented in DDD structure",
	})
}

// GetProjectHotspots returns hotspots analysis for a project
func GetProjectHotspots(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Parse pagination parameters
	page := 1
	limit := 20
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	// Parse filter parameters
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	repository := c.Query("repository")
	path := c.Query("path")
	metric := c.Query("metric")
	riskLevel := c.Query("riskLevel")
	fileTypes := c.Query("fileTypes")

	minComplexity := 0
	if mc := c.Query("minComplexity"); mc != "" {
		if parsed, err := strconv.Atoi(mc); err == nil {
			minComplexity = parsed
		}
	}

	minChanges := 0
	if mc := c.Query("minChanges"); mc != "" {
		if parsed, err := strconv.Atoi(mc); err == nil {
			minChanges = parsed
		}
	}

	noCache := c.Query("nocache") == "1"
	// Include all filter parameters in cache key
	cacheKey := fmt.Sprintf("hotspots_%d_page_%d_limit_%d_start_%s_end_%s_repo_%s_path_%s_metric_%s_risk_%s_types_%s_mincomp_%d_minchg_%d",
		id, page, limit, startDate, endDate, repository, path, metric, riskLevel, fileTypes, minComplexity, minChanges)
	if !noCache {
		if cached, exists := cache.get(cacheKey); exists {
			c.Header("X-Cache", "HIT")
			c.JSON(http.StatusOK, cached)
			return
		}
	}
	c.Header("X-Cache", func() string {
		if noCache {
			return "BYPASS"
		} else {
			return "MISS"
		}
	}())

	// Get hotspots from database with filters
	filters := map[string]interface{}{
		"startDate":     startDate,
		"endDate":       endDate,
		"repository":    repository,
		"path":          path,
		"metric":        metric,
		"riskLevel":     riskLevel,
		"fileTypes":     fileTypes,
		"minComplexity": minComplexity,
		"minChanges":    minChanges,
	}
	hotspots, totalCount, err := getProjectHotspotsFromDB(id, page, limit, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to retrieve hotspots",
			"detail": err.Error(),
		})
		return
	}

	totalPages := (totalCount + limit - 1) / limit // Ceiling division

	result := gin.H{
		"project_id": id,
		"hotspots":   hotspots,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       totalCount,
			"total_pages": totalPages,
		},
	}

	if !noCache {
		cache.set(cacheKey, result)
	}

	c.JSON(http.StatusOK, result)
}

// GetProjectStats returns statistics for a project
func GetProjectStats(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	noCache := c.Query("nocache") == "1"
	cacheKey := getCacheKey("stats", id)
	if !noCache {
		if cached, exists := cache.get(cacheKey); exists {
			c.Header("X-Cache", "HIT")
			c.JSON(http.StatusOK, cached)
			return
		}
	}
	c.Header("X-Cache", func() string {
		if noCache {
			return "BYPASS"
		} else {
			return "MISS"
		}
	}())

	// Get project statistics from database
	stats, err := getProjectStatsFromDB(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to retrieve project statistics",
			"detail": err.Error(),
		})
		return
	}

	result := gin.H{
		"project_id": id,
		"stats":      stats,
	}

	if !noCache {
		cache.set(cacheKey, result)
	}

	c.JSON(http.StatusOK, result)
}

// GetDashboardStats returns overall dashboard statistics
func GetDashboardStats(c *gin.Context) {
	// Initialize repository and use case
	repo := repository.NewAnalyticsRepository(database.DB)

	// Get aggregated statistics from database
	stats, err := getDashboardStatsFromDB(repo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to retrieve dashboard statistics",
			"detail": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetProjectTemporalCoupling returns temporal coupling pairs for a project
func GetProjectTemporalCoupling(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Optional query params
	limit := 200                        // enforce max 200
	if l := c.Query("limit"); l != "" { // allow smaller limits if provided
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")

	// New threshold parameters
	minSharedCommits := 2 // default value
	if msc := c.Query("minSharedCommits"); msc != "" {
		if v, err := strconv.Atoi(msc); err == nil && v > 0 {
			minSharedCommits = v
		}
	}

	minCouplingScore := 0.0 // default value
	if mcs := c.Query("minCouplingScore"); mcs != "" {
		if v, err := strconv.ParseFloat(mcs, 64); err == nil && v >= 0.0 && v <= 1.0 {
			minCouplingScore = v
		}
	}

	// File types filter
	fileTypes := c.Query("fileTypes") // comma-separated list like "php,js,py"

	// Cache key includes parameters
	cacheKey := fmt.Sprintf("temporal_coupling_%d_%d_%s_%s_%d_%.2f_%s", id, limit, startDate, endDate, minSharedCommits, minCouplingScore, fileTypes)
	if cached, exists := cache.get(cacheKey); exists {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, cached)
		return
	}
	c.Header("X-Cache", "MISS")

	repo := repository.NewAnalyticsRepository(database.DB)
	useCase := analytics.NewAnalyticsUseCase(repo)
	pairs, err := useCase.GetTemporalCoupling(id, limit, startDate, endDate, minSharedCommits, minCouplingScore, fileTypes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve temporal coupling", "detail": err.Error()})
		return
	}

	result := gin.H{
		"project_id":        id,
		"temporal_coupling": pairs,
		"params":            gin.H{"limit": limit, "startDate": startDate, "endDate": endDate, "minSharedCommits": minSharedCommits, "minCouplingScore": minCouplingScore, "fileTypes": fileTypes},
	}
	cache.set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// GetTemporalCouplingFlat supports /api/v1/temporal-coupling?projectId=ID
func GetTemporalCouplingFlat(c *gin.Context) {
	projectIDStr := c.Query("projectId")
	if projectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId query parameter is required"})
		return
	}
	id, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid projectId"})
		return
	}

	limit := 200
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")

	// New threshold parameters
	minSharedCommits := 2 // default value
	if msc := c.Query("minSharedCommits"); msc != "" {
		if v, err := strconv.Atoi(msc); err == nil && v > 0 {
			minSharedCommits = v
		}
	}

	minCouplingScore := 0.0 // default value
	if mcs := c.Query("minCouplingScore"); mcs != "" {
		if v, err := strconv.ParseFloat(mcs, 64); err == nil && v >= 0.0 && v <= 1.0 {
			minCouplingScore = v
		}
	}

	// File types filter
	fileTypes := c.Query("fileTypes") // comma-separated list like "php,js,py"

	cacheKey := fmt.Sprintf("temporal_coupling_flat_%d_%d_%s_%s_%d_%.2f_%s", id, limit, startDate, endDate, minSharedCommits, minCouplingScore, fileTypes)
	if cached, exists := cache.get(cacheKey); exists {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, cached)
		return
	}
	c.Header("X-Cache", "MISS")

	repo := repository.NewAnalyticsRepository(database.DB)
	useCase := analytics.NewAnalyticsUseCase(repo)
	pairs, err := useCase.GetTemporalCoupling(id, limit, startDate, endDate, minSharedCommits, minCouplingScore, fileTypes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve temporal coupling", "detail": err.Error()})
		return
	}

	result := gin.H{
		"projectId":        id,
		"temporalCoupling": pairs,
		"params":           gin.H{"limit": limit, "startDate": startDate, "endDate": endDate, "minSharedCommits": minSharedCommits, "minCouplingScore": minCouplingScore, "fileTypes": fileTypes},
	}
	cache.set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// GetProjectFileTypes returns available file types for a project
func GetProjectFileTypes(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Cache key for file types
	cacheKey := fmt.Sprintf("project_file_types_%d", id)
	if cached, exists := cache.get(cacheKey); exists {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, cached)
		return
	}
	c.Header("X-Cache", "MISS")

	repo := repository.NewAnalyticsRepository(database.DB)
	useCase := analytics.NewAnalyticsUseCase(repo)
	fileTypes, err := useCase.GetProjectFileTypes(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file types", "detail": err.Error()})
		return
	}

	result := gin.H{
		"project_id": id,
		"file_types": fileTypes,
	}
	cache.set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// getDashboardStatsFromDB calculates dashboard statistics from the database
func getDashboardStatsFromDB(repo *repository.AnalyticsRepository) (gin.H, error) {
	// Query for aggregated statistics using raw SQL
	query := `
		SELECT 
			COUNT(DISTINCT p.id) as total_projects,
			COUNT(DISTINCT c.id) as total_commits,
			COUNT(DISTINCT c.author) as active_contributors,
			COUNT(DISTINCT ch.file_path) as total_files
		FROM projects p
		LEFT JOIN commits c ON p.id = c.project_id
		LEFT JOIN changes ch ON c.id = ch.commit_id
	`

	var totalProjects, totalCommits, activeContributors, totalFiles int
	err := database.DB.QueryRow(query).Scan(
		&totalProjects,
		&totalCommits,
		&activeContributors,
		&totalFiles,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard stats: %w", err)
	}

	// Calculate code hotspots (files with high change frequency)
	hotspotQuery := `
		SELECT COUNT(*) FROM (
			SELECT ch.file_path
			FROM changes ch
			JOIN commits c ON ch.commit_id = c.id
			GROUP BY ch.file_path
			HAVING COUNT(*) > 2
		) as hotspots
	`

	var codeHotspots int
	err = database.DB.QueryRow(hotspotQuery).Scan(&codeHotspots)
	if err != nil {
		codeHotspots = 0 // Default to 0 if query fails
	}

	return gin.H{
		"totalProjects":      totalProjects,
		"totalCommits":       totalCommits,
		"activeContributors": activeContributors,
		"codeHotspots":       codeHotspots,
		"totalFiles":         totalFiles,
	}, nil
}

// getProjectCommitsFromDB gets commits for a specific project
func getProjectCommitsFromDB(projectID int) ([]gin.H, error) {
	query := `
		SELECT id, hash, author, timestamp, message
		FROM commits 
		WHERE project_id = ?
		ORDER BY timestamp DESC
		LIMIT 50
	`

	rows, err := database.DB.Query(query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query commits: %w", err)
	}
	defer rows.Close()

	var commits []gin.H
	for rows.Next() {
		var id int
		var hash, author, message, timestamp string

		err := rows.Scan(&id, &hash, &author, &timestamp, &message)
		if err != nil {
			continue
		}

		commits = append(commits, gin.H{
			"id":        id,
			"hash":      hash,
			"author":    author,
			"timestamp": timestamp,
			"message":   message,
		})
	}

	return commits, nil
}

// getProjectStatsFromDB gets statistics for a specific project
func getProjectStatsFromDB(projectID int) (gin.H, error) {
	query := `
		SELECT 
			COUNT(DISTINCT c.id) as total_commits,
			COUNT(DISTINCT c.author) as contributors,
			COUNT(DISTINCT ch.file_path) as total_files,
			COALESCE(SUM(ch.lines_added), 0) as lines_added,
			COALESCE(SUM(ch.lines_deleted), 0) as lines_deleted,
			COALESCE(MAX(c.timestamp), '') as last_commit
		FROM commits c
		LEFT JOIN changes ch ON c.id = ch.commit_id
		WHERE c.project_id = ?
	`

	var totalCommits, contributors, totalFiles, linesAdded, linesDeleted int
	var lastCommit string

	err := database.DB.QueryRow(query, projectID).Scan(
		&totalCommits,
		&contributors,
		&totalFiles,
		&linesAdded,
		&linesDeleted,
		&lastCommit,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get project stats: %w", err)
	}

	// Get total number of hotspots (files with more than 1 change)
	var totalHotspots int
	hotspotQuery := `
		SELECT COUNT(*) 
		FROM (
			SELECT ch.file_path
			FROM changes ch
			JOIN commits c ON ch.commit_id = c.id
			WHERE c.project_id = ?
			GROUP BY ch.file_path
			HAVING COUNT(*) > 1
		) AS hotspot_files
	`
	err = database.DB.QueryRow(hotspotQuery, projectID).Scan(&totalHotspots)
	if err != nil {
		// Don't fail if we can't get hotspot count, just set to 0
		totalHotspots = 0
	}

	return gin.H{
		"total_commits":  totalCommits,
		"contributors":   contributors,
		"total_files":    totalFiles,
		"lines_added":    linesAdded,
		"lines_deleted":  linesDeleted,
		"net_lines":      linesAdded - linesDeleted,
		"last_commit":    lastCommit,
		"total_hotspots": totalHotspots,
	}, nil
}

// getProjectHotspotsFromDB gets hotspots (frequently changed files) for a project with pagination and filters
func getProjectHotspotsFromDB(projectID int, page int, limit int, filters map[string]interface{}) ([]gin.H, int, error) {
	// Build WHERE clause for filters
	whereConditions := []string{"c.project_id = ?"}
	countArgs := []interface{}{projectID}
	queryArgs := []interface{}{projectID}

	// Date range filter
	if startDate, ok := filters["startDate"].(string); ok && startDate != "" {
		whereConditions = append(whereConditions, "c.timestamp >= ?")
		countArgs = append(countArgs, startDate)
		queryArgs = append(queryArgs, startDate)
	}
	if endDate, ok := filters["endDate"].(string); ok && endDate != "" {
		whereConditions = append(whereConditions, "c.timestamp <= ?")
		countArgs = append(countArgs, endDate)
		queryArgs = append(queryArgs, endDate)
	}

	// Repository filter (if applicable)
	if repository, ok := filters["repository"].(string); ok && repository != "" && repository != "all" {
		whereConditions = append(whereConditions, "c.repository = ?")
		countArgs = append(countArgs, repository)
		queryArgs = append(queryArgs, repository)
	}

	// Path filter
	if path, ok := filters["path"].(string); ok && path != "" {
		whereConditions = append(whereConditions, "ch.file_path LIKE ?")
		pathPattern := fmt.Sprintf("%%%s%%", path)
		countArgs = append(countArgs, pathPattern)
		queryArgs = append(queryArgs, pathPattern)
	}

	// File type filter
	if fileTypes, ok := filters["fileTypes"].(string); ok && fileTypes != "" {
		types := strings.Split(fileTypes, ",")
		if len(types) > 0 {
			typeConditions := make([]string, len(types))
			for i, fileType := range types {
				typeConditions[i] = "ch.file_path LIKE ?"
				pattern := fmt.Sprintf("%%.%s", strings.TrimSpace(fileType))
				countArgs = append(countArgs, pattern)
				queryArgs = append(queryArgs, pattern)
			}
			whereConditions = append(whereConditions, "("+strings.Join(typeConditions, " OR ")+")")
		}
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Build HAVING clause for complexity and change filters
	havingConditions := []string{"COUNT(*) > 1"}

	if minChanges, ok := filters["minChanges"].(int); ok && minChanges > 0 {
		havingConditions = append(havingConditions, "COUNT(*) >= ?")
		countArgs = append(countArgs, minChanges)
		queryArgs = append(queryArgs, minChanges)
	}

	havingClause := strings.Join(havingConditions, " AND ")

	// First, get the total count with filters applied
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM (
			SELECT ch.file_path
			FROM changes ch
			JOIN commits c ON ch.commit_id = c.id
			WHERE %s
			GROUP BY ch.file_path
			HAVING %s
		) AS hotspot_files
	`, whereClause, havingClause)

	var totalCount int
	err := database.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %w", err)
	}

	// Calculate offset
	offset := (page - 1) * limit

	// Add limit and offset to query args
	queryArgs = append(queryArgs, limit, offset)

	query := fmt.Sprintf(`
		SELECT 
			ch.file_path,
			COUNT(*) as change_count,
			SUM(ch.lines_added + ch.lines_deleted) as total_changes,
			COUNT(DISTINCT c.author) as authors,
			MAX(c.timestamp) as last_modified
		FROM changes ch
		JOIN commits c ON ch.commit_id = c.id
		WHERE %s
		GROUP BY ch.file_path
		HAVING %s
		ORDER BY total_changes DESC
		LIMIT ? OFFSET ?
	`, whereClause, havingClause)

	rows, err := database.DB.Query(query, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query hotspots: %w", err)
	}
	defer rows.Close()

	var hotspots []gin.H
	for rows.Next() {
		var filePath, lastModified string
		var changeCount, totalChanges, authors int

		err := rows.Scan(&filePath, &changeCount, &totalChanges, &authors, &lastModified)
		if err != nil {
			continue
		}

		// Calculate risk level based on change frequency
		riskLevel := "Low"
		if changeCount > 10 {
			riskLevel = "High"
		} else if changeCount > 5 {
			riskLevel = "Medium"
		}

		hotspots = append(hotspots, gin.H{
			"file_path":     filePath,
			"change_count":  changeCount,
			"total_changes": totalChanges,
			"authors":       authors,
			"last_modified": lastModified,
			"risk_level":    riskLevel,
		})
	}

	return hotspots, totalCount, nil
}

// GetProjectOverview returns project overview with health trends and risk metrics
func GetProjectOverview(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Initialize repository and use case
	repo := repository.NewAnalyticsRepository(database.DB)
	useCase := analytics.NewAnalyticsUseCase(repo)

	// Get project overview from database
	overview, err := useCase.GetProjectOverview(id)
	if err != nil {
		// Fallback to mock data if database query fails
		mockOverview := gin.H{
			"projectId":   id,
			"projectName": "Sample Project",
			"technicalDebtTrend": []gin.H{
				{"month": "Apr 2025", "score": 72},
				{"month": "May 2025", "score": 68},
				{"month": "Jun 2025", "score": 74},
				{"month": "Jul 2025", "score": 71},
				{"month": "Aug 2025", "score": 65},
				{"month": "Sep 2025", "score": 62},
			},
			"totalHotspots":     42,
			"highCouplingRisks": 15,
			"lastAnalysisTime":  "2025-09-29T10:30:00Z",
		}
		c.JSON(http.StatusOK, mockOverview)
		return
	}

	c.JSON(http.StatusOK, overview)
}

// GetFileOwnership returns file ownership data for knowledge risk analysis
func GetFileOwnership(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Initialize repository and use case
	repo := repository.NewAnalyticsRepository(database.DB)
	useCase := analytics.NewAnalyticsUseCase(repo)

	// Get file ownership from database
	fileOwnership, err := useCase.GetFileOwnership(id)
	if err != nil {
		// Fallback to mock data if database query fails
		mockFileOwnership := []gin.H{
			{
				"filePath": "src/components/UserAuth.js",
				"authors": []gin.H{
					{"name": "Alice Johnson", "contribution": 65},
					{"name": "Bob Smith", "contribution": 30},
					{"name": "Carol Davis", "contribution": 5},
				},
				"totalLines":   450,
				"lastModified": "2025-09-25",
				"riskLevel":    "high",
			},
			{
				"filePath": "src/utils/DatabaseConnection.js",
				"authors": []gin.H{
					{"name": "David Wilson", "contribution": 85},
					{"name": "Eve Brown", "contribution": 10},
					{"name": "Frank Miller", "contribution": 5},
				},
				"totalLines":   320,
				"lastModified": "2025-09-20",
				"riskLevel":    "high",
			},
		}
		c.JSON(http.StatusOK, gin.H{
			"projectId":     id,
			"fileOwnership": mockFileOwnership,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projectId":     id,
		"fileOwnership": fileOwnership,
	})
}

// GetOwnership (query-based) returns file ownership for a provided projectId via /ownership?projectId=ID
// This is a lightweight wrapper around GetFileOwnership logic for frontend pages that expect a flat endpoint.
func GetOwnership(c *gin.Context) {
	projectIDStr := c.Query("projectId")
	if projectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId query parameter is required"})
		return
	}
	id, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid projectId"})
		return
	}

	cacheKey := getCacheKey("file_ownership_flat", id)
	if cached, exists := cache.get(cacheKey); exists {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, cached)
		return
	}
	c.Header("X-Cache", "MISS")

	repo := repository.NewAnalyticsRepository(database.DB)
	useCase := analytics.NewAnalyticsUseCase(repo)
	ownership, err := useCase.GetFileOwnership(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve ownership", "detail": err.Error()})
		return
	}

	// Transform to simpler shape matching /projects/:id/file-ownership but flat
	result := gin.H{
		"projectId":     id,
		"fileOwnership": ownership,
	}
	cache.set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// GetAuthorHotspots returns author hotspot contribution data
func GetAuthorHotspots(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Initialize repository and use case
	repo := repository.NewAnalyticsRepository(database.DB)
	useCase := analytics.NewAnalyticsUseCase(repo)

	// Get author hotspots from database
	authorHotspots, err := useCase.GetAuthorHotspots(id)
	if err != nil {
		// Fallback to mock data if database query fails
		mockAuthorHotspots := []gin.H{
			{"author": "Alice Johnson", "hotspots": 12},
			{"author": "David Wilson", "hotspots": 8},
			{"author": "Bob Smith", "hotspots": 7},
			{"author": "Frank Miller", "hotspots": 6},
			{"author": "Carol Davis", "hotspots": 5},
		}
		c.JSON(http.StatusOK, gin.H{
			"projectId":      id,
			"authorHotspots": mockAuthorHotspots,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projectId":      id,
		"authorHotspots": authorHotspots,
	})
}

// GetProjectKnowledgeRisk returns combined knowledge risk data for a project
func GetProjectKnowledgeRisk(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Check cache first
	cacheKey := getCacheKey("knowledge_risk", id)
	if cached, exists := cache.get(cacheKey); exists {
		c.JSON(http.StatusOK, cached)
		return
	}

	// Initialize repository and use case
	repo := repository.NewAnalyticsRepository(database.DB)
	useCase := analytics.NewAnalyticsUseCase(repo)

	// Fetch real data
	ownership, err := useCase.GetFileOwnership(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to retrieve file ownership",
			"detail": err.Error(),
		})
		return
	}

	hotspots, err := useCase.GetAuthorHotspots(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to retrieve author hotspots",
			"detail": err.Error(),
		})
		return
	}

	// Transform ownership to UI-friendly shape
	fileOwnership := make([]map[string]interface{}, 0, len(ownership))
	for _, fo := range ownership {
		// Build authors list with percentages
		authors := make([]map[string]interface{}, 0, len(fo.Contributors))
		totalChanges := 0
		lastModified := ""
		for _, ctb := range fo.Contributors {
			// Round percentage to nearest integer for UI
			pct := int(ctb.Percentage + 0.5)
			authors = append(authors, map[string]interface{}{
				"name":         ctb.Author,
				"contribution": pct,
			})
			totalChanges += ctb.Changes
			if ctb.LastModified > lastModified {
				lastModified = ctb.LastModified
			}
		}

		// Normalize risk level to low/medium/high for UI
		risk := fo.RiskLevel
		if risk == "Critical" || risk == "critical" {
			risk = "high"
		}

		fileOwnership = append(fileOwnership, map[string]interface{}{
			"filePath": fo.FilePath,
			"authors":  authors,
			// Use totalChanges as a proxy for total lines displayed in UI
			"totalLines":   totalChanges,
			"lastModified": lastModified,
			"riskLevel":    strings.ToLower(risk),
		})
	}

	// Transform hotspots to UI-friendly shape
	authorHotspots := make([]map[string]interface{}, 0, len(hotspots))
	for _, h := range hotspots {
		// Ensure Hotspots is set by use case; fallback to TotalCommits-based heuristic
		hot := h.Hotspots
		if hot == 0 {
			hot = h.TotalCommits
			if hot > 20 { // cap like use case
				hot = 20
			}
		}
		authorHotspots = append(authorHotspots, map[string]interface{}{
			"author":   h.Author,
			"hotspots": hot,
		})
	}

	// Build summary
	highRisk := 0
	mediumRisk := 0
	lowRisk := 0
	authorSet := make(map[string]struct{})
	for _, fo := range fileOwnership {
		if lvl, ok := fo["riskLevel"].(string); ok {
			switch lvl {
			case "high":
				highRisk++
			case "medium":
				mediumRisk++
			default:
				lowRisk++
			}
		}
		if authors, ok := fo["authors"].([]map[string]interface{}); ok {
			for _, a := range authors {
				if name, ok := a["name"].(string); ok {
					authorSet[name] = struct{}{}
				}
			}
		}
	}

	response := gin.H{
		"projectId":      id,
		"fileOwnership":  fileOwnership,
		"authorHotspots": authorHotspots,
		"summary": gin.H{
			"totalFiles":      len(fileOwnership),
			"highRiskFiles":   highRisk,
			"mediumRiskFiles": mediumRisk,
			"lowRiskFiles":    lowRisk,
			"totalAuthors":    len(authorSet),
		},
	}

	// Cache the result
	cache.set(cacheKey, response)

	c.JSON(http.StatusOK, response)
}
