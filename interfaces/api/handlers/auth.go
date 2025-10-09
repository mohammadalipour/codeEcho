package handlers

import (
	"net/http"

	"codeecho/domain/services"
	"codeecho/infrastructure/database"
	"codeecho/infrastructure/persistence/mysql"
	infraServices "codeecho/infrastructure/services"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	authService *services.AuthService
	jwtService  *infraServices.JWTService
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler() *AuthHandler {
	authRepo := mysql.NewAuthRepository(database.DB)
	authService := services.NewAuthService(authRepo)
	jwtService := infraServices.NewJWTService()

	return &AuthHandler{
		authService: authService,
		jwtService:  jwtService,
	}
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	User struct {
		ID        int    `json:"id"`
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
	} `json:"user"`
	Token string `json:"token"`
}

// Login handles user authentication
func (ah *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	// Authenticate user
	user, err := ah.authService.Authenticate(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := ah.jwtService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Create refresh token
	refreshToken, err := ah.authService.CreateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create refresh token"})
		return
	}

	// Prepare response
	response := LoginResponse{
		User: struct {
			ID        int    `json:"id"`
			Email     string `json:"email"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Role      string `json:"role"`
		}{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Role:      user.Role,
		},
		Token: token,
	}

	// Set HTTP-only cookie for refresh token
	c.SetCookie(
		"refresh_token", // name
		refreshToken,    // value
		7*24*60*60,      // max age (7 days in seconds)
		"/",             // path
		"",              // domain (empty for current domain)
		false,           // secure (set to true in production with HTTPS)
		true,            // httpOnly
	)

	// Set HTTP-only cookie for JWT token as well (for extra security)
	c.SetCookie(
		"auth_token", // name
		token,        // value
		24*60*60,     // max age (24 hours in seconds)
		"/",          // path
		"",           // domain
		false,        // secure (set to true in production)
		true,         // httpOnly
	)

	c.JSON(http.StatusOK, response)
}

// Me returns current user information
func (ah *AuthHandler) Me(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get user from context or fetch from database
	userEmail, _ := c.Get("userEmail")
	userRole, _ := c.Get("userRole")
	userName, _ := c.Get("userName")

	response := gin.H{
		"id":    userID,
		"email": userEmail,
		"role":  userRole,
		"name":  userName,
	}

	c.JSON(http.StatusOK, gin.H{"user": response})
}

// Logout handles user logout
func (ah *AuthHandler) Logout(c *gin.Context) {
	// Get refresh token from cookie
	refreshToken, err := c.Cookie("refresh_token")
	if err == nil && refreshToken != "" {
		// Revoke the refresh token
		ah.authService.RevokeRefreshToken(refreshToken)
	}

	// Clear cookies
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)
	c.SetCookie("auth_token", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// RefreshToken handles token refresh
func (ah *AuthHandler) RefreshToken(c *gin.Context) {
	// Get refresh token from cookie
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token not found"})
		return
	}

	// Validate refresh token and get user
	user, err := ah.authService.ValidateRefreshToken(refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
		return
	}

	// Generate new JWT token
	newToken, err := ah.jwtService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate new token"})
		return
	}

	// Create new refresh token
	newRefreshToken, err := ah.authService.CreateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create new refresh token"})
		return
	}

	// Revoke old refresh token
	ah.authService.RevokeRefreshToken(refreshToken)

	// Set new cookies
	c.SetCookie("refresh_token", newRefreshToken, 7*24*60*60, "/", "", false, true)
	c.SetCookie("auth_token", newToken, 24*60*60, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"token": newToken,
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"role":       user.Role,
		},
	})
}
