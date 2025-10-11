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
  ExclamationTriangleIcon,
  UsersIcon,
  DocumentIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  FilterContainer, 
  FilterSection, 
  RangeFilter, 
  MultiSelectFilter, 
  ActiveFilterBadges,
  QuickFilterButtons,
  TimeRangeFilter
} from './UnifiedFilters';
import UnifiedPagination from './UnifiedPagination';

const KnowledgeRiskView = ({ projectId, className = "" }) => {
  const { api } = useApi();
  const [fileOwnership, setFileOwnership] = useState([]);
  const [authorHotspots, setAuthorHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRiskOnly, setShowRiskOnly] = useState(false); // will be deprecated by riskLevel filter but kept for backward compatibility (unused in UI now)
  const [sortConfig, setSortConfig] = useState({ key: 'ownershipPct', direction: 'desc' });

  // New filter state (merged from former KnowledgeOwnership page)
  const [selectedOwners, setSelectedOwners] = useState([]); // multi-select owners
  const [directoryPath, setDirectoryPath] = useState([]); // array of segments representing current directory selection
  const [riskLevel, setRiskLevel] = useState('all'); // high | medium | low | all
  const [minOwnership, setMinOwnership] = useState(0);
  const [maxAuthors, setMaxAuthors] = useState('');
  // Column visibility (optional columns)
  const [visibleCols, setVisibleCols] = useState({ authorsCount: true, busFactor: false, lastModified: true });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [density, setDensity] = useState('comfortable'); // 'comfortable' | 'compact'
  // Pagination
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  // Time range
  // unified presets: 'all' | '3months' | '6months' | '1year' | 'custom'
  const [timeRange, setTimeRange] = useState('3months');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  // File types (multi-select)
  const [selectedFileTypes, setSelectedFileTypes] = useState([]); // e.g. ['.js', '.py']
  

  const computeRange = () => {
    const now = new Date();
    let start = null;
    if (timeRange === '3months') {
      const d = new Date(now); d.setMonth(d.getMonth() - 3); start = d;
    } else if (timeRange === '6months') {
      const d = new Date(now); d.setMonth(d.getMonth() - 6); start = d;
    } else if (timeRange === '1year') {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1); start = d;
    } else if (timeRange === 'custom') {
      if (customStart) start = new Date(customStart);
    } else if (timeRange === 'all') {
      start = null;
    }
    const end = timeRange === 'custom' && customEnd ? new Date(customEnd) : now;
    const fmt = (d) => d ? d.toISOString().split('T')[0] : null;
    return { startDate: fmt(start), endDate: fmt(end) };
  };

  // Load persisted preferences & filters
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kr_prefs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.visibleCols) setVisibleCols(v => ({ ...v, ...parsed.visibleCols }));
        if (parsed.density) setDensity(parsed.density);
        if (parsed.pageSize) setPageSize(parsed.pageSize);
        if (parsed.selectedOwners) setSelectedOwners(parsed.selectedOwners);
        if (parsed.directoryPath) setDirectoryPath(parsed.directoryPath);
        if (parsed.riskLevel) setRiskLevel(parsed.riskLevel);
        if (typeof parsed.minOwnership !== 'undefined') setMinOwnership(parsed.minOwnership);
        if (typeof parsed.maxAuthors !== 'undefined') setMaxAuthors(parsed.maxAuthors);
        if (parsed.timeRange) {
          // migrate old keys (3m/6m/1y) to unified presets
          const mapped = parsed.timeRange === '3m' ? '3months'
            : parsed.timeRange === '6m' ? '6months'
            : parsed.timeRange === '1y' ? '1year'
            : parsed.timeRange;
          setTimeRange(mapped);
        }
        if (parsed.customStart) setCustomStart(parsed.customStart);
        if (parsed.customEnd) setCustomEnd(parsed.customEnd);
        if (parsed.selectedFileTypes) setSelectedFileTypes(parsed.selectedFileTypes);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // Persist preferences & filters when they change
  useEffect(() => {
    const prefs = {
      visibleCols,
      density,
      pageSize,
      selectedOwners,
      directoryPath,
      riskLevel,
      minOwnership,
      maxAuthors,
      timeRange,
      customStart: timeRange === 'custom' ? customStart : '',
      customEnd: timeRange === 'custom' ? customEnd : '',
      selectedFileTypes,
    };
    try { localStorage.setItem('kr_prefs', JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }, [visibleCols, density, pageSize, selectedOwners, directoryPath, riskLevel, minOwnership, maxAuthors, timeRange, customStart, customEnd, selectedFileTypes]);

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

        const { startDate, endDate } = computeRange();
        // If custom range selected but missing start date, defer fetch until valid
        if (timeRange === 'custom' && !startDate) {
          setLoading(false);
          return;
        }
        const knowledgeRiskData = await api.getProjectKnowledgeRisk(projectId, startDate, endDate);
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
  }, [projectId, api, timeRange, customStart, customEnd]);

  // Calculate knowledge & ownership metrics per file, including bus factor & risk.
  const processedFileData = useMemo(() => {
    const computeBusFactor = (authorsArr) => {
      if (!authorsArr || authorsArr.length === 0) return 0;
      const sorted = [...authorsArr].sort((a,b)=> (b.contribution||0) - (a.contribution||0));
      const top = sorted[0]?.contribution || 0;
      if (top > 75 && sorted.length < 3) return 1;
      let cumulative = 0; let count = 0;
      for (const a of sorted) {
        cumulative += (a.contribution || 0);
        count++;
        if (cumulative >= 60) break;
      }
      return Math.min(count, sorted.length);
    };
    return fileOwnership.map(file => {
      const authors = file.authors || [];
      const sortedAuthors = [...authors].sort((a, b) => (b.contribution||0) - (a.contribution||0));
      const primaryAuthor = sortedAuthors[0] || { name: 'Unknown', contribution: 0 };
      const secondaryAuthor = sortedAuthors[1];
      const topTwoContribution = primaryAuthor.contribution + (secondaryAuthor?.contribution || 0);
      const risk = topTwoContribution > 90 ? 'high' : topTwoContribution > 70 ? 'medium' : 'low';
      const busFactor = computeBusFactor(authors);
      return {
        ...file,
        primaryAuthor: primaryAuthor.name,
        ownershipPct: primaryAuthor.contribution,
        topTwoContribution,
        riskLevel: risk,
        authorsCount: authors.length,
        busFactor,
        ext: (() => { const m = file.filePath?.match(/\.([a-zA-Z0-9_]+)$/); return m ? ('.' + m[1].toLowerCase()) : '' })(),
      };
    });
  }, [fileOwnership]);

  // Apply filters (owner, path, risk, min ownership, max authors)
  const distinctOwners = useMemo(() => {
    const set = new Set(processedFileData.map(f=>f.primaryAuthor).filter(Boolean));
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [processedFileData]);

  // Distinct file extensions present in dataset
  const distinctFileTypes = useMemo(() => {
    const set = new Set();
    processedFileData.forEach(f => { if (f.ext) set.add(f.ext); });
    return Array.from(set).sort();
  }, [processedFileData]);

  // Build folder tree (directories only) from file paths
  const folderTree = useMemo(() => {
    const root = { children: {}, count: 0 };
    processedFileData.forEach(f => {
      const parts = f.filePath.split('/').filter(Boolean);
      let node = root;
      parts.forEach((segment, idx) => {
        if (!node.children[segment]) node.children[segment] = { children: {}, count: 0 };
        node = node.children[segment];
        node.count++;
      });
    });
    return root;
  }, [processedFileData]);

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
      .sort((a,b)=>a.name.localeCompare(b.name));
  }, [currentDirNode]);

  // counts for owners and file types (for MultiSelectFilter badges)
  const ownerCounts = useMemo(() => {
    const counts = {};
    processedFileData.forEach(f => {
      if (!f.primaryAuthor) return;
      counts[f.primaryAuthor] = (counts[f.primaryAuthor] || 0) + 1;
    });
    return counts;
  }, [processedFileData]);

  const fileTypeCounts = useMemo(() => {
    const counts = {};
    processedFileData.forEach(f => {
      if (!f.ext) return;
      counts[f.ext] = (counts[f.ext] || 0) + 1;
    });
    return counts;
  }, [processedFileData]);

  const filteredData = useMemo(() => {
    const dirPrefix = directoryPath.length ? directoryPath.join('/') + '/' : '';
    return processedFileData.filter(f => {
      if (selectedOwners.length && !selectedOwners.includes(f.primaryAuthor)) return false;
      if (directoryPath.length) {
        if (!(f.filePath === directoryPath.join('/') || f.filePath.startsWith(dirPrefix))) return false;
      }
      if (riskLevel !== 'all' && f.riskLevel !== riskLevel) return false;
      if (minOwnership && f.ownershipPct < Number(minOwnership)) return false;
      if (maxAuthors && f.authorsCount > Number(maxAuthors)) return false;
      if (selectedFileTypes.length && !selectedFileTypes.includes(f.ext)) return false;
      return true;
    });
  }, [processedFileData, selectedOwners, directoryPath, riskLevel, minOwnership, maxAuthors, selectedFileTypes]);

  // Derive hotspots authors synced with current table filters
  const filteredAuthorHotspots = useMemo(() => {
    if (!authorHotspots || authorHotspots.length === 0) return [];
    // Build a set of all authors (any contributor) that appear in currently filtered files
    const authorSet = new Set();
    filteredData.forEach(f => {
      (f.authors || []).forEach(a => {
        if (a?.name) authorSet.add(a.name);
      });
      // also include primary author explicitly (already covered above but safe)
      if (f.primaryAuthor) authorSet.add(f.primaryAuthor);
    });
    // Filter hotspot authors to those relevant to current file selection
    const subset = authorHotspots.filter(a => authorSet.has(a.author));
    // Sort descending by hotspot count and limit to top 12 for readability
    return subset.sort((a,b)=>(b.hotspots||0)-(a.hotspots||0)).slice(0,12);
  }, [authorHotspots, filteredData]);

  // Sort data based on current sort configuration
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      let av = a[sortConfig.key];
      let bv = b[sortConfig.key];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Reset to first page when dependencies change
  useEffect(() => { setCurrentPage(1); }, [selectedOwners, directoryPath, riskLevel, minOwnership, maxAuthors, sortConfig, pageSize, selectedFileTypes]);

  // Pagination calculations
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  };

  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first, last, current, neighbors
      const add = (n) => { if (!pages.includes(n) && n >= 1 && n <= totalPages) pages.push(n); };
      add(1);
      add(totalPages);
      add(safeCurrentPage);
      add(safeCurrentPage - 1);
      add(safeCurrentPage + 1);
      add(2);
      add(totalPages - 1);
      pages.sort((a,b)=>a-b);
      // Condense with ellipses logic handled in render
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  // Handle table sorting
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const activeFilterCount = [selectedOwners.length>0, directoryPath.length>0, riskLevel !== 'all', Number(minOwnership) > 0, !!maxAuthors, selectedFileTypes.length>0, (timeRange && timeRange!=='3months') || (timeRange==='custom' && (customStart||customEnd))].filter(Boolean).length;
  const resetFilters = () => { setSelectedOwners([]); setDirectoryPath([]); setRiskLevel('all'); setMinOwnership(0); setMaxAuthors(''); setSelectedFileTypes([]); setTimeRange('3months'); setCustomStart(''); setCustomEnd(''); };

  const onChangeTimeRange = (val) => {
    setTimeRange(val);
    if (val !== 'custom') { setCustomStart(''); setCustomEnd(''); }
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
      <div className="space-y-6">
      {/* Compact Header */}
      {/* Unified Filter Panel */}
      <FilterContainer
        loading={loading}
        onReset={resetFilters}
        activeFiltersCount={activeFilterCount}
        resultCount={sortedData.length}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Range & Risk Level */}
          <FilterSection title="Time Range & Risk Level" defaultOpen={true}>
            <div className="space-y-4">
              <div>
                <TimeRangeFilter
                  value={timeRange}
                  onChange={onChangeTimeRange}
                  startDate={customStart}
                  endDate={customEnd}
                  onDateChange={(which, value) => which === 'start' ? setCustomStart(value) : setCustomEnd(value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                <QuickFilterButtons
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' }
                  ]}
                  value={riskLevel}
                  onChange={setRiskLevel}
                />
              </div>
            </div>
          </FilterSection>

          {/* Ownership & Contributors */}
          <FilterSection title="Ownership & Contributors" defaultOpen={true}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Ownership %</label>
                <RangeFilter
                  label=""
                  value={Number(minOwnership) || 0}
                  onChange={(v)=>setMinOwnership(v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
              <div>
                <MultiSelectFilter
                  label="Authors"
                  options={distinctOwners.slice(0, 10)} // Limit to top 10 for performance
                  selected={selectedOwners}
                  onChange={setSelectedOwners}
                  searchable={true}
                  counts={ownerCounts}
                />
              </div>
              <div>
                <MultiSelectFilter
                  label="File Types"
                  options={distinctFileTypes}
                  selected={selectedFileTypes}
                  onChange={setSelectedFileTypes}
                  searchable={false}
                  counts={fileTypeCounts}
                />
              </div>
            </div>
          </FilterSection>
        </div>

        {/* Directory Filter - Show when active */}
        {directoryPath.length > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-700 font-medium">Directory:</span>
                <code className="text-blue-800 font-mono bg-white px-2 py-1 rounded">/{directoryPath.join('/')}</code>
              </div>
              <button
                onClick={() => setDirectoryPath([])}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Badges */}
        <ActiveFilterBadges
          filters={[
            ...selectedOwners.map(owner => ({
              label: owner,
              onRemove: () => setSelectedOwners(prev => prev.filter(o => o !== owner)),
              color: 'blue'
            })),
            ...selectedFileTypes.map(type => ({
              label: type,
              onRemove: () => setSelectedFileTypes(prev => prev.filter(t => t !== type)),
              color: 'green'
            })),
            ...(riskLevel !== 'all' ? [{
              label: `Risk: ${riskLevel}`,
              onRemove: () => setRiskLevel('all'),
              color: 'red'
            }] : []),
            ...(Number(minOwnership) > 0 ? [{
              label: `Ownership ≥ ${minOwnership}%`,
              onRemove: () => setMinOwnership(0),
              color: 'purple'
            }] : [])
          ]}
        />
      </FilterContainer>

      {/* Ownership / Knowledge Table */}
  <div className="bg-white rounded-lg shadow">
  <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-3 items-start justify-between relative">
          <div className="flex items-center space-x-2">
            <DocumentIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">File Ownership & Knowledge Concentration</h3>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowColumnMenu(v => !v)}
              className="text-xs px-2 py-1.5 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100"
            >Columns</button>
            <button
              type="button"
              onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              className="text-xs px-2 py-1.5 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100"
            >{density === 'comfortable' ? 'Compact' : 'Relaxed'}</button>
            <select
              value={pageSize}
              onChange={e=>setPageSize(Number(e.target.value))}
              className="text-xs px-2 py-1.5 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100 focus:outline-none"
              title="Rows per page"
            >
              {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            {showColumnMenu && (
              <div className="absolute top-full right-4 mt-2 w-52 bg-white shadow-lg border border-gray-200 rounded-md p-3 z-10 text-xs space-y-2">
                <div className="font-medium text-gray-700">Toggle Columns</div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={visibleCols.authorsCount} onChange={e=>setVisibleCols(c=>({...c, authorsCount: e.target.checked}))} />
                    <span># Authors</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={visibleCols.busFactor} onChange={e=>setVisibleCols(c=>({...c, busFactor: e.target.checked}))} />
                    <span>Bus Factor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={visibleCols.lastModified} onChange={e=>setVisibleCols(c=>({...c, lastModified: e.target.checked}))} />
                    <span>Last Modified</span>
                  </label>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <button onClick={()=>setShowColumnMenu(false)} className="text-[11px] text-blue-600 hover:text-blue-700">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="relative max-w-full">
          <div className="overflow-x-auto w-full max-w-full">
            <table className="min-w-full divide-y divide-gray-200 table-auto">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <Th label="File Path" sortKey="filePath" sortConfig={sortConfig} onSort={handleSort} className="w-1/3" />
                  <Th label="Main Owner" sortKey="primaryAuthor" sortConfig={sortConfig} onSort={handleSort} className="w-28" />
                  <Th label="Ownership %" sortKey="ownershipPct" sortConfig={sortConfig} onSort={handleSort} className="w-28" />
                  {visibleCols.authorsCount && <Th label="# Authors" sortKey="authorsCount" sortConfig={sortConfig} onSort={handleSort} className="w-24 hidden sm:table-cell" />}
                  {visibleCols.busFactor && <Th label="Bus Factor" sortKey="busFactor" sortConfig={sortConfig} onSort={handleSort} className="w-24 hidden md:table-cell" />}
                  {visibleCols.lastModified && <Th label="Last Modified" sortKey="lastModified" sortConfig={sortConfig} onSort={handleSort} className="w-40 hidden lg:table-cell" />}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((file, index) => (
                  <tr key={startIndex + index} className="hover:bg-gray-50">
                    <td className={`px-4 lg:px-5 ${density==='compact'?'py-1.5':'py-3'} align-top text-sm font-medium text-gray-900`}>
                      <div className="flex items-start gap-2 max-w-[480px]">
                        <DocumentIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="block truncate" title={file.filePath}>{file.filePath}</span>
                      </div>
                    </td>
                    <td className={`px-4 lg:px-5 ${density==='compact'?'py-1.5':'py-3'} whitespace-nowrap text-sm text-gray-900`}>{file.primaryAuthor}</td>
                    <td className={`px-4 lg:px-5 ${density==='compact'?'py-1.5':'py-3'} whitespace-nowrap text-sm text-gray-900`}>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${file.ownershipPct >= 70 ? 'bg-red-100 text-red-800' : file.ownershipPct >= 50 ? 'bg-amber-100 text-amber-800':'bg-green-100 text-green-800'}`}>{file.ownershipPct}%</span>
                    </td>
                    {visibleCols.authorsCount && (
                      <td className={`px-4 lg:px-5 ${density==='compact'?'py-1.5':'py-3'} whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell`}>{file.authorsCount}</td>
                    )}
                    {visibleCols.busFactor && (
                      <td className={`px-4 lg:px-5 ${density==='compact'?'py-1.5':'py-3'} whitespace-nowrap text-sm text-gray-900 hidden md:table-cell`}>{file.busFactor}</td>
                    )}
                    {visibleCols.lastModified && (
                      <td className={`px-4 lg:px-5 ${density==='compact'?'py-1.5':'py-3'} whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell`}>{file.lastModified || '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {totalItems === 0 && (
          <div className="px-6 py-12 text-center">
            <DocumentIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files match filters</h3>
            <p className="text-sm text-gray-500">Adjust or reset the filters to see ownership data.</p>
          </div>
        )}
        {/* Pagination Controls */}
        {totalItems > 0 && (
          <UnifiedPagination
            currentPage={safeCurrentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={(p) => goToPage(p)}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            compact
          />
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
              <BarChart data={filteredAuthorHotspots} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
        {/* Total Files */}
        <div className="bg-white shadow rounded-lg overflow-visible">
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
        {/* High Risk Files */}
        <div className="bg-white shadow rounded-lg overflow-visible">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">High Risk Files</dt>
                  <dd className="text-lg font-medium text-red-600">{processedFileData.filter(f => f.riskLevel==='high').length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        {/* Active Authors */}
        <div className="bg-white shadow rounded-lg overflow-visible">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Authors</dt>
                  <dd className="text-lg font-medium text-blue-600">{filteredAuthorHotspots.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        {/* Total Hotspots */}
        <div className="bg-white shadow rounded-lg overflow-visible">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Hotspots</dt>
                  <dd className="text-lg font-medium text-green-600">{filteredAuthorHotspots.reduce((sum, a) => sum + (a.hotspots || 0), 0)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

// Small reusable sortable header component
const Th = ({ label, sortKey, sortConfig, onSort, className = '' }) => {
  const active = sortConfig.key === sortKey;
  const isAsc = active && sortConfig.direction === 'asc';
  const ariaSort = active ? (isAsc ? 'ascending' : 'descending') : 'none';
  const dir = active ? (isAsc ? '▲' : '▼') : '';
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(sortKey);
    }
  };
  return (
    <th
      role="columnheader"
      tabIndex={0}
      aria-sort={ariaSort}
      onClick={() => onSort(sortKey)}
      onKeyDown={handleKey}
      className={`group px-4 lg:px-5 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 select-none ${className}`}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {dir && <span className="text-[10px] text-blue-600" aria-hidden>{dir}</span>}
      </div>
    </th>
  );
};

export default KnowledgeRiskView;