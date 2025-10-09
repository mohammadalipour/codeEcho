#!/bin/bash

echo "🔍 CodeEcho Build Diagnostics"
echo "============================="

echo -e "\n1. Checking project structure..."
if [ ! -f "go.mod" ]; then
    echo "❌ go.mod not found - you might not be in the project root"
    exit 1
fi

if [ ! -f "docker-compose.ddd.yml" ]; then
    echo "❌ docker-compose.ddd.yml not found"
    exit 1
fi

if [ ! -d "infrastructure/analyzer" ]; then
    echo "❌ infrastructure/analyzer directory missing"
    exit 1
fi

echo "✅ Basic project structure OK"

echo -e "\n2. Checking key files..."
echo "Go mod size: $(wc -c go.mod | cut -d' ' -f1) bytes"
echo "Go sum size: $(wc -c go.sum | cut -d' ' -f1) bytes"

echo -e "\n3. Checking Docker context (what gets copied)..."
echo "Project size: $(du -sh . | cut -f1)"
echo "Infrastructure analyzer files:"
find infrastructure/analyzer -type f

echo -e "\n4. Testing Go modules locally (without Docker)..."
if command -v go >/dev/null 2>&1; then
    echo "Local Go version: $(go version)"
    if go list ./infrastructure/analyzer >/dev/null 2>&1; then
        echo "✅ infrastructure/analyzer package found locally"
    else
        echo "❌ infrastructure/analyzer package not found locally"
        echo "Error: $(go list ./infrastructure/analyzer 2>&1)"
    fi
else
    echo "⚠️  Go not installed locally (Docker-only mode)"
fi

echo -e "\n5. Testing simple Docker Go build..."
docker run --rm -v $(pwd):/test -w /test golang:1.24-alpine sh -c '
    echo "Files in /test:" && 
    ls -la /test/infrastructure/analyzer/ &&
    echo "Go mod info:" &&
    head -5 /test/go.mod &&
    echo "Testing module list:" &&
    go list -m
' 2>&1

echo -e "\nDiagnostics complete!"