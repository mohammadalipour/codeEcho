package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"codeecho/domain/entities"
	"codeecho/domain/repositories"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserInactive       = errors.New("user account is inactive")
	ErrEmailExists        = errors.New("email already exists")
)

// AuthService handles authentication business logic
type AuthService struct {
	authRepo repositories.AuthRepository
}

// NewAuthService creates a new authentication service
func NewAuthService(authRepo repositories.AuthRepository) *AuthService {
	return &AuthService{
		authRepo: authRepo,
	}
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginResponse represents login response
type LoginResponse struct {
	User    *entities.User `json:"user"`
	Token   string         `json:"token"`
	Refresh string         `json:"refresh_token"`
}

// Authenticate validates user credentials and returns user info
func (as *AuthService) Authenticate(email, password string) (*entities.User, error) {
	user, err := as.authRepo.GetUserByEmail(email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if !user.IsActive {
		return nil, ErrUserInactive
	}

	// Compare password with hash
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	return user, nil
}

// HashPassword creates a bcrypt hash of the password
func (as *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// CreateRefreshToken generates and stores a new refresh token
func (as *AuthService) CreateRefreshToken(userID int) (string, error) {
	// Generate random token
	tokenBytes := make([]byte, 32)
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", err
	}

	token := hex.EncodeToString(tokenBytes)

	// Hash the token before storing
	hashedToken, err := bcrypt.GenerateFromPassword([]byte(token), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	refreshToken := &entities.RefreshToken{
		UserID:    userID,
		TokenHash: string(hashedToken),
		ExpiresAt: time.Now().Add(24 * 7 * time.Hour), // 7 days
	}

	err = as.authRepo.CreateRefreshToken(refreshToken)
	if err != nil {
		return "", err
	}

	return token, nil
}

// ValidateRefreshToken validates a refresh token and returns the associated user
func (as *AuthService) ValidateRefreshToken(token string) (*entities.User, error) {
	// Get all refresh tokens and check against each one
	// Note: In production, you might want to implement a more efficient lookup
	hashedToken, err := bcrypt.GenerateFromPassword([]byte(token), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	refreshToken, err := as.authRepo.GetRefreshToken(string(hashedToken))
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	if refreshToken.IsExpired() {
		// Clean up expired token
		as.authRepo.DeleteRefreshToken(string(hashedToken))
		return nil, errors.New("refresh token expired")
	}

	user, err := as.authRepo.GetUserByID(refreshToken.UserID)
	if err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrUserInactive
	}

	return user, nil
}

// RevokeRefreshToken removes a refresh token
func (as *AuthService) RevokeRefreshToken(token string) error {
	hashedToken, err := bcrypt.GenerateFromPassword([]byte(token), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return as.authRepo.DeleteRefreshToken(string(hashedToken))
}

// RevokeAllUserTokens removes all refresh tokens for a user
func (as *AuthService) RevokeAllUserTokens(userID int) error {
	return as.authRepo.DeleteUserRefreshTokens(userID)
}
