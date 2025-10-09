# CodeEcho Authentication Setup

This document provides a complete setup guide for the CodeEcho application with authentication using Docker.

## 🔐 Authentication Features

### Backend (Go + Gin)
- JWT authentication with refresh tokens
- HttpOnly cookies for secure token storage
- bcrypt password hashing
- Role-based access control (admin/user)
- MySQL database with user management
- Protected API routes with middleware

### Frontend (React.js)
- Login page with form validation
- Protected routes with automatic redirects
- JWT token management with automatic refresh
- User context and authentication state
- Responsive design with Tailwind CSS

## 🚀 Quick Start with Docker

### Development Environment

1. **Clone the repository** (if not already done):
```bash
git clone <repository-url>
cd codeEcho
```

2. **Start the development environment**:
```bash
docker-compose -f docker-compose.ddd.yml up --build
```

This will start:
- MySQL database on port 3306
- Go API server on port 8080
- React development server on port 3000

3. **Access the application**:
- Frontend: http://localhost:3000
- API: http://localhost:8080/api/v1
- Login with: `admin@codeecho.com` / `admin123`

### Production Environment

1. **Set environment variables**:
```bash
# Create .env file
cat > .env << EOF
MYSQL_ROOT_PASSWORD=your-secure-root-password
MYSQL_PASSWORD=your-secure-db-password
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRATION_HOURS=24
EOF
```

2. **Start production environment**:
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

3. **Access the application**:
- Frontend: http://localhost (port 80)
- API: http://localhost:8080/api/v1

## 📋 API Endpoints

### Authentication Routes
```
POST /api/v1/auth/login     - User login
POST /api/v1/auth/logout    - User logout
POST /api/v1/auth/refresh   - Refresh JWT token
GET  /api/v1/me            - Get current user info (protected)
```

### Example Login Request
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@codeecho.com",
    "password": "admin123"
  }'
```

### Example Response
```json
{
  "user": {
    "id": 1,
    "email": "admin@codeecho.com",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🗄️ Database Schema

The authentication system uses these tables:

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔧 Configuration

### Environment Variables

#### Backend (Go API)
- `DB_DSN` - MySQL connection string
- `JWT_SECRET` - Secret key for JWT signing (min 32 chars)
- `JWT_EXPIRATION_HOURS` - JWT token expiration time (default: 24)
- `GIN_MODE` - Gin framework mode (debug/release)

#### Frontend (React)
- `REACT_APP_API_URL` - Backend API base URL
- `CHOKIDAR_USEPOLLING` - Enable polling for Docker hot reload

## 🛡️ Security Features

### Backend Security
- JWT tokens with configurable expiration
- HttpOnly cookies prevent XSS attacks
- Refresh token rotation
- bcrypt password hashing (cost 10)
- CORS configuration with credentials
- Rate limiting middleware
- Request logging

### Frontend Security
- Protected routes with authentication checks
- Automatic token refresh on API calls
- Secure cookie handling
- Form validation and error handling
- XSS protection headers

## 📦 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `codeecho-mysql` | 3306 | MySQL 8.0 database |
| `codeecho-api` | 8080 | Go REST API with authentication |
| `codeecho-ui` | 3000 (dev) / 80 (prod) | React frontend |
| `nginx` | 443 (prod only) | Reverse proxy with SSL |

## 🔨 Development Commands

### Install Frontend Dependencies (using Docker)
```bash
# Install new packages
docker-compose -f docker-compose.ddd.yml exec codeecho-ui npm install package-name

# Run tests
docker-compose -f docker-compose.ddd.yml exec codeecho-ui npm test

# Build production bundle
docker-compose -f docker-compose.ddd.yml exec codeecho-ui npm run build
```

### Backend Development
```bash
# View API logs
docker-compose -f docker-compose.ddd.yml logs -f codeecho-api

# Access MySQL
docker-compose -f docker-compose.ddd.yml exec codeecho-mysql mysql -u codeecho_user -p codeecho_db

# Rebuild API only
docker-compose -f docker-compose.ddd.yml up --build codeecho-api
```

## 🧪 Testing the Authentication

### Test Login Flow
1. Visit http://localhost:3000
2. You should be redirected to login page
3. Use credentials: `admin@codeecho.com` / `admin123`
4. After successful login, you'll be redirected to dashboard
5. User info should appear in the header

### Test API Authentication
```bash
# Login and save cookies
curl -c cookies.txt -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@codeecho.com", "password": "admin123"}'

# Access protected endpoint
curl -b cookies.txt http://localhost:8080/api/v1/me

# Logout
curl -b cookies.txt -X POST http://localhost:8080/api/v1/auth/logout
```

## 🚀 Production Deployment

For production deployment:

1. Set strong passwords and JWT secrets
2. Use HTTPS with proper SSL certificates
3. Configure proper CORS origins
4. Set up database backups
5. Monitor logs and metrics
6. Use environment-specific configurations

### SSL Setup for Production
```bash
# Generate self-signed certificates (for testing)
mkdir ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=US/ST=CA/L=SF/O=CodeEcho/CN=localhost"
```

## 🔍 Troubleshooting

### Common Issues

1. **CORS errors**: Check `AllowCredentials` and origins in middleware
2. **Cookie not set**: Ensure `withCredentials: true` in frontend axios config
3. **JWT validation fails**: Verify `JWT_SECRET` matches between API instances
4. **Database connection**: Check MySQL health and connection string
5. **Hot reload not working**: Ensure `CHOKIDAR_USEPOLLING=true` in Docker

### Debug Commands
```bash
# Check container status
docker-compose -f docker-compose.ddd.yml ps

# View all logs
docker-compose -f docker-compose.ddd.yml logs

# Restart specific service
docker-compose -f docker-compose.ddd.yml restart codeecho-api
```

## 📚 Technology Stack

- **Backend**: Go 1.23, Gin, JWT, bcrypt, MySQL
- **Frontend**: React 18, React Router, Axios, Tailwind CSS
- **Database**: MySQL 8.0
- **Infrastructure**: Docker, Docker Compose, Nginx
- **Security**: JWT tokens, HttpOnly cookies, CORS, bcrypt hashing