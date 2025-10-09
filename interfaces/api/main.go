package main

import (
	"log"
	"net/http"

	"codeecho/infrastructure/database"
	infraServices "codeecho/infrastructure/services"
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

	// Initialize auth handler and JWT service
	authHandler := handlers.NewAuthHandler()
	jwtService := infraServices.NewJWTService()

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

		// Authentication routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// Current user info (protected)
		api.GET("/me", middleware.AuthMiddleware(jwtService), authHandler.Me)

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.OptionalAuthMiddleware(jwtService)) // Optional auth for most routes
		{
			// Projects
			protected.GET("/projects", handlers.GetProjects)
			protected.POST("/projects", handlers.CreateProject)
			protected.GET("/projects/:id", handlers.GetProject)
			protected.PUT("/projects/:id", handlers.UpdateProject)
			protected.DELETE("/projects/:id", handlers.DeleteProject)

			// Commits
			protected.GET("/projects/:id/commits", handlers.GetProjectCommits)
			protected.GET("/commits/:id", handlers.GetCommit)

			// Analytics
			protected.GET("/projects/:id/hotspots", handlers.GetProjectHotspots)
			protected.GET("/projects/:id/stats", handlers.GetProjectStats)
			protected.GET("/projects/:id/overview", handlers.GetProjectOverview)
			protected.GET("/projects/:id/file-ownership", handlers.GetFileOwnership)
			protected.GET("/ownership", handlers.GetOwnership)
			protected.GET("/projects/:id/author-hotspots", handlers.GetAuthorHotspots)
			protected.GET("/projects/:id/knowledge-risk", handlers.GetProjectKnowledgeRisk)
			protected.GET("/projects/:id/temporal-coupling", handlers.GetProjectTemporalCoupling)
			protected.GET("/projects/:id/file-types", handlers.GetProjectFileTypes)
			protected.GET("/projects/:id/bus-factor", handlers.GetProjectBusFactor)
			protected.GET("/temporal-coupling", handlers.GetTemporalCouplingFlat)
			protected.GET("/dashboard/stats", handlers.GetDashboardStats)

			// Project Analysis
			protected.POST("/projects/:id/analyze", handlers.AnalyzeProject)
			protected.POST("/projects/:id/refresh", handlers.RefreshProjectAnalysis)
			protected.POST("/projects/:id/cancel-analysis", handlers.CancelAnalysis)
			protected.GET("/projects/:id/analysis-status", handlers.GetProjectAnalysisStatus)

			// Project Upload
			protected.POST("/projects/:id/upload", uploadHandler.UploadProject)

			// Debug (optional) - raw counts for troubleshooting
			protected.GET("/projects/:id/debug/raw-counts", handlers.GetProjectRawCounts)
		}
	}

	// Start server
	log.Println("Starting CodeEcho API server on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
