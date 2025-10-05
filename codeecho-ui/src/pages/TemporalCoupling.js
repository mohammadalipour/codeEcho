import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../services/ApiContext';

// Simple sortable header component
const SortHeader = ({ label, field, currentSort, direction, onSort }) => {
  const active = currentSort === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none ${active ? 'text-blue-700' : 'text-gray-500'}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <span className="text-[10px]">{direction === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  );
};

const TemporalCoupling = () => {
  const { id: projectId } = useParams();
  const { api } = useApi();

  const [project, setProject] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters (editing draft vs applied allows Apply button UX)
  // Backend always returns up to 200 pairs (fixed)
  const [directoryFilter, setDirectoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [draftDirectory, setDraftDirectory] = useState(''); // kept for minimal diff; not actively used
  const [dirSearch, setDirSearch] = useState('');
  
  // New threshold filters
  const [minSharedCommits, setMinSharedCommits] = useState(2);
  const [minCouplingScore, setMinCouplingScore] = useState(0);
  
  // File type filters
  const [selectedFileTypes, setSelectedFileTypes] = useState([]);
  const [fileTypeSearch, setFileTypeSearch] = useState('');
  const [projectFileTypes, setProjectFileTypes] = useState([]);
  const [loadingFileTypes, setLoadingFileTypes] = useState(false);

  // Pagination (client-side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting
  const [sortField, setSortField] = useState('coupling_score');
  const [sortDir, setSortDir] = useState('desc');

  // Fetch project meta
  useEffect(() => {
    if (!projectId || !api?.getProject) return;
    const load = async () => {
      try { const p = await api.getProject(projectId); setProject(p); } catch (e) { /* ignore */ }
    };
    load();
  }, [projectId, api]);

  // Fetch project file types
  useEffect(() => {
    if (!projectId || !api?.getProjectFileTypes) return;
    const loadFileTypes = async () => {
      try {
        setLoadingFileTypes(true);
        const data = await api.getProjectFileTypes(projectId);
        setProjectFileTypes(data?.file_types || []);
      } catch (e) {
        console.error('Failed to load file types:', e);
        setProjectFileTypes([]);
      } finally {
        setLoadingFileTypes(false);
      }
    };
    loadFileTypes();
  }, [projectId, api]);

  // Fetch temporal coupling data
  const fetchPairs = async () => {
    if (!projectId || !api?.getProjectTemporalCoupling) return;
    setLoading(true); setError(null);
    try {
      const fileTypesString = selectedFileTypes.length > 0 ? selectedFileTypes.join(',') : undefined;
      const data = await api.getProjectTemporalCoupling(projectId, { 
        limit: 200, 
        startDate: startDate || undefined, 
        endDate: endDate || undefined,
        minSharedCommits: minSharedCommits > 0 ? minSharedCommits : undefined,
        minCouplingScore: minCouplingScore > 0 ? minCouplingScore : undefined,
        fileTypes: fileTypesString
      });
      const list = data?.temporal_coupling || [];
      setPairs(list);
    } catch (e) {
      console.error('Failed to load temporal coupling:', e);
      setError(e?.response?.data?.error || 'Failed to load temporal coupling data');
      setPairs([]);
    } finally {
      setLoading(false);
    }
  };

  const debounceRef = useRef();
  useEffect(() => {
    if (!projectId) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchPairs(); }, 250);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, startDate, endDate, minSharedCommits, minCouplingScore, selectedFileTypes]);

  const onSort = (field) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredPairs = useMemo(() => {
    let list = pairs;
    if (directoryFilter) {
      const dir = directoryFilter.toLowerCase();
      list = list.filter(p => p.file_a.toLowerCase().startsWith(dir) || p.file_b.toLowerCase().startsWith(dir));
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === bv) return 0;
      if (sortDir === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
    return sorted;
  }, [pairs, directoryFilter, sortField, sortDir]);

  // Derive directory list from file paths (top N) - collect segments up to 3 levels
  const directories = useMemo(() => {
    const counts = new Map();
    pairs.forEach(p => {
      [p.file_a, p.file_b].forEach(fp => {
        if (!fp) return;
        const parts = fp.split('/');
        for (let depth = 1; depth <= Math.min(3, parts.length - 1); depth++) {
          const prefix = parts.slice(0, depth).join('/') + '/';
            counts.set(prefix, (counts.get(prefix) || 0) + 1);
        }
      });
    });
    return Array.from(counts.entries())
      .sort((a,b) => b[1]-a[1])
      .slice(0,40)
      .map(([dir]) => dir);
  }, [pairs]);

  // Paginated slice
  const totalItems = filteredPairs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedPairs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPairs.slice(start, start + pageSize);
  }, [filteredPairs, currentPage, pageSize]);

  // Sync page when filters change
  useEffect(() => { setPage(1); }, [directoryFilter, startDate, endDate, pageSize, minSharedCommits, minCouplingScore, selectedFileTypes]);

  const applyFilters = () => {
    // Explicit refresh: ensure current slider values persisted and force fetch
    // No minShared to apply now; just refetch
    fetchPairs();
  };

  const resetFilters = () => {
    setStartDate(''); setEndDate('');
    setDirSearch('');
    setDirectoryFilter('');
    setDraftDirectory('');
    setMinSharedCommits(2);
    setMinCouplingScore(0);
    setSelectedFileTypes([]);
    setFileTypeSearch('');
  };

  return (
    <div className="py-4">
      <div className="max-w-7xl mx-auto px-0">
        {/* Removed back button because persistent tabs provide navigation */}

        <h1 className="text-xl font-semibold text-gray-900 mb-1">Temporal Coupling</h1>
        <p className="text-sm text-gray-600 mb-6 max-w-3xl">
          Files that frequently change together in commits can indicate implicit coupling, propagation chains, or modularity issues.
          Investigate pairs with high coupling scores (close to 1.0) or high shared commit counts. Showing up to the top 200 pairs from the backend. Optionally filter by commit date range.
        </p>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-gray-600 font-medium">
                {loading ? 'Loading…' : `Showing ${(currentPage - 1) * pageSize + (totalItems ? 1 : 0)}–${Math.min(currentPage * pageSize, totalItems)} of ${pairs.length} pairs (filtered: ${totalItems}, max 200)`}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >Refresh</button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200"
                >Reset</button>
                {/* Secondary refresh removed (duplicate) */}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Date Range Filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Date Range</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); }} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); }} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
              </div>

              {/* Threshold Filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Thresholds</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Min Shared Commits: {minSharedCommits}</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={minSharedCommits} 
                      onChange={e => setMinSharedCommits(parseInt(e.target.value))} 
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" 
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1</span>
                      <span>20+</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Min Coupling Score: {minCouplingScore.toFixed(1)}</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={minCouplingScore} 
                      onChange={e => setMinCouplingScore(parseFloat(e.target.value))} 
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" 
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.0</span>
                      <span>1.0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Types Filter */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
                  File Types {loadingFileTypes && <span className="text-xs text-gray-500">(loading...)</span>}
                </h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={fileTypeSearch}
                    onChange={e => setFileTypeSearch(e.target.value)}
                    placeholder="Search file types..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-auto bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedFileTypes([])}
                      className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center border-b border-gray-100 ${selectedFileTypes.length === 0 ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span>All File Types</span>
                      <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{projectFileTypes.length}</span>
                    </button>
                    {projectFileTypes
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
                          className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center hover:bg-gray-50 ${selectedFileTypes.includes(ft) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400">.</span>{ft}
                          </span>
                          {selectedFileTypes.includes(ft) && <span className="text-blue-600 text-xs">✓</span>}
                        </button>
                      ))}
                    {projectFileTypes.filter(ft => !fileTypeSearch || ft.toLowerCase().includes(fileTypeSearch.toLowerCase())).length === 0 && !loadingFileTypes && (
                      <div className="px-3 py-2 text-xs text-gray-400 text-center">
                        {projectFileTypes.length === 0 ? 'No file types found' : 'No matches'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Directory Filter */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Directory Filter</h3>
                {directoryFilter && (
                  <button type="button" onClick={()=>{setDirectoryFilter(''); setDraftDirectory('');}} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={dirSearch}
                  onChange={e => setDirSearch(e.target.value)}
                  placeholder="Search directory..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="border border-gray-200 rounded-md max-h-40 overflow-auto bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={()=>{setDirectoryFilter(''); setDraftDirectory('');}}
                    className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center border-b border-gray-100 ${directoryFilter===''?'bg-blue-50 text-blue-700 font-medium':'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>All Directories</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{directories.length}</span>
                  </button>
                  {directories
                    .filter(d => !dirSearch || d.toLowerCase().includes(dirSearch.toLowerCase()))
                    .map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={()=>{setDirectoryFilter(d); setDraftDirectory(d); setPage(1);}}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${directoryFilter===d?'bg-blue-50 text-blue-700 font-medium':'text-gray-700'}`}
                      >
                        <span className="truncate">{d}</span>
                      </button>
                    ))}
                  {directories.filter(d => !dirSearch || d.toLowerCase().includes(dirSearch.toLowerCase())).length===0 && (
                    <div className="px-3 py-2 text-xs text-gray-400 text-center">No matches</div>
                  )}
                  </div>
                </div>
              </div>
            {/* Active filter chips */}
            <div className="flex flex-wrap gap-2 text-xs mt-1">
              {directoryFilter && (
                <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-1 rounded">
                  Dir: {directoryFilter}
                  <button className="text-cyan-500 hover:text-cyan-700" onClick={() => setDirectoryFilter('')}>×</button>
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded">
                  From: {startDate}
                  <button className="hover:text-amber-900" onClick={() => { setStartDate(''); fetchPairs(); }}>×</button>
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded">
                  To: {endDate}
                  <button className="hover:text-amber-900" onClick={() => { setEndDate(''); fetchPairs(); }}>×</button>
                </span>
              )}
              {minSharedCommits > 2 && (
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
                  Min Shared: {minSharedCommits}
                  <button className="hover:text-green-900" onClick={() => setMinSharedCommits(2)}>×</button>
                </span>
              )}
              {minCouplingScore > 0 && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded">
                  Min Score: {minCouplingScore.toFixed(1)}
                  <button className="hover:text-purple-900" onClick={() => setMinCouplingScore(0)}>×</button>
                </span>
              )}
              {selectedFileTypes.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded">
                  Types: {selectedFileTypes.join(', ')}
                  <button className="hover:text-blue-900" onClick={() => setSelectedFileTypes([])}>×</button>
                </span>
              )}
              {!directoryFilter && !startDate && !endDate && minSharedCommits <= 2 && minCouplingScore <= 0 && selectedFileTypes.length === 0 && (
                <span className="text-[11px] text-gray-500">No additional filters applied.</span>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <SortHeader label="File A" field="file_a" currentSort={sortField} direction={sortDir} onSort={onSort} />
                  <SortHeader label="File B" field="file_b" currentSort={sortField} direction={sortDir} onSort={onSort} />
                  <SortHeader label="Shared" field="shared_commits" currentSort={sortField} direction={sortDir} onSort={onSort} />
                  <SortHeader label="Commits A" field="total_commits_a" currentSort={sortField} direction={sortDir} onSort={onSort} />
                  <SortHeader label="Commits B" field="total_commits_b" currentSort={sortField} direction={sortDir} onSort={onSort} />
                  <SortHeader label="Score" field="coupling_score" currentSort={sortField} direction={sortDir} onSort={onSort} />
                  <SortHeader label="Last Modified" field="last_modified" currentSort={sortField} direction={sortDir} onSort={onSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading...</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={7} className="p-4 text-center text-red-600">{error}</td></tr>
                )}
                {!loading && !error && filteredPairs.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-500">No coupling pairs found.</td></tr>
                )}
                {!loading && !error && pagedPairs.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs whitespace-pre-wrap max-w-xs break-words">{p.file_a}</td>
                    <td className="px-4 py-2 font-mono text-xs whitespace-pre-wrap max-w-xs break-words">{p.file_b}</td>
                    <td className="px-4 py-2 text-center">{p.shared_commits}</td>
                    <td className="px-4 py-2 text-center">{p.total_commits_a}</td>
                    <td className="px-4 py-2 text-center">{p.total_commits_b}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.coupling_score >= 0.9 ? 'bg-red-100 text-red-700' :
                        p.coupling_score >= 0.7 ? 'bg-orange-100 text-orange-700' :
                        p.coupling_score >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {p.coupling_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{p.last_modified?.replace('T',' ').replace('Z','')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {!loading && !error && totalItems > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t px-4 py-3 bg-gray-50">
              <div className="text-xs text-gray-600">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} pairs
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-500">Rows:</label>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1"
                >
                  {[25,50,100,200].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border rounded disabled:opacity-40 hover:bg-white bg-gray-100"
                  >Prev</button>
                  <span className="text-xs text-gray-700 px-1">Page {currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs border rounded disabled:opacity-40 hover:bg-white bg-gray-100"
                  >Next</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explanation Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">How to Interpret Coupling</h2>
          <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
            <li>Score = shared_commits / min(total_commits_a, total_commits_b)</li>
            <li>1.00 means every commit of the less-frequent file also touched the other file.</li>
            <li>High scores across modules may indicate hidden architecture seams or feature scattering.</li>
            <li>Refactor by isolating shared responsibilities or introducing clearer module boundaries.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TemporalCoupling;
