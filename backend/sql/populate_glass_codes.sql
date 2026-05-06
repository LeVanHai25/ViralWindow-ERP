-- Migration: Populate glass_items.code column with K-xxx format codes
-- This script generates unique codes based on glass type and structure
-- Format: K-[thickness] or K-[id] for unique identification

-- First, let's see current data
-- SELECT id, name, structure, code FROM glass_items;

-- Update glass_items to have K-xxx format codes
-- Using structure (like "4+4", "5+5") to create meaningful codes

-- Method 1: Generate code from structure (e.g., "4+4" -> "K-8.38")
-- Method 2: Generate code from ID (e.g., id=22 -> "K-022")

-- Let's use Method 2 for consistent, unique codes:
UPDATE glass_items 
SET code = CONCAT('K-', LPAD(id, 3, '0'))
WHERE code IS NULL OR code = '';

-- Verify update
SELECT id, code, name, structure FROM glass_items ORDER BY id;

-- OPTIONAL: If you want to use structure-based codes instead:
-- This creates codes like "K-8.38-001" based on name pattern

/*
-- Extract thickness from name and create code
UPDATE glass_items 
SET code = CASE
    WHEN name LIKE '%6.38mm%' OR name LIKE '%6,38mm%' THEN CONCAT('K-638-', LPAD(id, 3, '0'))
    WHEN name LIKE '%8.38mm%' OR name LIKE '%8,38mm%' THEN CONCAT('K-838-', LPAD(id, 3, '0'))
    WHEN name LIKE '%10.38mm%' OR name LIKE '%10,38mm%' THEN CONCAT('K-1038-', LPAD(id, 3, '0'))
    WHEN name LIKE '%12.38mm%' OR name LIKE '%12,38mm%' THEN CONCAT('K-1238-', LPAD(id, 3, '0'))
    WHEN name LIKE '%16.38mm%' OR name LIKE '%16,38mm%' THEN CONCAT('K-1638-', LPAD(id, 3, '0'))
    WHEN name LIKE '%20.76mm%' OR name LIKE '%20,76mm%' THEN CONCAT('K-2076-', LPAD(id, 3, '0'))
    WHEN name LIKE '%24.76mm%' OR name LIKE '%24,76mm%' THEN CONCAT('K-2476-', LPAD(id, 3, '0'))
    ELSE CONCAT('K-', LPAD(id, 3, '0'))
END
WHERE code IS NULL OR code = '';
*/
