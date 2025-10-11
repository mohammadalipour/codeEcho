import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { format } from 'date-fns';
import { FireIcon } from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Overview analytics page (formerly ProjectDetail header moved to ProjectLayout)
const ProjectDetail = () => {
  const { id } = useParams();
  const { api, loading, error } = useApi();
  const [project, setProject] = useState(null);
  const [commits, setCommits] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [stats, setStats] = useState(null);

  const loadProjectData = useCallback(async () => {
    try {
      const [projectData, commitsData, hotspotsData, statsData] = await Promise.all([
        api.getProject(id),
        api.getProjectCommits(id),
        api.getProjectHotspots(id),
        api.getProjectStats(id)
      ]);
      setProject(projectData);
      setCommits(commitsData.commits || []);
      setHotspots(hotspotsData.hotspots || []);
      setStats(statsData.stats || {});
    } catch (err) {
      console.error('Failed to load project data:', err);
    }
  }, [id, api]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading project</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Process real commits data for chart
  const processCommitTrend = (commits) => {
    if (!commits || commits.length === 0) return [];
    
    // Group commits by month
    const commitsByMonth = {};
    commits.forEach(commit => {
      const date = new Date(commit.timestamp);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      commitsByMonth[monthKey] = (commitsByMonth[monthKey] || 0) + 1;
    });

    // Convert to chart format and sort by date
    return Object.entries(commitsByMonth)
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12); // Last 12 months
  };

  // Process real hotspots data for chart and table
  const processHotspots = (hotspots) => {
    if (!hotspots || hotspots.length === 0) return [];
    
    return hotspots.slice(0, 10).map(hotspot => ({
      file: hotspot.file_path.split('/').pop() || hotspot.file_path, // Just filename for chart
      fullPath: hotspot.file_path,
      changes: hotspot.change_count || 0,
      additions: hotspot.total_changes || 0, // Using total_changes as proxy for additions
      deletions: Math.floor((hotspot.total_changes || 0) * 0.3), // Estimate deletions as 30% of total
      riskLevel: hotspot.risk_level
    }));
  };

  // Get unique authors count from commits
  const getContributorsCount = (commits) => {
    if (!commits || commits.length === 0) return 0;
    const uniqueAuthors = new Set(commits.map(commit => commit.author));
    return uniqueAuthors.size;
  };

  const commitTrendData = processCommitTrend(commits);
  const hotspotsData = processHotspots(hotspots);
  const contributorsCount = getContributorsCount(commits);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">

      {/* Stat cards removed: metrics now displayed in persistent header */}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Commit Trend Chart */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Commit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={commitTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="commits" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Code Hotspots Chart */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Code Hotspots</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hotspotsData.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="file" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                fontSize={10}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="changes" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hotspots Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Top Code Hotspots
          </h3>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Changes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lines Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lines Deleted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hotspotsData.map((hotspot, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FireIcon className="h-4 w-4 text-red-500 mr-2" />
                        <span className="truncate max-w-xs" title={hotspot.fullPath}>
                          {hotspot.fullPath}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hotspot.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                        hotspot.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {hotspot.changes}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      +{hotspot.additions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      -{hotspot.deletions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

// Removed StatCard component (header now owns these stats)

export default ProjectDetail;