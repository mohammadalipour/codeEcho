# Build stage
FROM golang:1.24-alpine AS builder

# Install git for downloading dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Verify module structure
RUN go mod verify

# Build the CLI application
RUN CGO_ENABLED=0 GOOS=linux go build -v -o codeecho-cli ./interfaces/cli

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates git

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/codeecho-cli .

# Run the CLI application
ENTRYPOINT ["./codeecho-cli"]