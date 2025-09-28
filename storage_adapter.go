package main

import (
	"codeecho/internal/analyzer"
)

// StorageAdapter adapts the main Storage to the analyzer.Storage interface
type StorageAdapter struct {
	storage *Storage
}

// NewStorageAdapter creates a new storage adapter
func NewStorageAdapter(storage *Storage) *StorageAdapter {
	return &StorageAdapter{storage: storage}
}

// GetCommitsByProjectID adapts the storage method to return analyzer.Commit types
func (sa *StorageAdapter) GetCommitsByProjectID(projectID int) ([]analyzer.Commit, error) {
	commits, err := sa.storage.GetCommitsByProjectID(projectID)
	if err != nil {
		return nil, err
	}

	// Convert from main.Commit to analyzer.Commit
	analyzerCommits := make([]analyzer.Commit, len(commits))
	for i, commit := range commits {
		analyzerCommits[i] = analyzer.Commit{
			ID:        commit.ID,
			ProjectID: commit.ProjectID,
			Hash:      commit.Hash,
			Author:    commit.Author,
			Message:   commit.Message,
		}
	}

	return analyzerCommits, nil
}

// GetChangesByProjectID adapts the storage method to return analyzer.Change types
func (sa *StorageAdapter) GetChangesByProjectID(projectID int) ([]analyzer.Change, error) {
	changes, err := sa.storage.GetChangesByProjectID(projectID)
	if err != nil {
		return nil, err
	}

	// Convert from main.Change to analyzer.Change
	analyzerChanges := make([]analyzer.Change, len(changes))
	for i, change := range changes {
		analyzerChanges[i] = analyzer.Change{
			ID:           change.ID,
			CommitID:     change.CommitID,
			FilePath:     change.FilePath,
			LinesAdded:   change.LinesAdded,
			LinesDeleted: change.LinesDeleted,
		}
	}

	return analyzerChanges, nil
}
