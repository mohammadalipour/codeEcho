import React, { useEffect, useState, useRef } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
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
  const [analyzingProjects, setAnalyzingProjects] = useState(new Set());
  const [analysisStatus, setAnalysisStatus] = useState({}); // { projectId: { totalCommits, totalFiles, lastCommitDate } }
  const [refreshingProjects, setRefreshingProjects] = useState(new Set());
  const [analysisStartTimes, setAnalysisStartTimes] = useState({}); // { projectId: timestamp }
  const [nowTick, setNowTick] = useState(Date.now());
  const intervalRef = useRef(null); // project list polling
  const statusIntervalRef = useRef(null); // per-project status polling
  const elapsedIntervalRef = useRef(null); // elapsed time ticker

  useEffect(() => {
    api.getProjects().catch(console.error);
  }, []);

  useEffect(() => {
    // Fetch stats for all projects (even if not yet fully analyzed) to reflect partial ingestion
    const fetchStats = async () => {
      if (!projects || projects.length === 0) return;
      const entries = await Promise.all(
        projects.map(async (p) => {
          try {
            const noCache = !p.is_analyzed || refreshingProjects.has(p.id);
            const res = await api.getProjectStats(p.id, { noCache });
            const stats = res?.stats || {};
            const commits = stats.total_commits || 0;
            const changes = (stats.lines_added || 0) + (stats.lines_deleted || 0);
            if (!p.is_analyzed && commits === 0 && changes === 0) {
              return [p.id, { commits: '—', changes: '—' }];
            }
            return [p.id, { commits, changes }];
          } catch (e) {
            const isAnalyzing = !p.is_analyzed;
            return [p.id, { commits: isAnalyzing ? '—' : 0, changes: isAnalyzing ? '—' : 0 }];
          }
        })
      );
      setStatsByProject(Object.fromEntries(entries));
    };
    fetchStats();
  }, [projects, api, refreshingProjects]);

  // Auto-refresh logic for analyzing projects (stabilized to avoid infinite re-renders)
  useEffect(() => {
    if (projects.length === 0) return;

    // Determine currently analyzing projects
    const currentlyAnalyzing = new Set();
    projects.forEach(p => { if (!p.is_analyzed) currentlyAnalyzing.add(p.id); });

    // Update analysis start times only for newly added analyzing projects
    setAnalysisStartTimes(prev => {
      let changed = false;
      const next = { ...prev };
      currentlyAnalyzing.forEach(id => {
        if (!next[id]) { next[id] = Date.now(); changed = true; }
      });
      return changed ? next : prev; // prevent state churn when unchanged
    });

    // Update analyzingProjects state only if membership changed
    setAnalyzingProjects(prev => {
      if (prev.size === currentlyAnalyzing.size) {
        let identical = true;
        for (const id of prev) { if (!currentlyAnalyzing.has(id)) { identical = false; break; } }
        if (identical) return prev;
      }
      return currentlyAnalyzing;
    });

    const hasAnalyzing = currentlyAnalyzing.size > 0;

    // Project list polling
    if (hasAnalyzing && !intervalRef.current) {
      intervalRef.current = setInterval(async () => {
        try { await api.getProjects(); } catch { /* ignore */ }
      }, 4000);
    } else if (!hasAnalyzing && intervalRef.current) {
      clearInterval(intervalRef.current); intervalRef.current = null;
    }

    // Per-project status polling
    if (hasAnalyzing && !statusIntervalRef.current) {
      statusIntervalRef.current = setInterval(async () => {
        try {
          const entries = await Promise.all(
            Array.from(currentlyAnalyzing).map(async (id) => {
              try { return [id, await api.getProjectAnalysisStatus(id)]; } catch { return [id, null]; }
            })
          );
          setAnalysisStatus(prev => {
            const next = { ...prev };
            let changed = false;
            entries.forEach(([pid, s]) => {
              if (s) {
                const existing = next[pid];
                if (!existing || existing.totalCommits !== s.totalCommits || existing.totalFiles !== s.totalFiles || existing.lastCommitDate !== s.lastCommitDate) {
                  next[pid] = {
                    totalCommits: s.totalCommits,
                    totalFiles: s.totalFiles,
                    lastCommitDate: s.lastCommitDate
                  };
                  changed = true;
                }
              }
            });
            return changed ? next : prev;
          });
        } catch { /* ignore */ }
      }, 3000);
    } else if (!hasAnalyzing && statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current); statusIntervalRef.current = null; setAnalysisStatus({});
    }

    // Elapsed timer
    if (hasAnalyzing && !elapsedIntervalRef.current) {
      elapsedIntervalRef.current = setInterval(() => setNowTick(Date.now()), 1000);
    } else if (!hasAnalyzing && elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null;
    }

    return () => {
      if (!hasAnalyzing) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (statusIntervalRef.current) { clearInterval(statusIntervalRef.current); statusIntervalRef.current = null; }
        if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
      }
    };
  }, [projects, api]);

  const formatElapsed = (start) => {
    if (!start) return '';
    const secs = Math.floor((nowTick - start) / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

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
      // Optimistically mark as refreshing
      setRefreshingProjects(prev => new Set(prev).add(project.id));
      const baselineStats = statsByProject[project.id];
      const baselineCommits = typeof baselineStats?.commits === 'number' ? baselineStats.commits : null;
      const baselineChanges = typeof baselineStats?.changes === 'number' ? baselineStats.changes : null;
      await api.refreshProjectAnalysis(project.id);
      // Start temporary polling for updated stats (independent of analyzing state)
      let attempts = 0;
      const maxAttempts = 20; // ~60s if interval 3s
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await api.getProjectStats(project.id, { noCache: true });
          const s = res?.stats || {};
          const commits = s.total_commits || 0;
            const changes = (s.lines_added || 0) + (s.lines_deleted || 0);
          const changed = (
            (baselineCommits !== null && commits > baselineCommits) ||
            (baselineChanges !== null && changes > baselineChanges) ||
            (baselineCommits === null && commits > 0)
          );
          if (changed || attempts >= maxAttempts) {
            clearInterval(interval);
            setRefreshingProjects(prev => {
              const next = new Set(prev);
              next.delete(project.id);
              return next;
            });
            // Force projects list refresh to ensure any last_analyzed_hash update is visible
            api.getProjects().catch(() => {});
          }
        } catch (e) {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setRefreshingProjects(prev => {
              const next = new Set(prev);
              next.delete(project.id);
              return next;
            });
          }
        }
      }, 3000);
    } catch (error) {
      console.error('Error refreshing project:', error);
      setRefreshingProjects(prev => {
        const next = new Set(prev);
        next.delete(project.id);
        return next;
      });
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
              isAnalyzing={analyzingProjects.has(project.id)}
              analysisStatus={analysisStatus[project.id]}
              elapsed={formatElapsed(analysisStartTimes[project.id])}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              onRefresh={handleRefreshProject}
              refreshingProjects={refreshingProjects}
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

const ProjectCard = ({ project, stats, isAnalyzing, analysisStatus, elapsed, onEdit, onDelete, onRefresh, refreshingProjects }) => {
  // Prefer live status commits if available while analyzing
  const liveCommits = analysisStatus?.totalCommits;
  const commits = isAnalyzing && typeof liveCommits === 'number'
    ? liveCommits
    : (stats?.commits ?? (isAnalyzing ? '—' : 0));
  const changes = stats?.changes ?? (isAnalyzing ? '—' : 0);
  
  // Check if the project is in a "processing" state (analyzed but no stats yet)
  const isProcessing = commits === 'Processing...' || changes === 'Processing...';
  const isRefreshing = refreshingProjects?.has(project.id);
  const showPlaceholder = isAnalyzing || isProcessing;
  
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
    <div className={`group relative overflow-hidden shadow rounded-lg transition-all duration-300 ${
      showPlaceholder 
        ? 'bg-gradient-to-br from-gray-50 to-gray-100 shadow-md cursor-not-allowed transform scale-[0.98] border-2 border-gray-200' 
        : 'bg-white hover:shadow-xl cursor-pointer hover:transform hover:scale-[1.02]'
    }`}>
      {/* Beautiful loading overlay for analyzing/processing projects */}
      {showPlaceholder && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 to-indigo-50/90 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center space-y-4 p-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-lg font-semibold text-gray-800 tracking-wide">
                {isAnalyzing ? '🔍 Analyzing Repository' : '⚡ Processing Data'}
              </h4>
              <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
                {isAnalyzing
                  ? `Scanning code & parsing commits${typeof liveCommits === 'number' ? ` • ${liveCommits} commits` : ''}`
                  : isRefreshing
                    ? 'Updating analysis with new commits'
                    : 'Generating analytics and computing metrics'}
              </p>
              {(isAnalyzing || isRefreshing) && (
                <p className="text-xs text-gray-500 mt-1">{isAnalyzing ? 'Elapsed: ' + elapsed : 'Updating...'}</p>
              )}
              <div className="flex justify-center space-x-1 pt-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Link
        to={showPlaceholder ? '#' : `/projects/${project.id}`}
        className={`block p-6 ${showPlaceholder ? 'pointer-events-none' : 'hover:bg-gray-50 transition-colors duration-200'}`}
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
              {typeof commits === 'number' ? (
                <AnimatedNumber value={commits} className="font-medium text-gray-900" />
              ) : (
                <span className="font-medium text-gray-900">{commits}</span>
              )}
              <span className="text-gray-500 ml-1">commits</span>
            </div>
            <div className="text-sm">
              {typeof changes === 'number' ? (
                <AnimatedNumber value={changes} className="font-medium text-gray-900" />
              ) : (
                <span className="font-medium text-gray-900">{changes}</span>
              )}
              <span className="text-gray-500 ml-1">changes</span>
            </div>
          </div>
          {project.is_analyzed ? (
            isRefreshing ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <ClockIcon className="h-3 w-3 mr-1 animate-spin" /> Updating
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )
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