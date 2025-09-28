-- CodeEcho Database Schema
-- MySQL 8.0

CREATE DATABASE IF NOT EXISTS codeecho_db;
USE codeecho_db;

-- Projects table
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    repo_path VARCHAR(500) NOT NULL,
    last_analyzed_hash VARCHAR(40),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_repo_path (repo_path(255)),
    INDEX idx_last_analyzed_hash (last_analyzed_hash)
);

-- Commits table
CREATE TABLE commits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    hash VARCHAR(40) NOT NULL,
    author VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_hash (project_id, hash),
    INDEX idx_project_id (project_id),
    INDEX idx_hash (hash),
    INDEX idx_author (author),
    INDEX idx_timestamp (timestamp)
);

-- Changes table
CREATE TABLE changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commit_id INT NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    lines_added INT NOT NULL DEFAULT 0,
    lines_deleted INT NOT NULL DEFAULT 0,
    FOREIGN KEY (commit_id) REFERENCES commits(id) ON DELETE CASCADE,
    INDEX idx_commit_id (commit_id),
    INDEX idx_file_path (file_path(255)),
    INDEX idx_lines_stats (lines_added, lines_deleted)
);

-- Create user for the application (if not exists)
CREATE USER IF NOT EXISTS 'codeecho_user'@'%' IDENTIFIED BY 'codeecho_pass';
GRANT SELECT, INSERT, UPDATE, DELETE ON codeecho_db.* TO 'codeecho_user'@'%';
FLUSH PRIVILEGES;