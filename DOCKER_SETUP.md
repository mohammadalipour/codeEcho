# CodeEcho - Docker-Only Setup Guide

This guide shows how to set up and run the CodeEcho project using **only Docker and Make**, without requiring local Go or Node.js installations.

## Prerequisites

- **Docker** (with Docker Compose support)
- **Make** (usually pre-installed on Linux/macOS, or available via package managers)
- **Git** (to clone the repository)

That's it! No Go, Node.js, or other development tools needed locally.

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mohammadalipour/codeEcho.git
   cd codeEcho
   ```

2. **Validate your setup (optional but recommended):**
   ```bash
   ./validate-docker-setup.sh
   ```

3. **Start the complete development environment:**
   ```bash
   make docker-dev
   ```

   This single command will:
   - Build all Docker images (API, UI, CLI)
   - Start all services (API, UI, Database)
   - Set up the database with schema
   - Display service URLs

3. **Access the application:**
   - **API**: http://localhost:8080/api/v1/health
   - **UI**: http://localhost:3000
   - **Database**: mysql://localhost:3306

4. **Create default users for login (optional):**
   ```bash
   make db-create-users
   ```
   
   This creates three test users:
   - **Admin**: `admin@codeecho.com` / `admin123`
   - **Demo**: `demo@codeecho.com` / `admin123`
   - **Test**: `test@codeecho.com` / `admin123`

5. **Test the authentication system:**
   ```bash
   make test-auth
   ```

## Available Docker-Only Commands

### Core Development
```bash
make docker-dev        # Start complete development environment
make docker-build      # Build all Docker images
make docker-up         # Start all services
make docker-down       # Stop all services
make docker-restart    # Restart all services
make docker-reset      # Complete reset (rebuild + restart + reset DB)
```

### Testing
```bash
make docker-test       # Run all tests (Go + React)
make docker-test-go    # Run Go tests only
make docker-test-ui    # Run React tests only
make docker-test-integration  # Run integration tests
make docker-benchmark  # Run Go benchmarks
```

### Code Quality
```bash
make docker-quality    # Run all quality checks
make docker-fmt        # Format Go code
make docker-vet        # Run go vet
make docker-lint       # Run Go linter (golangci-lint)
make docker-lint-ui    # Run React linter (ESLint)
make docker-fix-ui     # Auto-fix ESLint issues
```

### CLI Operations
```bash
# Run CLI commands inside Docker
make docker-cli-run ARGS="analyze /path/to/repo"
make docker-cli-run ARGS="--help"

# Get shell access to CLI container
make docker-cli-shell
```

### Database Operations
```bash
make db-up                    # Start database only
make db-connect               # Connect to database
make db-schema                # Apply database schema
make db-seed                  # Seed with sample data
make db-reset                 # Reset database completely
make db-backup                # Backup to backup.sql
make db-restore               # Restore from backup.sql

# User Management
make db-create-users          # Create default users for login
make db-list-users            # List all users in database  
make db-reset-user-passwords  # Reset passwords to defaults
make test-auth                # Test authentication system
```

### Monitoring & Logs
```bash
make docker-logs       # Show all service logs
make docker-logs-api   # Show API logs only
make docker-logs-ui    # Show UI logs only  
make docker-logs-db    # Show database logs only
make docker-ps         # Show running containers
make status            # Show application status
make health            # Check application health
```

### Complete CI Pipeline
```bash
make docker-ci         # Run complete CI pipeline (quality + tests + build)
```

## Development Workflow

### 1. Initial Setup
```bash
git clone https://github.com/mohammadalipour/codeEcho.git
cd codeEcho
make docker-dev
```

### 2. Daily Development
```bash
# Start development environment
make docker-up

# Make code changes in your editor...

# Run tests
make docker-test

# Check code quality
make docker-quality

# View logs if needed
make docker-logs-api
```

### 3. Troubleshooting
```bash
# If something goes wrong, reset everything
make docker-reset

# Or just restart services
make docker-restart

# Check service status
make status
make health
```

## Project Structure

```
codeEcho/
├── interfaces/
│   ├── api/              # Go API service
│   └── cli/              # Go CLI tool
├── codeecho-ui/          # React frontend
├── domain/               # Domain logic
├── infrastructure/       # Infrastructure layer
├── docker-compose.ddd.yml # Docker Compose configuration
├── Makefile             # Development commands
└── README.md
```

## Environment Configuration

The Docker setup includes:

- **Go API** (Port 8080): Backend services
- **React UI** (Port 3000): Frontend application  
- **MySQL Database** (Port 3306): Data storage
- **CLI Tool**: Available in container for manual tasks

All services are pre-configured to work together with proper networking, health checks, and dependency management.

## Advanced Usage

### Running Individual Services
```bash
# Start only database
make db-up

# Build specific service
docker-compose -f docker-compose.ddd.yml build codeecho-api

# Run specific tests
make docker-test-go
```

### Accessing Service Containers
```bash
# API container shell
docker exec -it codeecho-api /bin/sh

# Database shell
docker exec -it codeecho-mysql mysql -u codeecho_user -p

# CLI container shell  
make docker-cli-shell
```

### Custom Configuration

Environment variables can be modified in `docker-compose.ddd.yml`:

```yaml
environment:
  - DB_DSN=codeecho_user:codeecho_pass@tcp(codeecho-mysql:3306)/codeecho_db?parseTime=true
  - JWT_SECRET=your-super-secret-jwt-key-change-in-production
  - JWT_EXPIRATION_HOURS=24
  - REACT_APP_API_URL=http://localhost:8080/api/v1
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   make docker-down
   # Wait a moment, then:
   make docker-up
   ```

2. **Build failures:**
   ```bash
   make docker-down
   docker system prune -f  # Clean Docker cache
   make docker-build
   ```

3. **Database connection issues:**
   ```bash
   make db-reset
   ```

4. **Permission issues:**
   ```bash
   sudo chown -R $USER:$USER .
   ```

### Getting Help

```bash
make help              # Show all available commands
make status            # Show current application status
make health            # Check service health
```

## Comparison: Docker-Only vs Local Development

| Task | Docker-Only Command | Local Command (requires Go/Node) |
|------|-------------------|----------------------------------|
| Start development | `make docker-dev` | `make install && make run` |
| Run tests | `make docker-test` | `make test` |
| Format code | `make docker-fmt` | `make fmt` |
| Build project | `make docker-build` | `make build` |
| Run linters | `make docker-quality` | `make lint` |

The Docker-only commands provide identical functionality without requiring local tool installation.

## Production Deployment

For production deployment, use:

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

See `docker-compose.prod.yml` for production configuration.