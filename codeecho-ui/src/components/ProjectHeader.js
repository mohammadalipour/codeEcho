import React from 'react';
import ProjectSectionNav from './ProjectSectionNav';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';

/*
 * ProjectHeader – fancy project hero + actions + sticky tabs.
 * Props:
 *  project: { name, repo_path }
 *  stats: { total_commits, contributors, total_hotspots, last_commit }
 *  projectId: string
 *  onRefresh: fn()
 */
const StatPill = ({ label, value }) => (
  <div className="flex flex-col px-3 py-2 rounded-md bg-white/10 backdrop-blur text-xs min-w-[90px]">
    <span className="uppercase tracking-wide text-[10px] text-white/70 font-medium">{label}</span>
    <span className="text-sm font-semibold tabular-nums">{value ?? '—'}</span>
  </div>
);

const ProjectHeader = ({ project, stats, projectId, onRefresh }) => {
  const location = useLocation();
  // Provide public API for nav component: pass projectId only; nav handles active state.
  return (
    <div className="relative mb-6">
      <div className="rounded-xl overflow-hidden shadow ring-1 ring-black/10">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-800 to-indigo-600 p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
                <span>{project?.name || `Project ${projectId}`}</span>
                {project?.private && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-semibold uppercase">Private</span>
                )}
              </h1>
              {project?.repo_path && (
                <p className="mt-2 text-sm text-white/70 font-medium break-all">{project.repo_path}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 transition-colors px-4 py-2 text-sm font-medium shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60"
              >
                <ArrowPathIcon className="h-5 w-5" /> Refresh
              </button>
            </div>
          </div>
          {/* Stat Pills */}
          <div className="mt-6 flex flex-wrap gap-3">
            <StatPill label="Commits" value={stats?.total_commits ?? '0'} />
            <StatPill label="Contributors" value={stats?.contributors ?? '0'} />
            <StatPill label="Hotspots" value={stats?.total_hotspots ?? '0'} />
            <StatPill label="Last Commit" value={stats?.last_commit ? new Date(stats.last_commit).toLocaleDateString() : '—'} />
          </div>
        </div>
        {/* Sticky Nav */}
        <div className="bg-white sticky top-0 z-10 border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <ProjectSectionNav projectId={projectId} enhanced />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
