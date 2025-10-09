import React, { createContext, useContext, useReducer, useMemo } from 'react';
import axios from 'axios';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable credentials for cookie support
  validateStatus: status => status < 500, // Handle 4xx errors in catch block
});

// API Context
const ApiContext = createContext();

// Initial state
const initialState = {
  projects: [],
  currentProject: null,
  dashboardStats: null,
  loading: false,
  error: null,
};

// Reducer
const apiReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload, loading: false };
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload, loading: false };
    case 'SET_DASHBOARD_STATS':
      return { ...state, dashboardStats: action.payload, loading: false };
    default:
      return state;
  }
};

// Provider component
export const ApiProvider = ({ children }) => {
  const [state, dispatch] = useReducer(apiReducer, initialState);

  // Memoize API methods to prevent infinite re-renders
  const apiService = useMemo(() => ({
    // Health check
    async healthCheck() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.get('/health');
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Projects
    async getProjects() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.get('/projects');
        dispatch({ type: 'SET_PROJECTS', payload: response.data.projects || [] });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getProject(id) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.get(`/projects/${id}`);
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: response.data });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async createProject(projectData) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.post('/projects', projectData);
        
        if (!response.data || response.status >= 400) {
          throw new Error(response.data?.error || 'Failed to create project');
        }

        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async updateProject(id, projectData) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.put(`/projects/${id}`, projectData);
        // Refresh projects list after update
        await this.getProjects();
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async deleteProject(id) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.delete(`/projects/${id}`);
        // Refresh projects list after deletion
        await this.getProjects();
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async analyzeProject(projectId, repoPath) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.post(`/projects/${projectId}/analyze`, {
          repoPath: repoPath
        });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async refreshProjectAnalysis(projectId) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.post(`/projects/${projectId}/refresh`);
        // Refresh projects list to get updated stats
        await this.getProjects();
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },
    
    async cancelAnalysis(projectId) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.post(`/projects/${projectId}/cancel-analysis`);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    async getProjectAnalysisStatus(projectId) {
      try {
        const response = await api.get(`/projects/${projectId}/analysis-status`);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    // Analytics
    async getProjectCommits(projectId, { noCache = false } = {}) {
      try {
        const response = await api.get(`/projects/${projectId}/commits${noCache ? '?nocache=1' : ''}`);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    // List repositories (microservices) available for filtering
    async getRepositories() {
      try {
        const response = await api.get(`/repositories`);
        // Expect response like { repositories: [] } or array fallback
        return Array.isArray(response.data) ? response.data : (response.data.repositories || []);
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getProjectHotspots(projectId, startDate = null, endDate = null, repository = null, path = null, metric = null, minComplexity = null, minChanges = null, fileTypes = null, riskLevel = null, page = null, limit = null, { noCache = false } = {}) {
      try {
        let url = `/projects/${projectId}/hotspots`;
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (repository && repository !== 'all') params.append('repository', repository);
        if (path && path.trim() !== '') params.append('path', path.trim());
        if (metric) params.append('metric', metric);
        if (minComplexity !== null && minComplexity !== undefined && minComplexity !== '') params.append('minComplexity', String(minComplexity));
        if (minChanges !== null && minChanges !== undefined && Number(minChanges) > 0) params.append('minChanges', String(minChanges));
        if (fileTypes && Array.isArray(fileTypes) && fileTypes.length > 0) params.append('fileTypes', fileTypes.join(','));
        if (riskLevel && riskLevel !== 'all') params.append('riskLevel', riskLevel);
        if (page !== null && page !== undefined) params.append('page', String(page));
        if (limit !== null && limit !== undefined) params.append('limit', String(limit));
        
        if (params.toString()) url += `?${params.toString()}`;
        
        const sep = params.toString() ? '&' : '?';
        if (noCache) url += `${params.toString() ? '&' : '?'}nocache=1`;
        else if (params.toString()) { /* already appended */ }
        const response = await api.get(url);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getProjectStats(projectId, { noCache = false } = {}) {
      try {
        const response = await api.get(`/projects/${projectId}/stats${noCache ? '?nocache=1' : ''}`);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getProjectKnowledgeRisk(projectId, startDate = null, endDate = null) {
      try {
        let url = `/projects/${projectId}/knowledge-risk`;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        const response = await api.get(url);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    // New: File ownership raw endpoint (for dedicated Ownership page)
    async getFileOwnership(projectId) {
      try {
        const response = await api.get(`/projects/${projectId}/file-ownership`);
        return response.data; // { projectId, fileOwnership: [...] }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    // New generic ownership endpoint (/ownership?projectId=ID)
    async getOwnership(projectId) {
      try {
        const response = await api.get(`/ownership`, { params: { projectId } });
        return response.data; // { projectId, fileOwnership: [...] }
      } catch (error) {
        // Fallback silently to older endpoint if 404
        if (error?.response?.status === 404) {
          return this.getFileOwnership(projectId);
        }
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getDashboardStats() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await api.get('/dashboard/stats');
        dispatch({ type: 'SET_DASHBOARD_STATS', payload: response.data });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    // Temporal Coupling (minShared removed; optional date range)
    async getProjectTemporalCoupling(projectId, { limit = 200, startDate, endDate, minSharedCommits, minCouplingScore, fileTypes } = {}) {
      try {
        const params = new URLSearchParams();
        if (limit) params.append('limit', String(limit));
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (minSharedCommits !== undefined) params.append('minSharedCommits', String(minSharedCommits));
        if (minCouplingScore !== undefined) params.append('minCouplingScore', String(minCouplingScore));
        if (fileTypes) params.append('fileTypes', fileTypes);
        const response = await api.get(`/projects/${projectId}/temporal-coupling?${params.toString()}`);
        return response.data; // { project_id, temporal_coupling: [...], params: {...} }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getProjectFileTypes(projectId) {
      try {
        const response = await api.get(`/projects/${projectId}/file-types`);
        return response.data; // { project_id, file_types: [...] }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    // Bus Factor Analysis
    async getProjectBusFactor(projectId, queryParams = '') {
      try {
        let url = `/projects/${projectId}/bus-factor`;
        if (queryParams) url += `?${queryParams}`;
        const response = await api.get(url);
        return response.data; // { project_id, summary: {...}, files: [...] }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },
  }), [dispatch]);

  return (
    <ApiContext.Provider value={{ ...state, api: apiService }}>
      {children}
    </ApiContext.Provider>
  );
};

// Hook to use API context
export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};