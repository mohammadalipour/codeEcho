package repositories

import (
	"codeecho/domain/entities"
)

// AuthRepository defines the interface for authentication-related database operations
type AuthRepository interface {
	// User management
	GetUserByEmail(email string) (*entities.User, error)
	GetUserByID(id int) (*entities.User, error)
	CreateUser(user *entities.User) error
	UpdateUser(user *entities.User) error

	// Refresh token management
	CreateRefreshToken(token *entities.RefreshToken) error
	GetRefreshToken(tokenHash string) (*entities.RefreshToken, error)
	DeleteRefreshToken(tokenHash string) error
	DeleteUserRefreshTokens(userID int) error
}
