import React, { useState, useMemo } from 'react';
import { FunnelIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * HotspotFilters Component
 * Consolidates time range, repository, and directory selection with improved UX.
 */
const AdvancedSection = ({ title, description, children, openByDefault=false }) => {
  const [open, setOpen] = useState(openByDefault);
  return (
    <div className="border border-gray-200 rounded-md">
      <button
        type="button"
        onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>{title}</span>
        <span className="text-xs text-gray-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 text-xs text-gray-500">{description}</div>
      )}
      {open && <div className="px-3 pb-3 space-y-6">{children}</div>}
    </div>
  );
};

const HotspotFilters = ({
  timeRange, startDate, endDate,
  onTimeRangeChange, onCustomDateChange,
  repositories, repository, onRepositoryChange,
  directories, directory, onDirectoryChange,
  directoryCounts = {},
  complexityMetric, onComplexityMetricChange,
  minComplexity, onMinComplexityChange,
  availableFileTypes = [], fileTypeCounts = {}, selectedFileTypes = [], onSelectedFileTypesChange,
  minChanges, onMinChangesChange,
  riskLevel = 'all', onRiskLevelChange,
  totalHotspotCount = 0,
  filteredHotspotCount = 0,
  onReset,
  loading
}) => {
  const [dirSearch, setDirSearch] = useState('');
  const filteredDirectories = useMemo(() => {
    if (!dirSearch) return directories;
    return directories.filter(d => d.toLowerCase().includes(dirSearch.toLowerCase()));
  }, [directories, dirSearch]);

  const activeFilterCount = [
    timeRange !== 'all',
    repository !== 'all',
    !!directory,
    complexityMetric !== 'cyclomatic' || (minComplexity && Number(minComplexity) !== 10),
    (minComplexity && Number(minComplexity) !== 10),
    Number(minChanges) > 0,
    selectedFileTypes && selectedFileTypes.length > 0,
    riskLevel !== 'all'
  ].filter(Boolean).length;

  const toggleFileType = (ext) => {
    if (!onSelectedFileTypesChange) return;
    if (selectedFileTypes.includes(ext)) {
      onSelectedFileTypesChange(selectedFileTypes.filter(e => e !== ext));
    } else {
      onSelectedFileTypesChange([...selectedFileTypes, ext]);
    }
  };

  const clearFileTypes = () => onSelectedFileTypesChange && onSelectedFileTypesChange([]);

  return (
  <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
          <FunnelIcon className="h-5 w-5 text-blue-600" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500">
            Showing <span className="font-medium text-gray-700">{filteredHotspotCount}</span> of {totalHotspotCount}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ArrowPathIcon className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

  <div className="grid gap-4 md:gap-5 md:grid-cols-3 items-start">
        {/* Time Range (segmented) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              {value:'all',label:'All'},
              {value:'3months',label:'3M'},
              {value:'6months',label:'6M'},
              {value:'1year',label:'1Y'},
              {value:'custom',label:'Custom'}
            ].map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => onTimeRangeChange(p.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${timeRange===p.value ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
              >{p.label}</button>
            ))}
          </div>
          {timeRange === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e)=>onCustomDateChange('start', e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  max={endDate || undefined}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e)=>onCustomDateChange('end', e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={startDate || undefined}
                />
              </div>
            </div>
          )}
        </div>

        {/* Risk Level (moved up) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Risk Level</label>
          <select
            value={riskLevel}
            onChange={e => onRiskLevelChange && onRiskLevelChange(e.target.value)}
            className="w-full px-2.5 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

  {/* Repository */}
  <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Repository / Service</label>
          <select
            value={repository}
            onChange={(e) => onRepositoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            aria-label="Repository filter"
          >
            <option value="all">All Repositories</option>
            {repositories.map(r => (
              <option key={r.id || r.name || r} value={r.name || r.slug || r.repository || r}>
                {r.name || r.slug || r.repository || r}
              </option>
            ))}
          </select>
        </div>

  {/* Complexity */}
    <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Complexity</label>
          <div className="flex items-center gap-2 mb-3">
            <select
              value={complexityMetric}
              onChange={(e) => onComplexityMetricChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              aria-label="Complexity metric"
            >
              <option value="cyclomatic">Cyclomatic</option>
              <option value="cognitive">Cognitive</option>
              <option value="loc">LOC</option>
            </select>
            <input
              type="number"
              value={minComplexity}
              min={0}
              onChange={(e) => onMinComplexityChange(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Minimum complexity threshold"
              placeholder="Min"
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {[5,10,15,20].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => onMinComplexityChange(val)}
                className={`px-2 py-1 rounded-md text-xs border ${Number(minComplexity) === val ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
              >≥ {val}</button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">Applied on selected metric.</p>
        </div>

        {/* Change Frequency */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Changes</label>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={minChanges}
              onChange={(e)=>onMinChangesChange(Number(e.target.value))}
              className="flex-1 h-2 accent-blue-600"
              aria-label="Minimum number of changes slider"
            />
            <input
              type="number"
              min={0}
              value={minChanges}
              onChange={(e)=>onMinChangesChange(Number(e.target.value))}
              className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Minimum number of changes input"
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-1">
            {[0,5,10,20,30].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => onMinChangesChange(v)}
                className={`px-2 py-1 rounded-md text-xs border ${Number(minChanges) === v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
              >{v === 0 ? 'Any' : `≥ ${v}`}</button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">Only show files changed at least this many times in selected period.</p>
        </div>

        {/* File Types Multi-select */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">File Types
            {selectedFileTypes.length > 0 && (
              <button type="button" onClick={clearFileTypes} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"><XMarkIcon className="h-4 w-4"/>Clear</button>
            )}
          </label>
          {availableFileTypes.length === 0 ? (
            <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-md p-3">No file types detected</div>
          ) : (
            <div className="border border-gray-200 rounded-md p-2 max-h-44 overflow-auto bg-white">
              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => onSelectedFileTypesChange(selectedFileTypes.length === availableFileTypes.length ? [] : [...availableFileTypes])}
                  className="px-2 py-1 rounded-md text-[11px] border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
                >{selectedFileTypes.length === availableFileTypes.length ? 'Unselect All' : 'Select All'}</button>
                {selectedFileTypes.length > 0 && (
                  <span className="px-2 py-1 rounded-md text-[11px] bg-blue-50 text-blue-700 border border-blue-200">{selectedFileTypes.length} selected</span>
                )}
              </div>
              <ul className="space-y-1">
                {availableFileTypes.map(ext => {
                  const active = selectedFileTypes.includes(ext);
                  return (
                    <li key={ext}>
                      <button
                        type="button"
                        onClick={() => toggleFileType(ext)}
                        className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-md border text-xs transition ${active ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-sm border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`} aria-hidden="true"></span>
                          .{ext}
                        </span>
                        <span className="text-[10px] bg-gray-100 rounded px-1.5 py-0.5">{fileTypeCounts[ext]||0}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="mt-2 text-[11px] text-gray-500">Filter hotspots by one or more file extensions.</p>
        </div>

        {/* Directory full-width row */}
  <div className="md:col-span-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Directory</label>
            {directory && (
              <button type="button" onClick={() => onDirectoryChange('')} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"><XMarkIcon className="h-4 w-4"/>Clear</button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={dirSearch}
              onChange={(e) => setDirSearch(e.target.value)}
              placeholder="Search directory..."
              className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Search directories"
            />
            {dirSearch && (
              <button type="button" onClick={() => setDirSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear directory search">×</button>
            )}
          </div>
          <div className="border border-gray-200 rounded-md max-h-44 overflow-auto divide-y divide-gray-100 bg-white">
            <button
              type="button"
              onClick={() => onDirectoryChange('')}
              className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center hover:bg-gray-50 ${directory === '' ? 'bg-blue-50/60 text-blue-700 font-medium' : 'text-gray-600'}`}
            >
              <span>All Directories</span>
              <span className="text-[10px] rounded bg-gray-100 px-1.5 py-0.5">{directories.length}</span>
            </button>
            {filteredDirectories.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">No match</div>
            )}
            {filteredDirectories.map(dir => (
              <button
                key={dir}
                type="button"
                onClick={() => onDirectoryChange(dir)}
                className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center hover:bg-gray-50 ${directory === dir ? 'bg-blue-50/60 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                <span className="truncate mr-2">{dir}</span>
                <span className="text-[10px] rounded bg-gray-100 px-1.5 py-0.5">{directoryCounts[dir] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

  {/* Active filter badges */}
  <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 pt-3">
        {timeRange !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
            Time: {timeRange}
            <button onClick={() => onTimeRangeChange('all')} aria-label="Clear time range" className="hover:text-blue-900">×</button>
          </span>
        )}
        {repository !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
            Repo: {repository}
            <button onClick={() => onRepositoryChange('all')} aria-label="Clear repository" className="hover:text-green-900">×</button>
          </span>
        )}
        {directory && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">
            Dir: {directory}
            <button onClick={() => onDirectoryChange('')} aria-label="Clear directory" className="hover:text-purple-900">×</button>
          </span>
        )}
        {(complexityMetric !== 'cyclomatic' || (minComplexity && Number(minComplexity) !== 10)) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">
            Metric: {complexityMetric}{minComplexity ? ` ≥ ${minComplexity}` : ''}
            <button onClick={() => { onComplexityMetricChange('cyclomatic'); onMinComplexityChange(10); }} aria-label="Clear complexity filters" className="hover:text-orange-900">×</button>
          </span>
        )}
        {Number(minChanges) > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs">
            Changes ≥ {minChanges}
            <button onClick={() => onMinChangesChange(0)} aria-label="Clear min changes" className="hover:text-rose-900">×</button>
          </span>
        )}
        {selectedFileTypes && selectedFileTypes.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs">
            Types: {selectedFileTypes.slice(0,3).join(', ')}{selectedFileTypes.length>3?` +${selectedFileTypes.length-3}`:''}
            <button onClick={clearFileTypes} aria-label="Clear file types" className="hover:text-indigo-900">×</button>
          </span>
        )}
        {riskLevel !== 'all' && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${riskLevel==='High' ? 'bg-red-100 text-red-700' : riskLevel==='Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            Risk: {riskLevel}
            <button onClick={() => onRiskLevelChange && onRiskLevelChange('all')} aria-label="Clear risk level" className="hover:opacity-80">×</button>
          </span>
        )}
      </div>

      {loading && (
        <div className="text-xs text-gray-500 animate-pulse">Updating hotspots…</div>
      )}
    </div>
  );
};

export default HotspotFilters;
