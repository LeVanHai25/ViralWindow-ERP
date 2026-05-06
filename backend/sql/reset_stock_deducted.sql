-- =====================================================
-- SCRIPT RESET CHO TÍNH NĂNG XUẤT KHO TỪNG PHẦN
-- Chạy script này trong phpMyAdmin TRƯỚC KHI test
-- =====================================================

-- BƯỚC 1: Xem vật tư của dự án cụ thể (thay 15 bằng project_id của bạn)
SELECT 
    pm.id,
    pm.material_name,
    pm.material_type,
    pm.quantity as qty_required,
    pm.stock_deducted,
    pm.created_at
FROM project_materials pm
WHERE pm.project_id = 15
ORDER BY pm.stock_deducted ASC, pm.created_at DESC;

-- BƯỚC 2: Reset tất cả stock_deducted = 0 cho dự án cụ thể
-- Điều này sẽ cho phép hệ thống thử xuất lại
UPDATE project_materials 
SET stock_deducted = 0 
WHERE project_id = 15;

-- BƯỚC 3: Kiểm tra tồn kho accessories
SELECT id, code, name, stock_quantity 
FROM accessories 
ORDER BY name
LIMIT 20;

-- BƯỚC 4: Kiểm tra tồn kho aluminum_systems
SELECT id, code, name, quantity, quantity_m 
FROM aluminum_systems 
ORDER BY name
LIMIT 20;

-- BƯỚC 5: Kiểm tra tồn kho inventory (glass/other)
SELECT id, item_code, item_name, quantity, item_type 
FROM inventory 
ORDER BY item_name
LIMIT 20;

-- BƯỚC 6: SAU KHI RESET, làm theo các bước:
-- 1. Restart backend server
-- 2. Nhấn nút "Xác nhận xuất" trên frontend
-- 3. Hệ thống sẽ:
--    - Kiểm tra tồn kho từng vật tư
--    - CHỈ TRỪ các vật tư có đủ kho
--    - GIỮ LẠI các vật tư không đủ (stock_deducted = 0)
-- 4. Hiển thị thông báo chi tiết số đã xuất và số chờ nhập kho
