import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import HotspotTreemapComponent from '../components/HotspotTreemap';

const HotspotTreemap = () => {
  const { id } = useParams();
  const { api } = useApi();
  const [project, setProject] = useState(null);
  const [hotspotsData, setHotspotsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProjectHotspots = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load project info and hotspots data
        const [projectData, hotspotsResponse] = await Promise.all([
          api.getProject(id),
          api.getProjectHotspots(id)
        ]);
        
        setProject(projectData);
        setHotspotsData(hotspotsResponse.hotspots || []);
      } catch (err) {
        console.error('Failed to load project hotspots:', err);
        setError('Failed to load hotspot data for this project');
        // Fall back to mock data for demo purposes
        setHotspotsData(getMockProjectData());
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProjectHotspots();
    }
  }, [id, api]);

  const getMockProjectData = () => {
    return [
    {
      name: 'src',
      riskScore: 0.6,
      size: 2500,
      changeFrequency: 25,
      children: [
        {
          name: 'components',
          riskScore: 0.8,
          size: 1200,
          changeFrequency: 15,
          children: [
            {
              name: 'Header.js',
              riskScore: 0.9,
              size: 150,
              changeFrequency: 20
            },
            {
              name: 'Footer.js',
              riskScore: 0.2,
              size: 80,
              changeFrequency: 3
            },
            {
              name: 'Navigation.js',
              riskScore: 0.7,
              size: 200,
              changeFrequency: 12
            },
            {
              name: 'Modal.js',
              riskScore: 0.95,
              size: 300,
              changeFrequency: 35
            },
            {
              name: 'Button.js',
              riskScore: 0.1,
              size: 50,
              changeFrequency: 2
            },
            {
              name: 'forms',
              riskScore: 0.6,
              size: 420,
              changeFrequency: 8,
              children: [
                {
                  name: 'LoginForm.js',
                  riskScore: 0.8,
                  size: 180,
                  changeFrequency: 15
                },
                {
                  name: 'ContactForm.js',
                  riskScore: 0.4,
                  size: 120,
                  changeFrequency: 6
                },
                {
                  name: 'ValidationUtils.js',
                  riskScore: 0.7,
                  size: 120,
                  changeFrequency: 12
                }
              ]
            }
          ]
        },
        {
          name: 'pages',
          riskScore: 0.5,
          size: 800,
          changeFrequency: 18,
          children: [
            {
              name: 'Home.js',
              riskScore: 0.3,
              size: 200,
              changeFrequency: 8
            },
            {
              name: 'About.js',
              riskScore: 0.1,
              size: 120,
              changeFrequency: 2
            },
            {
              name: 'Dashboard.js',
              riskScore: 0.85,
              size: 350,
              changeFrequency: 25
            },
            {
              name: 'Profile.js',
              riskScore: 0.6,
              size: 130,
              changeFrequency: 11
            }
          ]
        },
        {
          name: 'utils',
          riskScore: 0.4,
          size: 300,
          changeFrequency: 7,
          children: [
            {
              name: 'api.js',
              riskScore: 0.8,
              size: 180,
              changeFrequency: 16
            },
            {
              name: 'helpers.js',
              riskScore: 0.2,
              size: 120,
              changeFrequency: 4
            }
          ]
        },
        {
          name: 'App.js',
          riskScore: 0.7,
          size: 200,
          changeFrequency: 14
        }
      ]
    },
    {
      name: 'public',
      riskScore: 0.1,
      size: 100,
      changeFrequency: 1,
      children: [
        {
          name: 'index.html',
          riskScore: 0.05,
          size: 50,
          changeFrequency: 1
        },
        {
          name: 'favicon.ico',
          riskScore: 0.0,
          size: 1,
          changeFrequency: 0
        },
        {
          name: 'manifest.json',
          riskScore: 0.1,
          size: 49,
          changeFrequency: 1
        }
      ]
    },
    {
      name: 'docs',
      riskScore: 0.2,
      size: 300,
      changeFrequency: 3,
      children: [
        {
          name: 'README.md',
          riskScore: 0.3,
          size: 150,
          changeFrequency: 5
        },
        {
          name: 'CHANGELOG.md',
          riskScore: 0.1,
          size: 100,
          changeFrequency: 2
        },
        {
          name: 'api',
          riskScore: 0.2,
          size: 50,
          changeFrequency: 1,
          children: [
            {
              name: 'endpoints.md',
              riskScore: 0.2,
              size: 50,
              changeFrequency: 1
            }
          ]
        }
      ]
    },
    {
      name: 'tests',
      riskScore: 0.3,
      size: 400,
      changeFrequency: 8,
      children: [
        {
          name: 'unit',
          riskScore: 0.4,
          size: 250,
          changeFrequency: 6,
          children: [
            {
              name: 'components.test.js',
              riskScore: 0.5,
              size: 150,
              changeFrequency: 8
            },
            {
              name: 'utils.test.js',
              riskScore: 0.3,
              size: 100,
              changeFrequency: 4
            }
          ]
        },
        {
          name: 'integration',
          riskScore: 0.2,
          size: 150,
          changeFrequency: 2,
          children: [
            {
              name: 'api.test.js',
              riskScore: 0.2,
              size: 150,
              changeFrequency: 2
            }
          ]
        }
      ]
    }
  ];
  };

  // Transform API data to treemap format (when real data is available)
  const transformHotspotsToTreemap = (hotspots) => {
    if (!hotspots || hotspots.length === 0) {
      console.log('No hotspots data, using mock data');
      return getMockProjectData();
    }

    console.log('Transforming real hotspots data:', hotspots);

    // Create a hierarchical structure from flat hotspot data
    const folderMap = new Map();
    const result = [];

    hotspots.forEach(hotspot => {
      const parts = hotspot.file_path.split('/').filter(part => part.length > 0);
      if (parts.length === 0) return;

      let currentPath = '';
      let currentLevel = result;

      // Build folder structure
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        
        let folder = currentLevel.find(item => item.name === folderName);
        if (!folder) {
          folder = {
            name: folderName,
            riskScore: 0.3,
            size: 0,
            changeFrequency: 0,
            children: []
          };
          currentLevel.push(folder);
        }
        
        currentLevel = folder.children;
      }

      // Add the file
      const fileName = parts[parts.length - 1];
      const riskScore = hotspot.risk_level === 'High' ? 0.8 : 
                       hotspot.risk_level === 'Medium' ? 0.5 : 0.2;
      
      currentLevel.push({
        name: fileName,
        riskScore: riskScore,
        size: Math.max(hotspot.total_changes || 50, 20), // Ensure minimum size for visibility
        changeFrequency: hotspot.change_count || 1
      });
    });

    // Calculate folder sizes and risk scores based on children
    const calculateFolderStats = (items) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          calculateFolderStats(item.children);
          
          // Calculate folder size as sum of children
          item.size = item.children.reduce((sum, child) => sum + (child.size || 0), 0);
          
          // Calculate folder risk as average of children
          const childRisks = item.children.map(child => child.riskScore || 0);
          item.riskScore = childRisks.reduce((sum, risk) => sum + risk, 0) / childRisks.length;
          
          // Calculate folder change frequency as sum of children
          item.changeFrequency = item.children.reduce((sum, child) => sum + (child.changeFrequency || 0), 0);
        }
      });
    };

    calculateFolderStats(result);
    
    console.log('Transformed treemap data:', result);
    return result;
  };

  const handleNodeClick = (nodeData) => {
    console.log('Clicked node:', nodeData);
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading hotspots</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const treeMapData = transformHotspotsToTreemap(hotspotsData);
  
  console.log('HotspotTreemap - hotspotsData length:', hotspotsData.length);
  console.log('HotspotTreemap - using transformed data');
  console.log('HotspotTreemap - final treeMapData:', treeMapData);

  // Ensure we always have some data to display
  const finalTreeMapData = treeMapData && treeMapData.length > 0 ? treeMapData : getMockProjectData();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {project ? `${project.name} - Hotspot Analysis` : 'Project Hotspot Analysis'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Interactive visualization of project structure and risk analysis
        </p>
        
        {/* Hotspot Definition */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">What are Code Hotspots?</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Files, modules, or classes with both high complexity and frequent changes. 
                  These are prime candidates for refactoring because they are both risky and business-critical.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {project && !project.is_analyzed && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Demo Mode</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>This project hasn't been analyzed yet. The treemap shows mock data for demonstration.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <HotspotTreemapComponent 
        data={finalTreeMapData}
        onNodeClick={handleNodeClick}
        className="mb-8"
      />

      {/* Usage instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">How to Use</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div>• <strong>Rectangle Size:</strong> Represents Lines of Code (LOC)</div>
          <div>• <strong>Rectangle Color:</strong> Indicates risk score (Green = Low, Orange = Medium, Red = High)</div>
          <div>• <strong>Click Directories:</strong> Drill down to explore folder contents</div>
          <div>• <strong>Breadcrumb Navigation:</strong> Click path segments to navigate back</div>
          <div>• <strong>High Activity Filter:</strong> Toggle to show only files with &gt;10 changes</div>
          <div>• <strong>Hover:</strong> View detailed metrics in tooltip</div>
        </div>
      </div>
    </div>
  );
};

export default HotspotTreemap;