-- Add columns for cancel/restore project functionality
-- Run this script to add the necessary columns to the projects table

-- Add cancelled_at column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cancelled_at DATETIME DEFAULT NULL;

-- Add cancel_reason column  
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL;

-- Add previous_status column (to restore to original status)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50) DEFAULT NULL;

-- Verify columns were added
DESCRIBE projects;
