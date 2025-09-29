import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { 
  PlusIcon, 
  FolderIcon, 
  CalendarIcon, 
  CodeBracketIcon 
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Projects = () => {
  const { api, projects, loading, error } = useApi();
  const [statsByProject, setStatsByProject] = useState({});

  useEffect(() => {
    api.getProjects().catch(console.error);
  }, []);

  useEffect(() => {
    // After projects load, fetch stats per project in parallel
    const fetchStats = async () => {
      if (!projects || projects.length === 0) return;
      const entries = await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.getProjectStats(p.id);
            // API shape: { project_id, stats: { total_commits, lines_added, lines_deleted, ... } }
            const stats = res?.stats || {};
            const changes = (stats.lines_added || 0) + (stats.lines_deleted || 0);
            return [p.id, { commits: stats.total_commits || 0, changes }];
          } catch (e) {
            return [p.id, { commits: 0, changes: 0 }];
          }
        })
      );
      const dict = Object.fromEntries(entries);
      setStatsByProject(dict);
    };
    fetchStats();
  }, [projects, api]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
              <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all analyzed Git repositories and their analytics.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Analyze Repository
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} stats={statsByProject[project.id]} />
          ))}
        </div>
      )}
    </div>
  );
};

const EmptyState = () => (
  <div className="text-center mt-12">
    <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
    <p className="mt-1 text-sm text-gray-500">
      Get started by analyzing your first Git repository.
    </p>
    <div className="mt-6 bg-blue-50 rounded-lg p-4 max-w-lg mx-auto">
      <h4 className="text-sm font-medium text-blue-900 mb-2">
        Quick Start Command
      </h4>
      <code className="block bg-blue-100 text-blue-800 p-2 rounded text-xs">
        ./codeecho-cli analyze --project-name "MyProject" --repo-path /path/to/repo
      </code>
      <p className="mt-2 text-xs text-blue-600">
        Run this command to analyze a repository and see it appear here.
      </p>
    </div>
  </div>
);

const ProjectCard = ({ project, stats }) => {
  const commits = stats?.commits ?? 0;
  const changes = stats?.changes ?? 0;
  return (
    <Link
      to={`/projects/${project.id}`}
      className="card-hover block bg-white overflow-hidden shadow rounded-lg"
    >
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="inline-flex items-center justify-center p-3 bg-primary-100 rounded-md">
              <FolderIcon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {project.name}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {project.repo_path}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center text-sm text-gray-500">
            <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
            Created {format(new Date(project.created_at), 'MMM d, yyyy')}
          </div>
          {project.last_analyzed_hash && (
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <CodeBracketIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
              Last analyzed: {project.last_analyzed_hash.substring(0, 8)}...
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="flex space-x-4">
            <div className="text-sm">
              <span className="font-medium text-gray-900">{commits}</span>
              <span className="text-gray-500 ml-1">commits</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-900">{changes}</span>
              <span className="text-gray-500 ml-1">changes</span>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {project.is_analyzed ? 'Active' : 'Pending'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Projects;