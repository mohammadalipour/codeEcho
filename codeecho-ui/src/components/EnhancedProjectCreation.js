import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../services/ApiContext';
import { 
  FolderIcon, 
  LockClosedIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  SparklesIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const EnhancedProjectCreation = () => {
  const navigate = useNavigate();
  const { api } = useApi();
  const fileInputRef = useRef(null);
  
  const [repositoryType, setRepositoryType] = useState('public_git');
  const [formData, setFormData] = useState({
    name: '',
    repoPath: '',
    username: '',
    token: '',
    sshKey: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadInfo, setUploadInfo] = useState(null);
  const [currentStep, setCurrentStep] = useState('input');
  const [projectId, setProjectId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const repositoryTypes = [
    {
      id: 'public_git',
      name: 'Public Git Repository',
      description: 'GitHub, GitLab.com, Bitbucket and other public repositories',
      icon: GlobeAltIcon,
      color: 'blue'
    },
    {
      id: 'private_git',
      name: 'Private Git Repository',
      description: 'Private GitHub, internal GitLab, company servers with authentication',
      icon: LockClosedIcon,
      color: 'orange'
    },
    {
      id: 'local_directory',
      name: 'Upload Project Archive',
      description: 'Upload ZIP/TAR archive of your local project',
      icon: CloudArrowUpIcon,
      color: 'green'
    },
    {
      id: 'local_path',
      name: 'Local Project Directory',
      description: 'Direct access to local project on your machine',
      icon: ComputerDesktopIcon,
      color: 'purple'
    }
  ];

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
      // Validate file type
      const validExtensions = ['.zip', '.tar', '.tar.gz', '.tgz'];
      const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!isValid) {
        setError('Please select a valid archive file (.zip, .tar, .tar.gz, .tgz)');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      
      // Auto-populate project name from filename if empty
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\\.(zip|tar|tar\\.gz|tgz)$/i, '');
        setFormData(prev => ({
          ...prev,
          name: nameWithoutExt
        }));
      }
    }
  };

  const uploadArchive = async (file) => {
    return await api.uploadArchive(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let projectData = {
        name: formData.name
      };

      if (repositoryType === 'local_directory') {
        if (!selectedFile) {
          setError('Please select an archive file');
          return;
        }

        // Upload the archive first
        setCurrentStep('uploading');
        const uploadResult = await uploadArchive(selectedFile);
        setUploadInfo(uploadResult);

        // Create project from upload
        setCurrentStep('processing');
        projectData = {
          name: formData.name,
          upload_id: uploadResult.upload_id
        };

        const result = await api.createProjectFromUpload(projectData);
        setProjectId(result.project_id);

      } else if (repositoryType === 'private_git') {
        if (!formData.repoPath) {
          setError('Repository URL is required');
          return;
        }

        if (!formData.username && !formData.token && !formData.sshKey) {
          setError('Authentication credentials are required for private repositories');
          return;
        }

        setCurrentStep('processing');
        projectData = {
          name: formData.name,
          repo_url: formData.repoPath,
          username: formData.username,
          token: formData.token,
          ssh_key: formData.sshKey
        };

        const result = await api.createPrivateProject(projectData);
        setProjectId(result.project_id);

        // Trigger analysis after successful project creation
        setCurrentStep('analyzing');
        await api.analyzeProject(result.project_id, formData.repoPath);

      } else if (repositoryType === 'local_path') {
        if (!formData.repoPath) {
          setError('Local directory path is required');
          return;
        }

        setCurrentStep('processing');
        projectData = {
          name: formData.name,
          repo_path: formData.repoPath,
          repo_type: 'local_path'
        };

        const result = await api.createEnhancedProject(projectData);
        setProjectId(result.project_id);

        // Trigger analysis after successful project creation
        setCurrentStep('analyzing');
        await api.analyzeProject(result.project_id, formData.repoPath);

      } else {
        // Public Git repository
        if (!formData.repoPath) {
          setError('Repository URL is required');
          return;
        }

        setCurrentStep('processing');
        projectData = {
          name: formData.name,
          repo_path: formData.repoPath,
          repo_type: 'git_url'
        };

        const result = await api.createEnhancedProject(projectData);
        setProjectId(result.project_id);

        // Trigger analysis after successful project creation
        setCurrentStep('analyzing');
        await api.analyzeProject(result.project_id, formData.repoPath);
      }

      setCurrentStep('success');

    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.message);
      setCurrentStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = () => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    }
  };

  const handleCreateAnother = () => {
    setCurrentStep('input');
    setProjectId(null);
    setRepositoryType('public_git');
    setSelectedFile(null);
    setUploadInfo(null);
    setFormData({
      name: '',
      repoPath: '',
      username: '',
      token: '',
      sshKey: ''
    });
    setError('');
  };

  const renderRepositoryTypeSelector = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Select Repository Type
        </h2>
        <p className="text-sm text-gray-600">
          Choose how you want to add your project for analysis
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {repositoryTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setRepositoryType(type.id)}
              className={`relative p-6 border rounded-lg text-left transition-all duration-200 ${
                repositoryType === type.id
                  ? `border-${type.color}-500 bg-${type.color}-50 ring-2 ring-${type.color}-500`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 p-3 rounded-lg ${
                  repositoryType === type.id 
                    ? `bg-${type.color}-100` 
                    : 'bg-gray-50'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    repositoryType === type.id 
                      ? `text-${type.color}-600` 
                      : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    {type.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {type.description}
                  </p>
                </div>
              </div>
              {repositoryType === type.id && (
                <div className="absolute top-4 right-4">
                  <CheckCircleIcon className={`h-5 w-5 text-${type.color}-600`} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderProjectNameInput = () => (
    <div>
      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Project Name *
      </label>
      <input
        type="text"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        required
        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        placeholder="Enter a name for your project"
      />
    </div>
  );

  const renderPublicGitForm = () => (
    <div className="space-y-4">
      {renderProjectNameInput()}
      <div>
        <label htmlFor="repoPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Repository URL *
        </label>
        <input
          type="url"
          id="repoPath"
          name="repoPath"
          value={formData.repoPath}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="https://github.com/user/repo.git"
        />
      </div>
    </div>
  );

  const renderPrivateGitForm = () => (
    <div className="space-y-4">
      {renderProjectNameInput()}
      <div>
        <label htmlFor="repoPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Repository URL *
        </label>
        <input
          type="url"
          id="repoPath"
          name="repoPath"
          value={formData.repoPath}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="https://gitlab.company.com/user/repo.git"
        />
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Git username"
          />
        </div>
        
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Personal Access Token
          </label>
          <div className="mt-1 relative">
            <input
              type={showToken ? 'text' : 'password'}
              id="token"
              name="token"
              value={formData.token}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="ghp_xxxxxxxxxxxx or glpat-xxxxxxxxxxxx"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showToken ? (
                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <div className="flex">
          <KeyIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Authentication Help
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <ul className="list-disc list-inside space-y-1">
                <li>For GitHub: Create a Personal Access Token in Settings → Developer settings → Personal access tokens</li>
                <li>For GitLab: Create an Access Token in User Settings → Access Tokens</li>
                <li>For corporate Git servers: Contact your administrator for access credentials</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLocalDirectoryForm = () => (
    <div className="space-y-4">
      {renderProjectNameInput()}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Project Archive *
        </label>
        <div className="mt-1">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".zip,.tar,.tar.gz,.tgz"
              className="hidden"
            />
            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedFile ? selectedFile.name : 'Click to upload archive'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports ZIP, TAR, TAR.GZ files
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Archive Requirements
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <ul className="list-disc list-inside space-y-1">
                <li>Archive should contain your complete project directory</li>
                <li>Include .git directory for full Git history analysis</li>
                <li>Maximum file size: 100MB</li>
                <li>Ensure no sensitive data is included in the archive</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLocalPathForm = () => (
    <div className="space-y-4">
      {renderProjectNameInput()}
      <div>
        <label htmlFor="repoPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Local Directory Path *
        </label>
        <input
          type="text"
          id="repoPath"
          name="repoPath"
          value={formData.repoPath}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="/path/to/your/project"
        />
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Hybrid Approach
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <ul className="list-disc list-inside space-y-1">
                <li>Direct access to local project directory (no Docker volumes)</li>
                <li>Path must be accessible from the API container</li>
                <li>Ensure the directory contains a valid Git repository</li>
                <li>Project will be analyzed using compiled binary + Docker integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm = () => {
    switch (repositoryType) {
      case 'private_git':
        return renderPrivateGitForm();
      case 'local_directory':
        return renderLocalDirectoryForm();
      case 'local_path':
        return renderLocalPathForm();
      default:
        return renderPublicGitForm();
    }
  };

  const renderProcessingStep = () => {
    let message = 'Creating project...';
    let details = '';

    if (currentStep === 'uploading') {
      message = 'Uploading archive...';
      details = selectedFile ? `Uploading ${selectedFile.name}` : '';
    } else if (currentStep === 'processing') {
      message = 'Processing repository...';
      details = repositoryType === 'local_directory' 
        ? 'Extracting and analyzing archive' 
        : 'Cloning and validating repository';
    } else if (currentStep === 'analyzing') {
      message = 'Analyzing repository...';
      details = 'Extracting commit history and calculating metrics';
    }

    return (
      <div className="text-center">
        <CloudArrowUpIcon className="mx-auto h-16 w-16 text-blue-500 animate-pulse" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          {message}
        </h3>
        {details && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {details}
          </p>
        )}
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="text-center">
      <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        Project Created Successfully!
      </h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Your project "{formData.name}" has been created and is ready for analysis.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleViewProject}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlayIcon className="-ml-1 mr-2 h-4 w-4" />
          View Project
        </button>
        <button
          onClick={handleCreateAnother}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Another Project
        </button>
      </div>
    </div>
  );

  if (currentStep === 'uploading' || currentStep === 'processing' || currentStep === 'analyzing') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            {renderProcessingStep()}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            {renderSuccessStep()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/projects')}
                className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-1" />
                Back to Projects
              </button>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-8 w-8 text-blue-600 mr-3" />
              Create New Project
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Add a new repository for code analysis. Choose from multiple source options to get started.
            </p>
          </div>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {renderRepositoryTypeSelector()}
              {renderForm()}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProjectCreation;