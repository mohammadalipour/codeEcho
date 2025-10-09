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
  DocumentArrowUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const AnalyzeRepository = () => {
  const navigate = useNavigate();
  const { api } = useApi();
  
  const [inputMethod, setInputMethod] = useState('url');
  const [formData, setFormData] = useState({
    projectName: '',
    repoPath: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentStep, setCurrentStep] = useState('input');
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
    // SSH format: git@hostname:user/repo.git
    const sshPattern = /^git@[^:]+:[^\/]+\/[^\/]+\.git$/i;
    // HTTPS format: https://hostname/user/repo.git or https://hostname/user/repo
    const httpsPattern = /^https?:\/\/[^\/]+\/[^\/]+\/[^\/]+(\.git)?$/i;
    
    return sshPattern.test(url) || httpsPattern.test(url);
  };

  const convertSshToHttps = (sshUrl) => {
    // Convert git@github.com:user/repo.git to https://github.com/user/repo.git
    const sshMatch = sshUrl.match(/^git@([^:]+):([^\/]+\/[^\/]+)\.git$/i);
    if (sshMatch) {
      return `https://${sshMatch[1]}/${sshMatch[2]}.git`;
    }
    return sshUrl;
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

  const handleAnalyzeRepository = async (e) => {
    e.preventDefault();
    
    if (!formData.projectName.trim()) {
      setError('Project name is required');
      return;
    }
    
    if (inputMethod === 'url' && !formData.repoPath.trim()) {
      setError('Repository path or URL is required');
      return;
    }
    
    if (inputMethod === 'upload' && !selectedFile) {
      setError('Please select a ZIP file to upload');
      return;
    }

    if (inputMethod === 'url' && !isGitUrl(formData.repoPath.trim())) {
      console.log('Git URL validation failed for:', formData.repoPath.trim());
      setError('Please enter a valid Git repository URL');
      return;
    }

    // Auto-convert SSH URLs to HTTPS for better compatibility
    let repoUrl = formData.repoPath.trim();
    if (repoUrl.startsWith('git@')) {
      const httpsUrl = convertSshToHttps(repoUrl);
      if (httpsUrl !== repoUrl) {
        console.log(`Converting SSH URL to HTTPS: ${repoUrl} → ${httpsUrl}`);
        repoUrl = httpsUrl;
        setFormData(prev => ({ ...prev, repoPath: httpsUrl }));
      }
    }
    
    try {
      setError('');
      setCurrentStep('creating');
      setProgress({
        message: 'Creating project...',
        details: 'Setting up project structure in database'
      });

      // Format data according to the API's expected schema
      const projectData = {
        name: formData.projectName.trim(),
        repo_path: inputMethod === 'upload' ? selectedFile.name : repoUrl,
        description: formData.description.trim() || `Git repository analysis for ${formData.projectName.trim()}`
      };
      
      const project = await api.createProject(projectData);
      setProjectId(project.id);
      
      setCurrentStep('analyzing');
      setProgress({
        message: 'Analyzing repository...',
        details: 'Processing commits and calculating metrics'
      });

      if (inputMethod === 'upload') {
        const uploadFormData = new FormData();
        uploadFormData.append('project', selectedFile);
        
        const response = await fetch(process.env.REACT_APP_API_URL + `/api/v1/projects/${project.id}/upload`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload project files');
        }
      }
      
      await api.analyzeProject(project.id, inputMethod === 'upload' ? selectedFile.name : repoUrl);
      
      setCurrentStep('complete');
      setProgress({
        message: 'Analysis Started!',
        details: 'Your repository is being analyzed in the background'
      });

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.error || err.message || 'Analysis failed. Please try again.');
      setCurrentStep('input');
      setProgress({ message: '', details: '' });
    }
  };

  if (currentStep !== 'input') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
            {/* Enhanced Progress Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Repository Analysis</h1>
                  <p className="text-blue-100 mt-1">Processing your repository for insights</p>
                </div>
                <div className="text-right">
                  <div className="text-white/90 text-sm font-medium">
                    {currentStep === 'creating' && 'Step 1 of 3'}
                    {currentStep === 'analyzing' && 'Step 2 of 3'}
                    {currentStep === 'complete' && 'Step 3 of 3'}
                  </div>
                  <div className="text-blue-100 text-xs mt-1">
                    {currentStep === 'creating' && 'Setting up project'}
                    {currentStep === 'analyzing' && 'Analyzing code'}
                    {currentStep === 'complete' && 'Analysis complete'}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="px-8 py-8">
              <div className="text-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 border border-gray-200">
                <div className={`
                  mx-auto inline-flex items-center justify-center h-20 w-20 rounded-full mb-6
                  transition-all duration-500 ease-in-out
                  ${currentStep === 'complete' ? 'bg-green-100 animate-bounce' : 'bg-blue-100'}
                `}>
                  {renderStepIcon()}
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {progress.message}
                </h2>
                
                <p className="text-gray-600 text-base mb-6 max-w-2xl mx-auto">
                  {progress.details}
                </p>

                {/* Enhanced step-specific content */}
                {currentStep === 'analyzing' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <div className="relative">
                        <div className="absolute inset-0 animate-ping bg-blue-400 rounded-full opacity-30"></div>
                        <ClockIcon className="h-8 w-8 text-blue-500 animate-spin relative" />
                      </div>
                      <span className="text-blue-700 font-bold text-lg">Analysis in Progress</span>
                    </div>
                    
                    <div className="w-full bg-blue-200 rounded-full h-4 mb-6 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full animate-pulse" style={{width: '100%'}}></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg p-3">
                        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-blue-700 font-medium text-xs">Scanning commits</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg p-3">
                        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <span className="text-blue-700 font-medium text-xs">Processing changes</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg p-3">
                        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        <span className="text-blue-700 font-medium text-xs">Computing metrics</span>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'complete' && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 mb-6 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="text-6xl mb-4">🎉</div>
                      <h3 className="text-xl font-bold text-green-900 mb-4">
                        Analysis Complete!
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-100 rounded-lg p-3">
                          <div className="flex items-center space-x-2 text-green-700">
                            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                            <span className="font-semibold text-xs">Repository scanned</span>
                          </div>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3">
                          <div className="flex items-center space-x-2 text-green-700">
                            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                            <span className="font-semibold text-xs">Analytics generated</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Celebration animation */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-green-400 rounded-full animate-bounce"
                          style={{
                            left: `${20 + i * 12}%`,
                            top: `${30 + (i % 2) * 20}%`,
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: '1s'
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-4">
                  {currentStep === 'complete' && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={handleViewProject}
                        className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        View Project Dashboard
                      </button>
                      
                      <button
                        onClick={handleAnalyzeAnother}
                        className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Analyze Another Repository
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => navigate('/projects')}
                    className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Projects
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial form view
  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-lg">
            <FolderIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Analyze Repository</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Add a Git repository for comprehensive analysis to gain deep insights about your codebase, 
            hotspots, and team collaboration patterns.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
          <form onSubmit={handleAnalyzeRepository} className="p-8 space-y-8">
            {/* Repository Input Method Selection */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose Input Method</h2>
                <p className="text-gray-600">How would you like to provide your repository?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  type="button"
                  className={`relative p-8 rounded-xl border-2 transition-all duration-300 focus:outline-none transform hover:scale-105 ${
                    inputMethod === 'url'
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:shadow-md'
                  }`}
                  onClick={() => handleMethodChange('url')}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className={`p-4 rounded-full ${inputMethod === 'url' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <LinkIcon className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Git Repository URL</h3>
                      <p className="text-sm text-gray-500">Connect directly to your Git repository</p>
                      <div className="mt-3 text-xs bg-gray-100 rounded-lg px-3 py-2 text-gray-600">
                        Supports GitHub, GitLab, Bitbucket & more
                      </div>
                    </div>
                  </div>
                  {inputMethod === 'url' && (
                    <div className="absolute top-4 right-4">
                      <CheckCircleIcon className="h-6 w-6 text-blue-500" />
                    </div>
                  )}
                </button>
                
                <button
                  type="button"
                  className={`relative p-8 rounded-xl border-2 transition-all duration-300 focus:outline-none transform hover:scale-105 ${
                    inputMethod === 'upload'
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:shadow-md'
                  }`}
                  onClick={() => handleMethodChange('upload')}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className={`p-4 rounded-full ${inputMethod === 'upload' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <CloudArrowUpIcon className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Upload ZIP File</h3>
                      <p className="text-sm text-gray-500">Upload your project as a ZIP archive</p>
                      <div className="mt-3 text-xs bg-gray-100 rounded-lg px-3 py-2 text-gray-600">
                        Up to 100MB • Preserves Git history
                      </div>
                    </div>
                  </div>
                  {inputMethod === 'upload' && (
                    <div className="absolute top-4 right-4">
                      <CheckCircleIcon className="h-6 w-6 text-blue-500" />
                    </div>
                  )}
                </button>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-6">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    id="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter a descriptive name for your project"
                  />
                </div>

                {inputMethod === 'url' ? (
                  <div>
                    <label htmlFor="repoPath" className="block text-sm font-medium text-gray-700 mb-2">
                      Git Repository URL *
                    </label>
                    <input
                      type="text"
                      name="repoPath"
                      id="repoPath"
                      value={formData.repoPath}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="https://github.com/username/repository.git"
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      💡 Use HTTPS URLs for best compatibility. SSH URLs will be automatically converted.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
                      Project ZIP File *
                    </label>
                    <div className="relative">
                      <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100">
                        <div className="space-y-2 text-center">
                          <DocumentArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />
                          <div className="flex text-lg text-gray-600">
                            <label
                              htmlFor="project"
                              className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 transition-colors"
                            >
                              <span>Upload a file</span>
                              <input
                                id="project"
                                name="project"
                                type="file"
                                accept=".zip"
                                className="sr-only"
                                onChange={handleFileSelect}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            ZIP file up to 100MB
                          </p>
                          {selectedFile && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800 font-medium flex items-center">
                                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                                Selected: {selectedFile.name}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows="4"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Add a description for your project to help identify its purpose"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-center">
                <button
                  type="submit"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <PlayIcon className="h-6 w-6 mr-3" />
                  Start Analysis
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeRepository;