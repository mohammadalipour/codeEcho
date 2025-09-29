package values

import (
	"errors"
	"path/filepath"
	"strings"
)

// FilePath represents a file path value object
type FilePath struct {
	value string
}

// NewFilePath creates a new FilePath value object
func NewFilePath(path string) (*FilePath, error) {
	if err := validateFilePath(path); err != nil {
		return nil, err
	}

	// Clean the path
	cleanPath := filepath.Clean(path)

	return &FilePath{value: cleanPath}, nil
}

// String returns the string representation of the file path
func (fp *FilePath) String() string {
	return fp.value
}

// IsEmpty checks if the file path is empty
func (fp *FilePath) IsEmpty() bool {
	return fp.value == ""
}

// GetExtension returns the file extension
func (fp *FilePath) GetExtension() string {
	return filepath.Ext(fp.value)
}

// GetFileName returns just the filename without the directory
func (fp *FilePath) GetFileName() string {
	return filepath.Base(fp.value)
}

// GetDirectory returns the directory part of the path
func (fp *FilePath) GetDirectory() string {
	return filepath.Dir(fp.value)
}

// IsCodeFile checks if the file is a code file based on extension
func (fp *FilePath) IsCodeFile() bool {
	codeExtensions := []string{".go", ".js", ".ts", ".py", ".java", ".cpp", ".c", ".h", ".cs", ".php", ".rb", ".swift", ".kt", ".rs"}
	ext := strings.ToLower(fp.GetExtension())

	for _, codeExt := range codeExtensions {
		if ext == codeExt {
			return true
		}
	}

	return false
}

// Equals compares two FilePath objects
func (fp *FilePath) Equals(other *FilePath) bool {
	if other == nil {
		return false
	}
	return fp.value == other.value
}

// validateFilePath validates if the provided string is a valid file path
func validateFilePath(path string) error {
	if path == "" {
		return errors.New("file path cannot be empty")
	}

	// Check for invalid characters (basic validation)
	if strings.Contains(path, "\x00") {
		return errors.New("file path contains invalid null character")
	}

	return nil
}
