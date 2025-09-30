import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { 
  FolderIcon, 
  FireIcon, 
  CodeBracketIcon, 
  UserGroupIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { api, dashboardStats, loading, error } = useApi();

  useEffect(() => {
    api.getDashboardStats().catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <p className="mt-2 text-xs">Make sure the API server is running on port 8080</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Projects',
      value: dashboardStats?.totalProjects || 0,
      icon: FolderIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Commits',
      value: dashboardStats?.totalCommits || 0,
      icon: CodeBracketIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Contributors',
      value: dashboardStats?.activeContributors || 0,
      icon: UserGroupIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Code Hotspots',
      value: dashboardStats?.codeHotspots || 0,
      icon: FireIcon,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          Welcome to CodeEcho - Git Repository Analytics
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="card-hover bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`inline-flex items-center justify-center p-3 rounded-md ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Getting Started Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">1. Analyze a Repository</h3>
            <p className="text-sm text-blue-700 mb-3">
              Add a new repository for analysis using our web interface or CLI tool.
            </p>
            <div className="space-y-2">
              <Link 
                to="/projects/analyze"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 bg-white px-3 py-1 rounded border border-blue-200"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Analyze Repository
              </Link>
              <details className="mt-2">
                <summary className="text-xs text-blue-600 cursor-pointer">Or use CLI</summary>
                <code className="block bg-blue-100 text-blue-800 p-2 rounded text-xs mt-1">
                  ./codeecho-cli analyze --project-name "MyProject" --repo-path /path/to/repo
                </code>
              </details>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-900 mb-2">2. View Analytics</h3>
            <p className="text-sm text-green-700 mb-3">
              Once you have data, navigate to the Projects page to view detailed analytics and hotspots.
            </p>
            <a 
              href="/projects" 
              className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-500"
            >
              Go to Projects →
            </a>
          </div>
        </div>
      </div>

      {/* API Status */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">API Status</h3>
        <div className="flex items-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">
            Connected to CodeEcho API (Implementation in progress)
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;