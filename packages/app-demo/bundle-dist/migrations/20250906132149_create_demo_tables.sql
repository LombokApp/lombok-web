-- Migration: 20250906132149_create_demo_tables
-- Version: 20250906132149
-- Description: Create initial demo app tables

-- Create users table for demo app
CREATE TABLE IF NOT EXISTS demo_entities (
    id TEXT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
