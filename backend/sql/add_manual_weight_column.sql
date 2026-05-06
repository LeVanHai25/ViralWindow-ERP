-- =====================================================
-- ADD MANUAL_WEIGHT COLUMN TO PROJECTS
-- =====================================================
-- Add manual_weight column to projects table for Production Excel View
-- This allows users to manually override the calculated aluminum weight
-- =====================================================

-- Add manual_weight column (Khối lượng thủ công)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS manual_weight DECIMAL(15,3) NULL 
COMMENT 'Khối lượng nhôm thủ công (kg) - ghi đè khối lượng tính từ BOM'
AFTER fix_compatible;

-- Verify column was added
DESCRIBE projects;

SELECT 'Column manual_weight added successfully!' AS result;
