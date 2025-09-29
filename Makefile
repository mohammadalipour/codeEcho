# CodeEcho - Makefile for Development Automation
# ==============================================================================
# This Makefile provides common development tasks for the CodeEcho project
# Usage: make <target>
# ==============================================================================

# Variables
APP_NAME = codeecho
API_PORT = 8080
UI_PORT = 3000
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
install: ## Install all dependencies (Go modules and npm packages)
	@echo "$(YELLOW)Installing Go dependencies...$(NC)"
	go mod download
	go mod tidy
	@echo "$(YELLOW)Installing frontend dependencies...$(NC)"
	cd codeecho-ui && npm install

.PHONY: build
build: build-api build-cli build-ui ## Build all components (API, CLI, and UI)

.PHONY: build-api
build-api: ## Build the API server binary
	@echo "$(YELLOW)Building API server...$(NC)"
	@mkdir -p $(BINARY_DIR)
	cd interfaces/api && go build -o ../../$(API_BINARY) .
	@echo "$(GREEN)API binary built: $(API_BINARY)$(NC)"

.PHONY: build-cli
build-cli: ## Build the CLI binary
	@echo "$(YELLOW)Building CLI...$(NC)"
	@mkdir -p $(BINARY_DIR)
	cd interfaces/cli && go build -o ../../$(CLI_BINARY) .
	@echo "$(GREEN)CLI binary built: $(CLI_BINARY)$(NC)"

.PHONY: build-ui
build-ui: ## Build the React frontend
	@echo "$(YELLOW)Building React frontend...$(NC)"
	cd codeecho-ui && npm run build
	@echo "$(GREEN)Frontend built successfully$(NC)"

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

.PHONY: run-cli
run-cli: ## Run the CLI (use ARGS="..." to pass arguments)
	@echo "$(YELLOW)Running CLI...$(NC)"
	cd interfaces/cli && go run . $(ARGS)

# ==============================================================================
# Testing
# ==============================================================================

.PHONY: test
test: test-go test-ui ## Run all tests

.PHONY: test-go
test-go: ## Run Go tests
	@echo "$(YELLOW)Running Go tests...$(NC)"
	go test -v ./...

.PHONY: test-ui
test-ui: ## Run React tests
	@echo "$(YELLOW)Running React tests...$(NC)"
	cd codeecho-ui && npm test -- --coverage --watchAll=false

.PHONY: test-integration
test-integration: ## Run integration tests
	@echo "$(YELLOW)Running integration tests...$(NC)"
	go test -tags=integration -v ./...

.PHONY: benchmark
benchmark: ## Run Go benchmarks
	@echo "$(YELLOW)Running benchmarks...$(NC)"
	go test -bench=. -benchmem ./...

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

.PHONY: db-restore
db-restore: ## Restore database from backup.sql
	@echo "$(YELLOW)Restoring database from backup...$(NC)"
	docker exec -i $(APP_NAME)-db mysql -u codeecho -pcodeecho codeecho_db < backup.sql
	@echo "$(GREEN)Database restored$(NC)"

# ==============================================================================
# Code Quality & Formatting
# ==============================================================================

.PHONY: fmt
fmt: ## Format Go code
	@echo "$(YELLOW)Formatting Go code...$(NC)"
	go fmt ./...
	@echo "$(GREEN)Code formatted$(NC)"

.PHONY: vet
vet: ## Run go vet
	@echo "$(YELLOW)Running go vet...$(NC)"
	go vet ./...

.PHONY: lint
lint: ## Run golangci-lint
	@echo "$(YELLOW)Running golangci-lint...$(NC)"
	golangci-lint run

.PHONY: lint-ui
lint-ui: ## Run ESLint on React code
	@echo "$(YELLOW)Running ESLint...$(NC)"
	cd codeecho-ui && npm run lint

.PHONY: fix-ui
fix-ui: ## Fix ESLint issues automatically
	@echo "$(YELLOW)Fixing ESLint issues...$(NC)"
	cd codeecho-ui && npm run lint:fix

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
# Development Shortcuts
# ==============================================================================

.PHONY: dev
dev: docker-up ## Start development environment
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "$(BLUE)API: http://localhost:$(API_PORT)/api/v1/health$(NC)"
	@echo "$(BLUE)UI: http://localhost:$(UI_PORT)$(NC)"

.PHONY: stop
stop: docker-down ## Stop development environment

.PHONY: restart
restart: docker-restart ## Restart development environment

.PHONY: reset
reset: clean docker-down docker-build docker-up db-reset ## Full reset (clean, rebuild, restart, reset DB)
	@echo "$(GREEN)Full reset complete!$(NC)"

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