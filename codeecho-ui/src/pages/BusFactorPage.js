import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

// Time range summary helper component
function TimeRangeSummary({ timeRange, customStart, customEnd }) {
  const text = useMemo(() => {
    if (timeRange === 'all') return 'All time';
    if (timeRange === '3m') return 'Last 3 months';
    if (timeRange === '6m') return 'Last 6 months';
    if (timeRange === '1y') return 'Last 12 months';
    if (timeRange === 'custom') {
      if (!customStart && !customEnd) return 'Select start/end';
      if (customStart && !customEnd) return `${customStart} → today`;
      if (!customStart && customEnd) return `… → ${customEnd}`;
      return `${customStart} → ${customEnd}`;
    }
    return '';
  }, [timeRange, customStart, customEnd]);
  return (
    <div className="mt-1 text-[10px] text-gray-500 flex items-center gap-1">
      <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded">{text}</span>
      {timeRange === 'custom' && customStart && customEnd && customStart > customEnd && (
        <span className="text-red-600">Start after end!</span>
      )}
    </div>
  );
}

const BusFactorPage = () => {
  const { id: projectId } = useParams();
  const { api } = useApi();
  const navigate = useNavigate();

  // State for bus factor data
  const [busFactorData, setBusFactorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters (similar to Knowledge Risk)
  const [timeRange, setTimeRange] = useState('all'); // all | 3m | 6m | 1y | custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [directoryPath, setDirectoryPath] = useState([]); // array of segments representing current directory selection
  const [dirMenuOpen, setDirMenuOpen] = useState(false);
  const [riskLevel, setRiskLevel] = useState('all'); // all | high | medium | low
  const [sortConfig, setSortConfig] = useState({ key: 'bus_factor', direction: 'asc' });

  // Refs for outside click
  const dirMenuRef = useRef(null);

  // Modal state for file ownership details
  const [selectedFile, setSelectedFile] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Outside click close for dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (dirMenuOpen && dirMenuRef.current && !dirMenuRef.current.contains(e.target)) {
        setDirMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dirMenuOpen]);

  // Calculate date range based on time filter
  const getDateRange = () => {
    const now = new Date();
    let startDate = null;
    let endDate = null;

    if (timeRange === 'all') {
      // No date filtering
      return { startDate: null, endDate: null };
    } else if (timeRange === '3m') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      startDate = d.toISOString().split('T')[0];
    } else if (timeRange === '6m') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      startDate = d.toISOString().split('T')[0];
    } else if (timeRange === '1y') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      startDate = d.toISOString().split('T')[0];
    } else if (timeRange === 'custom') {
      startDate = customStart;
      endDate = customEnd;
    }

    return { startDate, endDate };
  };

  // Fetch bus factor data
  const fetchBusFactorData = async () => {
    if (!projectId || !api?.getProjectBusFactor) return;

    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (directoryPath.length > 0) params.append('path', directoryPath.join('/'));
      if (riskLevel !== 'all') params.append('riskLevel', riskLevel);

      const data = await api.getProjectBusFactor(projectId, params.toString());
      setBusFactorData(data);
    } catch (err) {
      console.error('Failed to fetch bus factor data:', err);
      setError('Failed to load bus factor data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchBusFactorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, timeRange, customStart, customEnd, directoryPath, riskLevel]);

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!busFactorData?.files) return [];

    let filtered = [...busFactorData.files];

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === bVal) return 0;
      
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      return (aVal > bVal ? 1 : -1) * multiplier;
    });

    return filtered;
  }, [busFactorData, sortConfig]);

  // Build folder tree (directories only) from file paths
  const folderTree = useMemo(() => {
    if (!busFactorData?.files) return { children: {}, count: 0 };
    
    const root = { children: {}, count: 0 };
    busFactorData.files.forEach(f => {
      const parts = f.file.split('/').filter(Boolean);
      let node = root;
      parts.forEach((segment, idx) => {
        if (idx < parts.length - 1) { // Only create directory nodes, not files
          if (!node.children[segment]) node.children[segment] = { children: {}, count: 0 };
          node = node.children[segment];
          node.count++;
        }
      });
    });
    return root;
  }, [busFactorData]);

  const currentDirNode = useMemo(() => {
    let node = folderTree;
    for (const seg of directoryPath) {
      node = node.children[seg] || { children: {}, count: 0 };
    }
    return node;
  }, [folderTree, directoryPath]);

  const directoryChildren = useMemo(() => {
    return Object.entries(currentDirNode.children)
      .map(([name, n]) => ({ name, count: n.count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentDirNode]);

  // Calculate active filter count
  const activeFilterCount = [
    directoryPath.length > 0,
    riskLevel !== 'all',
    timeRange !== 'all'
  ].filter(Boolean).length;

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Chart data for bus factor distribution
  const chartData = useMemo(() => {
    if (!busFactorData?.summary?.distribution) return [];

    return Object.entries(busFactorData.summary.distribution)
      .map(([busFactor, count]) => ({
        busFactor: parseInt(busFactor),
        count,
        color: parseInt(busFactor) === 1 ? '#ef4444' : parseInt(busFactor) === 2 ? '#f97316' : '#10b981'
      }))
      .sort((a, b) => a.busFactor - b.busFactor);
  }, [busFactorData]);

  // Get risk level styling
  const getRiskStyling = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'medium':
        return 'bg-orange-50 border-l-4 border-orange-500';
      case 'low':
        return 'bg-green-50 border-l-4 border-green-500';
      default:
        return 'bg-white';
    }
  };

  // Get risk badge styling
  const getRiskBadge = (riskLevel, busFactor) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (riskLevel) {
      case 'high':
        return `${baseClasses} bg-red-100 text-red-700`;
      case 'medium':
        return `${baseClasses} bg-orange-100 text-orange-700`;
      case 'low':
        return `${baseClasses} bg-green-100 text-green-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setTimeRange('all');
    setCustomStart('');
    setCustomEnd('');
    setDirectoryPath([]);
    setRiskLevel('all');
    setCurrentPage(1);
  };

  const onChangeTimeRange = (val) => {
    setTimeRange(val);
    if (val !== 'custom') { 
      setCustomStart(''); 
      setCustomEnd(''); 
    }
  };

  // Handle developer click to navigate to Knowledge Ownership
  const handleDeveloperClick = (developerName) => {
    navigate(`/projects/${projectId}/knowledge-ownership?developer=${encodeURIComponent(developerName)}`);
  };

  // Handle file click to show ownership modal
  const handleFileClick = (file) => {
    setSelectedFile(file);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Bus Factor Analysis</h1>
        <p className="text-sm text-gray-600 max-w-3xl">
          Measures project resilience to developer turnover. Bus Factor indicates the minimum number of developers 
          that must leave before critical knowledge is lost. Lower values indicate higher risk.
        </p>
      </div>

      {/* Summary Cards */}
      {busFactorData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Files</div>
            <div className="text-2xl font-semibold text-gray-900">{busFactorData.summary.total_files}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm font-medium text-red-600">High Risk</div>
            <div className="text-2xl font-semibold text-red-700">{busFactorData.summary.high_risk_files}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm font-medium text-orange-600">Medium Risk</div>
            <div className="text-2xl font-semibold text-orange-700">{busFactorData.summary.medium_risk_files}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm font-medium text-green-600">Low Risk</div>
            <div className="text-2xl font-semibold text-green-700">{busFactorData.summary.low_risk_files}</div>
          </div>
        </div>
      )}

      {/* Filter Panel (Knowledge Risk Style) */}
      <div className="bg-white rounded-lg shadow px-6 pt-4 pb-3 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <span className="flex items-center gap-1">Filters {activeFilterCount>0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">{activeFilterCount}</span>}</span>
            <span className="text-xs text-gray-400 font-normal">Showing {processedData.length} of {busFactorData?.summary?.total_files || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetFilters} className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100">Reset</button>
          </div>
        </div>

        {/* Basic Filters - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Directory Filter */}
          <div className="relative">
            <label className="flex items-center text-[11px] font-medium text-gray-600 mb-1 gap-1">Directory</label>
            <button type="button" onClick={()=>setDirMenuOpen(o=>!o)} className="w-full h-10 px-3 text-left border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between hover:border-gray-400">
              <span className="truncate">{directoryPath.length ? '/' + directoryPath.join('/') : 'All Directories'}</span>
              <ChevronDownIcon className={`h-4 w-4 transition ${dirMenuOpen ? 'rotate-180': ''}`} />
            </button>
            {dirMenuOpen && (
              <div ref={dirMenuRef} className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-2 text-xs max-h-80 overflow-auto">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-blue-700">
                      <button type="button" onClick={()=>setDirectoryPath([])} className="hover:underline">root</button>
                      {directoryPath.map((seg, idx) => (
                        <React.Fragment key={idx}>
                          <span className="text-gray-400">/</span>
                          <button type="button" onClick={()=>setDirectoryPath(directoryPath.slice(0, idx+1))} className="hover:underline truncate max-w-[80px]">{seg}</button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  {directoryPath.length>0 && <button className="text-[10px] text-blue-600 whitespace-nowrap" onClick={()=>setDirectoryPath(p=>p.slice(0,-1))}>Up</button>}
                </div>
                {directoryChildren.map(d => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={()=>setDirectoryPath(p=>[...p, d.name])}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-gray-50 text-left"
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="text-[10px] text-gray-400">{d.count}</span>
                  </button>
                ))}
                {directoryChildren.length===0 && <div className="text-gray-400 px-2 py-1">No subfolders</div>}
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                  <button onClick={()=>setDirectoryPath([])} className="text-[10px] text-blue-600 hover:underline">Clear</button>
                  <button onClick={()=>setDirMenuOpen(false)} className="text-[10px] text-blue-600 hover:underline">Close</button>
                </div>
              </div>
            )}
          </div>

          {/* Time Range (Knowledge Risk Style) */}
          <div className="relative flex flex-col">
            <label className="flex items-center text-[11px] font-medium text-gray-600 mb-1 gap-1">Time Range</label>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {[
                {key:'all', label:'All'},
                {key:'3m', label:'3M'},
                {key:'6m', label:'6M'},
                {key:'1y', label:'1Y'},
                {key:'custom', label:'Custom'}
              ].map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={()=>onChangeTimeRange(r.key)}
                  className={`px-2.5 py-1 text-[11px] rounded-md border transition ${timeRange===r.key ? 'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >{r.label}</button>
              ))}
            </div>
            {timeRange === 'custom' && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="flex items-center text-[10px] font-medium text-gray-500 mb-0.5">Start</label>
                  <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="w-full h-9 px-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex-1">
                  <label className="flex items-center text-[10px] font-medium text-gray-500 mb-0.5">End</label>
                  <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="w-full h-9 px-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}
            <TimeRangeSummary timeRange={timeRange} customStart={customStart} customEnd={customEnd} />
          </div>
        </div>

        {/* Quick Risk Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-3 select-none">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />High</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />Medium</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />Low</span>
          </div>
          <div className="flex items-center gap-1">
            {['high','medium','low'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRiskLevel(prev => prev === r ? 'all' : r)}
                className={`px-2 py-1 rounded-md border transition ${riskLevel===r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >{r.charAt(0).toUpperCase()+r.slice(1)}</button>
            ))}
          </div>
        </div>

        {/* Active Filter Badges */}
        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          {directoryPath.length>0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Dir: /{directoryPath.join('/')}<button onClick={()=>setDirectoryPath([])} className="hover:text-purple-900">×</button></span>}
          {riskLevel !== 'all' && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${riskLevel==='high'?'bg-red-100 text-red-700':riskLevel==='medium'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>Risk: {riskLevel}<button onClick={()=>setRiskLevel('all')} className="hover:opacity-80">×</button></span>}
          {timeRange && timeRange !== 'all' && timeRange !== 'custom' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{timeRange==='3m'?'3 mo':timeRange==='6m'?'6 mo':'1 yr'}<button onClick={()=>setTimeRange('all')} className="hover:text-gray-900" title="Reset to all">↺</button></span>}
          {timeRange === 'custom' && (customStart || customEnd) && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{customStart || '…'} → {customEnd || '…'}<button onClick={()=>{setCustomStart(''); setCustomEnd(''); setTimeRange('all');}} className="hover:text-gray-900" title="Clear custom">×</button></span>}
        </div>
      </div>

      {/* Bus Factor Distribution Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Bus Factor Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="busFactor" 
                  label={{ value: 'Bus Factor', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  label={{ value: 'Number of Files', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Bar dataKey="count" fill={(entry) => entry.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Files Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">
            Files ({processedData.length} of {busFactorData?.summary?.total_files || 0})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('file')}
                >
                  File
                  {sortConfig.key === 'file' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('bus_factor')}
                >
                  Bus Factor
                  {sortConfig.key === 'bus_factor' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Top Authors
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('risk_level')}
                >
                  Risk Level
                  {sortConfig.key === 'risk_level' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('last_modified')}
                >
                  Last Modified
                  {sortConfig.key === 'last_modified' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((file, index) => (
                <tr 
                  key={index} 
                  className={`hover:bg-gray-50 cursor-pointer ${getRiskStyling(file.risk_level)}`}
                  onClick={() => handleFileClick(file)}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-mono text-gray-900 truncate max-w-xs">
                      {file.file}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {file.bus_factor}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {file.top_authors?.slice(0, 2).map((author, idx) => (
                        <React.Fragment key={author.author}>
                          {idx > 0 && ', '}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeveloperClick(author.author);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            title={`View files owned by ${author.author}`}
                          >
                            {author.author}
                          </button>
                        </React.Fragment>
                      ))}
                      {file.top_authors?.length > 2 && (
                        <span className="text-gray-500"> +{file.top_authors.length - 2} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={getRiskBadge(file.risk_level, file.bus_factor)}>
                      {file.risk_level} ({file.bus_factor})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-500">
                      {file.last_modified ? new Date(file.last_modified).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} files
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Ownership Modal */}
      {showModal && selectedFile && (
        <FileOwnershipModal 
          file={selectedFile} 
          onClose={() => setShowModal(false)}
          onDeveloperClick={handleDeveloperClick}
        />
      )}
    </div>
  );
};

// Modal component for showing file ownership distribution
const FileOwnershipModal = ({ file, onClose, onDeveloperClick }) => {
  const pieData = file.ownership_distribution?.map((owner, index) => ({
    name: owner.author,
    value: owner.ownership_percent,
    commits: owner.commits,
    color: `hsl(${(index * 360) / file.ownership_distribution.length}, 70%, 50%)`
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">File Ownership Distribution</h2>
            <p className="text-sm text-gray-600 font-mono">{file.file}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Ownership by Author</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Ownership']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Author List */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Author Details</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {file.ownership_distribution?.map((owner, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: pieData?.[index]?.color }}
                    ></div>
                    <button
                      onClick={() => onDeveloperClick && onDeveloperClick(owner.author)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      title={`View files owned by ${owner.author}`}
                    >
                      {owner.author}
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {owner.ownership_percent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {owner.commits} commits
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <div className="font-medium text-blue-900">Bus Factor</div>
            <div className="text-xl font-bold text-blue-700">{file.bus_factor}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-900">Total Commits</div>
            <div className="text-xl font-bold text-gray-700">{file.total_commits}</div>
          </div>
          <div className={`p-3 rounded ${
            file.risk_level === 'high' ? 'bg-red-50' :
            file.risk_level === 'medium' ? 'bg-orange-50' : 'bg-green-50'
          }`}>
            <div className={`font-medium ${
              file.risk_level === 'high' ? 'text-red-900' :
              file.risk_level === 'medium' ? 'text-orange-900' : 'text-green-900'
            }`}>Risk Level</div>
            <div className={`text-xl font-bold ${
              file.risk_level === 'high' ? 'text-red-700' :
              file.risk_level === 'medium' ? 'text-orange-700' : 'text-green-700'
            }`}>{file.risk_level}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusFactorPage;