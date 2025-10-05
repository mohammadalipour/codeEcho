import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import HotspotTreemap from './pages/HotspotTreemap';
import KnowledgeRisk from './pages/KnowledgeRisk';
import TemporalCoupling from './pages/TemporalCoupling';
import AnalyzeRepository from './pages/AnalyzeRepository';
import { ApiProvider } from './services/ApiContext';
import ProjectLayout from './components/ProjectLayout';

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
            <Route path="/projects/analyze" element={<AnalyzeRepository />} />
            <Route path="/projects/:id/*" element={<ProjectLayout />}>
              <Route index element={<ProjectDetail />} />
              <Route path="hotspots" element={<HotspotTreemap />} />
              <Route path="knowledge-risk" element={<KnowledgeRisk />} />
              <Route path="temporal-coupling" element={<TemporalCoupling />} />
            </Route>
            <Route path="/knowledge-risk" element={<KnowledgeRisk />} />
          </Routes>
        </Layout>
      </Router>
    </ApiProvider>
  );
}

export default App;