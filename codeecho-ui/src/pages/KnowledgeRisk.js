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
        {/* Back button removed; navigation handled by persistent tabs */}
        <h1 className="text-xl font-semibold text-gray-900">
          {isProjectSpecific 
            ? `Knowledge Risk Analysis - ${projectName}`
            : 'Knowledge Risk Analysis'}
        </h1>
        <p className="mt-2 text-sm text-gray-600 max-w-3xl">
          {isProjectSpecific
            ? `Ownership concentration, author activity, and bus factor indicators for ${projectName}`
            : 'Select a project below to analyze ownership concentration, author activity, and bus factor indicators.'}
        </p>

        {!isProjectSpecific && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a Project</h2>
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>
            )}
            {allProjects.length === 0 && !error && (
              <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-4 text-center">No projects found. Create or analyze a project first.</div>
            )}
            <div className="border border-gray-200 rounded-md max-h-80 overflow-auto bg-white">
              {allProjects.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/projects/${p.id}/knowledge-risk`)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <span className="truncate font-medium text-gray-900">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-4">ID {p.id}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Ownership Definition */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">What is Knowledge Ownership?</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
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
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="text-gray-400 font-medium">•</span>
                <div><strong className="text-gray-900">Select a Project:</strong> Pick one to view ownership, risk levels, and activity metrics</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 font-medium">•</span>
                <div><strong className="text-gray-900">Filters:</strong> Narrow by owner, path, risk, ownership %, or number of authors</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 font-medium">•</span>
                <div><strong className="text-gray-900">Bus Factor:</strong> Estimated minimum people retaining ≥60% cumulative knowledge</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 font-medium">•</span>
                <div><strong className="text-gray-900">Hotspots & Authors:</strong> Use chart to see concentration of activity</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 font-medium">•</span>
                <div><strong className="text-gray-900">Goal:</strong> Spot fragile high-ownership areas and under-owned critical paths</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeRisk;