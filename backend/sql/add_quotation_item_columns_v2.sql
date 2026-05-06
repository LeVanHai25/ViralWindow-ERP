-- Migration: Add missing columns to quotation_items table (v2)
-- Run this script to add color, aluminum_system, location columns

-- Add color column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT NULL AFTER accessories;

-- Add aluminum_system column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS aluminum_system VARCHAR(100) DEFAULT NULL AFTER color;

-- Add location column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL AFTER aluminum_system;

-- Verify columns
DESCRIBE quotation_items;


