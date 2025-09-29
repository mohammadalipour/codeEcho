import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const OverviewDashboard = () => {
  const { projectId } = useParams();
  const { api } = useApi();
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Prefer the central ApiContext if available
        if (api && typeof api.getProjectOverview === 'function') {
          const data = await api.getProjectOverview(projectId);
          setOverviewData(data);
        } else {
          const res = await fetch(`/api/v1/projects/${projectId}/overview`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setOverviewData(data);
        }
      } catch (e) {
        console.error('Failed to load overview data:', e);
        setError('Failed to load project overview data');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchOverviewData();
  }, [projectId, api]);

  const formatAnalysisTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const toDebtTrendSeries = (trend) => {
    if (!Array.isArray(trend)) return [];
    // Accept both pre-formatted {month, score} or {date,value}
    return trend.map((p) => {
      if (p.month !== undefined && p.score !== undefined) return p;
      const month = p.date
        ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '';
      const score = Math.round(((p.value ?? 0) + Number.EPSILON) * 100) / 1; // keep int-ish
      return { month, score };
    });
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading overview</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500">No overview data available</div>
      </div>
    );
  }

  const debtTrendData = toDebtTrendSeries(overviewData.technicalDebtTrend);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Project Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          {overviewData.projectName || `Project ${projectId}`} • Technical health and risk analysis
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Code Health Trend</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">Technical Debt Score over time (lower is better)</p>
          </div>
          <div className="px-6 py-4">
            <div className="h-64">
              {debtTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={debtTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }} />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No trend data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{overviewData.totalFiles ?? 0}</div>
                  <div className="text-sm text-gray-600">Total Files</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{overviewData.totalHotspots ?? 0}</div>
                  <div className="text-sm text-gray-600">Total Hotspots</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{overviewData.highCouplingRisks ?? 0}</div>
                  <div className="text-sm text-gray-600">High Coupling Risks</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{overviewData.analysisStatus?.filesScanned ?? 0}</div>
                  <div className="text-sm text-gray-600">Files Scanned</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-6 py-4">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Analysis Status</h3>
              </div>
              <div className="mt-3">
                <div className="text-sm text-gray-900">
                  Status: <span className="font-medium">{overviewData.analysisStatus?.status || 'Unknown'}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Last analyzed {formatAnalysisTime(overviewData.analysisStatus?.lastAnalyzed)}
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700">Data is up-to-date</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;