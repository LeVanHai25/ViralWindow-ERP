-- ============================================
-- KIỂM TRA DỮ LIỆU aluminum_system
-- Chạy trong phpMyAdmin để kiểm tra
-- ============================================

-- 1. Kiểm tra cột aluminum_system có tồn tại không
DESCRIBE `aluminum_systems`;

-- 2. Xem dữ liệu hiện tại (kiểm tra xem có giá trị aluminum_system không)
SELECT id, code, name, aluminum_system 
FROM `aluminum_systems` 
LIMIT 10;

-- 3. Đếm số record có aluminum_system NULL
SELECT COUNT(*) as total_null 
FROM `aluminum_systems` 
WHERE aluminum_system IS NULL OR aluminum_system = '';

-- 4. Cập nhật thử một record để test (thay id = 1 bằng id thực tế)
-- UPDATE `aluminum_systems` 
-- SET aluminum_system = 'VRA – Hệ 50' 
-- WHERE id = 1;








