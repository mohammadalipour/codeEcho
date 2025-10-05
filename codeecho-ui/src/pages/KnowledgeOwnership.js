import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [project, setProject] = useState(null);

  // Filters (inspired by HotspotFilters styling but simplified)
  const [ownerSearch, setOwnerSearch] = useState('');
  const [pathSearch, setPathSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState('all'); // low|medium|high|critical
  const [minOwnership, setMinOwnership] = useState(0); // % threshold
  const [maxAuthors, setMaxAuthors] = useState(''); // numeric filter

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'ownershipPercentage', direction: 'desc' });

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

  // Derived & filtered data
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (ownerSearch && !r.primaryOwner.toLowerCase().includes(ownerSearch.toLowerCase())) return false;
      if (pathSearch && !r.filePath.toLowerCase().includes(pathSearch.toLowerCase())) return false;
      if (riskLevel !== 'all' && r.riskLevel !== riskLevel) return false;
      if (minOwnership && r.ownershipPercentage < Number(minOwnership)) return false;
      if (maxAuthors && r.totalContributors > Number(maxAuthors)) return false;
      return true;
    });
  }, [records, ownerSearch, pathSearch, riskLevel, minOwnership, maxAuthors]);

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

  const toggleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const activeFilterCount = [
    ownerSearch, pathSearch, riskLevel !== 'all', Number(minOwnership) > 0, !!maxAuthors
  ].filter(Boolean).length;

  const resetFilters = () => {
    setOwnerSearch(''); setPathSearch(''); setRiskLevel('all'); setMinOwnership(0); setMaxAuthors('');
  };

  const riskBadge = (lvl) => {
    const map = { high: 'bg-red-100 text-red-700 border-red-200', medium: 'bg-amber-100 text-amber-700 border-amber-200', low: 'bg-green-100 text-green-700 border-green-200', critical: 'bg-red-200 text-red-800 border-red-300' };
    return map[lvl] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/projects'); }}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium group"
          >
            <span className="inline-block transition-transform group-hover:-translate-x-0.5">←</span>
            <span>Back</span>
          </button>
        </div>
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
        <div className="grid gap-4 md:grid-cols-5 items-start">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Owner</label>
            <input value={ownerSearch} onChange={e=>setOwnerSearch(e.target.value)} placeholder="Search owner" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Path</label>
            <input value={pathSearch} onChange={e=>setPathSearch(e.target.value)} placeholder="Search path" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Risk</label>
            <select value={riskLevel} onChange={e=>setRiskLevel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Ownership ≥ %</label>
            <input type="number" min={0} max={100} value={minOwnership} onChange={e=>setMinOwnership(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <label className="block text-sm font-medium text-gray-700 mt-2">Max Authors</label>
            <input type="number" min={1} value={maxAuthors} onChange={e=>setMaxAuthors(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {/* Active badges */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 pt-3 text-xs">
          {ownerSearch && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Owner: {ownerSearch}<button onClick={()=>setOwnerSearch('')} className="hover:text-indigo-900">×</button></span>}
          {pathSearch && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Path: {pathSearch}<button onClick={()=>setPathSearch('')} className="hover:text-purple-900">×</button></span>}
          {riskLevel !== 'all' && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${riskLevel==='high'||riskLevel==='critical'?'bg-red-100 text-red-700':riskLevel==='medium'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>Risk: {riskLevel}<button onClick={()=>setRiskLevel('all')} className="hover:opacity-80">×</button></span>}
          {Number(minOwnership) > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Own ≥ {minOwnership}%<button onClick={()=>setMinOwnership(0)} className="hover:text-blue-900">×</button></span>}
          {maxAuthors && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">≤ {maxAuthors} authors<button onClick={()=>setMaxAuthors('')} className="hover:text-teal-900">×</button></span>}
        </div>
        {loading && <div className="text-xs text-gray-500 animate-pulse">Loading ownership…</div>}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
        <h3 className="text-sm font-medium text-gray-700 mb-3">File Ownership ({sorted.length})</h3>
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
            {sorted.slice(0,300).map((r,i) => {
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
        {sorted.length > 300 && <div className="mt-2 text-[11px] text-gray-500">Showing first 300 results. Refine filters to narrow further.</div>}
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
  );
};

export default KnowledgeOwnership;
