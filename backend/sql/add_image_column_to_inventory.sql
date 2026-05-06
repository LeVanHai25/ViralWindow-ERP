-- Migration: Add image_url column to inventory table
-- Date: 2026-01-12
-- Purpose: Store image URLs for Glass and Secondary Materials

-- Add image_url column if not exists
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL 
COMMENT 'URL/path to item image' 
AFTER notes;

-- Verify the column was added
DESCRIBE inventory;
