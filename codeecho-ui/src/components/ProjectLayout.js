import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import ProjectHeader from './ProjectHeader';
import ProjectSectionNav from './ProjectSectionNav';

/*
 * ProjectLayout wraps all project analytics sub-pages with a clean header + navigation tabs.
 * Updated to work with the new minimalist design approach.
 */
const ProjectLayout = () => {
  const { id } = useParams();
  const { api } = useApi();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!api || !id) return;
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.getProject(id),
        api.getProjectStats(id)
      ]);
      setProject(p);
      setStats(s?.stats || {});
    } catch (e) {
      console.error('Failed loading project layout data', e);
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} stats={stats} projectId={id} onRefresh={load} />

      {/* Navigation tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <ProjectSectionNav projectId={id} />
      </div>

      {/* Content area */}
      <div>
        <Outlet context={{ project, stats, refresh: load, loading }} />
      </div>
    </div>
  );
};

export default ProjectLayout;
