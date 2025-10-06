import React, { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/*
 * ProjectSectionNav - Tabbed navigation for project analytics sections.
 * Accessible: uses nav + ul + role attributes; keyboard focusable.
 */
const tabs = (projectId) => [
  { key: 'overview', label: 'Overview', to: `/projects/${projectId}` },
  { key: 'hotspots', label: 'Hotspots', to: `/projects/${projectId}/hotspots` },
  { key: 'knowledge-risk', label: 'Knowledge Risk', to: `/projects/${projectId}/knowledge-risk` },
  { key: 'knowledge-ownership', label: 'Knowledge Ownership', to: `/projects/${projectId}/knowledge-ownership` },
  { key: 'temporal-coupling', label: 'Temporal Coupling', to: `/projects/${projectId}/temporal-coupling` },
  { key: 'bus-factor', label: 'Bus Factor', to: `/projects/${projectId}/bus-factor` },
];

const ProjectSectionNav = ({ projectId, className = '', enhanced = false }) => {
  const location = useLocation();
  const underlineRef = useRef(null);
  const containerRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  const tabDefs = projectId ? tabs(projectId) : [];
  const activeIndex = tabDefs.findIndex(t => location.pathname === t.to || (t.key === 'overview' && location.pathname === `/projects/${projectId}`));

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!enhanced || !underlineRef.current || activeIndex === -1) return;
    const list = containerRef.current?.querySelectorAll('[data-tab-item]');
    if (!list || !list[activeIndex]) return;
    const el = list[activeIndex];
    const rect = el.getBoundingClientRect();
    const parentRect = containerRef.current.getBoundingClientRect();
    const left = rect.left - parentRect.left + containerRef.current.scrollLeft;
    underlineRef.current.style.width = rect.width + 'px';
    underlineRef.current.style.transform = `translateX(${left}px)`;
  }, [activeIndex, enhanced, location.pathname]);

  const baseClasses = 'relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium focus:outline-none transition-colors rounded-md';

  if (!projectId) return null;
  return (
    <nav aria-label="Project sections" className={`${enhanced ? '' : 'border-b border-gray-200'} ${className}`}>
      <div ref={containerRef} className={`relative ${enhanced ? 'overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300' : ''}`}>
        {enhanced && (
          <span
            ref={underlineRef}
            className={`pointer-events-none absolute bottom-0 h-0.5 bg-gradient-to-r from-indigo-400 to-fuchsia-400 rounded-full transition-all duration-300 ease-out ${mounted ? 'opacity-100' : 'opacity-0'}`}
            style={{ left: 0, width: 0 }}
          />
        )}
        <ul role="tablist" className="flex flex-nowrap gap-2 min-w-max py-1 pr-4">
          {tabDefs.map((tab, idx) => (
            <li key={tab.key} role="presentation" data-tab-item>
              <NavLink
                to={tab.to}
                end={tab.key === 'overview'}
                role="tab"
                className={({ isActive }) => {
                  if (enhanced) {
                    return `${baseClasses} ${isActive ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 bg-white/30 backdrop-blur'} focus-visible:ring-2 focus-visible:ring-indigo-500/70`;
                  }
                  return `${baseClasses} border-b-2 rounded-t-md ${isActive ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`;
                }}
              >
                <span className="relative z-10">{tab.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default ProjectSectionNav;
