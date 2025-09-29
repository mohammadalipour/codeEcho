import React, { useState, useMemo } from 'react';
import { 
  Treemap, 
  ResponsiveContainer, 
  Cell, 
  Tooltip 
} from 'recharts';
import { 
  ChevronRightIcon, 
  HomeIcon, 
  FunnelIcon, 
  EyeIcon, 
  EyeSlashIcon 
} from '@heroicons/react/24/outline';

const HotspotTreemap = ({ 
  data = [], 
  className = "",
  onNodeClick = () => {} 
}) => {
  const [currentPath, setCurrentPath] = useState([]);
  const [showHighActivityOnly, setShowHighActivityOnly] = useState(false);

  // Get risk color based on risk score
  const getRiskColor = (riskScore) => {
    if (riskScore < 0.3) return '#22c55e'; // green-500
    if (riskScore <= 0.7) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  // Transform hierarchical data to flat structure for treemap
  const transformDataForTreemap = (nodes, pathArray = []) => {
    const result = [];
    
    if (!Array.isArray(nodes)) {
      return result;
    }
    
    nodes.forEach(node => {
      // Safety check for node
      if (!node || typeof node !== 'object') {
        return;
      }
      
      const nodePath = [...pathArray, node.name || ''];
      const fullPath = nodePath.join('/');
      
      // Base node data with safe defaults
      const baseNode = {
        name: node.name || 'Unknown',
        fullPath: fullPath,
        riskScore: typeof node.riskScore === 'number' ? node.riskScore : 0,
        size: typeof node.size === 'number' ? node.size : 0,
        changeFrequency: typeof node.changeFrequency === 'number' ? node.changeFrequency : 0,
        isDirectory: !!(node.children && Array.isArray(node.children) && node.children.length > 0),
        path: nodePath
      };

      // If it has children, add them recursively but also add parent as summary
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        // Add directory node
        result.push({
          ...baseNode,
          size: node.children.reduce((sum, child) => sum + (child?.size || 0), 0)
        });
        
        // Add children
        result.push(...transformDataForTreemap(node.children, nodePath));
      } else {
        // Leaf node (file)
        result.push(baseNode);
      }
    });
    
    return result;
  };

  // Get current level data based on navigation path
  const getCurrentLevelData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    let currentData = data;
    
    // Navigate to current path
    for (const pathSegment of currentPath) {
      const foundNode = currentData.find(node => node.name === pathSegment);
      if (foundNode && foundNode.children) {
        currentData = foundNode.children;
      } else {
        currentData = [];
        break;
      }
    }
    
    // Apply filtering if enabled
    if (showHighActivityOnly) {
      currentData = currentData.filter(node => 
        (node.changeFrequency || 0) > 10 || 
        (node.children && node.children.some(child => (child.changeFrequency || 0) > 10))
      );
    }
    
    // For treemap, we need direct children only - don't transform recursively
    // Just return the immediate children with proper structure for Recharts Treemap
    const directChildren = currentData.map(node => ({
      name: node.name || 'Unknown',
      size: Math.max(node.size || 50, 20), // Ensure minimum size for visibility
      riskScore: node.riskScore || 0,
      changeFrequency: node.changeFrequency || 0,
      isDirectory: !!(node.children && Array.isArray(node.children) && node.children.length > 0),
      // Add color based on risk score - this is what Recharts uses for fill
      fill: getRiskColor(node.riskScore || 0),
      // Store original node for navigation
      originalNode: node
    }));
    
    return directChildren;
  }, [data, currentPath, showHighActivityOnly]);

  // Handle treemap cell click
  const handleCellClick = (entry) => {
    if (entry && entry.payload) {
      const nodeData = entry.payload;
      onNodeClick(nodeData);
      
      // If it's a directory, drill down
      if (nodeData.isDirectory) {
        setCurrentPath([...currentPath, nodeData.name]);
      }
    }
  };

  // Navigate back in breadcrumb
  const navigateToPath = (targetIndex) => {
    setCurrentPath(currentPath.slice(0, targetIndex));
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="font-semibold text-gray-900">{data.name || 'Unknown'}</div>
          <div className="text-sm text-gray-600 mt-1">
            <div>Risk Score: <span className="font-medium">{(data.riskScore || 0).toFixed(2)}</span></div>
            <div>Size: <span className="font-medium">{data.size || 0} LOC</span></div>
            <div>Changes: <span className="font-medium">{data.changeFrequency || 0}</span></div>
            {data.isDirectory && <div className="text-blue-600 text-xs mt-1">Click to drill down</div>}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom treemap cell component
  const CustomCell = (props) => {
    const { payload, ...cellProps } = props;
    
    // Safety check for payload
    if (!payload) {
      return null;
    }
    
    const riskScore = payload.riskScore || 0;
    const name = payload.name || '';
    const color = getRiskColor(riskScore);
    
    return (
      <g>
        <rect
          {...cellProps}
          fill={color}
          stroke="#fff"
          strokeWidth={1}
          className="cursor-pointer transition-opacity hover:opacity-80"
          onClick={() => handleCellClick({ payload })}
        />
        {/* Add text label if cell is large enough */}
        {cellProps.width > 60 && cellProps.height > 30 && (
          <text
            x={cellProps.x + cellProps.width / 2}
            y={cellProps.y + cellProps.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-xs font-medium pointer-events-none"
            style={{ 
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
              fontSize: Math.min(cellProps.width / 8, 12)
            }}
          >
            {name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header with controls */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">Project Hotspot Treemap</h3>
            
            {/* Breadcrumb navigation */}
            <nav className="flex items-center space-x-1 text-sm text-gray-500">
              <button
                onClick={() => setCurrentPath([])}
                className="flex items-center hover:text-gray-700 transition-colors"
              >
                <HomeIcon className="h-4 w-4 mr-1" />
                Root
              </button>
              
              {currentPath.map((segment, index) => (
                <React.Fragment key={index}>
                  <ChevronRightIcon className="h-4 w-4" />
                  <button
                    onClick={() => navigateToPath(index + 1)}
                    className="hover:text-gray-700 transition-colors"
                  >
                    {segment}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>
          
          {/* Filter toggle */}
          <button
            onClick={() => setShowHighActivityOnly(!showHighActivityOnly)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              showHighActivityOnly
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {showHighActivityOnly ? (
              <EyeIcon className="h-4 w-4 mr-2" />
            ) : (
              <EyeSlashIcon className="h-4 w-4 mr-2" />
            )}
            High Activity Only
            {showHighActivityOnly && (
              <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                &gt;10
              </span>
            )}
          </button>
        </div>
        
        {/* Legend */}
        <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span>Low Risk (&lt; 0.3)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-amber-500 rounded mr-2"></div>
            <span>Medium Risk (0.3-0.7)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span>High Risk (&gt; 0.7)</span>
          </div>
          <div className="text-xs text-gray-500">
            • Rectangle size = Lines of Code • Click directories to drill down
          </div>
        </div>
      </div>

      {/* Treemap visualization */}
      <div className="px-6 py-4">
        {getCurrentLevelData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={getCurrentLevelData}
                dataKey="size"
                stroke="#fff"
                strokeWidth={2}
                onClick={handleCellClick}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FunnelIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <div className="text-lg font-medium">No data to display</div>
              <div className="text-sm mt-1">
                {showHighActivityOnly 
                  ? 'Try disabling the high activity filter'
                  : 'No files or directories found at this level'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {getCurrentLevelData.length} items
            {showHighActivityOnly && ' (high activity only)'}
          </div>
          <div className="flex items-center space-x-4">
            <span>
              Total LOC: {getCurrentLevelData.reduce((sum, item) => sum + item.size, 0).toLocaleString()}
            </span>
            <span>
              Avg Risk: {getCurrentLevelData.length > 0 
                ? (getCurrentLevelData.reduce((sum, item) => sum + item.riskScore, 0) / getCurrentLevelData.length).toFixed(2)
                : '0.00'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotTreemap;