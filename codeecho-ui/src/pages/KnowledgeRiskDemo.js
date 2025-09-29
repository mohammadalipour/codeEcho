import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import KnowledgeRiskView from '../components/KnowledgeRiskView';

const KnowledgeRiskDemo = () => {
  const { id } = useParams();
  const { api } = useApi();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProject = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const projectData = await api.getProject(id);
        setProject(projectData);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id, api]);

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

  const isProjectSpecific = !!id;
  const projectName = project?.name || `Project ${id}`;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isProjectSpecific 
            ? `Knowledge Risk Analysis - ${projectName}`
            : 'Knowledge Risk Analysis Demo'
          }
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isProjectSpecific
            ? `Analyze file ownership patterns and identify knowledge concentration risks for ${projectName}`
            : 'Analyze file ownership patterns and identify knowledge concentration risks'
          }
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {isProjectSpecific ? 'Project Data Unavailable' : 'Demo Mode'}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{isProjectSpecific 
                  ? `${error}. The analysis shows mock data for demonstration.`
                  : 'This project hasn\'t been analyzed yet. The analysis shows mock data for demonstration.'
                }</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <KnowledgeRiskView 
        projectId={id || "demo-project"}
        className="mb-8"
      />

      {/* Usage instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">How to Use</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div>• <strong>Sortable Table:</strong> Click column headers to sort by File Path, Author, or Contribution %</div>
          <div>• <strong>Knowledge Loss Risk Filter:</strong> Toggle to show only files where top 2 authors own &gt;90% of code</div>
          <div>• <strong>Risk Indicators:</strong> Color-coded badges show risk levels (High/Medium/Low)</div>
          <div>• <strong>Author Hotspots Chart:</strong> Shows top 5 authors by recent hotspot contributions</div>
          <div>• <strong>Summary Stats:</strong> Quick overview of files, risks, and author activity</div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Risk Assessment Logic:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div>• <span className="font-medium text-red-700">High Risk:</span> Top 2 authors contribute &gt;90% of code</div>
            <div>• <span className="font-medium text-yellow-700">Medium Risk:</span> Top 2 authors contribute 70-90% of code</div>
            <div>• <span className="font-medium text-green-700">Low Risk:</span> Top 2 authors contribute &lt;70% of code</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeRiskDemo;