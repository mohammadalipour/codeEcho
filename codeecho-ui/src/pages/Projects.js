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
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Projects = () => {
  const { api, projects, loading, error } = useApi();
  const [statsByProject, setStatsByProject] = useState({});
  const [editingProject, setEditingProject] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelAnalysisModalOpen, setIsCancelAnalysisModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [projectToCancel, setProjectToCancel] = useState(null);
  const [analyzingProjects, setAnalyzingProjects] = useState(new Set());
  const [analysisStatus, setAnalysisStatus] = useState({}); // { projectId: { totalCommits, totalFiles, lastCommitDate } }
  const [refreshingProjects, setRefreshingProjects] = useState(new Set());
  const [analysisStartTimes, setAnalysisStartTimes] = useState({}); // { projectId: timestamp }
  const [nowTick, setNowTick] = useState(Date.now());
  const [notifications, setNotifications] = useState([]);
  const notificationTimeoutRef = useRef(null);
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
      
      // When projects have completed analysis, clean up the refreshing state
      if (prev.size > currentlyAnalyzing.size) {
        const completed = [...prev].filter(id => !currentlyAnalyzing.has(id));
        
        // Show notifications for completed analyses
        completed.forEach(id => {
          const project = projects.find(p => p.id === id);
          if (project) {
            addNotification({
              type: 'success',
              message: `Analysis of "${project.name}" completed successfully!`,
              duration: 5000
            });
          }
        });
        
        // Clean up any refreshingProjects entries for completed analyses
        setRefreshingProjects(refreshing => {
          if (refreshing.size === 0) return refreshing;
          const newRefreshing = new Set(refreshing);
          completed.forEach(id => newRefreshing.delete(id));
          return newRefreshing;
        });
      }
      
      return currentlyAnalyzing;
    });

    // Check for stuck analyses (over 5 minutes)
    const now = Date.now();
    Object.entries(analysisStartTimes).forEach(([id, startTime]) => {
      const elapsedMs = now - startTime;
      const MAX_ANALYSIS_TIME_MS = 5 * 60 * 1000; // 5 minutes
      
      if (elapsedMs > MAX_ANALYSIS_TIME_MS && currentlyAnalyzing.has(parseInt(id, 10))) {
        console.warn(`Analysis for project ${id} has been running for ${Math.floor(elapsedMs/60000)} minutes. Refreshing project data.`);
        api.getProjects().catch(console.error);
      }
    });

    const hasAnalyzing = currentlyAnalyzing.size > 0;

    // Project list polling with auto-refresh for analyzing projects
    if (hasAnalyzing && !intervalRef.current) {
      intervalRef.current = setInterval(async () => {
        try { 
          await api.getProjects();
          
          // Auto-refresh analyzing projects to update their stats
          Array.from(currentlyAnalyzing).forEach(projectId => {
            const project = projects.find(p => p.id === projectId);
            if (project) {
              setRefreshingProjects(prev => new Set(prev).add(projectId));
              api.getProjectStats(projectId, { noCache: true })
                .then(() => {
                  // Keep the refreshing state while analysis is ongoing
                  if (project.is_analyzed) {
                    setRefreshingProjects(prev => {
                      const next = new Set(prev);
                      next.delete(projectId);
                      return next;
                    });
                  }
                })
                .catch(() => {});
            }
          });
        } catch { /* ignore */ }
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
  
  const handleRetryAnalysis = () => {
    api.getProjects().catch(console.error);
  };
  
  const handleCancelAnalysis = (projectId) => {
    // Find the project by ID
    const projectToCancel = projects.find(p => p.id === projectId);
    setProjectToCancel(projectToCancel);
    setIsCancelAnalysisModalOpen(true);
  };
  
  // Notification management
  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = { id, ...notification };
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove notification after duration
    if (notification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }
  };
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const confirmCancelAnalysis = async () => {
    try {
      if (!projectToCancel) return;
      
      const projectName = projectToCancel.name;
      await api.cancelAnalysis(projectToCancel.id);
      // After cancellation, delete the project as well
      await api.deleteProject(projectToCancel.id);
      // Refresh the project list
      await api.getProjects();
      // Close the modal
      setIsCancelAnalysisModalOpen(false);
      setProjectToCancel(null);
      
      // Show notification
      addNotification({
        type: 'info',
        message: `Analysis of "${projectName}" was cancelled and the project was deleted.`,
        duration: 5000
      });
    } catch (error) {
      console.error('Failed to cancel analysis:', error);
      setIsCancelAnalysisModalOpen(false);
      
      // Handle different error cases
      let errorMessage = '';
      if (error.response?.status === 404) {
        errorMessage = `No active analysis found for "${projectToCancel?.name}". The analysis may have already completed or was not running.`;
        // Still try to delete the project if no analysis is running
        try {
          await api.deleteProject(projectToCancel.id);
          await api.getProjects();
          setProjectToCancel(null);
          addNotification({
            type: 'info',
            message: `Project "${projectToCancel?.name}" was deleted (no active analysis found).`,
            duration: 5000
          });
          return;
        } catch (deleteError) {
          errorMessage = `No active analysis found and failed to delete project: ${deleteError.message || 'Unknown error'}`;
        }
      } else {
        errorMessage = `Failed to cancel analysis: ${error.response?.data?.detail || error.message || 'Unknown error'}`;
      }
      
      // Show error notification
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 7000
      });
    }
  };

  const handleRefreshProject = async (project) => {
    try {
      // Show notification that refresh is starting
      addNotification({
        type: 'info',
        message: `Refreshing project "${project.name}"...`,
        duration: 3000
      });
      
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
            
            // Show success notification
            if (changed) {
              addNotification({
                type: 'success',
                message: `Project "${project.name}" refreshed with new data!`,
                duration: 5000
              });
            } else {
              addNotification({
                type: 'info',
                message: `No new changes found for "${project.name}".`,
                duration: 5000
              });
            }
          }
        } catch (e) {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setRefreshingProjects(prev => {
              const next = new Set(prev);
              next.delete(project.id);
              return next;
            });
            
            // Show timeout notification
            addNotification({
              type: 'info',
              message: `Refresh timeout for "${project.name}". No changes detected.`,
              duration: 5000
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
      
      // Show error notification
      addNotification({
        type: 'error',
        message: `Failed to refresh project "${project.name}": ${error.message || 'Unknown error'}`,
        duration: 5000
      });
    }
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      try {
        const projectName = projectToDelete.name;
        await api.deleteProject(projectToDelete.id);
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
        
        // Show success notification
        addNotification({
          type: 'success',
          message: `Project "${projectName}" was successfully deleted.`,
          duration: 5000
        });
      } catch (error) {
        console.error('Error deleting project:', error);
        
        // Show error notification
        addNotification({
          type: 'error',
          message: `Failed to delete project: ${error.message || 'Unknown error'}`,
          duration: 5000
        });
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
      
      // Show success notification
      addNotification({
        type: 'success',
        message: `Project "${updatedProject.name}" was successfully updated.`,
        duration: 5000
      });
    } catch (error) {
      console.error('Error updating project:', error);
      
      // Show error notification
      addNotification({
        type: 'error',
        message: `Failed to update project: ${error.message || 'Unknown error'}`,
        duration: 5000
      });
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">Error loading projects</h3>
              <div className="mt-2 text-sm text-gray-700">
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
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          <Link
            to="/projects/create"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Project
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
              onRetryAnalysis={handleRetryAnalysis}
              onCancelAnalysis={handleCancelAnalysis}
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
      
      {/* Cancel Analysis Confirmation Modal */}
      {isCancelAnalysisModalOpen && (
        <CancelAnalysisModal
          project={projectToCancel}
          onConfirm={confirmCancelAnalysis}
          onClose={() => {
            setIsCancelAnalysisModalOpen(false);
            setProjectToCancel(null);
          }}
        />
      )}

      {/* Notifications */}
      <div className="fixed bottom-5 right-5 space-y-3 z-50">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`flex items-center justify-between p-3 rounded-lg shadow-lg transition-all duration-300 animate-slideInRight ${
              notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
              notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
              'bg-blue-50 border-l-4 border-blue-500'
            }`}
            style={{ minWidth: '300px', maxWidth: '400px' }}
          >
            <div className="flex items-center">
              {notification.type === 'success' && (
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
              )}
              {notification.type === 'error' && (
                <XMarkIcon className="w-5 h-5 text-red-500 mr-2" />
              )}
              {notification.type === 'info' && (
                <FolderIcon className="w-5 h-5 text-blue-500 mr-2" />
              )}
              <p className={`text-sm ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </p>
            </div>
            <button 
              onClick={() => removeNotification(notification.id)}
              className="ml-3 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="text-center mt-12">
    <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
    <p className="mt-1 text-sm text-gray-500">
      Get started by creating your first project from Git repositories or local files.
    </p>
    
    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
      <Link
        to="/projects/create"
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Create Project
      </Link>
    </div>

    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
      <div className="bg-blue-50 rounded-lg p-4 text-center">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h4 className="text-sm font-medium text-blue-900 mb-1">Public Git Repos</h4>
        <p className="text-xs text-blue-700">GitHub, GitLab.com, Bitbucket</p>
      </div>
      
      <div className="bg-purple-50 rounded-lg p-4 text-center">
        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h4 className="text-sm font-medium text-purple-900 mb-1">Private Git Repos</h4>
        <p className="text-xs text-purple-700">Internal GitLab, Enterprise</p>
      </div>
      
      <div className="bg-green-50 rounded-lg p-4 text-center">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
        <h4 className="text-sm font-medium text-green-900 mb-1">Local Archives</h4>
        <p className="text-xs text-green-700">ZIP, TAR files (up to 100MB)</p>
      </div>
    </div>
    
    <div className="mt-8 bg-gray-50 rounded-lg p-4 max-w-lg mx-auto">
      <h4 className="text-sm font-medium text-gray-900 mb-2">
        Or use CLI
      </h4>
      <code className="block bg-gray-100 text-gray-800 p-2 rounded text-xs">
        ./codeecho-cli analyze --project-name "MyProject" --repo-path /path/to/repo
      </code>
      <p className="mt-2 text-xs text-gray-600">
        Run this command to analyze a repository via command line.
      </p>
    </div>
  </div>
);

const ProjectCard = ({ project, stats, isAnalyzing, analysisStatus, elapsed, onEdit, onDelete, onRefresh, onRetryAnalysis, onCancelAnalysis, refreshingProjects }) => {
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

  // Calculate progress percentage for visual feedback
  const getAnalysisProgress = () => {
    if (typeof liveCommits === 'number' && liveCommits > 0) {
      // Simulate progress based on commits processed (cap at 90% during analysis)
      return Math.min((liveCommits / (liveCommits + 100)) * 90, 90);
    }
    return 0;
  };

  return (
    <div className={`group relative overflow-hidden rounded-xl transition-all duration-500 ${
      showPlaceholder 
        ? 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 shadow-lg cursor-not-allowed transform scale-[0.98] border border-blue-200/50' 
        : 'bg-white hover:shadow-2xl cursor-pointer hover:transform hover:scale-[1.03] shadow-md border border-gray-200/50 hover:border-blue-200/70'
    }`}>
      {/* Beautiful loading overlay for analyzing/processing projects */}
      {showPlaceholder && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/95 to-indigo-100/95 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center space-y-6 p-8">
            <div className="relative">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-spin"></div>
              {/* Inner progress ring */}
              <div className="rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>
              {/* Center pulse */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse shadow-lg"></div>
              </div>
              {/* Progress indicator */}
              {getAnalysisProgress() > 0 && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {Math.round(getAnalysisProgress())}%
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center space-y-2 max-w-xs">
              <h4 className="text-base font-bold text-gray-800 tracking-wide flex items-center justify-center space-x-2">
                {isAnalyzing ? (
                  <>
                    <span>🔍</span>
                    <span>Analyzing Repository</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Processing Data</span>
                  </>
                )}
              </h4>
              
              <div className="space-y-1.5">
                <p className="text-xs text-gray-700 leading-relaxed font-medium">
                  {isAnalyzing
                    ? `Scanning commits & parsing changes${typeof liveCommits === 'number' ? ` • ${liveCommits.toLocaleString()} commits found` : ''}`
                    : isRefreshing
                      ? 'Updating analysis with latest commits'
                      : 'Computing analytics and generating insights'}
                </p>
                
                {(isAnalyzing || isRefreshing) && (
                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-600">
                    {isAnalyzing ? (
                      <>
                        <ClockIcon className="h-3 w-3" />
                        <span>Elapsed: {elapsed}</span>
                        <ArrowPathIcon className="h-3 w-3 animate-spin text-blue-500 ml-1" />
                        <span className="text-blue-500">Auto-refreshing</span>
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="h-3 w-3 animate-spin" />
                        <span>Updating...</span>
                      </>
                    )}
                  </div>
                )}
                
                {isAnalyzing && elapsed && parseInt(elapsed.split('m')[0]) >= 5 && (
                  <div className="mt-1 p-1.5 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-yellow-700 font-medium flex items-center">
                        <span className="inline-flex mr-1 h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></span>
                        Analysis taking longer than expected
                      </p>
                      {parseInt(elapsed.split('m')[0]) >= 10 && (
                        <div className="flex space-x-2">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRetryAnalysis();
                            }}
                            className="text-xs bg-yellow-100 px-2 py-0.5 rounded text-yellow-800 hover:bg-yellow-200 transition-colors"
                          >
                            Retry
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onCancelAnalysis(project.id);
                            }}
                            className="text-xs bg-red-100 px-2 py-0.5 rounded text-red-700 hover:bg-red-200 transition-colors"
                          >
                            Cancel & Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Progress bar for analysis */}
              {isAnalyzing && getAnalysisProgress() > 0 && (
                <div className="w-full bg-blue-100 rounded-full h-2 mt-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${getAnalysisProgress()}%` }}
                  ></div>
                </div>
              )}
              
              {/* Animated dots */}
              <div className="flex justify-center space-x-1.5 pt-3">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-bounce shadow-sm"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-bounce shadow-sm" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-bounce shadow-sm" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <Link
        to={showPlaceholder ? '#' : `/projects/${project.id}`}
        className={`block transition-all duration-300 ${showPlaceholder ? 'pointer-events-none' : 'hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50/30'}`}
      >
        {/* Enhanced header with gradient background */}
        <div className="relative p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 max-w-[calc(100%-64px)]">
              <div className="relative flex-shrink-0">
                <div className="inline-flex items-center justify-center p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <FolderIcon className="h-4 w-4 text-white" />
                </div>
                {project.is_analyzed && !showPlaceholder && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm">
                    <div className="w-1 h-1 bg-green-400 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                  </div>
                )}
              </div>
              <div className="ml-2.5 min-w-0 max-w-full">
                <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-300">
                  {project.name}
                </h3>
                <div className="text-xs text-gray-600 mt-1 flex items-center max-w-full">
                  <svg className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="truncate block">{project.repo_path}</span>
                </div>
              </div>
            </div>
            
            {/* Status badge */}
            <div className="flex-shrink-0">
              {project.is_analyzed ? (
                isRefreshing ? (
                  <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                    <ClockIcon className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                    <span className="truncate max-w-[60px]">Updating</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 whitespace-nowrap">
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full mr-0.5 animate-pulse"></div>
                    <span className="truncate max-w-[60px]">Active</span>
                  </div>
                )
              ) : (
                <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200 whitespace-nowrap">
                  <ClockIcon className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                  <span className="truncate max-w-[60px]">Analyzing</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content section with enhanced styling */}
        <div className="p-5 space-y-4">
          {/* Metadata section */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center text-gray-600 overflow-hidden">
              <CalendarIcon className="flex-shrink-0 mr-1.5 h-3 w-3 text-gray-400" />
              <span className="font-medium whitespace-nowrap">Created</span>
              <span className="ml-1.5 text-gray-900 truncate">{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
            </div>
            {project.last_analyzed_hash && (
              <div className="flex items-center text-gray-600 overflow-hidden">
                <CodeBracketIcon className="flex-shrink-0 mr-1.5 h-3 w-3 text-gray-400" />
                <span className="font-medium whitespace-nowrap">Last commit</span>
                <span className="ml-1.5 text-gray-900 font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[70px]">
                  {project.last_analyzed_hash.substring(0, 7)}
                </span>
              </div>
            )}
          </div>

          {/* Stats grid with enhanced visual design */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100 group-hover:border-blue-200 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Commits</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">
                    {typeof commits === 'number' ? (
                      <AnimatedNumber value={commits} className="font-bold" />
                    ) : (
                      <span className="text-gray-500">{commits}</span>
                    )}
                  </p>
                </div>
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <CodeBracketIcon className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100 group-hover:border-green-200 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Changes</p>
                  <p className="text-xl font-bold text-green-900 mt-1">
                    {typeof changes === 'number' ? (
                      <AnimatedNumber value={changes} className="font-bold" />
                    ) : (
                      <span className="text-gray-500">{changes}</span>
                    )}
                  </p>
                </div>
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Enhanced action buttons with better positioning and styling */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
        <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-sm rounded-lg p-1.5 shadow-lg border border-gray-200/50">
          {project.is_analyzed && (
            <button
              onClick={handleRefreshClick}
              className="inline-flex items-center p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 hover:scale-105 transition-all duration-200 group/btn"
              title="Refresh analysis (pull latest changes)"
            >
              <ArrowPathIcon className="h-4 w-4 group-hover/btn:rotate-180 transition-transform duration-300" />
            </button>
          )}
          <button
            onClick={handleEditClick}
            className="inline-flex items-center p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 hover:scale-105 transition-all duration-200 group/btn"
            title="Edit project details"
          >
            <PencilIcon className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="inline-flex items-center p-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 hover:scale-105 transition-all duration-200 group/btn"
            title="Delete project"
          >
            <TrashIcon className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200" />
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

// Modal for confirming analysis cancellation
const CancelAnalysisModal = ({ project, onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Cancel Analysis</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center justify-center mb-4 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-center text-sm text-gray-600 mb-2">
              <span className="font-medium">Are you sure?</span>
            </p>
            <p className="text-sm text-gray-500 text-center">
              This will cancel the ongoing analysis for "{project?.name}" and permanently delete the project. This action cannot be undone.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Keep Analyzing
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cancel & Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;