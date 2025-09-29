package analysis

import (
	"fmt"

	"codeecho/domain/repositories"
	"codeecho/infrastructure/analyzer"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/git"
)

// ProjectAnalysisUseCase handles project analysis operations
type ProjectAnalysisUseCase struct {
	analyzer    *analyzer.RepositoryAnalyzer
	projectRepo repositories.ProjectRepository
}

// NewProjectAnalysisUseCase creates a new project analysis use case
func NewProjectAnalysisUseCase(projectRepo repositories.ProjectRepository) *ProjectAnalysisUseCase {
	// Initialize git service
	gitService := git.NewGitService()

	// Initialize analyzer
	analyzer := analyzer.NewRepositoryAnalyzer(gitService, projectRepo, database.DB)

	return &ProjectAnalysisUseCase{
		analyzer:    analyzer,
		projectRepo: projectRepo,
	}
}

// AnalyzeRepository analyzes a Git repository and populates the database
func (uc *ProjectAnalysisUseCase) AnalyzeRepository(projectID int, repoPath string) error {
	// Get project to check if it has been analyzed before
	project, err := uc.projectRepo.GetByID(projectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}

	if project.IsAnalyzed() {
		// Analyze only new commits since last analysis
		return uc.analyzer.AnalyzeProjectSince(projectID, repoPath, project.LastAnalyzedHash.String())
	} else {
		// Full analysis of the repository
		return uc.analyzer.AnalyzeProject(projectID, repoPath)
	}
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
