# Build stage
FROM golang:1.24-alpine AS builder

# Install git for downloading dependencies
RUN apk add --no-cache git

WORKDIR /app

# Set Go environment variables to ensure module mode
ENV GO111MODULE=on
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org

# Copy go mod files first
COPY go.mod go.sum ./

# Ensure we're in module mode and download dependencies
RUN go mod download
RUN go mod verify

# Copy source code
COPY . .

# Debug: Show module info and verify structure
RUN go list -m
RUN go list ./...

# Clean module cache and rebuild
RUN go clean -modcache
RUN go mod download
RUN go mod tidy

# Build the CLI application with module mode explicitly enabled
RUN CGO_ENABLED=0 GOOS=linux GO111MODULE=on go build -v -o codeecho-cli ./interfaces/cli

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates git

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/codeecho-cli .

# Run the CLI application
ENTRYPOINT ["./codeecho-cli"]