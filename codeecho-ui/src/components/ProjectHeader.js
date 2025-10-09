import React from 'react';
import ProjectSectionNav from './ProjectSectionNav';
import { ArrowPathIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';

/*
 * ProjectHeader – clean project header with modern design aligned with new layout
 * Props:
 *  project: { name, repo_path }
 *  stats: { total_commits, contributors, total_hotspots, last_commit }
 *  projectId: string
 *  onRefresh: fn()
 */
const StatCard = ({ label, value }) => (
  <div className="text-center">
    <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

const ProjectHeader = ({ project, stats, projectId, onRefresh }) => {
  const location = useLocation();
  
  return (
    <div className="mb-8">
      {/* Clean Project Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <FolderIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project?.name || `Project ${projectId}`}
              </h1>
              {project?.repo_path && (
                <p className="text-sm text-gray-500 font-mono">{project.repo_path}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="h-4 w-4" /> 
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-gray-50 rounded-lg">
          <StatCard 
            label="Total Commits" 
            value={stats?.total_commits ?? '0'} 
          />
          <StatCard 
            label="Contributors" 
            value={stats?.contributors ?? '0'} 
          />
          <StatCard 
            label="Code Hotspots" 
            value={stats?.total_hotspots ?? '0'} 
          />
          <StatCard 
            label="Last Commit" 
            value={stats?.last_commit ? new Date(stats.last_commit).toLocaleDateString() : '—'} 
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
