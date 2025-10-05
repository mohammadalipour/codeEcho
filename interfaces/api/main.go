package main

import (
	"log"
	"net/http"

	"codeecho/infrastructure/database"
	"codeecho/interfaces/api/handlers"
	"codeecho/interfaces/api/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database connection
	if err := database.InitDB(); err != nil {
		log.Printf("Failed to initialize database: %v", err)
		log.Println("Continuing with fallback to mock data...")
	}
	defer database.CloseDB()

	// Initialize upload handler
	uploadHandler := handlers.NewUploadProjectHandler("/tmp/uploaded_projects")

	// Create Gin router
	router := gin.Default()

	// Add middleware
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())
	router.Use(middleware.RateLimit())

	// API routes
	api := router.Group("/api/v1")
	{
		// Health check
		api.GET("/health", handlers.HealthCheck)

		// Projects
		api.GET("/projects", handlers.GetProjects)
		api.POST("/projects", handlers.CreateProject)
		api.GET("/projects/:id", handlers.GetProject)
		api.PUT("/projects/:id", handlers.UpdateProject)
		api.DELETE("/projects/:id", handlers.DeleteProject)

		// Commits
		api.GET("/projects/:id/commits", handlers.GetProjectCommits)
		api.GET("/commits/:id", handlers.GetCommit)

		// Analytics
		api.GET("/projects/:id/hotspots", handlers.GetProjectHotspots)
		api.GET("/projects/:id/stats", handlers.GetProjectStats)
		api.GET("/projects/:id/overview", handlers.GetProjectOverview)
		api.GET("/projects/:id/file-ownership", handlers.GetFileOwnership)
		api.GET("/ownership", handlers.GetOwnership)
		api.GET("/projects/:id/author-hotspots", handlers.GetAuthorHotspots)
		api.GET("/projects/:id/knowledge-risk", handlers.GetProjectKnowledgeRisk)
		api.GET("/projects/:id/temporal-coupling", handlers.GetProjectTemporalCoupling)
		api.GET("/projects/:id/file-types", handlers.GetProjectFileTypes)
		api.GET("/temporal-coupling", handlers.GetTemporalCouplingFlat)
		api.GET("/dashboard/stats", handlers.GetDashboardStats)

		// Project Analysis
		api.POST("/projects/:id/analyze", handlers.AnalyzeProject)
		api.POST("/projects/:id/refresh", handlers.RefreshProjectAnalysis)
		api.POST("/projects/:id/cancel-analysis", handlers.CancelAnalysis)
		api.GET("/projects/:id/analysis-status", handlers.GetProjectAnalysisStatus)

		// Project Upload
		api.POST("/projects/:id/upload", uploadHandler.UploadProject)

		// Debug (optional) - raw counts for troubleshooting
		api.GET("/projects/:id/debug/raw-counts", handlers.GetProjectRawCounts)
	}

	// Start server
	log.Println("Starting CodeEcho API server on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
