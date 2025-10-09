import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookie support
});

// Auth Context
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        user: action.payload.user, 
        isAuthenticated: true, 
        loading: false, 
        error: null 
      };
    case 'LOGOUT':
      return { 
        ...state, 
        user: null, 
        isAuthenticated: false, 
        loading: false, 
        error: null 
      };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload, 
        loading: false 
      };
    default:
      return state;
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isRefreshing = React.useRef(false);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Create a special request that bypasses the interceptor
      const checkResponse = await axios.get('/me', {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: status => status < 500
      });
      
      if (checkResponse.status === 200 && checkResponse.data.user) {
        dispatch({ type: 'SET_USER', payload: checkResponse.data.user });
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
    } catch (error) {
      dispatch({ type: 'SET_USER', payload: null });
    }
  };

  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data && response.data.user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.data });
        return { success: true, user: response.data.user };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshToken = async () => {
    // Prevent multiple concurrent refresh attempts
    if (isRefreshing.current) {
      return false;
    }
    
    isRefreshing.current = true;
    
    try {
      const response = await api.post('/auth/refresh');
      if (response.data && response.data.user) {
        dispatch({ type: 'SET_USER', payload: response.data.user });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      dispatch({ type: 'LOGOUT' });
      return false;
    } finally {
      isRefreshing.current = false;
    }
  };

  // Add axios interceptor for automatic token refresh
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Don't retry if:
        // 1. Already retried this request
        // 2. It's a refresh token request (avoid infinite loop)
        // 3. It's a login request
        // 4. Currently refreshing
        if (
          originalRequest._retry || 
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/login') ||
          isRefreshing.current
        ) {
          return Promise.reject(error);
        }
        
        if (error.response?.status === 401 && state.isAuthenticated) {
          originalRequest._retry = true;
          
          const refreshed = await refreshToken();
          if (refreshed) {
            return api(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [state.isAuthenticated]);

  const value = {
    ...state,
    login,
    logout,
    checkAuth,
    refreshToken,
    api,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};