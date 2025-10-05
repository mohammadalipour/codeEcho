import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import HotspotTreemapComponent from '../components/HotspotTreemap';
import HotspotFilters from '../components/HotspotFilters';

// Clean refactored HotspotTreemap page with time range filtering
const HotspotTreemap = () => {
  const { id: projectId } = useParams();
  const { api } = useApi();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Time range filter state
  const [timeRange, setTimeRange] = useState('all'); // all | 3months | 6months | 1year | custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [repository, setRepository] = useState('all');
  const [pathFilter, setPathFilter] = useState(''); // selected directory path
  const [debouncedPath, setDebouncedPath] = useState('');
  const [directories, setDirectories] = useState([]); // derived from hotspots
  const [directoryCounts, setDirectoryCounts] = useState({}); // map dir -> file count
  // Complexity filters
  const [complexityMetric, setComplexityMetric] = useState('cyclomatic'); // cyclomatic | cognitive | loc
  const [minComplexity, setMinComplexity] = useState(10);
  // Change frequency filter
  const [minChanges, setMinChanges] = useState(0);
  // File types filter
  const [selectedFileTypes, setSelectedFileTypes] = useState([]); // array of extensions without leading dot
  const [availableFileTypes, setAvailableFileTypes] = useState([]);
  const [fileTypeCounts, setFileTypeCounts] = useState({});
  // Risk level filter
  const [riskLevel, setRiskLevel] = useState('all'); // all | High | Medium | Low
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState(null);

  const computeRange = useCallback(() => {
    const now = new Date();
    const start = new Date();
    switch (timeRange) {
      case '3months':
        start.setMonth(now.getMonth() - 3);
        return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
      case '6months':
        start.setMonth(now.getMonth() - 6);
        return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
      case '1year':
        start.setFullYear(now.getFullYear() - 1);
        return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
      case 'custom':
        return { startDate: startDate || null, endDate: endDate || null };
      case 'all':
      default:
        return { startDate: null, endDate: null };
    }
  }, [timeRange, startDate, endDate]);

  // Load project meta (optional)
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || !api?.getProject) return;
      try {
        const p = await api.getProject(projectId);
        setProject(p);
      } catch (e) {
        console.warn('Failed to load project meta', e);
      }
    };
    loadProject();
  }, [projectId, api]);

  // Load project stats to get total hotspots count
  useEffect(() => {
    const loadStats = async () => {
      if (!projectId || !api?.getProjectStats) return;
      try {
        const statsData = await api.getProjectStats(projectId);
        setStats(statsData.stats || {});
      } catch (e) {
        console.warn('Failed to load project stats', e);
      }
    };
    loadStats();
  }, [projectId, api]);

  // Fetch repositories list (microservices)
  useEffect(() => {
    const fetchRepos = async () => {
      if (!api?.getRepositories) return;
      try {
        const list = await api.getRepositories();
        setRepositories(list);
      } catch (e) {
        console.warn('Failed to load repositories list', e);
      }
    };
    fetchRepos();
  }, [api]);

  // Reset page to 1 when filters change (but not when just pagination changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [timeRange, startDate, endDate, repository, debouncedPath, complexityMetric, minComplexity, minChanges, selectedFileTypes, riskLevel, pageSize]);

  // Fetch hotspots when filters change
  useEffect(() => {
    const fetchHotspots = async () => {
      if (!projectId || !api?.getProjectHotspots) return;
      setLoading(true);
      setError(null);
      try {
        console.log('Fetching hotspots for page:', currentPage, 'pageSize:', pageSize);
        const { startDate: s, endDate: e } = computeRange();
        const data = await api.getProjectHotspots(projectId, s, e, repository, debouncedPath, complexityMetric, minComplexity, minChanges, selectedFileTypes, riskLevel, currentPage, pageSize);
        const hs = Array.isArray(data) ? data : (data?.hotspots || []);
        console.log('Received hotspots:', hs.length, 'Pagination:', data?.pagination);
        setHotspots(hs);
        setPagination(data?.pagination || null);
      } catch (err) {
        let serverMessage = err?.response?.data?.error || err?.response?.data?.message;
        const detail = err?.response?.data?.detail;
        if (detail) serverMessage = serverMessage ? `${serverMessage}: ${detail}` : detail;
        console.error('Error loading hotspots:', err, 'serverMessage:', serverMessage);
        setError(serverMessage || 'Failed to load hotspots');
        setHotspots([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHotspots();
  }, [projectId, computeRange, api, repository, debouncedPath, complexityMetric, minComplexity, minChanges, selectedFileTypes, riskLevel, currentPage, pageSize]);

  // Debounce path selection (still keep in case we later allow typing)
  useEffect(() => {
    const h = setTimeout(() => setDebouncedPath(pathFilter), 150);
    return () => clearTimeout(h);
  }, [pathFilter]);

  // Derive directory list and file types from current hotspots (only when no explicit debounced path filtering beyond selection)
  useEffect(() => {
    if (!hotspots || hotspots.length === 0) {
      setDirectories([]);
      setDirectoryCounts({});
      setAvailableFileTypes([]);
      setFileTypeCounts({});
      return;
    }
    const dirSet = new Set();
    const counts = {};
    const ftCounts = {};
    hotspots.forEach(h => {
      if (!h.file_path) return;
      const parts = h.file_path.split('/').filter(Boolean);
      let cumulative = '';
      for (let i = 0; i < parts.length - 1; i++) { // exclude filename for directory accumulation
        cumulative = cumulative ? `${cumulative}/${parts[i]}` : parts[i];
        dirSet.add(cumulative);
      }
      // Count this file toward each directory it belongs to
      cumulative = '';
      for (let i = 0; i < parts.length - 1; i++) {
        cumulative = cumulative ? `${cumulative}/${parts[i]}` : parts[i];
        counts[cumulative] = (counts[cumulative] || 0) + 1;
      }
      // File type extraction
      const fileName = parts[parts.length - 1];
      if (fileName && fileName.includes('.')) {
        const ext = fileName.split('.').pop().toLowerCase();
        if (ext && ext.length <= 8) {
          ftCounts[ext] = (ftCounts[ext] || 0) + 1;
        }
      }
    });
    const sorted = Array.from(dirSet).sort((a,b)=> a.localeCompare(b));
    setDirectories(sorted);
    setDirectoryCounts(counts);
    const ftList = Object.keys(ftCounts).sort((a,b)=> ftCounts[b]-ftCounts[a] || a.localeCompare(b));
    setAvailableFileTypes(ftList);
    setFileTypeCounts(ftCounts);
  }, [hotspots]);

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    if (range !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleCustomDateChange = (field, value) => {
    if (field === 'start') setStartDate(value); else setEndDate(value);
  };

  // Data transformation for treemap visualization
  const getMockProjectData = () => [
    { name: 'src', riskScore: 0.6, size: 1000, changeFrequency: 10, children: [] }
  ];

  const transformHotspotsToTreemap = (hotspots) => {
    if (!hotspots || hotspots.length === 0) return getMockProjectData();

    const result = [];
    hotspots.forEach(h => {
      if (!h.file_path) return;
      const parts = h.file_path.split('/').filter(Boolean);
      if (!parts.length) return;
      let level = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        let folder = level.find(x => x.name === folderName);
        if (!folder) {
          folder = { name: folderName, riskScore: 0.3, size: 0, changeFrequency: 0, children: [] };
          level.push(folder);
        }
        level = folder.children;
      }
      const fileName = parts[parts.length - 1];
      const riskScore = h.risk_level === 'High' ? 0.8 : h.risk_level === 'Medium' ? 0.5 : 0.2;
      level.push({
        name: fileName,
        riskScore,
        size: Math.max(h.total_changes || h.change_count || 20, 10),
        changeFrequency: h.change_count || 1
      });
    });
    const aggregate = (items) => {
      items.forEach(item => {
        if (item.children && item.children.length) {
          aggregate(item.children);
          item.size = item.children.reduce((s, c) => s + (c.size || 0), 0);
          const risks = item.children.map(c => c.riskScore || 0);
          item.riskScore = risks.reduce((s, r) => s + r, 0) / risks.length;
          item.changeFrequency = item.children.reduce((s, c) => s + (c.changeFrequency || 0), 0);
        }
      });
    };
    aggregate(result);
    return result;
  };

  // Client-side filter if backend didn't filter by path (common until server updated)
  const filteredHotspots = React.useMemo(() => {
    let base = hotspots;
    if (!hotspots || hotspots.length === 0) return hotspots;
    if (debouncedPath) {
      const prefix = debouncedPath.endsWith('/') ? debouncedPath : debouncedPath + '/';
        base = base.filter(h => h.file_path && (h.file_path === debouncedPath || h.file_path.startsWith(prefix)));
    }
    if (selectedFileTypes && selectedFileTypes.length > 0) {
      base = base.filter(h => {
        if (!h.file_path) return false;
        const name = h.file_path.split('/').pop();
        if (!name || !name.includes('.')) return false;
        const ext = name.split('.').pop().toLowerCase();
        return selectedFileTypes.includes(ext);
      });
    }
    if (riskLevel !== 'all') {
      base = base.filter(h => h.risk_level === riskLevel);
    }
    return base;
  }, [hotspots, debouncedPath, selectedFileTypes, riskLevel]);

  let treemapData = transformHotspotsToTreemap(filteredHotspots);
  // If filtering by riskLevel, slightly amplify matching nodes' riskScore and dim others for visual emphasis.
  if (riskLevel !== 'all' && treemapData && treemapData.length) {
    const adjust = (nodes) => {
      nodes.forEach(n => {
        if (n.children && n.children.length) {
          adjust(n.children);
          // recompute aggregated risk after child adjustments
          const risks = n.children.map(c => c.riskScore || 0);
          n.riskScore = risks.reduce((s,r)=>s+r,0) / (risks.length || 1);
        } else {
          // leaf heuristic: boost if matches risk, dim otherwise
          if (n.name) {
            // We don't have direct risk_level stored in node, approximate by thresholding existing riskScore mapping
            // (High ~ >=0.65, Medium ~ 0.4-0.65, Low < 0.4) matching earlier mapping logic
            const currentLevel = n.riskScore >= 0.65 ? 'High' : n.riskScore >= 0.4 ? 'Medium' : 'Low';
            if (currentLevel === riskLevel) {
              n.riskScore = Math.min(0.95, n.riskScore + 0.15);
            } else {
              n.riskScore = Math.max(0.1, n.riskScore * 0.5);
            }
          }
        }
      });
    };
    adjust(treemapData);
  }

  // UI States
  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // We'll still render page even with error so filters can be changed

  const hasRealData = hotspots && hotspots.length > 0;
  const hasFilteredData = filteredHotspots && filteredHotspots.length > 0;
  const totalHotspotCount = stats?.total_hotspots || hotspots?.length || 0;
  const filteredHotspotCount = filteredHotspots ? filteredHotspots.length : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Debug */}
      {process.env.NODE_ENV !== 'production' && console.debug('[HotspotTreemap] API methods:', api ? Object.keys(api) : 'api undefined')}

      {/* Header (back button removed; tabs handle navigation) */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {project ? `${project.name} - Hotspots` : 'Project Hotspot Analysis'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 max-w-3xl">
          Visualize change frequency and risk across the codebase. Use filters to focus on time windows, repositories, or directories.
        </p>
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
            {error}
          </div>
        )}
        {!error && !hasRealData && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
            No hotspot data for the selected time range. Showing minimal placeholder structure.
          </div>
        )}
        {!error && hasRealData && !hasFilteredData && debouncedPath && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
            No hotspots found under directory: <span className="font-medium">{debouncedPath}</span>
          </div>
        )}
      </div>

      {/* Main layout: Two stacked rows (Filters, then Visualization) */}
      <div className="space-y-8">
        {/* Row 1: Filters */}
        <section>
          <HotspotFilters
            timeRange={timeRange}
            startDate={startDate}
            endDate={endDate}
            onTimeRangeChange={handleTimeRangeChange}
            onCustomDateChange={handleCustomDateChange}
            repositories={repositories}
            repository={repository}
            onRepositoryChange={setRepository}
            directories={directories}
            directory={pathFilter}
            onDirectoryChange={setPathFilter}
            directoryCounts={directoryCounts}
            complexityMetric={complexityMetric}
            onComplexityMetricChange={setComplexityMetric}
            minComplexity={minComplexity}
            onMinComplexityChange={setMinComplexity}
            availableFileTypes={availableFileTypes}
            fileTypeCounts={fileTypeCounts}
            selectedFileTypes={selectedFileTypes}
            onSelectedFileTypesChange={setSelectedFileTypes}
            minChanges={minChanges}
            onMinChangesChange={setMinChanges}
            riskLevel={riskLevel}
            onRiskLevelChange={setRiskLevel}
            totalHotspotCount={totalHotspotCount}
            filteredHotspotCount={filteredHotspotCount}
            onReset={() => { setTimeRange('all'); setStartDate(''); setEndDate(''); setRepository('all'); setPathFilter(''); setComplexityMetric('cyclomatic'); setMinComplexity(10); setMinChanges(0); setSelectedFileTypes([]); }}
            loading={loading}
          />
        </section>

        {/* Row 2: Treemap & Interpretation */}
        <section>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <HotspotTreemapComponent
              data={treemapData}
              onNodeClick={(n) => console.log('Clicked node', n)}
              className=""
            />
          </div>
          {/* Hotspots Table */}
          {filteredHotspots && filteredHotspots.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 overflow-x-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-700">Hotspot Files ({totalHotspotCount})</h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Items per page:</label>
                  <select 
                    value={pageSize} 
                    onChange={(e) => {
                      console.log('Changing pageSize from', pageSize, 'to', Number(e.target.value));
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1); // Reset to first page when changing page size
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">File</th>
                    <th className="text-left font-semibold px-3 py-2">Risk</th>
                    <th className="text-left font-semibold px-3 py-2">Changes</th>
                    <th className="text-left font-semibold px-3 py-2">Complexity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHotspots.slice(0,150).map((h,i) => {
                    const risk = h.risk_level || 'Unknown';
                    const riskClass = risk === 'High' ? 'bg-red-100 text-red-700 border-red-200' : risk === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : risk === 'Low' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200';
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap max-w-xs truncate font-mono text-[11px] text-gray-800" title={h.file_path}>{h.file_path}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${riskClass}`}>{risk}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{h.change_count || h.total_changes || 0}</td>
                        <td className="px-3 py-2 text-gray-700">{h.complexity || h.cyclomatic_complexity || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredHotspots.length > 150 && (
                <div className="mt-2 text-[11px] text-gray-500">Showing first 150 results. Refine filters to narrow further.</div>
              )}
              
              {/* Pagination Controls */}
              {pagination && pagination.total_pages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-gray-600">
                    Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} total hotspots)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      const page = Math.max(1, Math.min(pagination.total_pages - 4, currentPage - 2)) + i;
                      if (page > pagination.total_pages) return null;
                      return (
                        <button
                          key={page}
                          onClick={() => {
                            console.log('Clicking page:', page, 'current:', currentPage);
                            setCurrentPage(page);
                          }}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === page 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                      disabled={currentPage >= pagination.total_pages}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">How to Interpret</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-blue-800">
              <div>• <strong>Size</strong> ≈ Volume of changes (LOC)</div>
              <div>• <strong>Color</strong> = Risk (Green → Low, Red → High)</div>
              <div>• <strong>Directory Drilldown</strong>: Click to zoom into structure</div>
              <div>• <strong>Filters</strong>: Combine time, repo, directory for focus</div>
              <div>• <strong>Badges</strong>: Show active scoped filters</div>
              <div>• <strong>Goal</strong>: Surface refactoring & ownership hotspots</div>
            </div>
          </div>
        </section>
      </div>

      {!api?.getProjectHotspots && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 text-sm">
          Warning: getProjectHotspots is not available on api context. Ensure ApiProvider is wrapping this route and the context value hasn't been shadowed.
        </div>
      )}
    </div>
  );
};

export default HotspotTreemap;