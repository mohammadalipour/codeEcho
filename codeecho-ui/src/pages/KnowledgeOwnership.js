import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { 
  FilterContainer, 
  FilterSection, 
  SelectFilter, 
  RangeFilter, 
  MultiSelectFilter, 
  ActiveFilterBadges,
  SearchFilter,
  QuickFilterButtons
} from '../components/UnifiedFilters';
import UnifiedPagination from '../components/UnifiedPagination';

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
    const map = { 
      high: 'text-red-700', 
      medium: 'text-yellow-700', 
      low: 'text-green-700', 
      critical: 'text-red-800' 
    };
    return map[lvl] || 'text-gray-600';
  };

  return (
    <>
      <style>{sliderStyles}</style>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Knowledge Ownership</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-3xl">Analyze file ownership concentration and potential knowledge risk across the codebase.</p>
        {error && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">{error}</div>
        )}
      </div>

      {/* Filters */}
            {/* Filters */}
      <FilterContainer
        loading={loading}
        onReset={resetFilters}
        activeFiltersCount={activeFilterCount}
        resultCount={sorted.length}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Owner */}
          <FilterSection title="Owner" defaultOpen={true}>
            <SelectFilter
              label="Select Owner"
              value={selectedOwner}
              onChange={setSelectedOwner}
              options={uniqueOwners.map(o => ({ value: o, label: o }))}
              placeholder="All Owners"
            />
          </FilterSection>

          {/* Risk Level */}
          <FilterSection title="Risk Level" defaultOpen={true}>
            <QuickFilterButtons
              options={[
                { value: 'all', label: 'All Levels' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              value={riskLevel}
              onChange={setRiskLevel}
            />
          </FilterSection>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Directory */}
          <FilterSection title="Directory" defaultOpen={false}>
            <div className="space-y-3">
              <div className="text-xs text-gray-600">
                <button type="button" onClick={() => setDirectoryPath([])} className="text-blue-600 hover:underline">root</button>
                {directoryPath.map((seg, idx) => (
                  <React.Fragment key={idx}>
                    <span className="text-gray-400"> / </span>
                    <button type="button" onClick={() => setDirectoryPath(directoryPath.slice(0, idx + 1))} className="text-blue-600 hover:underline truncate max-w-[80px] align-top">{seg}</button>
                  </React.Fragment>
                ))}
              </div>
              {directoryChildren.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setDirectoryPath([])}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white transition-colors border-b border-gray-200 ${
                      directoryPath.length === 0 ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>All Directories</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{directoryChildren.length}</span>
                    </div>
                  </button>
                  {directoryChildren.map(dir => (
                    <button
                      key={dir.name}
                      type="button"
                      onClick={() => setDirectoryPath(prev => [...prev, dir.name])}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white transition-colors border-b border-gray-200 last:border-b-0 ${
                        directoryPath.join('/').endsWith(dir.name) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{dir.name}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{dir.count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FilterSection>

          {/* File Types */}
          <FilterSection title="File Types" defaultOpen={false} badge={selectedFileTypes.length ? `${selectedFileTypes.length} selected` : null}>
            <MultiSelectFilter
              label="Filter by file extensions"
              options={(projectFileTypes || []).map(t => ({ value: t, label: t }))}
              selected={selectedFileTypes}
              onChange={setSelectedFileTypes}
              searchable={true}
            />
          </FilterSection>

          {/* Thresholds */}
          <FilterSection title="Thresholds" defaultOpen={false}>
            <div className="space-y-4">
              <RangeFilter
                label="Min Ownership %"
                value={minOwnership}
                onChange={setMinOwnership}
                min={0}
                max={100}
                step={5}
                description={`Files with primary ownership ≥ ${minOwnership}%`}
              />
              <RangeFilter
                label="Max Authors"
                value={maxAuthors}
                onChange={setMaxAuthors}
                min={1}
                max={20}
                step={1}
                description={`Files with ≤ ${maxAuthors} total contributors`}
              />
            </div>
          </FilterSection>
        </div>

        {/* Active Filter Badges */}
        <div className="pt-4 border-t border-gray-100">
          <ActiveFilterBadges
            filters={[
              selectedOwner && { key: 'owner', label: `Owner: ${selectedOwner}`, color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
              directoryPath.length > 0 && { key: 'directory', label: `Dir: /${directoryPath.join('/')}`, color: 'bg-purple-100 text-purple-800 border border-purple-200' },
              riskLevel !== 'all' && { 
                key: 'risk', 
                label: `Risk: ${riskLevel}`, 
                color: (riskLevel === 'critical' || riskLevel === 'high') ? 'bg-red-100 text-red-800 border border-red-200' : (riskLevel === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-green-100 text-green-800 border border-green-200')
              },
              selectedFileTypes.length > 0 && { key: 'fileTypes', label: `Types: ${selectedFileTypes.length === 1 ? selectedFileTypes[0] : `${selectedFileTypes.length} selected`}`, color: 'bg-cyan-100 text-cyan-800 border border-cyan-200' },
              minOwnership > 0 && { key: 'minOwnership', label: `Min Ownership: ${minOwnership}%`, color: 'bg-blue-100 text-blue-800 border border-blue-200' },
              maxAuthors < 20 && { key: 'maxAuthors', label: `≤ ${maxAuthors} authors`, color: 'bg-teal-100 text-teal-800 border border-teal-200' }
            ].filter(Boolean)}
            onRemove={(key) => {
              switch (key) {
                case 'owner': setSelectedOwner(''); break;
                case 'directory': setDirectoryPath([]); break;
                case 'risk': setRiskLevel('all'); break;
                case 'fileTypes': setSelectedFileTypes([]); break;
                case 'minOwnership': setMinOwnership(0); break;
                case 'maxAuthors': setMaxAuthors(20); break;
              }
            }}
          />
        </div>

        {loading && <div className="text-xs text-gray-500 animate-pulse">Loading ownership…</div>}
      </FilterContainer>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">File Ownership ({sorted.length} total, showing {paginatedData.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['filePath','primaryOwner','ownershipPercentage','totalContributors','busFactor','lastModified'].map(col => (
                  <th key={col} className={`text-left font-medium text-xs uppercase tracking-wider px-4 py-3 ${col!=='busFactor'?'cursor-pointer hover:text-gray-700':'text-gray-500'} ${sortConfig.key===col?'text-gray-900 bg-gray-100':'text-gray-500'}`} onClick={() => col!=='busFactor' && toggleSort(col === 'busFactor' ? 'busFactor' : col)}>
                    <div className="flex items-center gap-1">
                      <span>{col === 'filePath' ? 'File Path' : col === 'primaryOwner' ? 'Main Owner' : col === 'ownershipPercentage' ? 'Ownership %' : col === 'totalContributors' ? '# Authors' : col === 'busFactor' ? 'Bus Factor' : 'Last Modified'}</span>
                      {sortConfig.key === col && <span className="text-[10px]">{sortConfig.direction==='asc'?'▲':'▼'}</span>}
                    </div>
                  </th>
                ))}
                <th className="text-left font-medium text-xs uppercase tracking-wider px-4 py-3 text-gray-500">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((r,i) => {
                const bf = computeBusFactor(r);
                const risk = r.riskLevel;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap max-w-xs truncate font-mono text-xs text-gray-900" title={r.filePath}>{r.filePath}</td>
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap font-medium">{r.primaryOwner}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{r.ownershipPercentage}%</td>
                    <td className="px-4 py-3 text-gray-600">{r.totalContributors}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{bf}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{r.lastModified || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium text-xs ${riskBadge(risk)}`}>{risk}</span>
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
          <UnifiedPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={sorted.length}
            onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)))}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
        </div>
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
