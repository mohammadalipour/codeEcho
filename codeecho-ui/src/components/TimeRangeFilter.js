import React from 'react';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

const TimeRangeFilter = ({ 
  value, 
  startDate, 
  endDate, 
  onTimeRangeChange, 
  onCustomDateChange,
  className = "" 
}) => {
  const presets = [
    { value: 'all', label: 'All Time' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: '1year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const isValidCustomRange = () => {
    return value === 'custom' && startDate && endDate && startDate <= endDate;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <ClockIcon className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-medium text-gray-900">Time Range</h3>
      </div>
      
      {/* Preset Options */}
      <div className="space-y-2 mb-4">
        {presets.map((preset) => (
          <label key={preset.value} className="flex items-center">
            <input
              type="radio"
              value={preset.value}
              checked={value === preset.value}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">{preset.label}</span>
          </label>
        ))}
      </div>

      {/* Custom Date Range Inputs */}
      {value === 'custom' && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onCustomDateChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                max={endDate || undefined}
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => onCustomDateChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={startDate || undefined}
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Validation Message */}
          {value === 'custom' && startDate && endDate && !isValidCustomRange() && (
            <p className="text-sm text-red-600">
              End date must be after start date
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeRangeFilter;