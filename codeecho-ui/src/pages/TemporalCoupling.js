import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { 
  FilterContainer, 
  FilterSection, 
  TimeRangeFilter, 
  RangeFilter, 
  MultiSelectFilter, 
  ActiveFilterBadges,
  SearchFilter,
  QuickFilterButtons
} from '../components/UnifiedFilters';
import UnifiedPagination from '../components/UnifiedPagination';

// Simple sortable header component
const SortHeader = ({ label, field, currentSort, direction, onSort }) => {
  const active = currentSort === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors ${active ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
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

// Helper function to get coupling intensity information
const getCouplingIntensity = (score) => {
  if (score < 0.3) {
    return {
      category: 'low',
      label: 'Low',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    };
  } else if (score < 0.6) {
    return {
      category: 'medium', 
      label: 'Medium',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200'
    };
  } else {
    return {
      category: 'high',
      label: 'High', 
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-200'
    };
  }
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
  
  // Coupling intensity filter
  const [couplingIntensityFilter, setCouplingIntensityFilter] = useState('all'); // 'all', 'low', 'medium', 'high'

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
    
    // Apply directory filter
    if (directoryFilter) {
      const dir = directoryFilter.toLowerCase();
      list = list.filter(p => p.file_a.toLowerCase().startsWith(dir) || p.file_b.toLowerCase().startsWith(dir));
    }
    
    // Apply coupling intensity filter
    if (couplingIntensityFilter !== 'all') {
      list = list.filter(p => {
        const intensity = getCouplingIntensity(p.coupling_score);
        return intensity.category === couplingIntensityFilter;
      });
    }
    
    const sorted = [...list].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === bv) return 0;
      if (sortDir === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
    return sorted;
  }, [pairs, directoryFilter, couplingIntensityFilter, sortField, sortDir]);

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
    setCouplingIntensityFilter('all');
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
        <FilterContainer
          loading={loading}
          onReset={resetFilters}
          activeFiltersCount={[
            directoryFilter,
            startDate,
            endDate,
            minSharedCommits > 2,
            minCouplingScore > 0,
            selectedFileTypes.length > 0,
            couplingIntensityFilter !== 'all'
          ].filter(Boolean).length}
          resultCount={totalItems}
          totalCount={pairs.length}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Range Filter */}
            <FilterSection title="Time Range" defaultOpen={true}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </FilterSection>

            {/* Coupling Intensity Filter */}
            <FilterSection title="Coupling Intensity" defaultOpen={true}>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    Low (&lt;0.3)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
                    Medium (0.3-0.6)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                    High (&gt;0.6)
                  </span>
                </div>
                <QuickFilterButtons
                  options={[
                    { value: 'all', label: 'All Intensities' },
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' }
                  ]}
                  value={couplingIntensityFilter}
                  onChange={setCouplingIntensityFilter}
                />
              </div>
            </FilterSection>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Thresholds */}
            <FilterSection title="Thresholds" defaultOpen={false}>
              <div className="space-y-4">
                <RangeFilter
                  label="Min Shared Commits"
                  value={minSharedCommits}
                  onChange={setMinSharedCommits}
                  min={1}
                  max={20}
                  step={1}
                  description="Files that changed together at least this many times"
                />
                <RangeFilter
                  label="Min Coupling Score"
                  value={minCouplingScore}
                  onChange={setMinCouplingScore}
                  min={0}
                  max={1}
                  step={0.1}
                  description="Minimum coupling strength (0.0 = weak, 1.0 = always together)"
                />
              </div>
            </FilterSection>

            {/* File Types Filter */}
            <FilterSection title="File Types" defaultOpen={false} badge={selectedFileTypes.length > 0 ? `${selectedFileTypes.length} selected` : null}>
              <MultiSelectFilter
                label="Filter by file extensions"
                options={projectFileTypes}
                selected={selectedFileTypes}
                onChange={setSelectedFileTypes}
                searchable={true}
              />
            </FilterSection>

            {/* Directory Filter */}
            <FilterSection title="Directory" defaultOpen={false}>
              <div className="space-y-3">
                <SearchFilter
                  value={dirSearch}
                  onChange={setDirSearch}
                  placeholder="Search directories..."
                  label="Directory Search"
                />
                {directories.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                    <button
                      type="button"
                      onClick={() => { setDirectoryFilter(''); setDraftDirectory(''); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white transition-colors border-b border-gray-200 ${
                        directoryFilter === '' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>All Directories</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                          {directories.length}
                        </span>
                      </div>
                    </button>
                    {directories
                      .filter(d => !dirSearch || d.toLowerCase().includes(dirSearch.toLowerCase()))
                      .map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => { setDirectoryFilter(d); setDraftDirectory(d); setPage(1); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white transition-colors border-b border-gray-200 last:border-b-0 ${
                            directoryFilter === d ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <span className="truncate">{d}</span>
                        </button>
                      ))}
                    {directories.filter(d => !dirSearch || d.toLowerCase().includes(dirSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
                    )}
                  </div>
                )}
              </div>
            </FilterSection>
          </div>

          {/* Active Filter Badges */}
          <div className="pt-4 border-t border-gray-100">
            <ActiveFilterBadges
              filters={[
                directoryFilter && { key: 'directory', label: `Directory: ${directoryFilter}`, color: 'bg-purple-100 text-purple-800 border border-purple-200' },
                startDate && { key: 'startDate', label: `From: ${startDate}`, color: 'bg-blue-100 text-blue-800 border border-blue-200' },
                endDate && { key: 'endDate', label: `To: ${endDate}`, color: 'bg-blue-100 text-blue-800 border border-blue-200' },
                minSharedCommits > 2 && { key: 'minShared', label: `Min Shared: ${minSharedCommits}`, color: 'bg-green-100 text-green-800 border border-green-200' },
                minCouplingScore > 0 && { key: 'minScore', label: `Min Score: ${minCouplingScore.toFixed(1)}`, color: 'bg-orange-100 text-orange-800 border border-orange-200' },
                selectedFileTypes.length > 0 && { key: 'fileTypes', label: `Types: ${selectedFileTypes.length === 1 ? selectedFileTypes[0] : `${selectedFileTypes.length} selected`}`, color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
                couplingIntensityFilter !== 'all' && { key: 'intensity', label: `Intensity: ${couplingIntensityFilter.charAt(0).toUpperCase() + couplingIntensityFilter.slice(1)}`, color: 'bg-amber-100 text-amber-800 border border-amber-200' }
              ].filter(Boolean)}
              onRemove={(key) => {
                switch(key) {
                  case 'directory': setDirectoryFilter(''); setDraftDirectory(''); break;
                  case 'startDate': setStartDate(''); break;
                  case 'endDate': setEndDate(''); break;
                  case 'minShared': setMinSharedCommits(2); break;
                  case 'minScore': setMinCouplingScore(0); break;
                  case 'fileTypes': setSelectedFileTypes([]); break;
                  case 'intensity': setCouplingIntensityFilter('all'); break;
                }
              }}
            />
          </div>
        </FilterContainer>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
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
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading...</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={7} className="p-8 text-center text-red-600">{error}</td></tr>
                )}
                {!loading && !error && filteredPairs.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">No coupling pairs found.</td></tr>
                )}
                {!loading && !error && pagedPairs.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs whitespace-pre-wrap max-w-xs break-words text-gray-900">{p.file_a}</td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-pre-wrap max-w-xs break-words text-gray-900">{p.file_b}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900">{p.shared_commits}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.total_commits_a}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.total_commits_b}</td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const intensity = getCouplingIntensity(p.coupling_score);
                        const score = p.coupling_score.toFixed(2);
                        const colorClass = intensity.category === 'high' ? 'text-red-600' : 
                                         intensity.category === 'medium' ? 'text-yellow-600' : 
                                         'text-green-600';
                        return (
                          <span className={`font-medium ${colorClass}`}>
                            {score}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.last_modified?.replace('T',' ').replace('Z','')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {!loading && !error && totalItems > 0 && (
            <UnifiedPagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={(p) => setPage(Math.max(1, Math.min(p, totalPages)))}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          )}
        </div>

        {/* Explanation Panel */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How to Interpret Coupling</h2>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
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
