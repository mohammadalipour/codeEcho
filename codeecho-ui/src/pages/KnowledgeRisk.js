import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import KnowledgeRiskView from '../components/KnowledgeRiskView';

const KnowledgeRisk = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, projects } = useApi();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const isProjectSpecific = !!id;

  useEffect(() => {
    const load = async () => {
      if (!isProjectSpecific) {
        // Generic page: load project list
        try {
          setLoading(true); setError(null);
          const data = await api.getProjects();
          const list = data.projects || [];
            setAllProjects(list);
        } catch (e) {
          setError('Failed to load projects');
        } finally {
          setLoading(false);
        }
        return;
      }
      // Project specific
      try {
        setLoading(true); setError(null);
        const projectData = await api.getProject(id);
        setProject(projectData);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, api, isProjectSpecific]);

  const projectName = project?.name || (id ? `Project ${id}` : '');

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Constrained width container */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {isProjectSpecific && (
            <button
              type="button"
              onClick={() => {
                // Prefer history back if available and previous page was inside app; fallback to project detail
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(`/projects/${id}`);
                }
              }}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium group"
            >
              <span className="inline-block transition-transform group-hover:-translate-x-0.5">←</span>
              <span>Back to Project</span>
            </button>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isProjectSpecific 
            ? `Knowledge Risk Analysis - ${projectName}`
            : 'Knowledge Risk Analysis'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 max-w-3xl">
          {isProjectSpecific
            ? `Ownership concentration, author activity, and bus factor indicators for ${projectName}`
            : 'Select a project below to analyze ownership concentration, author activity, and bus factor indicators.'}
        </p>

        {!isProjectSpecific && (
          <div className="mt-5 bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Choose a Project</h2>
            {error && (
              <div className="mb-3 text-xs text-red-600">{error}</div>
            )}
            {allProjects.length === 0 && !error && (
              <div className="text-xs text-gray-500">No projects found. Create or analyze a project first.</div>
            )}
            <ul className="divide-y divide-gray-100 max-h-72 overflow-auto text-sm">
              {allProjects.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${p.id}/knowledge-risk`)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="truncate font-medium text-gray-800">{p.name}</span>
                    <span className="text-[11px] text-gray-500 ml-4">ID {p.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Knowledge Ownership Definition */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-purple-800 mb-1">What is Knowledge Ownership?</h3>
          <p className="text-sm text-purple-700 leading-relaxed">
            Knowledge ownership reflects how concentrated understanding of a code area is. Extremely high concentration (one
            person knows everything) creates risk. Extremely low concentration (too many casual editors) can also dilute accountability.
            Aim for balanced distribution with redundancy for critical modules.
          </p>
        </div>
        </div>

        {isProjectSpecific && (
          <KnowledgeRiskView 
            projectId={id}
            className="mb-10"
          />
        )}

        {!isProjectSpecific && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">How to Use</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div>• <strong>Select a Project:</strong> Pick one to view ownership, risk levels, and activity metrics</div>
              <div>• <strong>Filters:</strong> Narrow by owner, path, risk, ownership %, or number of authors</div>
              <div>• <strong>Bus Factor:</strong> Estimated minimum people retaining ≥60% cumulative knowledge</div>
              <div>• <strong>Hotspots & Authors:</strong> Use chart to see concentration of activity</div>
              <div>• <strong>Goal:</strong> Spot fragile high-ownership areas and under-owned critical paths</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeRisk;