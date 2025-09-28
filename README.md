# CodeEcho - Git Repository Analyzer

CodeEcho is a CLI application that analyzes Git repositories, extracts commit history and file changes, and stores the data in a MySQL database for further analysis.

## Features

- **Full Repository Analysis**: Extract complete commit history from any Git repository
- **Incremental Updates**: Update existing projects with new commits since last analysis
- **Database Storage**: Store commits and file changes in MySQL for querying and reporting
- **Docker Support**: Ready-to-use Docker Compose setup

## Prerequisites

- Go 1.22 or higher
- MySQL 8.0 (or use the provided Docker Compose setup)
- Git repositories to analyze

## Installation

### Using Docker Compose (Recommended)

1. Clone the repository
2. Build and start the services:
   ```bash
   docker-compose up -d
   ```

### Manual Installation

1. Install dependencies:
   ```bash
   go mod tidy
   ```

2. Set up MySQL database using the provided schema:
   ```bash
   mysql -u root -p < schema.sql
   ```

3. Build the application:
   ```bash
   go build -o codeecho
   ```

## Usage

### Database Connection

By default, CodeEcho connects to MySQL using:
```
codeecho_user:codeecho_pass@tcp(localhost:3306)/codeecho_db
```

You can override this with the `--db-dsn` flag:
```bash
./codeecho --db-dsn "user:pass@tcp(host:port)/database" <command>
```

### Commands

#### 1. Analyze a New Repository

Analyze a Git repository for the first time and store its complete history:

```bash
./codeecho analyze --repo-path /path/to/git/repo --project-name "My Project"
```

**Flags:**
- `--repo-path, -r`: Path to the Git repository (required)
- `--project-name, -n`: Name for the project (required)

**What it does:**
1. Validates the repository path
2. Creates a new project in the database
3. Extracts complete commit history and file changes
4. Stores all data in the database
5. Updates the project with the latest commit hash

#### 2. Update an Existing Project

Update an existing project with new commits since the last analysis:

```bash
./codeecho update --project-id 1
```

**Flags:**
- `--project-id, -i`: ID of the project to update (required)

**What it does:**
1. Retrieves the project from database
2. Gets new commits since the last analyzed hash
3. Stores new commits and file changes
4. Updates the project's last analyzed hash

#### 3. Analyze Code Hotspots

Identify code hotspots (frequently changed files) for a given project:

```bash
./codeecho hotspots --project-id 1
```

**Flags:**
- `--project-id, -i`: ID of the project to analyze (required)

**What it does:**
1. Retrieves all commits and changes for the project
2. Calculates change frequency for each file (number of unique commits that touched the file)
3. Identifies files with change frequency > 10 as hotspots
4. For hotspots, assigns a complexity score of 5 (placeholder for future complexity analysis)
5. Returns a list of hotspot file paths with analysis recommendations

### Examples

```bash
# Analyze a new project
./codeecho analyze -r /Users/john/myproject -n "My Awesome Project"

# Update project with ID 1
./codeecho update -i 1

# Analyze hotspots for project with ID 1
./codeecho hotspots -i 1

# Use custom database connection
./codeecho --db-dsn "root:password@tcp(localhost:3306)/mydb" analyze -r /path/to/repo -n "Project"
```

## Database Schema

The application uses three main tables:

- **projects**: Stores project information and tracking data
- **commits**: Stores commit details (hash, author, timestamp, message)
- **changes**: Stores file-level changes (path, lines added/deleted)

See `schema.sql` for the complete database structure.

## Development

### Project Structure

```
├── main.go                      # CLI application and command definitions
├── models.go                    # Database model structs
├── storage.go                   # Database operations
├── storage_adapter.go           # Adapter for analyzer package integration
├── git.go                       # Git operations using go-git
├── internal/
│   └── analyzer/
│       └── analyzer.go          # Hotspot analysis functionality
├── schema.sql                   # MySQL database schema
├── docker-compose.yml           # Docker services configuration
├── Dockerfile                   # Go application container
└── go.mod                       # Go module dependencies
```

### Key Dependencies

- **cobra**: CLI framework
- **go-git**: Git operations in pure Go
- **go-sql-driver/mysql**: MySQL database driver

### Adding New Features

1. **New Commands**: Add to `main.go` using cobra command structure
2. **Database Operations**: Extend `storage.go` with new methods
3. **Git Operations**: Enhance `git.go` for additional Git functionality
4. **Models**: Update `models.go` for new data structures

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure MySQL is running
   - Check connection string format
   - Verify user permissions

2. **Repository Not Found**
   - Ensure the path exists and is a valid Git repository
   - Check file permissions

3. **Build Issues**
   - Run `go mod tidy` to ensure dependencies are correct
   - Check Go version compatibility

### Error Messages

- `"not a Git repository"`: The specified path doesn't contain a `.git` directory
- `"project with id X not found"`: Invalid project ID provided to update command
- `"failed to connect to database"`: Database connection issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.# CodeEcho - Enhanced Version
