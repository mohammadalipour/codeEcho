import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../services/ApiContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  ExclamationTriangleIcon,
  UsersIcon,
  DocumentIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const KnowledgeRiskView = ({ projectId, className = "" }) => {
  const { api } = useApi();
  const [fileOwnership, setFileOwnership] = useState([]);
  const [authorHotspots, setAuthorHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRiskOnly, setShowRiskOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    const loadKnowledgeRiskData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!projectId || projectId === 'demo-project') {
          setFileOwnership([]);
          setAuthorHotspots([]);
          setError('No project selected or analysis not available yet.');
          return;
        }

        const knowledgeRiskData = await api.getProjectKnowledgeRisk(projectId);
        setFileOwnership(knowledgeRiskData.fileOwnership || []);
        setAuthorHotspots(knowledgeRiskData.authorHotspots || []);
      } catch (err) {
        console.error('Failed to load knowledge risk data:', err);
        setError('Failed to load knowledge risk data');
        setFileOwnership([]);
        setAuthorHotspots([]);
      } finally {
        setLoading(false);
      }
    };

    loadKnowledgeRiskData();
  }, [projectId, api]);

  // Calculate knowledge loss risk for each file
  const processedFileData = useMemo(() => {
    return fileOwnership.map(file => {
      const sortedAuthors = [...file.authors].sort((a, b) => b.contribution - a.contribution);
      const primaryAuthor = sortedAuthors[0] || { name: 'Unknown', contribution: 0 };
      const secondaryAuthor = sortedAuthors[1];
      const topTwoContribution = primaryAuthor.contribution + (secondaryAuthor?.contribution || 0);
      const isHighRisk = topTwoContribution > 90;
      return {
        ...file,
        primaryAuthor: primaryAuthor.name,
        primaryContribution: primaryAuthor.contribution,
        topTwoContribution,
        isHighRisk
      };
    });
  }, [fileOwnership]);

  // Filter data based on risk toggle
  const filteredData = useMemo(() => {
    if (showRiskOnly) {
      return processedFileData.filter(file => file.isHighRisk);
    }
    return processedFileData;
  }, [processedFileData, showRiskOnly]);

  // Sort data based on current sort configuration
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredData, sortConfig]);

  // Handle table sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sort icon for column headers
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUpIcon className="h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUpIcon className="h-4 w-4 text-blue-500" /> : 
      <ChevronDownIcon className="h-4 w-4 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UsersIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">Knowledge Risk Analysis</h2>
          </div>
          <button
            onClick={() => setShowRiskOnly(!showRiskOnly)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showRiskOnly
                ? 'bg-red-100 text-red-700 border-2 border-red-300'
                : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
            }`}
          >
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            Knowledge Loss Risk
            {showRiskOnly && (
              <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                &gt;90%
              </span>
            )}
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Analyzing file ownership patterns and knowledge concentration risks
          {showRiskOnly && (
            <span className="ml-2 text-red-600 font-medium">
              • Showing high-risk files only ({sortedData.length} files)
            </span>
          )}
        </div>
      </div>

      {/* File Ownership Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <DocumentIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">File Ownership Distribution</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => handleSort('filePath')} className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center space-x-1">
                    <span>File Path</span>
                    {getSortIcon('filePath')}
                  </div>
                </th>
                <th onClick={() => handleSort('primaryAuthor')} className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center space-x-1">
                    <span>Primary Author</span>
                    {getSortIcon('primaryAuthor')}
                  </div>
                </th>
                <th onClick={() => handleSort('primaryContribution')} className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center space-x-1">
                    <span>Primary Author Contribution (%)</span>
                    {getSortIcon('primaryContribution')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Lines</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((file, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <DocumentIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {file.filePath}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{file.primaryAuthor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          file.primaryContribution >= 70 
                            ? 'bg-red-100 text-red-800' 
                            : file.primaryContribution >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {file.primaryContribution}%
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      file.isHighRisk
                        ? 'bg-red-100 text-red-800'
                        : file.topTwoContribution > 70
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {file.isHighRisk ? 'High' : file.topTwoContribution > 70 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(file.totalLines || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.lastModified || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedData.length === 0 && (
          <div className="px-6 py-12 text-center">
            <DocumentIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-sm text-gray-500">
              {showRiskOnly 
                ? 'No high-risk files match the current filter criteria.'
                : 'No file ownership data available.'}
            </p>
          </div>
        )}
      </div>

      {/* Author Hotspots Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Top Authors by Recent Hotspots</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">Authors ranked by number of hotspots they have contributed to recently</p>
        </div>
        <div className="px-6 py-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={authorHotspots} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="author" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: 'Hotspots Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }} formatter={(value) => [value, 'Hotspots']} />
                <Bar dataKey="hotspots" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Files</dt>
                  <dd className="text-lg font-medium text-gray-900">{processedFileData.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">High Risk Files</dt>
                  <dd className="text-lg font-medium text-red-600">{processedFileData.filter(f => f.isHighRisk).length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Authors</dt>
                  <dd className="text-lg font-medium text-blue-600">{authorHotspots.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Hotspots</dt>
                  <dd className="text-lg font-medium text-green-600">{authorHotspots.reduce((sum, a) => sum + (a.hotspots || 0), 0)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeRiskView;