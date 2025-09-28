package git

import (
	"fmt"
	"time"

	"codeecho/internal/model"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// GitRepo represents a Git repository wrapper
type GitRepo struct {
	repo *git.Repository
}

// OpenRepo opens an existing local Git repository at the given path
func OpenRepo(repoPath string) (*GitRepo, error) {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository at %s: %w", repoPath, err)
	}

	return &GitRepo{repo: repo}, nil
}

// GetCommitLogs retrieves commit history and file changes from a Git repository
func GetCommitLogs(repoPath string, fromHash string) ([]model.Commit, []model.Change, error) {
	gitRepo, err := OpenRepo(repoPath)
	if err != nil {
		return nil, nil, err
	}

	// Get commit iterator
	var commitIter object.CommitIter
	if fromHash == "" {
		// Get all commits from HEAD
		ref, err := gitRepo.repo.Head()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get HEAD reference: %w", err)
		}

		commitIter, err = gitRepo.repo.Log(&git.LogOptions{From: ref.Hash()})
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get commit logs: %w", err)
		}
	} else {
		// Get commits starting from specific hash
		hash := plumbing.NewHash(fromHash)
		commitIter, err = gitRepo.repo.Log(&git.LogOptions{From: hash})
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get commit logs from hash %s: %w", fromHash, err)
		}
	}
	defer commitIter.Close()

	var commits []model.Commit
	var changes []model.Change
	commitIndex := 0

	// Iterate through commits
	err = commitIter.ForEach(func(commit *object.Commit) error {
		// Skip the starting commit if fromHash is provided
		if fromHash != "" && commit.Hash.String() == fromHash {
			return nil
		}

		// Create Commit struct
		gitCommit := model.Commit{
			Hash:      commit.Hash.String(),
			Author:    commit.Author.Name,
			Timestamp: commit.Author.When,
			Message:   &commit.Message,
			CreatedAt: time.Now(),
		}
		commits = append(commits, gitCommit)

		// Get file changes for this commit
		commitChanges, err := getCommitChanges(commit, commitIndex)
		if err != nil {
			return fmt.Errorf("failed to get changes for commit %s: %w", commit.Hash.String(), err)
		}

		changes = append(changes, commitChanges...)
		commitIndex++
		return nil
	})

	if err != nil {
		return nil, nil, fmt.Errorf("error iterating commits: %w", err)
	}

	return commits, changes, nil
}

// getCommitChanges extracts file changes from a commit
func getCommitChanges(commit *object.Commit, commitIndex int) ([]model.Change, error) {
	var changes []model.Change

	// Get the commit's tree
	tree, err := commit.Tree()
	if err != nil {
		return nil, fmt.Errorf("failed to get commit tree: %w", err)
	}

	// Get parent commit for comparison
	var parentTree *object.Tree
	if commit.NumParents() > 0 {
		parent, err := commit.Parents().Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get parent commit: %w", err)
		}

		parentTree, err = parent.Tree()
		if err != nil {
			return nil, fmt.Errorf("failed to get parent tree: %w", err)
		}
	}

	// Compare trees to get changes
	changesPatch, err := parentTree.Diff(tree)
	if err != nil {
		return nil, fmt.Errorf("failed to diff trees: %w", err)
	}

	// Process each file change
	for _, change := range changesPatch {
		// Get file stats
		stats, err := getFileStats(change)
		if err != nil {
			// Continue processing other files even if one fails
			continue
		}

		fileChange := model.Change{
			// CommitID will be set later when we know the database ID
			FilePath:     getFilePath(change),
			LinesAdded:   stats.Addition,
			LinesDeleted: stats.Deletion,
		}

		changes = append(changes, fileChange)
	}

	return changes, nil
}

// FileStats represents the statistics of a file change
type FileStats struct {
	Addition int
	Deletion int
}

// getFileStats calculates lines added and deleted for a file change
func getFileStats(change *object.Change) (FileStats, error) {
	patch, err := change.Patch()
	if err != nil {
		return FileStats{}, err
	}

	stats := patch.Stats()
	if len(stats) == 0 {
		return FileStats{}, nil
	}

	return FileStats{
		Addition: stats[0].Addition,
		Deletion: stats[0].Deletion,
	}, nil
}

// getFilePath extracts the file path from a change
func getFilePath(change *object.Change) string {
	if change.To.Name != "" {
		return change.To.Name
	}
	if change.From.Name != "" {
		return change.From.Name
	}
	return "unknown"
}

// GetLatestCommitHash returns the hash of the latest commit
func (gr *GitRepo) GetLatestCommitHash() (string, error) {
	ref, err := gr.repo.Head()
	if err != nil {
		return "", fmt.Errorf("failed to get HEAD reference: %w", err)
	}

	return ref.Hash().String(), nil
}
