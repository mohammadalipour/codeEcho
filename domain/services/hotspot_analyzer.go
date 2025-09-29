package services

import (
	"codeecho/domain/entities"
	"codeecho/domain/repositories"
	"sort"
)

// HotspotAnalyzer provides domain services for analyzing code hotspots
type HotspotAnalyzer struct {
	changeRepo repositories.ChangeRepository
}

// NewHotspotAnalyzer creates a new hotspot analyzer
func NewHotspotAnalyzer(changeRepo repositories.ChangeRepository) *HotspotAnalyzer {
	return &HotspotAnalyzer{
		changeRepo: changeRepo,
	}
}

// AnalyzeHotspots identifies files that change frequently in a project
func (ha *HotspotAnalyzer) AnalyzeHotspots(projectID int, limit int) ([]*repositories.FileChangeFrequency, error) {
	// Get all changes for the project
	changes, err := ha.changeRepo.GetByProjectID(projectID)
	if err != nil {
		return nil, err
	}

	// Calculate change frequency per file
	fileStats := ha.calculateFileStats(changes)

	// Sort by change frequency (descending)
	ha.sortByFrequency(fileStats)

	// Apply limit
	if limit > 0 && len(fileStats) > limit {
		fileStats = fileStats[:limit]
	}

	return fileStats, nil
}

// calculateFileStats calculates statistics for each file
func (ha *HotspotAnalyzer) calculateFileStats(changes []*entities.Change) []*repositories.FileChangeFrequency {
	// Track unique commits per file path
	filePathToCommits := make(map[string]map[int]bool)
	filePathToStats := make(map[string]*repositories.FileChangeFrequency)

	// Process changes
	for _, change := range changes {
		filePath := change.FilePath.String()

		// Initialize maps if needed
		if filePathToCommits[filePath] == nil {
			filePathToCommits[filePath] = make(map[int]bool)
			filePathToStats[filePath] = &repositories.FileChangeFrequency{
				FilePath: filePath,
			}
		}

		// Track commit for this file
		filePathToCommits[filePath][change.CommitID] = true

		// Accumulate line changes
		filePathToStats[filePath].TotalAdded += change.LinesAdded
		filePathToStats[filePath].TotalDeleted += change.LinesDeleted
	}

	// Calculate change counts
	var result []*repositories.FileChangeFrequency
	for filePath, stats := range filePathToStats {
		stats.ChangeCount = len(filePathToCommits[filePath])
		result = append(result, stats)
	}

	return result
}

// sortByFrequency sorts file stats by change frequency in descending order
func (ha *HotspotAnalyzer) sortByFrequency(fileStats []*repositories.FileChangeFrequency) {
	sort.Slice(fileStats, func(i, j int) bool {
		// Primary sort: by change count (descending)
		if fileStats[i].ChangeCount != fileStats[j].ChangeCount {
			return fileStats[i].ChangeCount > fileStats[j].ChangeCount
		}

		// Secondary sort: by total lines changed (descending)
		totalI := fileStats[i].TotalAdded + fileStats[i].TotalDeleted
		totalJ := fileStats[j].TotalAdded + fileStats[j].TotalDeleted

		return totalI > totalJ
	})
}
