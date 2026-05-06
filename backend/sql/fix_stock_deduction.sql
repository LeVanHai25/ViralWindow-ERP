-- =====================================================
-- SCRIPT SỬA LỖI TRỪ KHO
-- Chạy script này trong phpMyAdmin để fix dữ liệu cũ
-- =====================================================

-- BƯỚC 1: Xem các vật tư đã xuất nhưng có thể chưa trừ kho đúng
SELECT 
    pm.id,
    pm.project_id,
    pm.material_name,
    pm.material_type,
    pm.quantity,
    pm.material_id,
    pm.material_code,
    pm.stock_deducted,
    pm.created_at
FROM project_materials pm
WHERE pm.stock_deducted = 1
ORDER BY pm.created_at DESC
LIMIT 20;

-- BƯỚC 2: Reset flag stock_deducted = 0 cho các vật tư cần trừ lại
-- CẢNH BÁO: Chỉ chạy nếu bạn muốn trừ kho lại cho các vật tư này
-- UPDATE project_materials SET stock_deducted = 0 WHERE project_id = <project_id>;

-- BƯỚC 3: Kiểm tra tồn kho phụ kiện hiện tại
SELECT id, code, name, stock_quantity FROM accessories ORDER BY name;

-- BƯỚC 4: Kiểm tra project_materials xem material_id có đúng không
SELECT 
    pm.id,
    pm.material_name,
    pm.material_id,
    pm.material_code,
    pm.material_type,
    pm.quantity,
    a.id as actual_accessory_id,
    a.name as accessory_name,
    a.stock_quantity
FROM project_materials pm
LEFT JOIN accessories a ON a.name = pm.material_name OR a.code = pm.material_code
WHERE pm.material_type = 'accessory'
ORDER BY pm.created_at DESC
LIMIT 20;

-- BƯỚC 5: Cập nhật material_id cho các record chưa có
UPDATE project_materials pm
JOIN accessories a ON (a.name = pm.material_name OR a.code = pm.material_code)
SET pm.material_id = a.id
WHERE pm.material_type = 'accessory' 
  AND (pm.material_id IS NULL OR pm.material_id = 0);

-- Tương tự cho aluminum
UPDATE project_materials pm
JOIN aluminum_systems al ON (al.name = pm.material_name OR al.code = pm.material_code)
SET pm.material_id = al.id
WHERE pm.material_type = 'aluminum' 
  AND (pm.material_id IS NULL OR pm.material_id = 0);

-- Tương tự cho glass/kính
UPDATE project_materials pm
JOIN inventory inv ON (inv.item_name = pm.material_name OR inv.item_code = pm.material_code)
SET pm.material_id = inv.id
WHERE pm.material_type IN ('glass', 'other')
  AND (pm.material_id IS NULL OR pm.material_id = 0);
