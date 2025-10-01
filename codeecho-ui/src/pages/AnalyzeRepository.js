import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { 
  FolderIcon, 
  LinkIcon, 
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CloudArrowUpIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

const AnalyzeRepository = () => {
  const navigate = useNavigate();
  const { api } = useApi();
  
  const [inputMethod, setInputMethod] = useState('url'); // 'url' or 'upload'
  const [formData, setFormData] = useState({
    projectName: '',
    repoPath: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [currentStep, setCurrentStep] = useState('input'); // input, creating, analyzing, complete
  const [projectId, setProjectId] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({
    message: '',
    details: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        setError('Please select a ZIP file containing your project');
        return;
      }
      setSelectedFile(file);
      setError('');
      
      // Auto-populate project name from filename if empty
      if (!formData.projectName) {
        const nameWithoutExt = file.name.replace('.zip', '');
        setFormData(prev => ({
          ...prev,
          projectName: nameWithoutExt
        }));
      }
    }
  };

  const handleMethodChange = (method) => {
    setInputMethod(method);
    setError('');
    setSelectedFile(null);
  };

  const isGitUrl = (url) => {
    return url.match(/^(https?:\/\/|git@).*\.git$/i) || 
           url.match(/^https?:\/\/(github|gitlab|bitbucket)\.com\/.*$/i);
  };

  const validateForm = () => {
    if (!formData.projectName.trim()) {
      setError('Project name is required');
      return false;
    }
    
    if (inputMethod === 'url') {
      if (!formData.repoPath.trim()) {
        setError('Repository path or URL is required');
        return false;
      }
    } else if (inputMethod === 'upload') {
      if (!selectedFile) {
        setError('Please select a ZIP file to upload');
        return false;
      }
    }
    
    return true;
  };

  const uploadProjectFile = async (projectId, file) => {
    const formData = new FormData();
    formData.append('project', file);
    
    const response = await fetch(`http://localhost:8080/api/v1/projects/${projectId}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
    
    return await response.json();
  };

  const handleAnalyzeRepository = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setError('');
      setCurrentStep('creating');
      setProgress({
        message: 'Creating project...',
        details: 'Setting up project structure in database'
      });

      // Step 1: Create project
      const projectData = {
        name: formData.projectName.trim(),
        repo_path: inputMethod === 'upload' ? 'uploaded' : formData.repoPath.trim(),
        description: formData.description.trim() || `Git repository analysis for ${formData.projectName}`
      };
      
      const project = await api.createProject(projectData);
      setProjectId(project.id);
      
      // Step 2: Handle upload or start analysis immediately  
      if (inputMethod === 'upload') {
        setProgress({
          message: 'Uploading project files...',
          details: 'Extracting and preparing your project for analysis'
        });
        
        const uploadResult = await uploadProjectFile(project.id, selectedFile);
        
        // Start background analysis for upload
        await api.analyzeProject(project.id, uploadResult.projectPath);
      } else {
        // Start background analysis for URL
        await api.analyzeProject(project.id, formData.repoPath.trim());
      }
      
      // Step 3: Immediately redirect to dashboard - no waiting!
      setCurrentStep('complete');
      setProgress({
        message: 'Project created and analysis started!',
        details: 'Analysis is running in the background. You can view progress on the dashboard.'
      });
      
      // Auto-redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/projects');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Analysis failed. Please check the repository and try again.');
      setCurrentStep('input');
      setProgress({ message: '', details: '' });
    }
  };

  const handleViewProject = () => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    }
  };

  const handleAnalyzeAnother = () => {
    setCurrentStep('input');
    setProjectId(null);
    setInputMethod('url');
    setSelectedFile(null);
    setFormData({
      projectName: '',
      repoPath: '',
      description: ''
    });
    setError('');
    setProgress({ message: '', details: '' });
  };

  const renderStepIcon = () => {
    switch (currentStep) {
      case 'input':
        return <FolderIcon className="h-8 w-8 text-blue-500" />;
      case 'creating':
      case 'analyzing':
        return <ClockIcon className="h-8 w-8 text-yellow-500 animate-spin" />;
      case 'complete':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      default:
        return <FolderIcon className="h-8 w-8 text-blue-500" />;
    }
  };

  if (currentStep !== 'input') {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6">
              {renderStepIcon()}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {progress.message}
            </h1>
            
            <p className="text-gray-600 mb-8">
              {progress.details}
            </p>

            {currentStep === 'analyzing' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />
                  <span className="text-blue-700 font-medium">Analysis in Progress</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '45%' }}></div>
                </div>
                <p className="text-blue-600 text-sm mt-2">
                  Processing commits and file changes...
                </p>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  Repository Analysis Complete!
                </h3>
                <p className="text-green-700">
                  Your repository has been successfully analyzed. You can now explore insights, hotspots, and analytics.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {currentStep === 'complete' && (
                <>
                  <button
                    onClick={handleViewProject}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Project Dashboard
                  </button>
                  
                  <button
                    onClick={handleAnalyzeAnother}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Analyze Another Repository
                  </button>
                </>
              )}
              
              <button
                onClick={() => navigate('/projects')}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Projects
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
            <FolderIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analyze Repository
          </h1>
          <p className="text-lg text-gray-600">
            Add a new Git repository for comprehensive code analysis
          </p>
        </div>

        {/* Form */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          {/* Input Method Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  type="button"
                  onClick={() => handleMethodChange('url')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    inputMethod === 'url'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <LinkIcon className="h-5 w-5 inline mr-2" />
                  Git URL / Local Path
                </button>
                <button
                  type="button"
                  onClick={() => handleMethodChange('upload')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    inputMethod === 'upload'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CloudArrowUpIcon className="h-5 w-5 inline mr-2" />
                  Upload ZIP File
                </button>
              </nav>
            </div>
          </div>

          <form onSubmit={handleAnalyzeRepository} className="space-y-6">
            {/* Project Name */}
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleInputChange}
                placeholder="e.g., My Awesome Project"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Conditional Input Based on Method */}
            {inputMethod === 'url' ? (
              /* Repository Path/URL */
              <div>
                <label htmlFor="repoPath" className="block text-sm font-medium text-gray-700 mb-2">
                  Repository Path or URL *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isGitUrl(formData.repoPath) ? (
                      <LinkIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FolderIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    id="repoPath"
                    name="repoPath"
                    value={formData.repoPath}
                    onChange={handleInputChange}
                    placeholder="https://github.com/user/repo.git or /path/to/local/repo"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter a GitHub/GitLab URL or local filesystem path to your Git repository
                </p>
              </div>
            ) : (
              /* File Upload */
              <div>
                <label htmlFor="projectFile" className="block text-sm font-medium text-gray-700 mb-2">
                  Project ZIP File *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="projectFile"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a ZIP file</span>
                        <input
                          id="projectFile"
                          name="projectFile"
                          type="file"
                          accept=".zip"
                          onChange={handleFileSelect}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">ZIP files up to 100MB</p>
                    {selectedFile && (
                      <div className="mt-2 text-sm text-green-600">
                        ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Upload a ZIP archive containing your Git repository (including .git folder)
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Brief description of the project..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                {inputMethod === 'url' ? (
                  <>
                    <li>• Repository will be validated and cloned (if remote)</li>
                    <li>• Git history will be analyzed for commits and file changes</li>
                    <li>• Code hotspots and metrics will be calculated</li>
                    <li>• Analytics dashboard will be populated with insights</li>
                  </>
                ) : (
                  <>
                    <li>• ZIP file will be uploaded and extracted</li>
                    <li>• Git history will be analyzed for commits and file changes</li>
                    <li>• Code hotspots and metrics will be calculated</li>
                    <li>• Analytics dashboard will be populated with insights</li>
                  </>
                )}
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                {inputMethod === 'upload' ? 'Upload & Analyze' : 'Start Analysis'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeRepository;