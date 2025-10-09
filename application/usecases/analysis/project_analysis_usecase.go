package analysis

import (
	"fmt"
	"log"
	"sync"

	"codeecho/domain/repositories"
	"codeecho/infrastructure/analyzer"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/git"
	"codeecho/infrastructure/persistence/mysql"
)

// Global map to track active analyses and provide cancellation
var (
	activeAnalyses    = make(map[int]bool)
	cancelledAnalyses = make(map[int]bool)
	analysisMutex     = &sync.RWMutex{}
)

// CancelAnalysis cancels an ongoing analysis for a project
func (uc *ProjectAnalysisUseCase) CancelAnalysis(projectID int) error {
	analysisMutex.Lock()
	defer analysisMutex.Unlock()

	if _, exists := activeAnalyses[projectID]; !exists {
		return fmt.Errorf("no active analysis found for project %d", projectID)
	}

	// Mark the analysis as cancelled
	cancelledAnalyses[projectID] = true
	delete(activeAnalyses, projectID)

	log.Printf("Analysis for project %d has been marked for cancellation", projectID)
	return nil
}

// isAnalysisCancelled checks if an analysis has been cancelled
func isAnalysisCancelled(projectID int) bool {
	analysisMutex.RLock()
	defer analysisMutex.RUnlock()

	return cancelledAnalyses[projectID]
}

// ProjectAnalysisUseCase handles project analysis operations
type ProjectAnalysisUseCase struct {
	analyzer    *analyzer.RepositoryAnalyzer
	projectRepo repositories.ProjectRepository
}

// NewProjectAnalysisUseCase creates a new project analysis use case
func NewProjectAnalysisUseCase(projectRepo repositories.ProjectRepository) *ProjectAnalysisUseCase {
	// Initialize git service
	gitService := git.NewGitService()

	// Initialize required repositories
	commitRepo := mysql.NewCommitRepository(database.DB)
	changeRepo := mysql.NewChangeRepository(database.DB)

	// Initialize analyzer with required dependencies
	repositoryAnalyzer := analyzer.NewRepositoryAnalyzer(gitService, projectRepo, commitRepo, changeRepo, database.DB)

	return &ProjectAnalysisUseCase{
		analyzer:    repositoryAnalyzer,
		projectRepo: projectRepo,
	}
}

// AnalyzeRepository analyzes a Git repository and populates the database
func (uc *ProjectAnalysisUseCase) AnalyzeRepository(projectID int, repoPath string) error {
	// Mark this analysis as active
	analysisMutex.Lock()
	activeAnalyses[projectID] = true
	// Clear any previous cancellation
	delete(cancelledAnalyses, projectID)
	analysisMutex.Unlock()

	// Ensure we remove the active status when done
	defer func() {
		analysisMutex.Lock()
		delete(activeAnalyses, projectID)
		analysisMutex.Unlock()
	}()

	// Get project to check if it has been analyzed before
	project, err := uc.projectRepo.GetByID(projectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}

	// Check for cancellation before starting
	if isAnalysisCancelled(projectID) {
		log.Printf("Analysis for project %d was cancelled before starting", projectID)
		return fmt.Errorf("analysis cancelled")
	}

	var result error
	if project.IsAnalyzed() {
		// Analyze only new commits since last analysis
		result = uc.analyzer.AnalyzeProjectSince(projectID, repoPath, project.LastAnalyzedHash.String())
	} else {
		// Full analysis of the repository
		result = uc.analyzer.AnalyzeProject(projectID, repoPath)
	}

	// Check if the analysis was cancelled
	if isAnalysisCancelled(projectID) {
		log.Printf("Analysis for project %d was cancelled during execution", projectID)
		return fmt.Errorf("analysis cancelled")
	}

	return result
}

// GetAnalysisStatus returns the current analysis status of a project
func (uc *ProjectAnalysisUseCase) GetAnalysisStatus(projectID int) (*analyzer.AnalysisStatus, error) {
	return uc.analyzer.GetProjectAnalysisStatus(projectID)
}

// ValidateRepository checks if a repository path is valid
func (uc *ProjectAnalysisUseCase) ValidateRepository(repoPath string) error {
	gitService := git.NewGitService()
	return gitService.ValidateRepository(repoPath)
}
