-- Script to update material_code from notes JSON for existing data
-- Run this once to migrate existing data

-- Update material_code from notes JSON where material_code is NULL
-- Notes field contains JSON like: {"code": "C101", ...}

UPDATE project_materials 
SET material_code = JSON_UNQUOTE(JSON_EXTRACT(notes, '$.code'))
WHERE material_code IS NULL 
  AND notes IS NOT NULL 
  AND JSON_VALID(notes) = 1
  AND JSON_EXTRACT(notes, '$.code') IS NOT NULL;

-- Show how many records were updated
SELECT 
    'Đã cập nhật material_code từ notes JSON' AS action,
    ROW_COUNT() AS updated_rows;

-- Verify the update
SELECT id, material_type, material_name, material_code, 
       JSON_EXTRACT(notes, '$.code') as code_from_notes
FROM project_materials 
WHERE material_code IS NOT NULL
LIMIT 20;
