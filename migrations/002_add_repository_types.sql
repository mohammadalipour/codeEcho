-- Migration to add repository type and authentication support to projects table

-- Add new columns to projects table
ALTER TABLE projects 
ADD COLUMN repo_type ENUM('git_url', 'local_dir', 'private_git') DEFAULT 'git_url' NOT NULL,
ADD COLUMN auth_username VARCHAR(255) NULL,
ADD COLUMN auth_token TEXT NULL,
ADD COLUMN auth_ssh_key TEXT NULL;

-- Add index for repository type for better query performance
CREATE INDEX idx_projects_repo_type ON projects(repo_type);

-- Update existing projects to have the default repo_type
UPDATE projects SET repo_type = 'git_url' WHERE repo_type IS NULL;