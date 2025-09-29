import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import OverviewDashboard from './pages/OverviewDashboard';
import HotspotTreemapDemo from './pages/HotspotTreemapDemo';
import KnowledgeRiskDemo from './pages/KnowledgeRiskDemo';
import { ApiProvider } from './services/ApiContext';

function App() {
  return (
    <ApiProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/overview" element={<OverviewDashboard />} />
            <Route path="/projects/:id/hotspots" element={<HotspotTreemapDemo />} />
            <Route path="/projects/:id/knowledge-risk" element={<KnowledgeRiskDemo />} />
            <Route path="/knowledge-risk" element={<KnowledgeRiskDemo />} />
          </Routes>
        </Layout>
      </Router>
    </ApiProvider>
  );
}

export default App;