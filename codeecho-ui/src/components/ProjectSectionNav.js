import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/*
 * ProjectSectionNav - Clean tabbed navigation for project analytics sections.
 * Updated to match the new minimalist design approach.
 */
const tabs = (projectId) => [
  { key: 'overview', label: 'Overview', to: `/projects/${projectId}` },
  { key: 'hotspots', label: 'Hotspots', to: `/projects/${projectId}/hotspots` },
  { key: 'knowledge-risk', label: 'Knowledge Risk', to: `/projects/${projectId}/knowledge-risk` },
  { key: 'knowledge-ownership', label: 'Knowledge Ownership', to: `/projects/${projectId}/knowledge-ownership` },
  { key: 'temporal-coupling', label: 'Temporal Coupling', to: `/projects/${projectId}/temporal-coupling` },
  { key: 'bus-factor', label: 'Bus Factor', to: `/projects/${projectId}/bus-factor` },
];

const ProjectSectionNav = ({ projectId, className = '', compact = false }) => {
  const location = useLocation();
  const tabDefs = projectId ? tabs(projectId) : [];

  if (!projectId) return null;

  return (
    <nav aria-label="Project sections" className={`w-full ${className}`}>
      <div className="border-b border-gray-200">
        <div className="flex space-x-8 overflow-x-auto">
          {tabDefs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end={tab.key === 'overview'}
              className={({ isActive }) => {
                return `py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`;
              }}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default ProjectSectionNav;
