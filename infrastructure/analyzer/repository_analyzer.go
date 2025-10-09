package analyzer

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"codeecho/application/ports"
	"codeecho/domain/entities"
	"codeecho/domain/repositories"
	"codeecho/domain/values"
)

// RepositoryAnalyzer performs comprehensive analysis of Git repositories
type RepositoryAnalyzer struct {
	gitService  ports.GitService
	projectRepo repositories.ProjectRepository
	commitRepo  repositories.CommitRepository
	changeRepo  repositories.ChangeRepository
	db          *sql.DB
}

// NewRepositoryAnalyzer creates a new repository analyzer instance
func NewRepositoryAnalyzer(gitService ports.GitService, projectRepo repositories.ProjectRepository, commitRepo repositories.CommitRepository, changeRepo repositories.ChangeRepository, db *sql.DB) *RepositoryAnalyzer {
	return &RepositoryAnalyzer{
		gitService:  gitService,
		projectRepo: projectRepo,
		commitRepo:  commitRepo,
		changeRepo:  changeRepo,
		db:          db,
	}
}

// AnalysisResult contains the results of repository analysis
type AnalysisResult struct {
	Project     *entities.Project
	CommitCount int
	ChangeCount int
	FileCount   int
	ErrorCount  int
}

// AnalysisStatus represents the current analysis status of a project
type AnalysisStatus struct {
	ProjectID      int       `json:"project_id"`
	IsAnalyzed     bool      `json:"is_analyzed"`
	LastAnalyzed   time.Time `json:"last_analyzed"`
	CommitCount    int       `json:"commit_count"`
	FileCount      int       `json:"file_count"`
	ChangeCount    int       `json:"change_count"`
	LastCommitHash string    `json:"last_commit_hash"`
}

// AnalyzeRepository performs complete analysis of a Git repository
func (ra *RepositoryAnalyzer) AnalyzeRepository(projectName, repoPath string) (*AnalysisResult, error) {
	log.Printf("Starting analysis of repository: %s at path: %s", projectName, repoPath)

	// Create or get project
	project, err := ra.createOrGetProject(projectName, repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create/get project: %w", err)
	}

	// Get commit history from Git service
	commits, err := ra.gitService.GetCommits(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get commit history: %w", err)
	}

	log.Printf("Found %d commits to process", len(commits))

	result := &AnalysisResult{
		Project:     project,
		CommitCount: 0,
		ChangeCount: 0,
		FileCount:   0,
		ErrorCount:  0,
	}

	// Process commits and their changes
	for i, gitCommit := range commits {
		if i%100 == 0 {
			log.Printf("Processing commit %d/%d", i+1, len(commits))
		}

		err := ra.processGitCommit(project.ID, gitCommit)
		if err != nil {
			log.Printf("Error processing commit %s: %v", gitCommit.Hash, err)
			result.ErrorCount++
			continue
		}

		result.CommitCount++
		result.ChangeCount += len(gitCommit.Changes)
	}

	// Count unique files
	result.FileCount, err = ra.countUniqueFiles(project.ID)
	if err != nil {
		log.Printf("Error counting unique files: %v", err)
	}

	log.Printf("Analysis complete: %d commits, %d changes, %d files, %d errors",
		result.CommitCount, result.ChangeCount, result.FileCount, result.ErrorCount)

	return result, nil
}

// createOrGetProject creates a new project or returns existing one
func (ra *RepositoryAnalyzer) createOrGetProject(name, repoPath string) (*entities.Project, error) {
	// Try to find existing project by name
	projects, err := ra.projectRepo.GetAll()
	if err != nil {
		return nil, err
	}

	for _, project := range projects {
		if project.Name == name {
			log.Printf("Found existing project: %s (ID: %d)", name, project.ID)
			return project, nil
		}
	}

	// Create new project
	project := entities.NewProject(name, repoPath)

	err = ra.projectRepo.Create(project)
	if err != nil {
		return nil, err
	}

	log.Printf("Created new project: %s (ID: %d)", name, project.ID)
	return project, nil
}

// processGitCommit processes a single git commit and its changes
func (ra *RepositoryAnalyzer) processGitCommit(projectID int, gitCommit *ports.GitCommit) error {
	// Convert GitCommit to domain Commit entity
	hashValue, err := values.NewGitHash(gitCommit.Hash)
	if err != nil {
		return fmt.Errorf("invalid git hash: %w", err)
	}

	// Parse timestamp if needed
	timestamp := time.Now() // You might want to parse gitCommit.Timestamp properly

	commit := entities.NewCommit(projectID, hashValue, gitCommit.Author, timestamp, gitCommit.Message)

	// Save commit to database
	if ra.commitRepo != nil {
		err := ra.commitRepo.Create(commit)
		if err != nil {
			return fmt.Errorf("failed to save commit: %w", err)
		}
	}

	// Process changes
	for _, gitChange := range gitCommit.Changes {
		filePath, err := values.NewFilePath(gitChange.FilePath)
		if err != nil {
			log.Printf("Invalid file path %s: %v", gitChange.FilePath, err)
			continue
		}

		change := entities.NewChange(commit.ID, filePath, gitChange.LinesAdded, gitChange.LinesDeleted)

		// Save change to database
		if ra.changeRepo != nil {
			err := ra.changeRepo.Create(change)
			if err != nil {
				return fmt.Errorf("failed to save change: %w", err)
			}
		}
	}

	return nil
}

// countUniqueFiles counts the number of unique files in the project
func (ra *RepositoryAnalyzer) countUniqueFiles(projectID int) (int, error) {
	if ra.changeRepo == nil {
		return 0, nil
	}

	changes, err := ra.changeRepo.GetByProjectID(projectID)
	if err != nil {
		return 0, err
	}

	uniqueFiles := make(map[string]bool)
	for _, change := range changes {
		if change.FilePath != nil {
			// Use the String() method to get the normalized path
			normalizedPath := change.FilePath.String()
			uniqueFiles[normalizedPath] = true
		}
	}

	return len(uniqueFiles), nil
}

// GetHotspots returns files that change frequently
func (ra *RepositoryAnalyzer) GetHotspots(projectID int, limit int) ([]*repositories.FileChangeFrequency, error) {
	if ra.changeRepo == nil {
		return nil, fmt.Errorf("change repository not available")
	}

	changes, err := ra.changeRepo.GetByProjectID(projectID)
	if err != nil {
		return nil, err
	}

	// Calculate file change frequencies
	fileStats := make(map[string]*repositories.FileChangeFrequency)

	for _, change := range changes {
		if change.FilePath == nil {
			continue
		}

		filePath := change.FilePath.String()

		// Initialize if not exists
		if _, exists := fileStats[filePath]; !exists {
			fileStats[filePath] = &repositories.FileChangeFrequency{
				FilePath:     filePath,
				ChangeCount:  0,
				TotalAdded:   0,
				TotalDeleted: 0,
			}
		}

		// Update statistics
		fileStats[filePath].ChangeCount++
		fileStats[filePath].TotalAdded += change.LinesAdded
		fileStats[filePath].TotalDeleted += change.LinesDeleted
	}

	// Convert to slice
	var results []*repositories.FileChangeFrequency
	for _, stats := range fileStats {
		results = append(results, stats)
	}

	// Sort by change count (descending)
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[i].ChangeCount < results[j].ChangeCount {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	// Apply limit
	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}

	return results, nil
}

// SetCommitRepository sets the commit repository for the analyzer
func (ra *RepositoryAnalyzer) SetCommitRepository(repo repositories.CommitRepository) {
	ra.commitRepo = repo
}

// SetChangeRepository sets the change repository for the analyzer
func (ra *RepositoryAnalyzer) SetChangeRepository(repo repositories.ChangeRepository) {
	ra.changeRepo = repo
}

// AnalyzeProject performs full analysis of a project repository
func (ra *RepositoryAnalyzer) AnalyzeProject(projectID int, repoPath string) error {
	// Get project details
	project, err := ra.projectRepo.GetByID(projectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}

	_, err = ra.AnalyzeRepository(project.Name, repoPath)
	if err != nil {
		return err
	}

	// Update project's last analyzed hash with the latest commit
	commits, err := ra.gitService.GetCommits(repoPath)
	if err != nil {
		return fmt.Errorf("failed to get commits to update hash: %w", err)
	}

	if len(commits) > 0 {
		// Get the most recent commit (first in the list since commits are usually ordered newest first)
		latestCommit := commits[0]
		hashValue, err := values.NewGitHash(latestCommit.Hash)
		if err != nil {
			return fmt.Errorf("failed to create hash value: %w", err)
		}

		// Update the project with the latest commit hash
		project.UpdateLastAnalyzedHash(hashValue)
		err = ra.projectRepo.Update(project)
		if err != nil {
			return fmt.Errorf("failed to update project hash: %w", err)
		}

		log.Printf("Updated project %d with latest commit hash: %s", projectID, latestCommit.Hash)
	}

	return nil
}

// AnalyzeProjectSince performs incremental analysis of a project since a specific commit
func (ra *RepositoryAnalyzer) AnalyzeProjectSince(projectID int, repoPath string, sinceHash string) error {
	// Get commits since the specified hash
	commits, err := ra.gitService.GetCommitsSince(repoPath, sinceHash)
	if err != nil {
		return fmt.Errorf("failed to get commits since %s: %w", sinceHash, err)
	}

	log.Printf("Found %d new commits to process", len(commits))

	// Process new commits
	for _, gitCommit := range commits {
		err := ra.processGitCommit(projectID, gitCommit)
		if err != nil {
			log.Printf("Error processing commit %s: %v", gitCommit.Hash, err)
			continue
		}
	}

	// Update project's last analyzed hash
	if len(commits) > 0 {
		lastCommit := commits[len(commits)-1]
		hashValue, err := values.NewGitHash(lastCommit.Hash)
		if err == nil {
			project, err := ra.projectRepo.GetByID(projectID)
			if err == nil {
				project.UpdateLastAnalyzedHash(hashValue)
				ra.projectRepo.Update(project)
			}
		}
	}

	return nil
}

// GetProjectAnalysisStatus returns the current analysis status of a project
func (ra *RepositoryAnalyzer) GetProjectAnalysisStatus(projectID int) (*AnalysisStatus, error) {
	project, err := ra.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	status := &AnalysisStatus{
		ProjectID:  projectID,
		IsAnalyzed: project.IsAnalyzed(),
	}

	if project.LastAnalyzedHash != nil {
		status.LastCommitHash = project.LastAnalyzedHash.String()
	}

	// Get counts from database if change repository is available
	if ra.changeRepo != nil {
		changes, err := ra.changeRepo.GetByProjectID(projectID)
		if err == nil {
			status.ChangeCount = len(changes)

			// Count unique files
			uniqueFiles := make(map[string]bool)
			for _, change := range changes {
				if change.FilePath != nil {
					uniqueFiles[change.FilePath.String()] = true
				}
			}
			status.FileCount = len(uniqueFiles)
		}
	}

	// TODO: Get commit count from commit repository when available

	return status, nil
}
