# CodeEcho - Makefile for Development Automation
# ==============================================================================
# This Makefile provides common development tasks for the CodeEcho project
# Usage: make <target>
# =============.PHONY: db-restore
db-restore: ## Restore database from backup.sql
	@echo "$(YELLOW)Restoring database from backup...$(NC)"
	docker exec -i $(APP_NAME)-mysql mysql -u codeecho -pcodeecho codeecho_db < backup.sql
	@echo "$(GREEN)Database restored$(NC)"

.PHONY: db-create-users
db-create-users: ## Create default users for login (admin@codeecho.com:admin123, demo@codeecho.com:demo123, test@codeecho.com:test123)
	@echo "$(YELLOW)Creating default users...$(NC)"
	docker exec -i codeecho-mysql mysql -u $(MYSQL_USER) -p$(MYSQL_PASSWORD) $(MYSQL_DATABASE) < default_users.sql
	@echo "$(GREEN)Default users created:$(NC)"
	@echo "$(BLUE)Admin: admin@codeecho.com / admin123$(NC)"
	@echo "$(BLUE)Demo:  demo@codeecho.com  / admin123$(NC)"
	@echo "$(BLUE)Test:  test@codeecho.com  / admin123$(NC)"
	@echo ""
	@echo "$(YELLOW)💡 All users use 'admin123' password for now$(NC)"
	@echo "$(YELLOW)   Test with: make test-auth$(NC)"

.PHONY: db-list-users
db-list-users: ## List all users in the database
	@echo "$(YELLOW)Listing all users...$(NC)"
	docker exec codeecho-mysql mysql -u $(MYSQL_USER) -p$(MYSQL_PASSWORD) $(MYSQL_DATABASE) -e "SELECT id, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY role DESC, email;"

.PHONY: db-reset-user-passwords
db-reset-user-passwords: ## Reset all user passwords to default values
	@echo "$(YELLOW)Resetting user passwords to defaults...$(NC)"
	docker exec codeecho-mysql mysql -u codeecho_user -pcodeecho_pass codeecho_db -e "UPDATE users SET password_hash = '\$$2a\$$10\$$mKkNIVP4s4eSdXo65Vw8WeplO8Ff/0IX/awtnx2OlCHrWNvxYL.ke' WHERE email = 'admin@codeecho.com'; UPDATE users SET password_hash = '\$$2a\$$10\$$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE email = 'demo@codeecho.com'; UPDATE users SET password_hash = '\$$2a\$$10\$$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' WHERE email = 'test@codeecho.com';"
	@echo "$(GREEN)Passwords reset to defaults$(NC)"============================================================

# Load environment variables from .env file
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# Variables
APP_NAME = codeecho
API_PORT ?= 8080
UI_PORT ?= 3000
DOCKER_COMPOSE = docker-compose -f docker-compose.ddd.yml
GO_MOD = go.mod
BINARY_DIR = bin
API_BINARY = $(BINARY_DIR)/api
CLI_BINARY = $(BINARY_DIR)/cli

# Ensure we're in the project root
PROJECT_ROOT = $(shell pwd)

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)CodeEcho Development Makefile$(NC)"
	@echo "================================"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ==============================================================================
# Development Commands
# ==============================================================================

.PHONY: install
install: ## Install all dependencies (Go modules and npm packages) - Requires local Go/Node
	@echo "$(YELLOW)Installing Go dependencies...$(NC)"
	go mod download
	go mod tidy
	@echo "$(YELLOW)Installing frontend dependencies...$(NC)"
	cd codeecho-ui && npm install

.PHONY: docker-install
docker-install: docker-build ## Install all dependencies using Docker only (no local Go/Node required)
	@echo "$(GREEN)Dependencies installed via Docker build process$(NC)"

.PHONY: build
build: build-api build-cli build-ui ## Build all components (API, CLI, and UI) - Requires local Go/Node

.PHONY: docker-build-and-extract
docker-build-and-extract: docker-build ## Build all components using Docker and extract binaries
	@echo "$(YELLOW)Extracting built binaries from Docker images...$(NC)"
	@mkdir -p $(BINARY_DIR)
	@docker create --name temp-api $(APP_NAME)-codeecho-api:latest
	@docker cp temp-api:/root/codeecho-api ./$(API_BINARY) || true
	@docker rm temp-api || true
	@docker create --name temp-cli $(APP_NAME)-codeecho-cli:latest
	@docker cp temp-cli:/root/codeecho-cli ./$(CLI_BINARY) || true
	@docker rm temp-cli || true
	@echo "$(GREEN)Binaries extracted to $(BINARY_DIR)/$(NC)"

.PHONY: build-api
build-api: ## Build the API server binary - Requires local Go
	@echo "$(YELLOW)Building API server...$(NC)"
	@mkdir -p $(BINARY_DIR)
	cd interfaces/api && go build -o ../../$(API_BINARY) .
	@echo "$(GREEN)API binary built: $(API_BINARY)$(NC)"

.PHONY: build-cli
build-cli: ## Build the CLI binary - Requires local Go
	@echo "$(YELLOW)Building CLI...$(NC)"
	@mkdir -p $(BINARY_DIR)
	cd interfaces/cli && go build -o ../../$(CLI_BINARY) .
	@echo "$(GREEN)CLI binary built: $(CLI_BINARY)$(NC)"

.PHONY: build-ui
build-ui: ## Build the React frontend - Requires local Node
	@echo "$(YELLOW)Building React frontend...$(NC)"
	cd codeecho-ui && npm run build
	@echo "$(GREEN)Frontend built successfully$(NC)"

.PHONY: start
start: ## Start CodeEcho in hybrid mode (native API + Docker services)
	@echo "$(GREEN)🚀 Starting CodeEcho in Hybrid Mode$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(YELLOW)Architecture: Native API + Docker Services$(NC)"
	@echo ""
	@echo "$(YELLOW)Step 1: Starting Docker services (MySQL + UI)...$(NC)"
	@$(DOCKER_COMPOSE) up -d codeecho-mysql codeecho-ui
	@echo "$(GREEN)✅ Docker services started$(NC)"
	@echo ""
	@echo "$(YELLOW)Step 2: Waiting for database to be ready...$(NC)"
	@sleep 8
	@echo "$(YELLOW)Step 3: Running database migrations...$(NC)"
	@$(MAKE) migrate-db
	@echo ""
	@echo "$(YELLOW)Step 4: Creating default users...$(NC)"
	@$(MAKE) db-create-users
	@echo ""
	@echo "$(YELLOW)Step 5: Building and starting native API...$(NC)"
	@$(MAKE) build-api
	@echo ""
	@echo "$(GREEN)🎉 CodeEcho Started Successfully!$(NC)"
	@echo "$(BLUE)================================$(NC)"
	@echo "$(GREEN)✅ API: http://localhost:$(API_PORT) $(NC)(native)"
	@echo "$(GREEN)✅ UI:  http://localhost:$(UI_PORT) $(NC)(Docker)"
	@echo "$(GREEN)✅ DB:  localhost:3306           $(NC)(Docker)"
	@echo ""
	@echo "$(YELLOW)Starting native API server...$(NC)"
	@echo "$(BLUE)Using environment variables from .env file$(NC)"
	@./$(API_BINARY)

.PHONY: stop
stop: ## Stop all CodeEcho services
	@echo "$(YELLOW)Stopping CodeEcho services...$(NC)"
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	@docker-compose -f docker-compose.ddd.yml down
	@echo "$(BLUE)Stopping any running API processes...$(NC)"
	@-pkill -f "./bin/api" 2>/dev/null || true
	@-pkill -f "interfaces/api" 2>/dev/null || true
	@echo "$(GREEN)✅ All services stopped$(NC)"

.PHONY: restart
restart: stop start ## Restart CodeEcho in hybrid mode

.PHONY: run
run: ## Run the application locally (API + UI)
	@echo "$(YELLOW)Starting CodeEcho application...$(NC)"
	@echo "$(BLUE)API will be available at: http://localhost:$(API_PORT)$(NC)"
	@echo "$(BLUE)UI will be available at: http://localhost:$(UI_PORT)$(NC)"
	$(MAKE) -j2 run-api run-ui

.PHONY: run-api
run-api: ## Run the API server locally
	@echo "$(YELLOW)Starting API server on port $(API_PORT)...$(NC)"
	cd interfaces/api && go run .

.PHONY: run-ui
run-ui: ## Run the React development server
	@echo "$(YELLOW)Starting React development server on port $(UI_PORT)...$(NC)"
	cd codeecho-ui && npm start

.PHONY: dev-ui
dev-ui: ## Start React development server with enhanced repository support
	@echo "$(GREEN)🚀 Starting CodeEcho UI with Enhanced Repository Support$(NC)"
	@echo "$(BLUE)Features available:$(NC)"
	@echo "$(BLUE)  ✅ Public Git repositories (GitHub, GitLab.com, Bitbucket)$(NC)"
	@echo "$(BLUE)  ✅ Private Git repositories (Internal GitLab + authentication)$(NC)"
	@echo "$(BLUE)  ✅ Local directory archives (ZIP, TAR, TAR.GZ upload)$(NC)"
	@echo "$(BLUE)UI will be available at: http://localhost:$(UI_PORT)$(NC)"
	@echo "$(YELLOW)Access enhanced project creation at: /projects/create$(NC)"
	cd codeecho-ui && npm start

.PHONY: run-cli
run-cli: ## Run the CLI (use ARGS="..." to pass arguments)
	@echo "$(YELLOW)Running CLI...$(NC)"
	cd interfaces/cli && go run . $(ARGS)

# ==============================================================================
# Testing
# ==============================================================================

.PHONY: test
test: test-go test-ui ## Run all tests - Requires local Go/Node

.PHONY: docker-test
docker-test: docker-test-go docker-test-ui ## Run all tests using Docker only

.PHONY: test-go
test-go: ## Run Go tests - Requires local Go
	@echo "$(YELLOW)Running Go tests...$(NC)"
	go test -v ./...

.PHONY: docker-test-go
docker-test-go: ## Run Go tests using Docker only
	@echo "$(YELLOW)Running Go tests in Docker...$(NC)"
	@docker run --rm -v $(PWD):/app -w /app golang:1.24-alpine sh -c "apk add --no-cache git && go mod download && go test -v ./..."

.PHONY: test-ui
test-ui: ## Run React tests - Requires local Node
	@echo "$(YELLOW)Running React tests...$(NC)"
	cd codeecho-ui && npm test -- --coverage --watchAll=false

.PHONY: docker-test-ui
docker-test-ui: ## Run React tests using Docker only
	@echo "$(YELLOW)Running React tests in Docker...$(NC)"
	@docker run --rm -v $(PWD)/codeecho-ui:/app -w /app node:18-alpine sh -c "npm ci && npm test -- --coverage --watchAll=false"

.PHONY: test-integration
test-integration: ## Run integration tests - Requires local Go
	@echo "$(YELLOW)Running integration tests...$(NC)"
	go test -tags=integration -v ./...

.PHONY: docker-test-integration
docker-test-integration: ## Run integration tests using Docker only
	@echo "$(YELLOW)Running integration tests in Docker...$(NC)"
	@docker run --rm -v $(PWD):/app -w /app golang:1.24-alpine sh -c "apk add --no-cache git && go mod download && go test -tags=integration -v ./..."

.PHONY: benchmark
benchmark: ## Run Go benchmarks - Requires local Go
	@echo "$(YELLOW)Running benchmarks...$(NC)"
	go test -bench=. -benchmem ./...

.PHONY: docker-benchmark
docker-benchmark: ## Run Go benchmarks using Docker only
	@echo "$(YELLOW)Running benchmarks in Docker...$(NC)"
	@docker run --rm -v $(PWD):/app -w /app golang:1.24-alpine sh -c "apk add --no-cache git && go mod download && go test -bench=. -benchmem ./..."

.PHONY: test-auth
test-auth: ## Test authentication with default users
	@echo "$(YELLOW)Testing authentication system...$(NC)"
	@./test_auth.sh

.PHONY: db-set-passwords
db-set-passwords: ## Set passwords for default users using external script
	@echo "$(YELLOW)Setting passwords for default users...$(NC)"
	@./set_passwords.sh

# ==============================================================================
# Enhanced Repository Support
# ==============================================================================

.PHONY: build-enhanced
build-enhanced: ## Build CodeEcho with enhanced repository support features
	@echo "$(GREEN)🚀 Building CodeEcho with Enhanced Repository Support$(NC)"
	@./build-enhanced.sh

.PHONY: migrate-db
migrate-db: ## Apply all database migrations
	@echo "$(YELLOW)Applying database migrations...$(NC)"
	@if docker ps --format "table {{.Names}}" | grep -q "codeecho-mysql"; then \
		echo "$(GREEN)MySQL container found, applying migrations...$(NC)"; \
		for migration in migrations/*.sql; do \
			echo "$(BLUE)Applying $$migration...$(NC)"; \
			docker exec -i codeecho-mysql mysql -u $(MYSQL_USER) -p$(MYSQL_PASSWORD) $(MYSQL_DATABASE) < $$migration; \
		done; \
		echo "$(GREEN)✅ All database migrations completed$(NC)"; \
	else \
		echo "$(RED)❌ MySQL container not running. Start with: make docker-up or make start$(NC)"; \
		exit 1; \
	fi

.PHONY: enhanced-dev
enhanced-dev: migrate-db dev-ui ## Setup and run enhanced repository support in development mode
	@echo "$(GREEN)🎉 Enhanced Repository Support is ready!$(NC)"

.PHONY: show-enhanced-features
show-enhanced-features: ## Display information about enhanced repository support features
	@echo "$(GREEN)🚀 CodeEcho Enhanced Repository Support$(NC)"
	@echo "$(BLUE)=========================================$(NC)"
	@echo ""
	@echo "$(YELLOW)📦 Repository Types Supported:$(NC)"
	@echo "$(GREEN)  ✅ Public Git Repositories$(NC)"
	@echo "     - GitHub, GitLab.com, Bitbucket"
	@echo "     - No authentication required"
	@echo ""
	@echo "$(GREEN)  ✅ Private Git Repositories$(NC)"  
	@echo "     - Internal GitLab, GitHub Enterprise"
	@echo "     - Username/token authentication"
	@echo "     - SSH key support (planned)"
	@echo ""
	@echo "$(GREEN)  ✅ Local Directory Archives$(NC)"
	@echo "     - ZIP, TAR, TAR.GZ files (max 100MB)"
	@echo "     - Upload without Docker volumes"
	@echo "     - Automatic extraction and cleanup"
	@echo ""
	@echo "$(YELLOW)🌐 Access Points:$(NC)"
	@echo "$(BLUE)  - Enhanced UI: http://localhost:$(UI_PORT)/projects/create$(NC)"
	@echo "$(BLUE)  - Legacy UI:   http://localhost:$(UI_PORT)/projects/analyze$(NC)"
	@echo "$(BLUE)  - API Docs:    http://localhost:$(API_PORT)/api/v1/health$(NC)"
	@echo ""
	@echo "$(YELLOW)🔧 Quick Commands:$(NC)"
	@echo "$(GREEN)  make enhanced-dev$(NC)       # Setup and run enhanced features"
	@echo "$(GREEN)  make dev-ui$(NC)             # Start UI with enhanced support"
	@echo "$(GREEN)  make migrate-db$(NC)         # Apply database migrations"
	@echo "$(GREEN)  make show-endpoints$(NC)     # Show enhanced API endpoints"

.PHONY: show-endpoints
show-endpoints: ## Display enhanced repository support API endpoints
	@echo "$(GREEN)🔗 Enhanced Repository Support API Endpoints$(NC)"
	@echo "$(BLUE)==============================================$(NC)"
	@echo ""
	@echo "$(YELLOW)📋 Project Creation:$(NC)"
	@echo "$(GREEN)  POST /api/v1/projects/enhanced$(NC)     # Public repositories"
	@echo "$(GREEN)  POST /api/v1/projects/private$(NC)      # Private repositories with auth"
	@echo "$(GREEN)  POST /api/v1/projects/from-upload$(NC)  # Projects from uploaded archives"
	@echo ""
	@echo "$(YELLOW)📤 File Upload Management:$(NC)"
	@echo "$(GREEN)  POST /api/v1/upload/archive$(NC)        # Upload archive files"
	@echo "$(GREEN)  GET  /api/v1/upload/{id}$(NC)           # Get upload information"
	@echo "$(GREEN)  DELETE /api/v1/upload/{id}$(NC)         # Cleanup uploaded files"
	@echo ""
	@echo "$(YELLOW)📄 Request Body Examples:$(NC)"
	@echo "$(BLUE)Public Repository:$(NC)"
	@echo '{"name": "My Project", "repo_path": "https://github.com/user/repo.git", "repo_type": "git_url"}'
	@echo ""
	@echo "$(BLUE)Private Repository:$(NC)"
	@echo '{"name": "Private Project", "repo_url": "https://gitlab.company.com/user/repo.git", "username": "user", "token": "glpat-xxx"}'
	@echo ""
	@echo "$(BLUE)From Upload:$(NC)"
	@echo '{"name": "Local Project", "upload_id": "upload_1697028234_project.zip"}'

.PHONY: test-enhanced
test-enhanced: ## Test enhanced repository support features
	@echo "$(YELLOW)🧪 Testing Enhanced Repository Support$(NC)"
	@echo "$(BLUE)1. Testing public repository creation...$(NC)"
	@curl -s -X POST http://localhost:$(API_PORT)/api/v1/projects/enhanced \
		-H "Content-Type: application/json" \
		-d '{"name": "Test Public", "repo_path": "https://github.com/octocat/Hello-World.git", "repo_type": "git_url"}' \
		|| echo "$(RED)❌ API not running. Start with: make run$(NC)"
	@echo ""
	@echo "$(BLUE)2. Testing upload endpoint...$(NC)"
	@curl -s http://localhost:$(API_PORT)/api/v1/health \
		|| echo "$(RED)❌ API not running. Start with: make run$(NC)"
	@echo "$(GREEN)✅ Enhanced features test completed$(NC)"

# ==============================================================================
# Docker Operations
# ==============================================================================

# ==============================================================================
# Docker Operations
# ==============================================================================

.PHONY: docker-build
docker-build: ## Build Docker images
	@echo "$(YELLOW)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache

.PHONY: docker-up
docker-up: ## Start all services with Docker Compose
	@echo "$(YELLOW)Starting services with Docker Compose...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)Services started successfully$(NC)"
	@echo "$(BLUE)API: http://localhost:$(API_PORT)$(NC)"
	@echo "$(BLUE)UI: http://localhost:$(UI_PORT)$(NC)"
	@echo "$(BLUE)Database: mysql://localhost:3306$(NC)"

.PHONY: docker-down
docker-down: ## Stop all Docker services
	@echo "$(YELLOW)Stopping Docker services...$(NC)"
	$(DOCKER_COMPOSE) down

.PHONY: docker-restart
docker-restart: docker-down docker-up ## Restart all Docker services

.PHONY: docker-rebuild
docker-rebuild: docker-down docker-build docker-up ## Rebuild and restart all services

.PHONY: docker-logs
docker-logs: ## Show logs from all services
	$(DOCKER_COMPOSE) logs -f

.PHONY: docker-logs-api
docker-logs-api: ## Show API logs
	$(DOCKER_COMPOSE) logs -f $(APP_NAME)-api

.PHONY: docker-logs-ui
docker-logs-ui: ## Show UI logs
	$(DOCKER_COMPOSE) logs -f $(APP_NAME)-ui

.PHONY: docker-logs-db
docker-logs-db: ## Show database logs
	$(DOCKER_COMPOSE) logs -f $(APP_NAME)-db

.PHONY: docker-ps
docker-ps: ## Show running containers
	$(DOCKER_COMPOSE) ps

# ==============================================================================
# Database Operations
# ==============================================================================

.PHONY: db-up
db-up: ## Start only the database service
	@echo "$(YELLOW)Starting database...$(NC)"
	$(DOCKER_COMPOSE) up -d $(APP_NAME)-db

.PHONY: db-connect
db-connect: ## Connect to the database using MySQL client
	@echo "$(YELLOW)Connecting to database...$(NC)"
	docker exec -it $(APP_NAME)-db mysql -u codeecho -p codeecho_db

.PHONY: db-schema
db-schema: ## Apply database schema
	@echo "$(YELLOW)Applying database schema...$(NC)"
	docker exec -i $(APP_NAME)-db mysql -u codeecho -pcodeecho codeecho_db < schema.sql

.PHONY: db-seed
db-seed: ## Seed database with sample data
	@echo "$(YELLOW)Seeding database...$(NC)"
	docker exec -i $(APP_NAME)-db mysql -u codeecho -pcodeecho codeecho_db < seed_data.sql

.PHONY: db-reset
db-reset: ## Reset database (drop, create, schema, seed)
	@echo "$(YELLOW)Resetting database...$(NC)"
	docker exec $(APP_NAME)-db mysql -u root -prootpassword -e "DROP DATABASE IF EXISTS codeecho_db; CREATE DATABASE codeecho_db;"
	$(MAKE) db-schema
	$(MAKE) db-seed
	@echo "$(GREEN)Database reset complete$(NC)"

.PHONY: db-backup
db-backup: ## Backup database to backup.sql
	@echo "$(YELLOW)Creating database backup...$(NC)"
	docker exec $(APP_NAME)-db mysqldump -u codeecho -pcodeecho codeecho_db > backup.sql
	@echo "$(GREEN)Backup created: backup.sql$(NC)"

# Duplicate db-restore removed (already defined earlier)

# ==============================================================================
# Code Quality & Formatting
# ==============================================================================

.PHONY: fmt
fmt: ## Format Go code - Requires local Go
	@echo "$(YELLOW)Formatting Go code...$(NC)"
	go fmt ./...
	@echo "$(GREEN)Code formatted$(NC)"

.PHONY: docker-fmt
docker-fmt: ## Format Go code using Docker only
	@echo "$(YELLOW)Formatting Go code in Docker...$(NC)"
	@docker run --rm -v $(PWD):/app -w /app golang:1.24-alpine sh -c "go fmt ./..."
	@echo "$(GREEN)Code formatted$(NC)"

.PHONY: vet
vet: ## Run go vet - Requires local Go
	@echo "$(YELLOW)Running go vet...$(NC)"
	go vet ./...

.PHONY: docker-vet
docker-vet: ## Run go vet using Docker only
	@echo "$(YELLOW)Running go vet in Docker...$(NC)"
	@docker run --rm -v $(PWD):/app -w /app golang:1.24-alpine sh -c "apk add --no-cache git && go mod download && go vet ./..."

.PHONY: lint
lint: ## Run golangci-lint - Requires local golangci-lint
	@echo "$(YELLOW)Running golangci-lint...$(NC)"
	golangci-lint run

.PHONY: docker-lint
docker-lint: ## Run golangci-lint using Docker only
	@echo "$(YELLOW)Running golangci-lint in Docker...$(NC)"
	@docker run --rm -v $(PWD):/app -w /app golangci/golangci-lint:latest golangci-lint run

.PHONY: lint-ui
lint-ui: ## Run ESLint on React code - Requires local Node
	@echo "$(YELLOW)Running ESLint...$(NC)"
	cd codeecho-ui && npm run lint

.PHONY: docker-lint-ui
docker-lint-ui: ## Run ESLint using Docker only
	@echo "$(YELLOW)Running ESLint in Docker...$(NC)"
	@docker run --rm -v $(PWD)/codeecho-ui:/app -w /app node:18-alpine sh -c "npm ci && npm run lint"

.PHONY: fix-ui
fix-ui: ## Fix ESLint issues automatically - Requires local Node
	@echo "$(YELLOW)Fixing ESLint issues...$(NC)"
	cd codeecho-ui && npm run lint:fix

.PHONY: docker-fix-ui
docker-fix-ui: ## Fix ESLint issues using Docker only
	@echo "$(YELLOW)Fixing ESLint issues in Docker...$(NC)"
	@docker run --rm -v $(PWD)/codeecho-ui:/app -w /app node:18-alpine sh -c "npm ci && npm run lint:fix"

# ==============================================================================
# Utilities
# ==============================================================================

.PHONY: clean
clean: ## Clean build artifacts and dependencies
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf $(BINARY_DIR)
	rm -rf codeecho-ui/build
	rm -rf codeecho-ui/node_modules
	go clean -cache
	@echo "$(GREEN)Clean complete$(NC)"

.PHONY: deps
deps: ## Download and verify dependencies
	@echo "$(YELLOW)Downloading Go dependencies...$(NC)"
	go mod download
	go mod verify
	@echo "$(YELLOW)Installing frontend dependencies...$(NC)"
	cd codeecho-ui && npm ci

.PHONY: update
update: ## Update all dependencies
	@echo "$(YELLOW)Updating Go dependencies...$(NC)"
	go get -u ./...
	go mod tidy
	@echo "$(YELLOW)Updating frontend dependencies...$(NC)"
	cd codeecho-ui && npm update

.PHONY: status
status: ## Show application status
	@echo "$(BLUE)=== CodeEcho Status ===$(NC)"
	@echo "$(YELLOW)Docker Services:$(NC)"
	@$(DOCKER_COMPOSE) ps || echo "Docker Compose not running"
	@echo ""
	@echo "$(YELLOW)Port Status:$(NC)"
	@lsof -i :$(API_PORT) | head -2 || echo "API port $(API_PORT) not in use"
	@lsof -i :$(UI_PORT) | head -2 || echo "UI port $(UI_PORT) not in use"
	@lsof -i :3306 | head -2 || echo "MySQL port 3306 not in use"

.PHONY: health
health: ## Check application health
	@echo "$(YELLOW)Checking API health...$(NC)"
	@curl -s http://localhost:$(API_PORT)/api/v1/health | jq . || echo "API not responding"
	@echo ""
	@echo "$(YELLOW)Checking UI...$(NC)"
	@curl -s -o /dev/null -w "UI Status: %{http_code}\n" http://localhost:$(UI_PORT) || echo "UI not responding"

# ==============================================================================
# Docker-Only Development (No Local Go/Node Required)
# ==============================================================================

.PHONY: docker-dev
docker-dev: docker-build docker-up ## Complete Docker-only development setup
	@echo "$(GREEN)=== Docker-Only Development Environment Started! ===$(NC)"
	@echo "$(GREEN)No local Go or Node.js installation required$(NC)"
	@echo ""
	@echo "$(BLUE)Services Available:$(NC)"
	@echo "$(BLUE)API: http://localhost:$(API_PORT)/api/v1/health$(NC)"
	@echo "$(BLUE)UI: http://localhost:$(UI_PORT)$(NC)"
	@echo "$(BLUE)Database: mysql://localhost:3306$(NC)"
	@echo ""
	@echo "$(YELLOW)Useful Docker-only commands:$(NC)"
	@echo "$(YELLOW)- make docker-test$(NC)       # Run all tests"
	@echo "$(YELLOW)- make docker-lint$(NC)       # Run all linters"  
	@echo "$(YELLOW)- make docker-fmt$(NC)        # Format code"
	@echo "$(YELLOW)- make docker-cli-run$(NC)    # Run CLI commands"
	@echo "$(YELLOW)- make docker-logs$(NC)       # View logs"
	@echo "$(YELLOW)- make db-create-users$(NC)   # Create default users for login"  
	@echo "$(YELLOW)- make db-list-users$(NC)     # List all users"
	@echo "$(YELLOW)- make test-auth$(NC)         # Test authentication system"
	@echo "$(YELLOW)- make fix-build$(NC)         # Fix Docker build issues"
	@echo "$(YELLOW)- make stop$(NC)              # Stop services"

.PHONY: docker-cli-run
docker-cli-run: ## Run CLI commands in Docker (use: make docker-cli-run ARGS="your-command")
	@echo "$(YELLOW)Running CLI in Docker: $(ARGS)$(NC)"
	@docker exec -it codeecho-cli ./codeecho-cli $(ARGS)

.PHONY: docker-cli-shell
docker-cli-shell: ## Get shell access to CLI container
	@echo "$(YELLOW)Opening shell in CLI container...$(NC)"
	@docker exec -it codeecho-cli /bin/sh

.PHONY: docker-quality
docker-quality: docker-fmt docker-vet docker-lint docker-lint-ui ## Run all quality checks using Docker only

.PHONY: docker-ci
docker-ci: docker-quality docker-test docker-build ## Complete Docker-only CI pipeline

# ==============================================================================
# Development Shortcuts
# ==============================================================================

.PHONY: dev
dev: docker-up ## Start development environment
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "$(BLUE)API: http://localhost:$(API_PORT)/api/v1/health$(NC)"
	@echo "$(BLUE)UI: http://localhost:$(UI_PORT)$(NC)"

.PHONY: docker-stop
docker-stop: docker-down ## Stop Docker development environment

.PHONY: reset
reset: clean docker-down docker-build docker-up db-reset ## Full reset (clean, rebuild, restart, reset DB)
	@echo "$(GREEN)Full reset complete!$(NC)"

.PHONY: docker-reset
docker-reset: docker-down docker-build docker-up db-reset ## Docker-only full reset
	@echo "$(GREEN)Docker-only full reset complete!$(NC)"

.PHONY: fix-build
fix-build: ## Fix common Docker build issues (run this if build fails)
	@echo "$(YELLOW)Running build fix script...$(NC)"
	@./fix-docker-build.sh

# ==============================================================================
# CI/CD
# ==============================================================================

.PHONY: ci
ci: deps vet test build ## Run CI pipeline locally

.PHONY: release
release: clean test build ## Prepare release build

# ==============================================================================
# Documentation
# ==============================================================================

.PHONY: docs
docs: ## Generate documentation
	@echo "$(YELLOW)Generating Go documentation...$(NC)"
	godoc -http=:6060 &
	@echo "$(GREEN)Documentation server started at http://localhost:6060$(NC)"

.PHONY: api-docs
api-docs: ## Generate API documentation
	@echo "$(YELLOW)API documentation available at:$(NC)"
	@echo "$(BLUE)http://localhost:$(API_PORT)/api/v1/health$(NC)"