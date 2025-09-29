-- Sample data for testing the analytics dashboard

-- Insert sample projects
INSERT INTO projects (name, repo_path, last_analyzed_hash) VALUES
('CodeEcho Dashboard', '/repos/codeecho-dashboard', 'a1b2c3d4e5f6'),
('Authentication Service', '/repos/auth-service', 'f1e2d3c4b5a6'),
('Data Analytics Engine', '/repos/analytics-engine', 'b2c3d4e5f6a1');

-- Insert sample commits for project 1
INSERT INTO commits (project_id, hash, author, timestamp, message) VALUES
(1, 'a1b2c3d4e5f6', 'Alice Johnson', '2025-01-15 10:30:00', 'Initial dashboard setup'),
(1, 'b2c3d4e5f6a1', 'Bob Smith', '2025-01-16 14:20:00', 'Add user authentication'),
(1, 'c3d4e5f6a1b2', 'Alice Johnson', '2025-01-17 09:15:00', 'Implement data visualization'),
(1, 'd4e5f6a1b2c3', 'Carol Davis', '2025-01-18 16:45:00', 'Fix authentication bugs'),
(1, 'e5f6a1b2c3d4', 'Bob Smith', '2025-01-19 11:30:00', 'Add error handling'),
(1, 'f6a1b2c3d4e5', 'Alice Johnson', '2025-01-20 13:20:00', 'Optimize database queries'),
(1, '1a2b3c4d5e6f', 'David Wilson', '2025-01-21 08:45:00', 'Add caching layer'),
(1, '2b3c4d5e6f1a', 'Alice Johnson', '2025-01-22 15:10:00', 'Update UI components'),
(1, '3c4d5e6f1a2b', 'Eve Brown', '2025-01-23 12:30:00', 'Add unit tests'),
(1, '4d5e6f1a2b3c', 'Frank Miller', '2025-01-24 17:20:00', 'Documentation updates');

-- Insert sample commits for project 2
INSERT INTO commits (project_id, hash, author, timestamp, message) VALUES
(2, 'f1e2d3c4b5a6', 'David Wilson', '2025-01-10 09:00:00', 'JWT authentication setup'),
(2, '1f2e3d4c5b6a', 'Eve Brown', '2025-01-11 14:30:00', 'OAuth integration'),
(2, '2f3e4d5c6b7a', 'David Wilson', '2025-01-12 11:15:00', 'Password validation'),
(2, '3f4e5d6c7b8a', 'Grace Lee', '2025-01-13 16:45:00', 'Session management'),
(2, '4f5e6d7c8b9a', 'David Wilson', '2025-01-14 10:30:00', 'Security enhancements');

-- Insert sample changes for project 1 commits
INSERT INTO changes (commit_id, file_path, lines_added, lines_deleted) VALUES
-- Commit 1: Initial dashboard setup
(1, 'src/components/Dashboard.js', 120, 0),
(1, 'src/components/Header.js', 45, 0),
(1, 'src/styles/dashboard.css', 80, 0),
(1, 'package.json', 25, 0),

-- Commit 2: Add user authentication
(2, 'src/components/UserAuth.js', 95, 0),
(2, 'src/utils/auth.js', 60, 0),
(2, 'src/components/LoginForm.js', 75, 0),
(2, 'src/components/Dashboard.js', 30, 5),

-- Commit 3: Implement data visualization
(3, 'src/components/Charts.js', 150, 0),
(3, 'src/utils/dataProcessing.js', 85, 0),
(3, 'src/components/Dashboard.js', 40, 10),
(3, 'src/styles/charts.css', 65, 0),

-- Commit 4: Fix authentication bugs
(4, 'src/components/UserAuth.js', 15, 25),
(4, 'src/utils/auth.js', 20, 10),
(4, 'src/components/LoginForm.js', 10, 15),

-- Commit 5: Add error handling
(5, 'src/utils/errorHandler.js', 70, 0),
(5, 'src/components/ErrorBoundary.js', 55, 0),
(5, 'src/components/Dashboard.js', 25, 5),
(5, 'src/components/UserAuth.js', 15, 0),

-- Commit 6: Optimize database queries
(6, 'src/utils/DatabaseConnection.js', 90, 35),
(6, 'src/services/dataService.js', 45, 20),
(6, 'src/utils/queryOptimizer.js', 110, 0),

-- Commit 7: Add caching layer
(7, 'src/utils/cache.js', 85, 0),
(7, 'src/services/dataService.js', 30, 10),
(7, 'src/utils/DatabaseConnection.js', 25, 5),

-- Commit 8: Update UI components
(8, 'src/components/Dashboard.js', 35, 20),
(8, 'src/components/Charts.js', 40, 15),
(8, 'src/components/Header.js', 20, 10),
(8, 'src/styles/dashboard.css', 30, 25),

-- Commit 9: Add unit tests
(9, 'tests/components/Dashboard.test.js', 120, 0),
(9, 'tests/utils/auth.test.js', 85, 0),
(9, 'tests/services/dataService.test.js', 95, 0),
(9, 'jest.config.js', 30, 0),

-- Commit 10: Documentation updates
(10, 'README.md', 80, 20),
(10, 'docs/api.md', 150, 0),
(10, 'docs/deployment.md', 100, 0),
(10, 'CHANGELOG.md', 40, 0);

-- Insert sample changes for project 2 (authentication service)
INSERT INTO changes (commit_id, file_path, lines_added, lines_deleted) VALUES
-- Project 2 commits
(11, 'src/auth/jwt.js', 100, 0),
(11, 'src/middleware/auth.js', 70, 0),
(11, 'src/routes/auth.js', 85, 0),

(12, 'src/auth/oauth.js', 120, 0),
(12, 'src/config/oauth.js', 45, 0),
(12, 'src/routes/auth.js', 30, 5),

(13, 'src/utils/validation.js', 75, 0),
(13, 'src/auth/password.js', 90, 0),
(13, 'src/middleware/validation.js', 55, 0),

(14, 'src/session/manager.js', 110, 0),
(14, 'src/utils/session.js', 65, 0),
(14, 'src/config/session.js', 40, 0),

(15, 'src/security/encryption.js', 85, 0),
(15, 'src/middleware/security.js', 70, 0),
(15, 'src/auth/jwt.js', 25, 15);