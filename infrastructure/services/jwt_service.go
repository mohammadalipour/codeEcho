package services

import (
	"errors"
	"os"
	"strconv"
	"time"

	"codeecho/domain/entities"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
)

// JWTService handles JWT token operations
type JWTService struct {
	secret     []byte
	expiration time.Duration
}

// Claims represents JWT claims
type Claims struct {
	UserID    int    `json:"user_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	jwt.RegisteredClaims
}

// NewJWTService creates a new JWT service
func NewJWTService() *JWTService {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key-change-in-production" // Default for development
	}

	expirationStr := os.Getenv("JWT_EXPIRATION_HOURS")
	expiration := 24 * time.Hour // Default 24 hours

	if expirationStr != "" {
		if hours, err := strconv.Atoi(expirationStr); err == nil {
			expiration = time.Duration(hours) * time.Hour
		}
	}

	return &JWTService{
		secret:     []byte(secret),
		expiration: expiration,
	}
}

// GenerateToken creates a new JWT token for a user
func (js *JWTService) GenerateToken(user *entities.User) (string, error) {
	claims := Claims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(js.expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   strconv.Itoa(user.ID),
			Issuer:    "codeecho",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(js.secret)
}

// ValidateToken validates and parses a JWT token
func (js *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return js.secret, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// RefreshToken generates a new token from valid claims
func (js *JWTService) RefreshToken(user *entities.User) (string, error) {
	return js.GenerateToken(user)
}
