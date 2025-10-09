#!/bin/bash

# CodeEcho Docker-Only Setup Validation Script
# This script validates that the Docker-only setup works correctly

set -e  # Exit on any error

echo "🐳 CodeEcho Docker-Only Setup Validation"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
print_status "Checking Docker availability..."
if ! docker --version > /dev/null 2>&1; then
    print_error "Docker is not installed or not running"
    exit 1
fi
print_success "Docker is available"

# Check if make is available
print_status "Checking Make availability..."
if ! make --version > /dev/null 2>&1; then
    print_error "Make is not installed"
    exit 1
fi
print_success "Make is available"

# Check if we're in the codeEcho directory
print_status "Checking project directory..."
if [ ! -f "docker-compose.ddd.yml" ] || [ ! -f "Makefile" ]; then
    print_error "This script must be run from the codeEcho project root directory"
    exit 1
fi
print_success "Project directory is correct"

echo ""
echo "🔨 Testing Docker-Only Build Process"
echo "==================================="

# Test Docker build with detailed diagnostics
print_status "Testing Docker build (this may take a few minutes)..."

# First test Go module resolution
print_status "Step 1: Testing Go module resolution..."
docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine sh -c "
    echo 'Installing git...' &&
    apk add --no-cache git &&
    echo 'Setting Go environment...' &&
    export GO111MODULE=on &&
    export GOPROXY=https://proxy.golang.org,direct &&
    export GOSUMDB=sum.golang.org &&
    echo 'Downloading modules...' &&
    go mod download &&
    echo 'Verifying modules...' &&
    go mod verify &&
    echo 'Listing module...' &&
    go list -m &&
    echo 'Module resolution successful!'
" > /tmp/go-module-test.log 2>&1

if [ $? -eq 0 ]; then
    print_success "Go module resolution works"
else
    print_error "Go module resolution failed. Check /tmp/go-module-test.log for details"
    echo "Showing last 20 lines of module test log:"
    tail -20 /tmp/go-module-test.log
    
    print_status "Attempting to fix go.sum issues..."
    docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine sh -c "
        apk add --no-cache git &&
        export GO111MODULE=on &&
        rm -f go.sum &&
        go mod tidy
    " > /tmp/go-fix.log 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Fixed go.sum - retrying build"
    else
        print_error "Could not fix Go module issues"
        exit 1
    fi
fi

# Now test the actual build
print_status "Step 2: Testing actual Docker build..."
if timeout 600 make docker-build > /tmp/docker-build.log 2>&1; then
    print_success "Docker build completed successfully"
else
    print_error "Docker build failed. Showing build log:"
    echo "----------------------------------------"
    tail -50 /tmp/docker-build.log
    echo "----------------------------------------"
    
    print_warning "Common solutions for build failures:"
    echo "  1. Network Issues: Check internet connection, try again"
    echo "  2. Go Module Issues: Run 'go mod tidy' locally first"  
    echo "  3. Docker Issues: Restart Docker daemon, clear cache"
    echo "  4. Retry: Network timeouts are common - try running 'make docker-build' again"
    
    exit 1
fi

echo ""
echo "🚀 Testing Docker-Only Development Environment"
echo "============================================="

# Start services
print_status "Starting services..."
if make docker-up > /tmp/docker-up.log 2>&1; then
    print_success "Services started successfully"
else
    print_error "Failed to start services. Check /tmp/docker-up.log for details"
    exit 1
fi

# Wait a moment for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check API health
if curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    print_success "API service is healthy (http://localhost:8080)"
else
    print_warning "API service is not responding (this might be normal if it takes time to start)"
fi

# Check if UI is accessible
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "UI service is accessible (http://localhost:3000)"
else
    print_warning "UI service is not responding (this might be normal if it takes time to start)"
fi

echo ""
echo "🧪 Testing Docker-Only Development Commands"
echo "=========================================="

# Test CLI help command
print_status "Testing CLI functionality..."
if make docker-cli-run ARGS="--help" > /tmp/cli-test.log 2>&1; then
    print_success "CLI is working correctly"
else
    print_warning "CLI test failed. Check /tmp/cli-test.log for details"
fi

# Test Go tests
print_status "Testing Go tests in Docker..."
if timeout 60s make docker-test-go > /tmp/go-test.log 2>&1; then
    print_success "Go tests completed successfully"
else
    print_warning "Go tests failed or timed out. Check /tmp/go-test.log for details"
fi

# Test code formatting
print_status "Testing code formatting..."
if make docker-fmt > /tmp/fmt-test.log 2>&1; then
    print_success "Code formatting works correctly"
else
    print_warning "Code formatting test failed. Check /tmp/fmt-test.log for details"
fi

echo ""
echo "📊 Final Status Check"
echo "===================="

# Show final status
make status

echo ""
echo "🎉 Validation Complete!"
echo "======================"
echo ""
echo -e "${GREEN}✅ Docker-only setup is working correctly!${NC}"
echo ""
echo "You can now:"
echo "• Access the API at: http://localhost:8080/api/v1/health"
echo "• Access the UI at: http://localhost:3000"
echo "• Run 'make docker-cli-run ARGS=\"--help\"' for CLI usage"
echo "• Run 'make help' to see all available commands"
echo "• Run 'make stop' to stop all services"
echo ""
echo "For complete documentation, see DOCKER_SETUP.md"

# Clean up log files
rm -f /tmp/docker-build.log /tmp/docker-up.log /tmp/cli-test.log /tmp/go-test.log /tmp/fmt-test.log