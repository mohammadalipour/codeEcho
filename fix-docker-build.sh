#!/bin/bash

# Quick fix script for Docker build issues
# Run this when you get "package codeecho/infrastructure/analyzer is not in std" error

echo "🔧 Safe CodeEcho Docker Build Fix"
echo "=================================="
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Safety check - make sure we're in the right project
if [ ! -f "go.mod" ] || [ ! -f "docker-compose.ddd.yml" ]; then
    echo -e "${RED}❌ Error: This script must be run from the codeEcho project root directory${NC}"
    echo "   Make sure you're in the directory with go.mod and docker-compose.ddd.yml files"
    exit 1
fi

echo -e "${YELLOW}This script will ONLY affect codeEcho containers and images${NC}"
echo -e "${GREEN}✅ Safe: Will not touch other Docker projects${NC}"
echo

# 1. Stop only codeEcho containers
echo "1. Stopping only codeEcho containers..."
docker-compose -f docker-compose.ddd.yml down 2>/dev/null || true

# 2. Remove only codeEcho related containers (if stopped)
echo "2. Removing only codeEcho containers..."
docker rm codeecho-api codeecho-cli codeecho-ui codeecho-mysql 2>/dev/null || true

# 3. Remove only codeEcho related images
echo "3. Removing only codeEcho images..."
docker rmi codeecho-codeecho-api:latest 2>/dev/null || true
docker rmi codeecho-codeecho-cli:latest 2>/dev/null || true  
docker rmi codeecho-codeecho-ui:latest 2>/dev/null || true

# 4. Fix Go modules if needed
echo "4. Cleaning Go module cache..."
if [ -f "go.sum" ]; then
    echo "   Backing up go.sum..."
    cp go.sum go.sum.backup
fi

# Test if Go modules work in Docker
echo "5. Testing Go module resolution..."
docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine sh -c "
    apk add --no-cache git &&
    export GO111MODULE=on &&
    export GOPROXY=https://proxy.golang.org,direct &&
    rm -f go.sum &&
    go mod tidy &&
    go mod download &&
    go mod verify &&
    echo 'Go modules OK'
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Go modules working${NC}"
else
    echo -e "${RED}❌ Go modules issue detected - attempting fix...${NC}"
    
    # Try to regenerate go.sum
    docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine sh -c "
        apk add --no-cache git &&
        export GO111MODULE=on &&
        rm -f go.sum &&
        go clean -modcache &&
        go mod download &&
        go mod tidy
    " 2>/dev/null || true
fi

# 6. Try the build with enhanced Dockerfiles
echo "6. Attempting Docker build with fixes..."
echo -e "${YELLOW}   This may take several minutes on first run...${NC}"

if timeout 600 make docker-build; then
    echo -e "${GREEN}🎉 Build successful!${NC}"
    echo
    echo "Starting services..."
    make docker-up
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}🎉 Everything is working!${NC}"
        echo
        echo "You can now access:"
        echo "  - API: http://localhost:8080/api/v1/health"
        echo "  - UI: http://localhost:3000"
        echo
        echo "Next steps:"
        echo "  1. Create users: make db-create-users"
        echo "  2. Test auth: make test-auth"
    else
        echo -e "${YELLOW}⚠️  Build worked but services failed to start${NC}"
        echo "Try: make docker-up"
    fi
else
    echo -e "${RED}❌ Build still failing${NC}"
    echo
    echo -e "${YELLOW}Advanced troubleshooting:${NC}"
    echo
    echo "1. Check if you're behind a corporate firewall:"
    echo "   - Configure Docker proxy settings"
    echo "   - Or try: docker build --network=host"
    echo
    echo "2. Manual build test:"
    echo "   docker run --rm -v \$(pwd):/app -w /app golang:1.24-alpine sh -c \\"
    echo "     'apk add git && export GO111MODULE=on && go mod download && \\"
    echo "      go build -v ./interfaces/api'"
    echo
    echo "3. Check Docker resources:"
    echo "   - Ensure Docker has enough memory (4GB+ recommended)"
    echo "   - Restart Docker Desktop/daemon"
    echo
    echo "4. Try step-by-step build:"
    echo "   docker build -f interfaces/api/Dockerfile -t test-api ."
    echo
    echo "If none of these work, the issue might be:"
    echo "  - Network/firewall blocking Go proxy access"
    echo "  - Docker configuration issue"
    echo "  - Local system resources"
fi

echo
echo "🔧 Fix attempt completed."