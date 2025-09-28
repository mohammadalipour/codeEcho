package analyzer

import (
	"fmt"
)

// AnalyzeHotspots performs a minimal Hotspot analysis
// It takes a projectID and a storage pointer, and returns hotspot file paths
func AnalyzeHotspots(projectID int, storage Storage) ([]string, error) {
	// Step 1: Retrieve all Change records for the given projectID
	changes, err := storage.GetChangesByProjectID(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve changes for project %d: %w", projectID, err)
	}

	// Step 2: Calculate Change Frequency
	// Create a map of FilePath to ChangeCount (number of unique commits that modified the file)
	filePathToCommits := make(map[string]map[int]bool) // FilePath -> Set of CommitIDs

	// Iterate through Change records
	for _, change := range changes {
		if filePathToCommits[change.FilePath] == nil {
			filePathToCommits[change.FilePath] = make(map[int]bool)
		}
		filePathToCommits[change.FilePath][change.CommitID] = true
	}

	// Convert to change count map
	filePathToChangeCount := make(map[string]int)
	for filePath, commitSet := range filePathToCommits {
		filePathToChangeCount[filePath] = len(commitSet) // Count of unique commits
	}

	// Step 3: Identify Hotspots
	// Define a file as a Hotspot if its ChangeCount > 5
	var hotspots []string
	for filePath, changeCount := range filePathToChangeCount {
		if changeCount > 5 {
			hotspots = append(hotspots, filePath)
		}
	}

	// Step 4: Return slice of FilePaths of identified Hotspots
	return hotspots, nil
}

// Storage interface defines the required storage methods
type Storage interface {
	GetCommitsByProjectID(projectID int) ([]Commit, error)
	GetChangesByProjectID(projectID int) ([]Change, error)
}

// Commit represents a commit record from the database
type Commit struct {
	ID        int
	ProjectID int
	Hash      string
	Author    string
	Message   *string
}

// Change represents a file change record from the database
type Change struct {
	ID           int
	CommitID     int
	FilePath     string
	LinesAdded   int
	LinesDeleted int
}
