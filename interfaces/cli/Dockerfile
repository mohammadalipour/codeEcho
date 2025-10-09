# Build stage
FROM golang:1.24-alpine AS builder

# Install git and ca-certificates for downloading dependencies
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Set Go environment variables to ensure module mode
ENV GO111MODULE=on
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org
ENV CGO_ENABLED=0
ENV GOOS=linux

# Copy go mod files first
COPY go.mod go.sum ./

# Download dependencies with better error handling
RUN go mod download -x
RUN go mod verify

# Copy source code (make sure .dockerignore doesn't exclude needed files)
COPY . .

# Verify the module and packages exist before building
RUN echo "Module info:" && go list -m
RUN echo "Available packages:" && go list -f '{{.ImportPath}}' ./...

# Build the CLI application
RUN go build -v -a -installsuffix cgo -o codeecho-cli ./interfaces/cli

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates git

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/codeecho-cli .

# Run the CLI application
ENTRYPOINT ["./codeecho-cli"]