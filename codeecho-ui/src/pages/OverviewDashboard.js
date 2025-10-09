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
      return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Overview</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Loading project data...
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-6 py-6">
              <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-8">
              <div className="rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-6 py-6">
                <div className="h-24 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
              </div>
              <div className="rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-6 py-6">
                <div className="h-24 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      );
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Overview</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {overviewData.projectName || `Project ${projectId}`} ̧ Technical health and risk analysis
            return (
              <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Overview</h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Loading project data...</p>
                </div>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-6 py-6">
                    <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
                  </div>
                  <div className="space-y-8">
                    <div className="rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-6 py-6">
                      <div className="h-24 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
                    </div>
                    <div className="rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-6 py-6">
                      <div className="h-24 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            );
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Code Health Trend</h3>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Technical Debt Score over time (lower is better)</p>
                      </div>
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
                          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                            <div className="text-center">
                              <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                              <p>No trend data available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-8">
                      <div className="rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-6 py-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{overviewData.totalFiles ?? 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Files</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{overviewData.totalHotspots ?? 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Hotspots</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{overviewData.highCouplingRisks ?? 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">High Coupling Risks</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{overviewData.analysisStatus?.filesScanned ?? 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Files Scanned</div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-6 py-6">
                        <div className="flex items-center">
                          <ClockIcon className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analysis Status</h3>
                        </div>
                        <div className="mt-3">
                          <div className="text-sm text-gray-900 dark:text-white">
                            Status: <span className="font-medium">{overviewData.analysisStatus?.status || 'Unknown'}</span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Last analyzed {formatAnalysisTime(overviewData.analysisStatus?.lastAnalyzed)}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Data is up-to-date</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="px-8 py-6">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analysis Status</h3>
              </div>
              <div className="mt-3">
                <div className="text-sm text-gray-900 dark:text-white">
                  Status: <span className="font-medium">{overviewData.analysisStatus?.status || 'Unknown'}</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last analyzed {formatAnalysisTime(overviewData.analysisStatus?.lastAnalyzed)}
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Data is up-to-date</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;