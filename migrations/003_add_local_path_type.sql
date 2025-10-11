-- Migration to add local_path repository type

-- Update the repo_type enum to include local_path
ALTER TABLE projects 
MODIFY COLUMN repo_type ENUM('git_url', 'local_dir', 'private_git', 'local_path') DEFAULT 'git_url' NOT NULL;