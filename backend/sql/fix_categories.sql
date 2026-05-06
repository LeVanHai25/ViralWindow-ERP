-- Fix category encoding issues
SET NAMES utf8mb4;

-- First, normalize all categories that don't match the valid ones to 'Khác'
UPDATE accessories 
SET category = 'Khác' 
WHERE category NOT IN (
    'Khóa', 
    'Bản lề', 
    'Tay nắm', 
    'Phụ kiện lùa', 
    'Phụ kiện khác', 
    'Ke', 
    'Gioăng', 
    'Nhựa ốp', 
    'Keo', 
    'Khác'
);

-- Now move incorrectly categorized items from Phụ kiện to Vật tư phụ-Khác
-- Các dẫn hướng, ray, thanh chuyển động -> Khác
UPDATE accessories SET category = 'Khác' 
WHERE code IN ('VT-DHCL93', 'VT-DH65', 'VT-RI', 'VT-TCD', 'VT-TDD', 'DS-DH', 'DS-BCD5');

-- Vấu, đầu biên, đệm chống xệ -> Khác
UPDATE accessories SET category = 'Khác' WHERE code LIKE 'VAU-%';
UPDATE accessories SET category = 'Khác' WHERE code LIKE 'DB-%';
UPDATE accessories SET category = 'Khác' WHERE code LIKE 'DCX-%';

-- Các vật tư khác -> Khác
UPDATE accessories SET category = 'Khác' 
WHERE code IN ('VT-HC-D', 'VT-CCPDV', 'VT-DCCP', 'VT-VRTNCL', 'VT-LCM');

-- Report results
SELECT category, COUNT(*) as count 
FROM accessories 
GROUP BY category 
ORDER BY 
    CASE category
        WHEN 'Khóa' THEN 1
        WHEN 'Bản lề' THEN 2
        WHEN 'Tay nắm' THEN 3
        WHEN 'Phụ kiện lùa' THEN 4
        WHEN 'Phụ kiện khác' THEN 5
        WHEN 'Ke' THEN 6
        WHEN 'Gioăng' THEN 7
        WHEN 'Nhựa ốp' THEN 8
        WHEN 'Keo' THEN 9
        WHEN 'Khác' THEN 10
        ELSE 99
    END;
