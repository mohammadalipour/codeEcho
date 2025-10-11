package mysql

import (
	"database/sql"
	"fmt"
	"log"

	"codeecho/domain/entities"
	"codeecho/domain/repositories"
	"codeecho/domain/values"
	"codeecho/infrastructure/persistence/models"

	_ "github.com/go-sql-driver/mysql"
)

// ProjectRepositoryImpl implements the ProjectRepository interface
type ProjectRepositoryImpl struct {
	db *sql.DB
}

// NewProjectRepository creates a new project repository implementation
func NewProjectRepository(db *sql.DB) repositories.ProjectRepository {
	return &ProjectRepositoryImpl{db: db}
}

// Create creates a new project
func (r *ProjectRepositoryImpl) Create(project *entities.Project) error {
	query := `
		INSERT INTO projects (name, repo_path, repo_type, auth_username, auth_token, auth_ssh_key, last_analyzed_hash, created_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	var lastAnalyzedHash *string
	if project.LastAnalyzedHash != nil {
		hashStr := project.LastAnalyzedHash.String()
		lastAnalyzedHash = &hashStr
	}

	var authUsername, authToken, authSSHKey *string
	if project.AuthConfig != nil {
		if project.AuthConfig.Username != "" {
			authUsername = &project.AuthConfig.Username
		}
		if project.AuthConfig.Token != "" {
			authToken = &project.AuthConfig.Token
		}
		if project.AuthConfig.SSHKey != "" {
			authSSHKey = &project.AuthConfig.SSHKey
		}
	}

	result, err := r.db.Exec(query,
		project.Name,
		project.RepoPath,
		string(project.RepoType),
		authUsername,
		authToken,
		authSSHKey,
		lastAnalyzedHash,
		project.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create project: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %w", err)
	}

	project.ID = int(id)
	return nil
}

// GetByID retrieves a project by its ID
func (r *ProjectRepositoryImpl) GetByID(id int) (*entities.Project, error) {
	query := `
		SELECT id, name, repo_path, repo_type, auth_username, auth_token, auth_ssh_key, last_analyzed_hash, created_at 
		FROM projects 
		WHERE id = ?
	`

	var model models.ProjectModel
	err := r.db.QueryRow(query, id).Scan(
		&model.ID,
		&model.Name,
		&model.RepoPath,
		&model.RepoType,
		&model.AuthUsername,
		&model.AuthToken,
		&model.AuthSSHKey,
		&model.LastAnalyzedHash,
		&model.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("project with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to get project by id: %w", err)
	}

	return r.modelToEntity(&model)
}

// GetByName retrieves a project by its name
func (r *ProjectRepositoryImpl) GetByName(name string) (*entities.Project, error) {
	query := `
		SELECT id, name, repo_path, repo_type, auth_username, auth_token, auth_ssh_key, last_analyzed_hash, created_at 
		FROM projects 
		WHERE name = ?
	`

	var model models.ProjectModel
	err := r.db.QueryRow(query, name).Scan(
		&model.ID,
		&model.Name,
		&model.RepoPath,
		&model.RepoType,
		&model.AuthUsername,
		&model.AuthToken,
		&model.AuthSSHKey,
		&model.LastAnalyzedHash,
		&model.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("project with name '%s' not found", name)
		}
		return nil, fmt.Errorf("failed to get project by name: %w", err)
	}

	return r.modelToEntity(&model)
}

// GetAll retrieves all projects
func (r *ProjectRepositoryImpl) GetAll() ([]*entities.Project, error) {
	query := `
		SELECT id, name, repo_path, repo_type, auth_username, auth_token, auth_ssh_key, last_analyzed_hash, created_at 
		FROM projects 
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var projects []*entities.Project
	for rows.Next() {
		var model models.ProjectModel
		err := rows.Scan(
			&model.ID,
			&model.Name,
			&model.RepoPath,
			&model.RepoType,
			&model.AuthUsername,
			&model.AuthToken,
			&model.AuthSSHKey,
			&model.LastAnalyzedHash,
			&model.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}

		entity, err := r.modelToEntity(&model)
		if err != nil {
			return nil, err
		}

		projects = append(projects, entity)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating projects: %w", err)
	}

	return projects, nil
}

// Update updates an existing project
func (r *ProjectRepositoryImpl) Update(project *entities.Project) error {
	query := `
		UPDATE projects 
		SET name = ?, repo_path = ?, last_analyzed_hash = ? 
		WHERE id = ?
	`

	var lastAnalyzedHash *string
	if project.LastAnalyzedHash != nil {
		hashStr := project.LastAnalyzedHash.String()
		lastAnalyzedHash = &hashStr
	}

	_, err := r.db.Exec(query, project.Name, project.RepoPath, lastAnalyzedHash, project.ID)
	if err != nil {
		return fmt.Errorf("failed to update project: %w", err)
	}

	return nil
}

// Delete deletes a project by ID
func (r *ProjectRepositoryImpl) Delete(id int) error {
	// Start transaction to handle cascade deletion
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete related changes first (due to foreign key constraints)
	if _, err := tx.Exec("DELETE FROM changes WHERE commit_id IN (SELECT id FROM commits WHERE project_id = ?)", id); err != nil {
		return fmt.Errorf("failed to delete project changes: %w", err)
	}

	// Delete related commits
	if _, err := tx.Exec("DELETE FROM commits WHERE project_id = ?", id); err != nil {
		return fmt.Errorf("failed to delete project commits: %w", err)
	}

	// Delete the project
	result, err := tx.Exec("DELETE FROM projects WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project with ID %d not found", id)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// UpdateLastAnalyzedHash updates the last analyzed hash for a project
func (r *ProjectRepositoryImpl) UpdateLastAnalyzedHash(projectID int, hash string) error {
	query := `UPDATE projects SET last_analyzed_hash = ? WHERE id = ?`

	_, err := r.db.Exec(query, hash, projectID)
	if err != nil {
		return fmt.Errorf("failed to update last analyzed hash: %w", err)
	}

	return nil
}

// modelToEntity converts a database model to a domain entity
func (r *ProjectRepositoryImpl) modelToEntity(model *models.ProjectModel) (*entities.Project, error) {
	var lastAnalyzedHash *values.GitHash
	if model.LastAnalyzedHash != nil && *model.LastAnalyzedHash != "" {
		if hash, err := values.NewGitHash(*model.LastAnalyzedHash); err != nil {
			// Log and continue instead of failing whole request
			log.Printf("warning: ignoring invalid git hash for project %d: %s (%v)", model.ID, *model.LastAnalyzedHash, err)
		} else {
			lastAnalyzedHash = hash
		}
	}

	// Convert repository type
	repoType := entities.RepoTypeGitURL // Default
	switch model.RepoType {
	case "local_dir":
		repoType = entities.RepoTypeLocalDir
	case "private_git":
		repoType = entities.RepoTypePrivateGit
	case "git_url":
		repoType = entities.RepoTypeGitURL
	}

	// Build auth config if present
	var authConfig *entities.GitAuthConfig
	if model.AuthUsername != nil || model.AuthToken != nil || model.AuthSSHKey != nil {
		authConfig = &entities.GitAuthConfig{}
		if model.AuthUsername != nil {
			authConfig.Username = *model.AuthUsername
		}
		if model.AuthToken != nil {
			authConfig.Token = *model.AuthToken
		}
		if model.AuthSSHKey != nil {
			authConfig.SSHKey = *model.AuthSSHKey
		}
	}

	return &entities.Project{
		ID:               model.ID,
		Name:             model.Name,
		RepoPath:         model.RepoPath,
		RepoType:         repoType,
		AuthConfig:       authConfig,
		LastAnalyzedHash: lastAnalyzedHash,
		CreatedAt:        model.CreatedAt,
	}, nil
}
