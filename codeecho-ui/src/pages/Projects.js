import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { 
  PlusIcon, 
  FolderIcon, 
  CalendarIcon, 
  CodeBracketIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Projects = () => {
  const { api, projects, loading, error } = useApi();
  const [statsByProject, setStatsByProject] = useState({});
  const [editingProject, setEditingProject] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

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

  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = (project) => {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };

  const handleRefreshProject = async (project) => {
    try {
      await api.refreshProjectAnalysis(project.id);
      // Show a success message or toast notification here if desired
    } catch (error) {
      console.error('Error refreshing project:', error);
      // Show an error message or toast notification here if desired
    }
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      try {
        await api.deleteProject(projectToDelete.id);
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const saveProjectEdit = async (updatedProject) => {
    try {
      await api.updateProject(editingProject.id, {
        name: updatedProject.name,
        repo_path: updatedProject.repo_path
      });
      setIsEditModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

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
          <Link
            to="/projects/analyze"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Analyze Repository
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              stats={statsByProject[project.id]}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              onRefresh={handleRefreshProject}
            />
          ))}
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <EditProjectModal
          project={editingProject}
          onSave={saveProjectEdit}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProject(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          project={projectToDelete}
          onConfirm={confirmDeleteProject}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
          }}
        />
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
    
    <div className="mt-6">
      <Link
        to="/projects/analyze"
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Analyze Your First Repository
      </Link>
    </div>
    
    <div className="mt-8 bg-blue-50 rounded-lg p-4 max-w-lg mx-auto">
      <h4 className="text-sm font-medium text-blue-900 mb-2">
        Or use CLI
      </h4>
      <code className="block bg-blue-100 text-blue-800 p-2 rounded text-xs">
        ./codeecho-cli analyze --project-name "MyProject" --repo-path /path/to/repo
      </code>
      <p className="mt-2 text-xs text-blue-600">
        Run this command to analyze a repository via command line.
      </p>
    </div>
  </div>
);

const ProjectCard = ({ project, stats, onEdit, onDelete, onRefresh }) => {
  const commits = stats?.commits ?? 0;
  const changes = stats?.changes ?? 0;
  
  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(project);
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(project);
  };

  const handleRefreshClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRefresh(project);
  };

  return (
    <div className="group relative bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
      <Link
        to={`/projects/${project.id}`}
        className="block p-6"
      >
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
          {project.is_analyzed ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <ClockIcon className="h-3 w-3 mr-1 animate-spin" />
              Analyzing...
            </span>
          )}
        </div>
      </Link>

      {/* Action buttons - shown on hover */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex space-x-2">
          {project.is_analyzed && (
            <button
              onClick={handleRefreshClick}
              className="inline-flex items-center p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors duration-200"
              title="Refresh analysis (pull latest changes)"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleEditClick}
            className="inline-flex items-center p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors duration-200"
            title="Edit project"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="inline-flex items-center p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors duration-200"
            title="Delete project"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const EditProjectModal = ({ project, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    repo_path: project?.repo_path || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Project</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="repo_path" className="block text-sm font-medium text-gray-700 mb-2">
                Repository Path
              </label>
              <input
                type="text"
                id="repo_path"
                name="repo_path"
                value={formData.repo_path}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmationModal = ({ project, onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Delete Project</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete "{project?.name}"? This action cannot be undone and will remove all associated data including commits and changes.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;