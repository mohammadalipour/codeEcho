import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { FunnelIcon, ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// CSS for sliders
const sliderStyles = `
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  box-shadow: 0 0 2px 0 #555;
}

.slider::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 2px 0 #555;
}

.slider:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
`;

/*
 * KnowledgeOwnership Page
 * Displays per-file ownership with filter UI styled similarly to HotspotTreemap filters.
 * Columns: File Path | Main Owner | Ownership % | Number of Authors | Bus Factor | Last Modified Date
 * Bus Factor (simple heuristic): if primary ownership > 75% and total contributors < 3 => 1, else
 *  min(contributors where cumulative percentage >= 60%, totalContributors). Fallback to total contributors.
 */
const KnowledgeOwnership = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { api } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [project, setProject] = useState(null);

  // Filters (improved UI as requested)
  // Initialize from URL params if present
  const [selectedOwner, setSelectedOwner] = useState(searchParams.get('developer') || ''); // dropdown selection
  const [directoryPath, setDirectoryPath] = useState([]); // array of path segments like Bus Factor
  const [riskLevel, setRiskLevel] = useState('all'); // low|medium|high|critical
  const [minOwnership, setMinOwnership] = useState(0); // slider % threshold
  const [maxAuthors, setMaxAuthors] = useState(20); // slider for max authors

  // File type filters
  const [selectedFileTypes, setSelectedFileTypes] = useState([]);
  const [fileTypeSearch, setFileTypeSearch] = useState('');
  const [projectFileTypes, setProjectFileTypes] = useState([]);
  const [loadingFileTypes, setLoadingFileTypes] = useState(false);

  // UI state for dropdowns
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [dirMenuOpen, setDirMenuOpen] = useState(false);

  // Refs for outside click
  const ownerMenuRef = useRef(null);
  const dirMenuRef = useRef(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'ownershipPercentage', direction: 'desc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Items per page

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      setLoading(true); setError(null);
      try {
        // Fetch project meta (optional)
        try { const p = await api.getProject(projectId); setProject(p); } catch (_) {}
        let res;
        if (api.getOwnership) {
          try {
            res = await api.getOwnership(projectId);
          } catch (e) {
            // fallback to legacy endpoint
            res = await api.getFileOwnership(projectId);
          }
        } else {
          res = await api.getFileOwnership(projectId);
        }
        const list = Array.isArray(res.fileOwnership) ? res.fileOwnership : (res.fileOwnership?.fileOwnership || []);
        // Normalize shape to expected fields
        const normalized = list.map(item => ({
          filePath: item.filePath || item.file_path || '',
          primaryOwner: item.primaryOwner || item.primary_owner || item.primary || (item.authors && item.authors[0]?.name) || 'Unknown',
          ownershipPercentage: Math.round(item.ownershipPercentage || item.ownership_percentage || (item.authors && item.authors[0]?.contribution) || 0),
          totalContributors: item.totalContributors || item.total_contributors || (item.authors ? item.authors.length : 0),
          authors: item.authors || item.contributors || [],
          lastModified: item.lastModified || item.last_modified || '-',
          riskLevel: (item.riskLevel || item.risk_level || 'low').toLowerCase(),
        }));
        setRecords(normalized);
      } catch (e) {
        console.error('Ownership load failed', e);
        setError(e?.response?.data?.error || 'Failed to load ownership data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId, api]);

  // Fetch project file types
  useEffect(() => {
    if (!projectId || !api?.getProjectFileTypes) return;
    const fetchFileTypes = async () => {
      setLoadingFileTypes(true);
      try {
        const response = await api.getProjectFileTypes(projectId);
        // The API returns { project_id, file_types: [...] }
        const fileTypesArray = Array.isArray(response?.file_types) ? response.file_types : [];
        setProjectFileTypes(fileTypesArray);
      } catch (e) {
        console.error('Failed to load file types:', e);
        setProjectFileTypes([]);
      } finally {
        setLoadingFileTypes(false);
      }
    };
    fetchFileTypes();
  }, [projectId, api]);

  // Handle URL parameter changes (for developer filtering)
  useEffect(() => {
    const developer = searchParams.get('developer');
    if (developer && developer !== selectedOwner) {
      setSelectedOwner(developer);
    }
  }, [searchParams, selectedOwner]);

  // Outside click handlers for dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (ownerMenuOpen && ownerMenuRef.current && !ownerMenuRef.current.contains(e.target)) {
        setOwnerMenuOpen(false);
      }
      if (dirMenuOpen && dirMenuRef.current && !dirMenuRef.current.contains(e.target)) {
        setDirMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ownerMenuOpen, dirMenuOpen]);

  const computeBusFactor = (rec) => {
    if (!rec || !rec.authors || rec.authors.length === 0) return 0;
    const sorted = [...rec.authors].sort((a,b)=> (b.contribution||b.percentage||0) - (a.contribution||a.percentage||0));
    const primaryPct = sorted[0] ? (sorted[0].contribution || sorted[0].percentage || 0) : 0;
    const totalContribs = sorted.length;
    if (primaryPct > 75 && totalContribs < 3) return 1;
    let cumulative = 0; let count = 0;
    for (const a of sorted) {
      cumulative += (a.contribution || a.percentage || 0);
      count++;
      if (cumulative >= 60) break;
    }
    return Math.min(count, totalContribs);
  };

  // Extract unique owners for dropdown
  const uniqueOwners = useMemo(() => {
    const owners = new Set();
    records.forEach(r => {
      owners.add(r.primaryOwner);
      // Also add authors from the contributors list
      if (r.authors) {
        r.authors.forEach(author => {
          if (author.name || author.author) {
            owners.add(author.name || author.author);
          }
        });
      }
    });
    return Array.from(owners).sort();
  }, [records]);

  // Build folder tree from file paths
  const folderTree = useMemo(() => {
    const root = { children: {}, count: 0 };
    records.forEach(r => {
      const parts = r.filePath.split('/').filter(Boolean);
      let node = root;
      parts.forEach((segment, idx) => {
        if (idx < parts.length - 1) { // Only create directory nodes
          if (!node.children[segment]) node.children[segment] = { children: {}, count: 0 };
          node = node.children[segment];
          node.count++;
        }
      });
    });
    return root;
  }, [records]);

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

  // Derived & filtered data
  const filtered = useMemo(() => {
    return records.filter(r => {
      // Owner filter
      if (selectedOwner && r.primaryOwner !== selectedOwner) return false;
      
      // Directory path filter
      if (directoryPath.length > 0) {
        const dirPathStr = directoryPath.join('/');
        if (!r.filePath.startsWith(dirPathStr)) return false;
      }
      
      // Risk level filter
      if (riskLevel !== 'all' && r.riskLevel?.toLowerCase() !== riskLevel) return false;
      
      // Ownership percentage filter
      if (r.ownershipPercentage < minOwnership) return false;
      
      // Max authors filter
      if (r.totalContributors > maxAuthors) return false;
      
      // File type filter
      if (selectedFileTypes.length > 0) {
        const fileExtension = r.filePath.split('.').pop()?.toLowerCase();
        if (!fileExtension || !selectedFileTypes.includes(fileExtension)) return false;
      }
      
      return true;
    });
  }, [records, selectedOwner, directoryPath, riskLevel, minOwnership, maxAuthors, selectedFileTypes]);

  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a,b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      let av = a[sortConfig.key]; let bv = b[sortConfig.key];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sorted.slice(startIndex, endIndex);
  }, [sorted, currentPage, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOwner, directoryPath, riskLevel, minOwnership, maxAuthors, selectedFileTypes]);

  const toggleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const activeFilterCount = [
    selectedOwner, 
    directoryPath.length > 0, 
    riskLevel !== 'all', 
    selectedFileTypes.length > 0,
    minOwnership > 0, 
    maxAuthors < 20
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedOwner(''); 
    setDirectoryPath([]); 
    setRiskLevel('all'); 
    setSelectedFileTypes([]);
    setFileTypeSearch('');
    setMinOwnership(0); 
    setMaxAuthors(20);
  };

  const riskBadge = (lvl) => {
    const map = { high: 'bg-red-100 text-red-700 border-red-200', medium: 'bg-amber-100 text-amber-700 border-amber-200', low: 'bg-green-100 text-green-700 border-green-200', critical: 'bg-red-200 text-red-800 border-red-300' };
    return map[lvl] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <>
      <style>{sliderStyles}</style>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{project ? `${project.name} - Knowledge Ownership` : 'Knowledge Ownership'}</h1>
        <p className="mt-1 text-sm text-gray-500 max-w-3xl">Analyze file ownership concentration and potential knowledge risk across the codebase.</p>
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">{error}</div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <FunnelIcon className="h-5 w-5 text-blue-600" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">{activeFilterCount}</span>
              )}
            </div>
            <div className="text-[11px] text-gray-500">Showing <span className="font-medium text-gray-700">{sorted.length}</span> of {records.length}</div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">
              <ArrowPathIcon className="h-4 w-4"/>Reset
            </button>
          </div>
        </div>
        
        {/* Improved Filter Layout */}
        <div className="space-y-6">
          {/* Primary Filters Row - Most commonly used */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 items-start">
            {/* Owner Dropdown */}
            <div className="relative space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Owner
              </label>
              <button 
                type="button" 
                onClick={() => setOwnerMenuOpen(o => !o)} 
                className="w-full h-10 px-3 text-left border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between hover:border-gray-400 transition-colors"
              >
                <span className="truncate font-medium text-gray-900">{selectedOwner || 'All Owners'}</span>
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${ownerMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {ownerMenuOpen && (
                <div ref={ownerMenuRef} className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => { setSelectedOwner(''); setOwnerMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors ${!selectedOwner ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>All Owners</span>
                        <span className="text-xs text-gray-500">({records.length})</span>
                      </div>
                    </button>
                    {uniqueOwners.map(owner => (
                      <button
                        key={owner}
                        type="button"
                        onClick={() => { setSelectedOwner(owner); setOwnerMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors ${selectedOwner === owner ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                      >
                        {owner}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Directory Path Dropdown */}
            <div className="relative space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Directory
              </label>
              <button 
                type="button" 
                onClick={() => setDirMenuOpen(o => !o)} 
                className="w-full h-10 px-3 text-left border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between hover:border-gray-400 transition-colors"
              >
                <span className="truncate font-medium text-gray-900">{directoryPath.length ? '/' + directoryPath.join('/') : 'All Directories'}</span>
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${dirMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {dirMenuOpen && (
                <div ref={dirMenuRef} className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-h-80 overflow-auto">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 text-xs text-blue-700">
                        <button type="button" onClick={() => setDirectoryPath([])} className="hover:underline font-medium">root</button>
                        {directoryPath.map((seg, idx) => (
                          <React.Fragment key={idx}>
                            <span className="text-gray-400">/</span>
                            <button type="button" onClick={() => setDirectoryPath(directoryPath.slice(0, idx + 1))} className="hover:underline truncate max-w-[80px] font-medium">{seg}</button>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    {directoryPath.length > 0 && <button className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap font-medium" onClick={() => setDirectoryPath(p => p.slice(0, -1))}>↑ Up</button>}
                  </div>
                  <div className="space-y-1">
                    {directoryChildren.map(d => (
                      <button
                        key={d.name}
                        type="button"
                        onClick={() => setDirectoryPath(p => [...p, d.name])}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 text-left text-sm transition-colors"
                      >
                        <span className="truncate font-medium text-gray-900">{d.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{d.count}</span>
                      </button>
                    ))}
                    {directoryChildren.length === 0 && <div className="text-gray-500 px-3 py-2 text-sm italic">No subfolders</div>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                    <button onClick={() => setDirectoryPath([])} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Clear</button>
                    <button onClick={() => setDirMenuOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
                  </div>
                </div>
              )}
            </div>

            {/* Risk Level */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Risk Level
              </label>
              
              {/* Risk indicators - compact version */}
              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-2">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" />Critical</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-orange-500" />High</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" />Med</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />Low</span>
              </div>
              
              {/* Toggle buttons - improved layout */}
              <div className="grid grid-cols-2 gap-1">
                {['critical', 'high', 'medium', 'low'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRiskLevel(prev => prev === r ? 'all' : r)}
                    className={`px-2 py-1.5 text-xs rounded-md border transition-all font-medium ${
                      riskLevel === r 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* File Types Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                File Types 
                {loadingFileTypes && <span className="text-xs text-gray-500 animate-pulse">(loading...)</span>}
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={fileTypeSearch}
                  onChange={e => setFileTypeSearch(e.target.value)}
                  placeholder="Search file types..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-auto bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSelectedFileTypes([])}
                    className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center border-b border-gray-100 transition-colors ${
                      selectedFileTypes.length === 0 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">All File Types</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-medium">{(projectFileTypes || []).length}</span>
                  </button>
                  {(projectFileTypes || [])
                    .filter(ft => !fileTypeSearch || ft.toLowerCase().includes(fileTypeSearch.toLowerCase()))
                    .map(ft => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => {
                          if (selectedFileTypes.includes(ft)) {
                            setSelectedFileTypes(prev => prev.filter(t => t !== ft));
                          } else {
                            setSelectedFileTypes(prev => [...prev, ft]);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center hover:bg-gray-50 transition-colors ${
                          selectedFileTypes.includes(ft) 
                            ? 'bg-blue-50 text-blue-700 font-medium' 
                            : 'text-gray-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-gray-400 font-mono">.</span>
                          <span className="font-mono">{ft}</span>
                        </span>
                        {selectedFileTypes.includes(ft) && <span className="text-blue-600 text-xs font-bold">✓</span>}
                      </button>
                    ))}
                  {(projectFileTypes || []).filter(ft => !fileTypeSearch || ft.toLowerCase().includes(fileTypeSearch.toLowerCase())).length === 0 && !loadingFileTypes && (
                    <div className="px-3 py-2 text-xs text-gray-500 text-center italic">
                      {(projectFileTypes || []).length === 0 ? 'No file types found' : 'No matches'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Filters Row - Range controls */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Range Filters
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Ownership Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                  <span>Min Ownership</span>
                  <span className="text-blue-600 font-bold">{minOwnership}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={minOwnership} 
                  onChange={e => setMinOwnership(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Max Authors Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                  <span>Max Authors</span>
                  <span className="text-blue-600 font-bold">{maxAuthors}</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={maxAuthors} 
                  onChange={e => setMaxAuthors(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span>10</span>
                  <span>20+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active badges - Enhanced */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Active Filters</h3>
            {activeFilterCount > 0 && (
              <span className="text-xs text-gray-500">{activeFilterCount} active</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedOwner && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Owner: {selectedOwner}
                <button onClick={() => setSelectedOwner('')} className="hover:text-indigo-900 ml-1 font-bold">×</button>
              </span>
            )}
            {directoryPath.length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Dir: /{directoryPath.join('/')}
                <button onClick={() => setDirectoryPath([])} className="hover:text-purple-900 ml-1 font-bold">×</button>
              </span>
            )}
            {riskLevel !== 'all' && (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                riskLevel === 'critical' || riskLevel === 'high' 
                  ? 'bg-red-100 text-red-700' 
                  : riskLevel === 'medium' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-green-100 text-green-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  riskLevel === 'critical' || riskLevel === 'high' 
                    ? 'bg-red-500' 
                    : riskLevel === 'medium' 
                      ? 'bg-amber-500' 
                      : 'bg-green-500'
                }`}></span>
                Risk: {riskLevel}
                <button onClick={() => setRiskLevel('all')} className="hover:opacity-80 ml-1 font-bold">×</button>
              </span>
            )}
            {selectedFileTypes.length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                Types: {selectedFileTypes.slice(0, 2).join(', ')}{selectedFileTypes.length > 2 && ` +${selectedFileTypes.length - 2}`}
                <button onClick={() => setSelectedFileTypes([])} className="hover:text-cyan-900 ml-1 font-bold">×</button>
              </span>
            )}
            {minOwnership > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Own ≥ {minOwnership}%
                <button onClick={() => setMinOwnership(0)} className="hover:text-blue-900 ml-1 font-bold">×</button>
              </span>
            )}
            {maxAuthors < 20 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                ≤ {maxAuthors} authors
                <button onClick={() => setMaxAuthors(20)} className="hover:text-teal-900 ml-1 font-bold">×</button>
              </span>
            )}
            {activeFilterCount === 0 && (
              <span className="text-sm text-gray-500 italic">No filters applied</span>
            )}
          </div>
        </div>

        {loading && <div className="text-xs text-gray-500 animate-pulse">Loading ownership…</div>}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
        <h3 className="text-sm font-medium text-gray-700 mb-3">File Ownership ({sorted.length} total, showing {paginatedData.length})</h3>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {['filePath','primaryOwner','ownershipPercentage','totalContributors','busFactor','lastModified'].map(col => (
                <th key={col} className={`text-left font-semibold px-3 py-2 ${col!=='busFactor'?'cursor-pointer hover:bg-gray-100':''}`} onClick={() => col!=='busFactor' && toggleSort(col === 'busFactor' ? 'busFactor' : col)}>
                  <div className="flex items-center gap-1">
                    <span>{col === 'filePath' ? 'File Path' : col === 'primaryOwner' ? 'Main Owner' : col === 'ownershipPercentage' ? 'Ownership %' : col === 'totalContributors' ? '# Authors' : col === 'busFactor' ? 'Bus Factor' : 'Last Modified'}</span>
                    {sortConfig.key === col && <span className="text-[10px] text-blue-600">{sortConfig.direction==='asc'?'▲':'▼'}</span>}
                  </div>
                </th>
              ))}
              <th className="text-left font-semibold px-3 py-2">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((r,i) => {
              const bf = computeBusFactor(r);
              const risk = r.riskLevel;
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap max-w-xs truncate font-mono text-[11px] text-gray-800" title={r.filePath}>{r.filePath}</td>
                  <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{r.primaryOwner}</td>
                  <td className="px-3 py-2 text-gray-800">{r.ownershipPercentage}%</td>
                  <td className="px-3 py-2 text-gray-800">{r.totalContributors}</td>
                  <td className="px-3 py-2 text-gray-800">{bf}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.lastModified || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${riskBadge(risk)}`}>{risk}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && !loading && (
          <div className="text-center text-sm text-gray-500 py-10">No files match current filters.</div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} files
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
              
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded-md"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">How to Interpret</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-blue-800">
          <div>• <strong>Ownership %</strong>: Highest author percentage of total changes</div>
          <div>• <strong># Authors</strong>: Total contributors with changes</div>
          <div>• <strong>Bus Factor</strong>: Estimated number of people needed to retain ≥60% knowledge</div>
          <div>• <strong>Risk</strong>: Based on ownership concentration (High if &gt;70%, Critical if &gt;90%)</div>
          <div>• <strong>Filters</strong>: Narrow by owner, path, risk level, or minimum ownership</div>
          <div>• <strong>Goal</strong>: Identify fragile areas with concentrated knowledge</div>
        </div>
      </div>
      </div>
    </>
  );
};

export default KnowledgeOwnership;
