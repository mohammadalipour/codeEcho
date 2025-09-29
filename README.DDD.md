# CodeEcho - DDD Architecture

CodeEcho has been refactored using **Domain-Driven Design (DDD)** and **Clean Architecture** principles, providing a robust, scalable, and maintainable codebase.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERFACE LAYER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │       CLI       │  │       API       │  │    Web UI       │  │
│  │   (Commands)    │  │  (REST/HTTP)    │  │   (Future)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │             Use Cases (Business Logic)                      │ │
│  │  • Create Project    • Analyze Repository                   │ │
│  │  • Update Project    • Calculate Hotspots                   │ │
│  │  • Get Statistics    • Export Analytics                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                                │
│  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │     Entities      │  │   Domain Services │  │ Value Objects │ │
│  │ • Project         │  │ • HotspotAnalyzer │  │ • GitHash     │ │
│  │ • Commit          │  │ • TrendCalculator │  │ • FilePath    │ │
│  │ • Change          │  │ • ImpactAssessor  │  │ • TimePeriod  │ │
│  └───────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Persistence   │  │   Git Service   │  │  External APIs  │  │
│  │    (MySQL)      │  │  (go-git)       │  │   (Future)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
codeecho/
├── 🔵 domain/                     # Domain Layer (Business Logic)
│   ├── entities/                  # Core business entities
│   ├── repositories/              # Repository interfaces
│   ├── services/                  # Domain services
│   └── values/                    # Value objects
│
├── 🟢 application/                # Application Layer (Use Cases)
│   ├── usecases/                  # Business use cases
│   ├── ports/                     # External service interfaces
│   └── dto/                       # Data transfer objects
│
├── 🔴 infrastructure/             # Infrastructure Layer
│   ├── persistence/               # Database implementations
│   ├── git/                       # Git service implementation
│   └── config/                    # Configuration
│
├── 🟡 interfaces/                 # Interface Layer
│   ├── cli/                       # Command line interface
│   ├── api/                       # REST API interface
│   └── web/                       # Web UI (future)
│
├── 🔶 shared/                     # Shared utilities
│   ├── errors/                    # Custom error types
│   ├── utils/                     # Common utilities
│   └── constants/                 # Application constants
│
├── docker-compose.ddd.yml         # Multi-service Docker setup
└── README.DDD.md                  # This file
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose -f docker-compose.ddd.yml up --build -d

# Check API health
curl http://localhost:8080/api/v1/health

# Use CLI (interactive)
docker exec -it codeecho-cli ./codeecho-cli --help
```

### Option 2: Manual Setup

```bash
# Install dependencies
go mod tidy

# Build CLI
go build -o bin/codeecho-cli ./interfaces/cli

# Build API
go build -o bin/codeecho-api ./interfaces/api

# Run API
./bin/codeecho-api

# Use CLI
./bin/codeecho-cli --help
```

## 📚 Usage Examples

### CLI Commands

```bash
# Analyze a repository
./codeecho-cli analyze --project-name "MyProject" --repo-path /path/to/repo

# Update existing project
./codeecho-cli update --project-id 1

# Get hotspots analysis
./codeecho-cli hotspots --project-id 1
```

### API Endpoints

```bash
# Health check
GET /api/v1/health

# Projects
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{id}
PUT    /api/v1/projects/{id}
DELETE /api/v1/projects/{id}

# Analytics
GET /api/v1/projects/{id}/commits
GET /api/v1/projects/{id}/hotspots
GET /api/v1/projects/{id}/stats
GET /api/v1/dashboard/stats
```

## 🔧 Development

### Adding New Features

Follow the DDD feature development flow:

```
1. 🔵 DOMAIN LAYER
   └── Define entities, value objects, domain services

2. 🟢 APPLICATION LAYER  
   └── Create use cases, define external ports

3. 🔴 INFRASTRUCTURE LAYER
   └── Implement repositories, external services

4. 🟡 INTERFACE LAYER
   └── Add CLI commands, API endpoints

5. 🧪 TESTS
   └── Unit, integration, and interface tests
```

### Example: Adding "Code Complexity Analysis"

```bash
# 1. Domain Layer
touch domain/entities/complexity.go
touch domain/services/complexity_analyzer.go

# 2. Application Layer  
touch application/usecases/analysis/calculate_complexity.go
touch application/dto/complexity_dto.go

# 3. Infrastructure Layer
touch infrastructure/persistence/mysql/complexity_repository_impl.go

# 4. Interface Layer
touch interfaces/cli/commands/complexity.go
touch interfaces/api/handlers/complexity.go
```

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `codeecho-mysql` | 3306 | MySQL database |
| `codeecho-api` | 8080 | REST API server |
| `codeecho-cli` | - | CLI tool (interactive) |

## 🎯 Benefits of This Architecture

- **🔄 Dependency Inversion**: Domain doesn't depend on infrastructure
- **🧪 Testability**: Each layer can be tested independently  
- **🔧 Maintainability**: Changes in one layer don't break others
- **📈 Scalability**: Easy to add new features or interfaces
- **🚀 Deployment**: Multiple deployment targets from single codebase
- **👥 Team Development**: Clear boundaries for team responsibilities

## 🔮 Future Enhancements

- **Web UI**: React dashboard for visualization
- **Authentication**: JWT-based API authentication  
- **Caching**: Redis for improved performance
- **Notifications**: Slack/Email integration
- **Metrics**: Prometheus monitoring
- **GraphQL**: Alternative API interface

## 🤝 Contributing

When contributing to the DDD structure:

1. Follow the layer boundaries
2. Keep domain logic pure (no external dependencies)
3. Use interfaces for external dependencies
4. Write tests for each layer
5. Update documentation for new features

---

**This DDD architecture ensures CodeEcho remains maintainable and scalable as it grows! 🚀**