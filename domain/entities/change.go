package entities

import "codeecho/domain/values"

// Change represents a file change entity in the domain
type Change struct {
	ID           int
	CommitID     int
	FilePath     *values.FilePath
	LinesAdded   int
	LinesDeleted int
}

// NewChange creates a new change entity
func NewChange(commitID int, filePath *values.FilePath, linesAdded, linesDeleted int) *Change {
	return &Change{
		CommitID:     commitID,
		FilePath:     filePath,
		LinesAdded:   linesAdded,
		LinesDeleted: linesDeleted,
	}
}

// TotalLines returns the total number of lines changed (added + deleted)
func (c *Change) TotalLines() int {
	return c.LinesAdded + c.LinesDeleted
}

// NetLinesChange returns the net change in lines (added - deleted)
func (c *Change) NetLinesChange() int {
	return c.LinesAdded - c.LinesDeleted
}

// IsAddition checks if this change is primarily an addition
func (c *Change) IsAddition() bool {
	return c.LinesAdded > c.LinesDeleted
}

// IsDeletion checks if this change is primarily a deletion
func (c *Change) IsDeletion() bool {
	return c.LinesDeleted > c.LinesAdded
}

// IsSignificant checks if the change is significant (more than threshold lines)
func (c *Change) IsSignificant(threshold int) bool {
	return c.TotalLines() > threshold
}
