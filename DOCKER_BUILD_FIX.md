# 🚨 Docker Build Error Fix - Complete Solution

If your friend gets the error:
```
package codeecho/infrastructure/analyzer is not in std (/usr/local/go/src/codeecho/infrastructure/analyzer)
```

## ✅ Quick Fix (Recommended)

**Run this single command:**
```bash
make fix-build
```

This will automatically:
- Stop running containers
- Clean Docker cache  
- Fix Go module issues
- Rebuild with enhanced configuration
- Start services if successful

## 🔧 Manual Fix Steps

If the quick fix doesn't work, follow these steps:

### 1. Update Dockerfiles (Already Done)
The Dockerfiles have been enhanced with:
- Explicit Go module environment variables
- Module cache cleaning
- Debug output
- Multiple verification steps

### 2. Clean Environment
```bash
# Stop everything
make docker-down

# Clean Docker cache  
docker system prune -f

# Remove old images
docker rmi codeecho-codeecho-api:latest 2>/dev/null || true
docker rmi codeecho-codeecho-cli:latest 2>/dev/null || true
```

### 3. Test Go Modules
```bash
# Test if Go modules work in Docker
docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine sh -c "
    apk add --no-cache git &&
    export GO111MODULE=on &&
    go mod download &&
    go mod verify &&
    echo 'Success!'
"
```

### 4. Rebuild
```bash
make docker-build
```

## 🚨 If Still Failing

### Common Causes & Solutions:

#### 1. **Network/Proxy Issues**
- **Symptom**: Timeout downloading Go modules
- **Solution**: 
  ```bash
  # Try with host network
  docker build --network=host -f interfaces/api/Dockerfile -t test-api .
  
  # Or configure Docker proxy in Docker Desktop settings
  ```

#### 2. **Corrupted go.sum**
- **Symptom**: Module verification fails
- **Solution**:
  ```bash
  # Regenerate go.sum
  docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine sh -c "
      apk add git && rm -f go.sum && go mod tidy
  "
  ```

#### 3. **Docker Resource Issues**
- **Symptom**: Build stops unexpectedly
- **Solution**: 
  - Increase Docker memory to 4GB+
  - Restart Docker Desktop/daemon
  - Free up disk space

#### 4. **Corporate Firewall**
- **Symptom**: Cannot reach proxy.golang.org
- **Solution**:
  ```bash
  # Configure Docker proxy settings in Docker Desktop
  # Or use internal Go proxy if available
  ```

## 📋 Validation Commands

After fixing, run these to verify everything works:

```bash
# Complete validation
./validate-docker-setup.sh

# Quick test
make docker-up
make db-create-users  
make test-auth

# Check services
curl http://localhost:8080/api/v1/health
curl http://localhost:3000
```

## 🔍 Debugging Commands

If you need to investigate further:

```bash
# Test Go build manually
docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine sh -c "
    apk add git &&
    export GO111MODULE=on &&
    go mod download &&
    go list ./... &&
    go build -v ./interfaces/api
"

# Check Docker logs
make docker-logs-api

# Check what's in the container
docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine sh -c "
    ls -la && 
    cat go.mod && 
    go version
"
```

## 📞 Still Need Help?

If none of these work, the issue might be:

1. **System-specific**: Windows/macOS/Linux differences
2. **Network configuration**: Corporate firewall/proxy
3. **Docker version**: Try updating Docker
4. **File permissions**: Run `chmod -R 755 .`

**Collect this info for further debugging:**
```bash
# System info
uname -a
docker --version
docker-compose --version

# Project info  
ls -la
cat go.mod | head -5

# Network test
docker run --rm golang:1.24-alpine sh -c "wget -O- https://proxy.golang.org"
```

## ✅ Expected Result

When working correctly, you should see:
```
🎉 Build successful!
Starting services...
Services started successfully

You can now access:
- API: http://localhost:8080/api/v1/health  
- UI: http://localhost:3000
```