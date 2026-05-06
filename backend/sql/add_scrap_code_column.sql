-- =====================================================
-- MIGRATION: Add scrap_code column to aluminum_scraps
-- =====================================================
-- Run this script to add the missing scrap_code column
-- =====================================================

-- Add scrap_code column
ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS scrap_code VARCHAR(50) NULL COMMENT 'Mã nhôm đề c (VD: DC-0001)';

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_scraps_code 
ON aluminum_scraps (scrap_code);

-- Verification
SELECT 'Migration: Added scrap_code column to aluminum_scraps' AS status;
SHOW COLUMNS FROM aluminum_scraps LIKE 'scrap_code';
