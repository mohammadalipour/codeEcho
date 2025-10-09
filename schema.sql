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

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
);

-- Refresh tokens table for JWT management
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
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

-- Insert a default admin user for testing (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
    'admin@codeecho.com', 
    '$2a$10$mKkNIVP4s4eSdXo65Vw8WeplO8Ff/0IX/awtnx2OlCHrWNvxYL.ke', 
    'Admin', 
    'User', 
    'admin'
) ON DUPLICATE KEY UPDATE email = email;

-- Create user for the application (if not exists)
CREATE USER IF NOT EXISTS 'codeecho_user'@'%' IDENTIFIED BY 'codeecho_pass';
GRANT SELECT, INSERT, UPDATE, DELETE ON codeecho_db.* TO 'codeecho_user'@'%';
FLUSH PRIVILEGES;