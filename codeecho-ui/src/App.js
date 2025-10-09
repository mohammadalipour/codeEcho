import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/AuthLayout';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import HotspotTreemap from './pages/HotspotTreemap';
import KnowledgeRisk from './pages/KnowledgeRisk';
import KnowledgeOwnership from './pages/KnowledgeOwnership';
import TemporalCoupling from './pages/TemporalCoupling';
import BusFactorPage from './pages/BusFactorPage';
import AnalyzeRepository from './pages/AnalyzeRepository';
import { ApiProvider } from './services/ApiContext';
import ProjectLayout from './components/ProjectLayout';

function App() {
  return (
    <AuthProvider>
      <ApiProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <ProtectedRoute requireAuth={false}>
                  <Login />
                </ProtectedRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute requireAuth={true}>
                  <AuthLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/projects/analyze" element={<AnalyzeRepository />} />
                      <Route path="/projects/:id/*" element={<ProjectLayout />}>
                        <Route index element={<ProjectDetail />} />
                        <Route path="hotspots" element={<HotspotTreemap />} />
                        <Route path="knowledge-risk" element={<KnowledgeRisk />} />
                        <Route path="knowledge-ownership" element={<KnowledgeOwnership />} />
                        <Route path="temporal-coupling" element={<TemporalCoupling />} />
                        <Route path="bus-factor" element={<BusFactorPage />} />
                      </Route>
                      <Route path="/knowledge-risk" element={<KnowledgeRisk />} />
                    </Routes>
                  </AuthLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ApiProvider>
    </AuthProvider>
  );
}

export default App;