import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import ProjectHeader from './ProjectHeader';

/*
 * ProjectLayout wraps all project analytics sub-pages with a persistent header + tabs.
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
    <div className="px-4 sm:px-6 lg:px-8 pb-12">
      <ProjectHeader project={project} stats={stats} projectId={id} onRefresh={load} />
      <div>
        <Outlet context={{ project, stats, refresh: load, loading }} />
      </div>
    </div>
  );
};

export default ProjectLayout;
