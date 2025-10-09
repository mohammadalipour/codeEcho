import React, { useState } from 'react';
import { 
  FunnelIcon, 
  XMarkIcon, 
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

/**
 * Unified Filter Components for consistent UI/UX across all pages
 */

// Filter Section Container with modern styling
export const FilterContainer = ({ children, loading, onReset, activeFiltersCount, resultCount, totalCount }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
      <div className="p-6">
        {/* Filter Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg">
                <FunnelIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>
                    Showing <span className="font-medium text-gray-900">{resultCount?.toLocaleString() || 0}</span>
                    {totalCount !== undefined && totalCount !== resultCount && (
                      <span> of {totalCount.toLocaleString()}</span>
                    )}
                  </span>
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      {activeFiltersCount} active
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span>Updating...</span>
              </div>
            )}
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200 border border-gray-300"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset All
            </button>
          </div>
        </div>

        {/* Filter Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Collapsible Filter Section
export const FilterSection = ({ title, children, defaultOpen = true, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {badge && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

// Time Range Filter with modern design
export const TimeRangeFilter = ({ value, onChange, startDate, endDate, onDateChange }) => {
  const presets = [
    { value: 'all', label: 'All Time' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: '1year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {presets.map(preset => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              value === preset.value
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onDateChange('start', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              max={endDate || undefined}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange('end', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              min={startDate || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Dropdown Select Filter
export const SelectFilter = ({ label, value, onChange, options, placeholder = "Select..." }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Range Input Filter
export const RangeFilter = ({ label, value, onChange, min = 0, max = 100, step = 1, description }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  );
};

// Multi-Select Filter with Search
export const MultiSelectFilter = ({ label, options, selected, onChange, searchable = false, counts = {} }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = searchable 
    ? options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {selected.length > 0 && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {selected.length} selected
          </span>
        )}
      </div>

      {searchable && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={selected.length === options.length ? clearAll : selectAll}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
        >
          {selected.length === options.length ? 'Clear All' : 'Select All'}
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
        ) : (
          filteredOptions.map(option => {
            const isSelected = selected.includes(option);
            const count = counts[option];
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-white transition-colors border-b border-gray-200 last:border-b-0 ${
                  isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span>{option}</span>
                </div>
                {count !== undefined && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// Active Filter Badges
export const ActiveFilterBadges = ({ filters, onRemove }) => {
  if (!filters || filters.length === 0) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
        No filters applied
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter, index) => (
        <span
          key={index}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
            filter.color || 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          {filter.label}
          <button
            type="button"
            onClick={() => onRemove(filter.key)}
            className="text-current opacity-70 hover:opacity-100 font-semibold"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
};

// Search Input with clear button
export const SearchFilter = ({ value, onChange, placeholder, label }) => {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Quick Action Buttons
export const QuickFilterButtons = ({ options, value, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            value === option.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default {
  FilterContainer,
  FilterSection,
  TimeRangeFilter,
  SelectFilter,
  RangeFilter,
  MultiSelectFilter,
  ActiveFilterBadges,
  SearchFilter,
  QuickFilterButtons
};