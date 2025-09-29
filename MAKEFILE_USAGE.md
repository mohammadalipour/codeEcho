# CodeEcho Makefile Usage

This project includes a comprehensive Makefile to streamline development tasks. Here are the most commonly used commands:

## Quick Start

```bash
# Install all dependencies
make install

# Start development environment
make dev

# Stop development environment
make stop

# Show all available commands
make help
```

## Development Commands

### Building
- `make build` - Build all components (API, CLI, UI)
- `make build-api` - Build only the API server
- `make build-ui` - Build only the React frontend
- `make build-cli` - Build only the CLI tool

### Running
- `make run` - Run API and UI locally (development mode)
- `make run-api` - Run only the API server
- `make run-ui` - Run only the React dev server
- `make run-cli ARGS="--help"` - Run CLI with arguments

### Testing
- `make test` - Run all tests (Go + React)
- `make test-go` - Run only Go tests
- `make test-ui` - Run only React tests
- `make benchmark` - Run Go benchmarks

## Docker Operations

### Basic Docker Commands
- `make docker-up` - Start all services with Docker Compose
- `make docker-down` - Stop all Docker services
- `make docker-restart` - Restart all services
- `make docker-rebuild` - Rebuild and restart all services
- `make docker-build` - Build Docker images

### Docker Logs
- `make docker-logs` - Show logs from all services
- `make docker-logs-api` - Show only API logs
- `make docker-logs-ui` - Show only UI logs
- `make docker-logs-db` - Show only database logs

## Database Management

- `make db-up` - Start only the database
- `make db-connect` - Connect to database with MySQL client
- `make db-schema` - Apply database schema
- `make db-seed` - Seed database with sample data
- `make db-reset` - Full database reset (drop, create, schema, seed)
- `make db-backup` - Backup database to backup.sql
- `make db-restore` - Restore from backup.sql

## Code Quality

- `make fmt` - Format Go code
- `make vet` - Run go vet
- `make lint` - Run golangci-lint
- `make lint-ui` - Run ESLint on React code
- `make fix-ui` - Auto-fix ESLint issues

## Utility Commands

- `make clean` - Clean build artifacts and dependencies
- `make deps` - Download and verify dependencies
- `make update` - Update all dependencies
- `make status` - Show application status
- `make health` - Check application health endpoints

## Development Shortcuts

- `make dev` - Complete development environment setup
- `make reset` - Full reset (clean, rebuild, restart, reset DB)
- `make ci` - Run CI pipeline locally
- `make release` - Prepare release build

## Examples

```bash
# Complete setup from scratch
make clean install dev

# Debug issues
make status
make health
make docker-logs-api

# Code quality check
make fmt vet lint test

# Database maintenance
make db-backup
make db-reset
make db-seed

# Production build
make clean release
```

## Port Information

- **API Server**: http://localhost:8080
- **React UI**: http://localhost:3000  
- **MySQL Database**: localhost:3306
- **Health Check**: http://localhost:8080/api/v1/health

## Troubleshooting

1. **Docker issues**: Try `make docker-rebuild`
2. **Database connection**: Try `make db-reset`
3. **Build failures**: Try `make clean install build`
4. **Permission errors**: Ensure Docker is running and you have proper permissions

For more detailed help on any command, check the Makefile comments or run `make help`.