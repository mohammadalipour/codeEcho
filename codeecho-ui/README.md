# CodeEcho UI

A modern React-based dashboard for visualizing Git repository analytics from CodeEcho.

## 🚀 Features

- **Dashboard Overview**: Get a birds-eye view of all your projects and stats
- **Project Management**: View and manage analyzed Git repositories
- **Code Hotspots Analysis**: Identify frequently changing files with visual charts
- **Commit Trends**: Track commit patterns over time
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Data**: Connects to CodeEcho API for live analytics

## 🛠️ Technology Stack

- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Heroicons** - Beautiful SVG icons
- **Recharts** - Composable charting library
- **Axios** - HTTP client for API calls
- **date-fns** - Modern JavaScript date utility library

## 📁 Project Structure

```
codeecho-ui/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   └── Layout.js       # Main layout with sidebar
│   ├── pages/              # Page components
│   │   ├── Dashboard.js    # Overview dashboard
│   │   ├── Projects.js     # Projects list
│   │   └── ProjectDetail.js # Individual project analytics
│   ├── services/           # API services and context
│   │   └── ApiContext.js   # API state management
│   ├── hooks/              # Custom React hooks
│   ├── App.js              # Main app component
│   ├── index.js            # React app entry point
│   └── index.css           # Global styles with Tailwind
├── package.json
├── tailwind.config.js      # Tailwind configuration
└── Dockerfile              # Container setup
```

## 🏃‍♂️ Quick Start

### Option 1: Docker (Recommended)

```bash
# From the main codeecho directory
docker-compose -f docker-compose.ddd.yml up --build -d

# The UI will be available at: http://localhost:3000
```

### Option 2: Local Development

```bash
# Navigate to UI directory
cd codeecho-ui

# Install dependencies
npm install

# Start development server
npm start

# Opens automatically at http://localhost:3000
```

## 🔌 API Integration

The UI connects to the CodeEcho API running on port 8080. Make sure to:

1. **Start the API server** first (using Docker or manually)
2. **Analyze some repositories** using the CLI to populate data
3. **View the analytics** in the UI

### API Endpoints Used

- `GET /api/v1/health` - API health check
- `GET /api/v1/projects` - List all projects
- `GET /api/v1/projects/{id}` - Get project details
- `GET /api/v1/projects/{id}/commits` - Get project commits
- `GET /api/v1/projects/{id}/hotspots` - Get code hotspots
- `GET /api/v1/projects/{id}/stats` - Get project statistics
- `GET /api/v1/dashboard/stats` - Get dashboard overview

## 📊 Features Overview

### Dashboard Page
- **Quick Stats**: Total projects, commits, contributors, hotspots
- **Getting Started Guide**: Instructions for new users
- **API Status**: Connection status to backend
- **System Overview**: High-level analytics

### Projects Page
- **Project Cards**: Visual cards for each analyzed repository
- **Project Information**: Name, path, creation date, last analysis
- **Quick Actions**: Navigate to detailed analytics
- **Empty State**: Helpful instructions when no projects exist

### Project Detail Page
- **Detailed Analytics**: Comprehensive metrics for individual projects
- **Commit Trends**: Line chart showing commit activity over time
- **Code Hotspots**: Bar chart and table of frequently changed files
- **File-level Insights**: Lines added/deleted, change frequency
- **Interactive Charts**: Hover tooltips and responsive design

## 🎨 Design System

The UI uses a consistent design system built with Tailwind CSS:

### Colors
- **Primary**: Blue (`#3B82F6`) for main actions and navigation
- **Success**: Green for positive metrics
- **Warning**: Yellow for attention items  
- **Danger**: Red for hotspots and critical items
- **Neutral**: Grays for text and backgrounds

### Components
- **Cards**: Elevated surfaces with hover effects
- **Navigation**: Responsive sidebar with mobile support
- **Charts**: Consistent styling across all visualizations
- **Tables**: Clean, sortable data tables
- **Loading States**: Skeleton loaders for better UX

## 🔧 Configuration

### Environment Variables
- `REACT_APP_API_URL`: API base URL (default: `/api/v1`)
- `CHOKIDAR_USEPOLLING`: Enable file watching in Docker

### Proxy Configuration
The development server proxies API requests to `http://localhost:8080` when running locally.

## 🚀 Deployment

### Production Build
```bash
# Create optimized production build
npm run build

# Serve with static file server
npx serve -s build
```

### Docker Production
```bash
# Build production image
docker build -t codeecho-ui:prod --target production .

# Run production container
docker run -p 3000:80 codeecho-ui:prod
```

## 🤝 Contributing

1. Follow the existing code structure and naming conventions
2. Use functional components with hooks
3. Implement responsive design with Tailwind classes
4. Add loading states and error handling
5. Write meaningful commit messages

## 🐛 Troubleshooting

### Common Issues

**API Connection Failed**
- Ensure the CodeEcho API is running on port 8080
- Check that the API health endpoint returns 200 OK
- Verify no firewall blocking the connection

**No Data Displayed**
- Run CLI commands to analyze repositories first
- Check API endpoints return data (not just placeholder responses)
- Verify database contains actual project data

**Build Errors**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility (requires Node 16+)
- Verify all dependencies are properly installed

**Docker Issues**
- Rebuild with no cache: `docker-compose build --no-cache`
- Check container logs: `docker logs codeecho-ui`
- Verify port 3000 is not in use by another service

## 📈 Future Enhancements

- **Real-time Updates**: WebSocket connections for live data
- **Advanced Filtering**: Filter projects and analytics by date, author, etc.
- **Export Features**: Download reports as PDF or CSV
- **Team Analytics**: Multi-developer insights and comparisons
- **Custom Dashboards**: User-configurable dashboard layouts
- **Dark Mode**: Theme switching support
- **Mobile App**: React Native companion app

---

**Ready to explore your Git analytics! 🚀**