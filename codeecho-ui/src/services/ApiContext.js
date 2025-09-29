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
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    // Analytics
    async getProjectCommits(projectId) {
      try {
        const response = await api.get(`/projects/${projectId}/commits`);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getProjectHotspots(projectId) {
      try {
        const response = await api.get(`/projects/${projectId}/hotspots`);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getProjectStats(projectId) {
      try {
        const response = await api.get(`/projects/${projectId}/stats`);
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    async getProjectKnowledgeRisk(projectId) {
      try {
        const response = await api.get(`/projects/${projectId}/knowledge-risk`);
        return response.data;
      } catch (error) {
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