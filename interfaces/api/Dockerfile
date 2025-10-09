# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# 1. Copy go mod and sum files first for better layer caching
COPY go.mod go.sum ./

# 2. Tidy the modules and vendor all dependencies. This is the crucial fix.
# 'go mod tidy' ensures your go.mod file is accurate.
# 'go mod vendor' creates a 'vendor' directory with all required packages.
RUN go mod tidy
RUN go mod vendor

# 3. Copy the rest of your source code
COPY . .

# 4. Build the API application. The Go toolchain will automatically use the 'vendor' directory.
RUN CGO_ENABLED=0 GOOS=linux go build -o codeecho-api ./interfaces/api

# Final stage - This part was already correct
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the built binary from the 'builder' stage
COPY --from=builder /app/codeecho-api .

# Expose the application port
EXPOSE 8080

# Run the API application
CMD ["./codeecho-api"]