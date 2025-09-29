package git

import (
	"fmt"
	"time"

	"codeecho/application/ports"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// GitServiceImpl implements the GitService port
type GitServiceImpl struct{}

// NewGitService creates a new git service implementation
func NewGitService() ports.GitService {
	return &GitServiceImpl{}
}

// ValidateRepository checks if the path is a valid git repository
func (gs *GitServiceImpl) ValidateRepository(repoPath string) error {
	_, err := git.PlainOpen(repoPath)
	if err != nil {
		return fmt.Errorf("invalid git repository at %s: %w", repoPath, err)
	}
	return nil
}

// GetCommits retrieves commits from a git repository
func (gs *GitServiceImpl) GetCommits(repoPath string) ([]*ports.GitCommit, error) {
	return gs.getCommitsFromHash(repoPath, "")
}

// GetCommitsSince retrieves commits since a specific hash
func (gs *GitServiceImpl) GetCommitsSince(repoPath string, sinceHash string) ([]*ports.GitCommit, error) {
	return gs.getCommitsFromHash(repoPath, sinceHash)
}

// getCommitsFromHash is a helper method to get commits from a specific hash or from the beginning
func (gs *GitServiceImpl) getCommitsFromHash(repoPath string, fromHash string) ([]*ports.GitCommit, error) {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository at %s: %w", repoPath, err)
	}

	// Get commit iterator
	var commitIter object.CommitIter
	if fromHash == "" {
		// Get all commits from HEAD
		ref, err := repo.Head()
		if err != nil {
			return nil, fmt.Errorf("failed to get HEAD reference: %w", err)
		}

		commitIter, err = repo.Log(&git.LogOptions{From: ref.Hash()})
		if err != nil {
			return nil, fmt.Errorf("failed to get commit logs: %w", err)
		}
	} else {
		// Get commits starting from specific hash
		hash := plumbing.NewHash(fromHash)
		commitIter, err = repo.Log(&git.LogOptions{From: hash})
		if err != nil {
			return nil, fmt.Errorf("failed to get commit logs from %s: %w", fromHash, err)
		}
	}
	defer commitIter.Close()

	var gitCommits []*ports.GitCommit
	var skipFirst bool = fromHash != "" // Skip the first commit if we're getting commits since a hash

	err = commitIter.ForEach(func(commit *object.Commit) error {
		if skipFirst {
			skipFirst = false
			return nil
		}

		// Get file changes for this commit
		changes, err := gs.getCommitChanges(commit)
		if err != nil {
			return fmt.Errorf("failed to get changes for commit %s: %w", commit.Hash.String(), err)
		}

		gitCommit := &ports.GitCommit{
			Hash:      commit.Hash.String(),
			Author:    commit.Author.Name,
			Timestamp: commit.Author.When.Format(time.RFC3339),
			Message:   commit.Message,
			Changes:   changes,
		}

		gitCommits = append(gitCommits, gitCommit)
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to iterate over commits: %w", err)
	}

	return gitCommits, nil
}

// getCommitChanges gets file changes for a specific commit
func (gs *GitServiceImpl) getCommitChanges(commit *object.Commit) ([]*ports.GitChange, error) {
	var changes []*ports.GitChange

	// Get parent commit for comparison
	parents := commit.Parents()
	parent, err := parents.Next()
	if err != nil {
		// This is likely the first commit (no parent), so we'll compare against an empty tree
		return gs.getChangesFromFirstCommit(commit)
	}

	// Get file changes between parent and current commit
	parentTree, err := parent.Tree()
	if err != nil {
		return nil, fmt.Errorf("failed to get parent tree: %w", err)
	}

	currentTree, err := commit.Tree()
	if err != nil {
		return nil, fmt.Errorf("failed to get current tree: %w", err)
	}

	changelist, err := parentTree.Diff(currentTree)
	if err != nil {
		return nil, fmt.Errorf("failed to get diff: %w", err)
	}

	for _, change := range changelist {
		from, to, err := change.Files()
		if err != nil {
			continue // Skip files we can't process
		}

		filePath := ""
		var linesAdded, linesDeleted int

		switch {
		case from == nil && to != nil:
			// File added
			filePath = change.To.Name
			linesAdded, _ = gs.countLines(to)
		case from != nil && to == nil:
			// File deleted
			filePath = change.From.Name
			linesDeleted, _ = gs.countLines(from)
		case from != nil && to != nil:
			// File modified
			filePath = change.To.Name
			linesAdded, linesDeleted = gs.getDiffStats(from, to)
		}

		if filePath != "" {
			changes = append(changes, &ports.GitChange{
				FilePath:     filePath,
				LinesAdded:   linesAdded,
				LinesDeleted: linesDeleted,
			})
		}
	}

	return changes, nil
}

// getChangesFromFirstCommit handles the first commit (no parent)
func (gs *GitServiceImpl) getChangesFromFirstCommit(commit *object.Commit) ([]*ports.GitChange, error) {
	var changes []*ports.GitChange

	tree, err := commit.Tree()
	if err != nil {
		return nil, fmt.Errorf("failed to get tree: %w", err)
	}

	err = tree.Files().ForEach(func(file *object.File) error {
		linesAdded, _ := gs.countLines(file)
		changes = append(changes, &ports.GitChange{
			FilePath:     file.Name,
			LinesAdded:   linesAdded,
			LinesDeleted: 0, // No deletions in first commit
		})
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to iterate over files: %w", err)
	}

	return changes, nil
}

// countLines counts the number of lines in a file
func (gs *GitServiceImpl) countLines(file *object.File) (int, error) {
	content, err := file.Contents()
	if err != nil {
		return 0, err
	}

	lines := 0
	for _, char := range content {
		if char == '\n' {
			lines++
		}
	}

	// Add 1 if the file doesn't end with a newline but has content
	if len(content) > 0 && content[len(content)-1] != '\n' {
		lines++
	}

	return lines, nil
}

// getDiffStats calculates lines added and deleted between two files
func (gs *GitServiceImpl) getDiffStats(from, to *object.File) (int, int) {
	// This is a simplified implementation
	// In a real implementation, you'd use a proper diff algorithm

	fromContent, err := from.Contents()
	if err != nil {
		return 0, 0
	}

	toContent, err := to.Contents()
	if err != nil {
		return 0, 0
	}

	fromLines := gs.countLinesInString(fromContent)
	toLines := gs.countLinesInString(toContent)

	if toLines > fromLines {
		return toLines - fromLines, 0
	} else if fromLines > toLines {
		return 0, fromLines - toLines
	}

	// If same number of lines, assume some were modified
	return toLines / 10, toLines / 10 // Rough estimate
}

// countLinesInString counts lines in a string
func (gs *GitServiceImpl) countLinesInString(content string) int {
	lines := 0
	for _, char := range content {
		if char == '\n' {
			lines++
		}
	}
	if len(content) > 0 && content[len(content)-1] != '\n' {
		lines++
	}
	return lines
}
