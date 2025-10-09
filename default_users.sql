-- Default users for CodeEcho
-- These users can be used for testing and initial login

USE codeecho_db;

-- Default admin user (email: admin@codeecho.com, password: admin123)
-- This user is already created in schema.sql, this ensures it exists
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES (
    'admin@codeecho.com', 
    '$2a$10$mKkNIVP4s4eSdXo65Vw8WeplO8Ff/0IX/awtnx2OlCHrWNvxYL.ke', 
    'Admin', 
    'User', 
    'admin',
    1
) ON DUPLICATE KEY UPDATE 
    first_name = 'Admin',
    last_name = 'User',
    role = 'admin',
    is_active = 1;

-- Default demo user (email: demo@codeecho.com, password: admin123)  
-- Using the same hash as admin for simplicity
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES (
    'demo@codeecho.com', 
    '$2a$10$mKkNIVP4s4eSdXo65Vw8WeplO8Ff/0IX/awtnx2OlCHrWNvxYL.ke', 
    'Demo', 
    'User', 
    'user',
    1
) ON DUPLICATE KEY UPDATE 
    password_hash = '$2a$10$mKkNIVP4s4eSdXo65Vw8WeplO8Ff/0IX/awtnx2OlCHrWNvxYL.ke',
    first_name = 'Demo',
    last_name = 'User',
    role = 'user',
    is_active = 1;

-- Test user (email: test@codeecho.com, password: admin123)
-- Using the same hash as admin for simplicity  
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES (
    'test@codeecho.com', 
    '$2a$10$mKkNIVP4s4eSdXo65Vw8WeplO8Ff/0IX/awtnx2OlCHrWNvxYL.ke', 
    'Test', 
    'User', 
    'user',
    1
) ON DUPLICATE KEY UPDATE 
    password_hash = '$2a$10$mKkNIVP4s4eSdXo65Vw8WeplO8Ff/0IX/awtnx2OlCHrWNvxYL.ke',
    first_name = 'Test',
    last_name = 'User', 
    role = 'user',
    is_active = 1;

-- Display the created users
SELECT id, email, first_name, last_name, role, is_active, created_at 
FROM users 
WHERE email IN ('admin@codeecho.com', 'user@codeecho.com', 'dev@codeecho.com')
ORDER BY role DESC, email;