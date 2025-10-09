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
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="bg-gray-100 rounded-2xl p-8 border mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-5 w-96 bg-gray-200 rounded"></div>
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
          {/* Content skeleton */}
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-40 bg-gray-100 rounded-xl"></div>
              <div className="h-40 bg-gray-100 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white border border-red-200 rounded-xl shadow-sm p-8">
          <div className="flex items-start">
            <div className="bg-red-100 p-3 rounded-xl mr-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Dashboard</h3>
              <div className="text-sm text-red-700 mb-4">
                <p className="mb-2">{error}</p>
                <p className="text-red-600">Make sure the API server is running on port 8080</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-100 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-200 transition-colors duration-200"
              >
                Retry
              </button>
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
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
    },
    {
      name: 'Total Commits',
      value: dashboardStats?.totalCommits || 0,
      icon: CodeBracketIcon,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
    },
    {
      name: 'Contributors',
      value: dashboardStats?.activeContributors || 0,
      icon: UserGroupIcon,
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
    },
    {
      name: 'Code Hotspots',
      value: dashboardStats?.codeHotspots || 0,
      icon: FireIcon,
      gradient: 'from-orange-500 to-red-500',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-lg text-gray-600">
            Welcome to CodeEcho - Advanced Git Repository Analytics
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`flex-shrink-0 ${stat.iconBg} p-3 rounded-xl`}>
                  <stat.icon className={`h-6 w-6 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`} />
                </div>
              </div>
            </div>
            <div className={`h-1 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></div>
          </div>
        ))}
      </div>

      {/* Getting Started Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 mb-6">
        <div className="flex items-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg mr-4">
            <PlusIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Getting Started</h2>
            <p className="text-gray-600">Set up your first repository analysis</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-lg mr-4">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Analyze Repository</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Add a new repository for comprehensive code analysis and insights.
                </p>
                <Link 
                  to="/projects/analyze"
                  className="inline-flex items-center px-4 py-2 bg-white border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors duration-200"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Analyze Repository
                </Link>
                <details className="mt-3">
                  <summary className="text-xs text-blue-600 cursor-pointer font-medium">Or use CLI</summary>
                  <code className="block bg-blue-100 text-blue-800 p-3 rounded-lg text-xs mt-2 font-mono">
                    ./codeecho-cli analyze --project-name "MyProject" --repo-path /path/to/repo
                  </code>
                </details>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-6">
            <div className="flex items-start">
              <div className="bg-emerald-100 p-2 rounded-lg mr-4">
                <span className="text-emerald-600 font-bold text-sm">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-emerald-900 mb-2">View Analytics</h3>
                <p className="text-sm text-emerald-700 mb-4">
                  Explore detailed analytics, hotspots, and insights once data is available.
                </p>
                <Link 
                  to="/projects"
                  className="inline-flex items-center px-4 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-colors duration-200"
                >
                  View Projects
                  <span className="ml-2">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Status */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900">API Status</span>
            </div>
            <span className="text-sm text-gray-600">
              Connected to CodeEcho API
            </span>
          </div>
          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;