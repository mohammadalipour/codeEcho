package values

import (
	"errors"
	"regexp"
)

// GitHash represents a Git commit hash value object
type GitHash struct {
	value string
}

// NewGitHash creates a new GitHash value object
func NewGitHash(hash string) (*GitHash, error) {
	if err := validateGitHash(hash); err != nil {
		return nil, err
	}

	return &GitHash{value: hash}, nil
}

// String returns the string representation of the hash
func (gh *GitHash) String() string {
	return gh.value
}

// IsEmpty checks if the hash is empty
func (gh *GitHash) IsEmpty() bool {
	return gh.value == ""
}

// Equals compares two GitHash objects
func (gh *GitHash) Equals(other *GitHash) bool {
	if other == nil {
		return false
	}
	return gh.value == other.value
}

// validateGitHash validates if the provided string is a valid git hash
func validateGitHash(hash string) error {
	if hash == "" {
		return errors.New("git hash cannot be empty")
	}

	// Git SHA-1 hash is 40 characters long, hexadecimal
	matched, err := regexp.MatchString("^[a-fA-F0-9]{40}$", hash)
	if err != nil {
		return err
	}

	if !matched {
		return errors.New("invalid git hash format")
	}

	return nil
}
