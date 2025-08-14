-- Database initialization script for LLMMux
-- This script creates the necessary database and user if they don't exist

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS llmmux;

-- Use the database
USE llmmux;

-- Create user if it doesn't exist (MySQL 8.0+ syntax)
CREATE USER IF NOT EXISTS 'llmmux_user'@'%' IDENTIFIED BY 'llmmux_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON llmmux.* TO 'llmmux_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Note: Prisma will handle table creation through migrations
-- This script only ensures the database and user exist
