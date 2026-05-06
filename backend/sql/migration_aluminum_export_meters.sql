-- =====================================================
-- Migration: Aluminum Export with Meters Used
-- Phase 1: Add columns to stock_document_lines
-- =====================================================
-- This migration adds support for tracking meters used when exporting aluminum.
-- Columns are NULLABLE for backward compatibility with existing data.

-- Add meters_used column (mét sử dụng)
ALTER TABLE stock_document_lines 
ADD COLUMN IF NOT EXISTS meters_used DECIMAL(10,2) NULL 
COMMENT 'Mét sử dụng (chỉ áp dụng cho nhôm)';

-- Add length_per_bar_m column (snapshot dài/cây tại thời điểm xuất)
ALTER TABLE stock_document_lines 
ADD COLUMN IF NOT EXISTS length_per_bar_m DECIMAL(10,2) NULL 
COMMENT 'Dài/cây snapshot từ kho nhôm (m)';

-- Add meters_leftover column (mét thừa tính toán)
ALTER TABLE stock_document_lines 
ADD COLUMN IF NOT EXISTS meters_leftover DECIMAL(10,2) NULL 
COMMENT 'Mét thừa = qty * length_per_bar_m - meters_used';

-- Verify columns added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'stock_document_lines'
  AND COLUMN_NAME IN ('meters_used', 'length_per_bar_m', 'meters_leftover');

-- =====================================================
-- Optional: Add index for aluminum reporting queries
-- Uncomment if needed for performance
-- =====================================================
-- CREATE INDEX IF NOT EXISTS idx_sdl_aluminum 
-- ON stock_document_lines (material_type, aluminum_system_id);
