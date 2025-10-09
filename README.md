# CodeEcho - Git Repository Analytics Platform

> **🎉 NEW: Complete DDD Architecture + React Dashboard!**

CodeEcho is now a **complete Git analytics platform** with a modern **Domain-Driven Design (DDD)** backend and beautiful **React dashboard** for visualizing your repository insights.

## 🏗️ **Architecture**

Built with **Clean Architecture** principles:
- **🔵 Domain Layer**: Pure business logic
- **🟢 Application Layer**: Use cases and orchestration
- **🔴 Infrastructure Layer**: Database, Git services, external APIs
- **🟡 Interface Layer**: CLI tool + REST API + React UI

## ✨ **Features**

### **Git Analytics**
- **📊 Repository Analysis**: Complete commit history extraction
- **🔥 Code Hotspots**: Identify frequently changed files
- **📈 Commit Trends**: Visualize development patterns over time
- **👥 Contributor Insights**: Author-based analytics
- **🎯 Interactive Dashboard**: Beautiful charts and visualizations

### **Multi-Interface Access**
- **💻 CLI Tool**: Command-line interface for analysis
- **🌐 REST API**: JSON API for integrations
- **📱 React Dashboard**: Modern web interface
- **🐳 Docker Ready**: Complete containerized setup

## 🚀 **Quick Start**

### **🐳 Docker-Only Setup (No Local Go/Node Required)**

**Perfect for users without Go or Node.js installed locally!**

```bash
# Clone and start complete development environment
git clone https://github.com/mohammadalipour/codeEcho.git
cd codeEcho
make docker-dev

# Access your applications:
# - React Dashboard: http://localhost:3000
# - API Health Check: http://localhost:8080/api/v1/health
# - Database: localhost:3306
```

**📖 See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for complete Docker-only development guide**

### **Alternative: Manual Docker Compose**

```bash
# Start everything with Docker Compose directly
docker-compose -f docker-compose.ddd.yml up --build -d
```

### **Analyze Your First Repository**

```bash
# Get into CLI container
docker exec -it codeecho-cli sh

# Analyze a repository
./codeecho-cli analyze --project-name "MyProject" --repo-path /path/to/repo

# Check hotspots
./codeecho-cli hotspots --project-id 1
```

### **View Results**
Open **http://localhost:3000** in your browser to explore the beautiful React dashboard!

## 🎯 **What's New in DDD Version**
## 🎯 **What's New in DDD Version**

### **🏛️ Clean Architecture**
- **Domain-Driven Design**: Proper separation of business logic
- **Dependency Inversion**: Infrastructure depends on domain, not vice versa
- **Repository Pattern**: Clean data access abstractions
- **Use Cases**: Clear business operations

### **🎨 Modern Frontend**
- **React Dashboard**: Interactive charts and visualizations
- **Responsive Design**: Works on all devices
- **Real-time Data**: Live API integration
- **Tailwind CSS**: Modern, utility-first styling

### **🐳 Multi-Service Architecture**
- **API Service**: Go REST API server
- **CLI Service**: Command-line analysis tool
- **UI Service**: React development server
- **Database Service**: MySQL with proper schema

## 📁 **Project Structure**

```
codeecho/
├── 🔵 domain/              # Business entities, value objects, services
├── 🟢 application/         # Use cases, ports, DTOs
├── 🔴 infrastructure/      # Database, Git service, config
├── 🟡 interfaces/          # CLI + API endpoints
│   ├── cli/               # Command line interface
│   └── api/               # REST API server
├── 🎨 codeecho-ui/         # React dashboard
├── 🐳 docker-compose.ddd.yml # Multi-service orchestration
└── 📚 Documentation files
```

## 🔌 **API Endpoints**
