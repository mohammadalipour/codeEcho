package mysql

import (
	"database/sql"
	"fmt"

	"codeecho/domain/entities"
)

// AuthRepositoryImpl implements the AuthRepository interface
type AuthRepositoryImpl struct {
	db *sql.DB
}

// NewAuthRepository creates a new auth repository
func NewAuthRepository(db *sql.DB) *AuthRepositoryImpl {
	return &AuthRepositoryImpl{db: db}
}

// GetUserByEmail retrieves a user by email
func (ar *AuthRepositoryImpl) GetUserByEmail(email string) (*entities.User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, is_active, 
			   email_verified_at, created_at, updated_at 
		FROM users 
		WHERE email = ? AND is_active = 1
	`

	var user entities.User
	err := ar.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerifiedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	return &user, nil
}

// GetUserByID retrieves a user by ID
func (ar *AuthRepositoryImpl) GetUserByID(id int) (*entities.User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, is_active, 
			   email_verified_at, created_at, updated_at 
		FROM users 
		WHERE id = ? AND is_active = 1
	`

	var user entities.User
	err := ar.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerifiedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	return &user, nil
}

// CreateUser creates a new user
func (ar *AuthRepositoryImpl) CreateUser(user *entities.User) error {
	query := `
		INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	result, err := ar.db.Exec(query,
		user.Email,
		user.PasswordHash,
		user.FirstName,
		user.LastName,
		user.Role,
		user.IsActive,
	)

	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	user.ID = int(id)
	return nil
}

// UpdateUser updates user information
func (ar *AuthRepositoryImpl) UpdateUser(user *entities.User) error {
	query := `
		UPDATE users 
		SET email = ?, first_name = ?, last_name = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	_, err := ar.db.Exec(query,
		user.Email,
		user.FirstName,
		user.LastName,
		user.Role,
		user.IsActive,
		user.ID,
	)

	return err
}

// CreateRefreshToken creates a new refresh token
func (ar *AuthRepositoryImpl) CreateRefreshToken(token *entities.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES (?, ?, ?)
	`

	result, err := ar.db.Exec(query, token.UserID, token.TokenHash, token.ExpiresAt)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	token.ID = int(id)
	return nil
}

// GetRefreshToken retrieves a refresh token by hash
func (ar *AuthRepositoryImpl) GetRefreshToken(tokenHash string) (*entities.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, created_at
		FROM refresh_tokens 
		WHERE token_hash = ? AND expires_at > NOW()
	`

	var token entities.RefreshToken
	err := ar.db.QueryRow(query, tokenHash).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("refresh token not found")
		}
		return nil, err
	}

	return &token, nil
}

// DeleteRefreshToken removes a refresh token
func (ar *AuthRepositoryImpl) DeleteRefreshToken(tokenHash string) error {
	query := `DELETE FROM refresh_tokens WHERE token_hash = ?`
	_, err := ar.db.Exec(query, tokenHash)
	return err
}

// DeleteUserRefreshTokens removes all refresh tokens for a user
func (ar *AuthRepositoryImpl) DeleteUserRefreshTokens(userID int) error {
	query := `DELETE FROM refresh_tokens WHERE user_id = ?`
	_, err := ar.db.Exec(query, userID)
	return err
}
