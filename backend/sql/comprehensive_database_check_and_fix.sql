-- =====================================================
-- COMPREHENSIVE DATABASE CHECK AND FIX SCRIPT
-- Kiểm tra và sửa tất cả các vấn đề liên quan đến BOM extraction
-- =====================================================
-- ⚠️ LƯU Ý: Thay đổi project_id = 14 thành project_id của bạn nếu khác
-- =====================================================

SET @project_id = 14;  -- ⚠️ THAY ĐỔI NẾU CẦN

-- =====================================================
-- PHẦN 1: KIỂM TRA DỮ LIỆU project_items
-- =====================================================

-- 1.1. Kiểm tra project_items thiếu kích thước
SELECT 
    '1.1. Project Items thiếu kích thước' as check_name,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') as item_ids
FROM project_items pi
WHERE pi.project_id = @project_id
  AND (pi.custom_width_mm IS NULL OR pi.custom_height_mm IS NULL);

-- 1.2. Kiểm tra project_items thiếu aluminum_system
SELECT 
    '1.2. Project Items thiếu aluminum_system' as check_name,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') as item_ids
FROM project_items pi
WHERE pi.project_id = @project_id
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '');

-- 1.3. Kiểm tra snapshot_config có dữ liệu không
SELECT 
    '1.3. Project Items có snapshot_config' as check_name,
    COUNT(*) as count_with_snapshot,
    COUNT(CASE WHEN pi.snapshot_config IS NULL THEN 1 END) as count_without_snapshot
FROM project_items pi
WHERE pi.project_id = @project_id;

-- =====================================================
-- PHẦN 2: EXTRACT DỮ LIỆU TỪ snapshot_config
-- =====================================================

-- 2.1. Xem dữ liệu trong snapshot_config (mẫu 3 dòng đầu)
SELECT 
    '2.1. Mẫu snapshot_config' as check_name,
    pi.id,
    pi.snapshot_config,
    JSON_EXTRACT(pi.snapshot_config, '$.size.w') as size_w,
    JSON_EXTRACT(pi.snapshot_config, '$.size.h') as size_h,
    JSON_EXTRACT(pi.snapshot_config, '$.width_mm') as width_mm,
    JSON_EXTRACT(pi.snapshot_config, '$.height_mm') as height_mm,
    JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system') as aluminum_system,
    JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system_code') as aluminum_system_code
FROM project_items pi
WHERE pi.project_id = @project_id
  AND pi.snapshot_config IS NOT NULL
LIMIT 3;

-- 2.2. FIX: Extract kích thước từ snapshot_config
-- ⚠️ CHẠY CẨN THẬN - Script này sẽ UPDATE dữ liệu
UPDATE project_items pi
SET 
    custom_width_mm = COALESCE(
        pi.custom_width_mm,
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.size.w') AS UNSIGNED),
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.width_mm') AS UNSIGNED),
        NULL
    ),
    custom_height_mm = COALESCE(
        pi.custom_height_mm,
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.size.h') AS UNSIGNED),
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.height_mm') AS UNSIGNED),
        NULL
    )
WHERE pi.project_id = @project_id
  AND pi.snapshot_config IS NOT NULL
  AND (pi.custom_width_mm IS NULL OR pi.custom_height_mm IS NULL);

-- 2.3. FIX: Extract aluminum_system từ snapshot_config (nếu có)
UPDATE project_items pi
SET 
    aluminum_system = COALESCE(
        pi.aluminum_system,
        JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system')),
        JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system_code')),
        JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.system')),
        NULL
    )
WHERE pi.project_id = @project_id
  AND pi.snapshot_config IS NOT NULL
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '');

-- =====================================================
-- PHẦN 3: KIỂM TRA door_designs
-- =====================================================

-- 3.1. Kiểm tra door_designs đã được tạo chưa
SELECT 
    '3.1. Door Designs tổng số' as check_name,
    COUNT(*) as total_door_designs,
    COUNT(CASE WHEN dd.project_item_id IS NOT NULL THEN 1 END) as with_project_item_id,
    COUNT(CASE WHEN dd.project_item_id IS NULL THEN 1 END) as without_project_item_id
FROM door_designs dd
WHERE dd.project_id = @project_id;

-- 3.2. Kiểm tra project_items chưa có door_designs
SELECT 
    '3.2. Project Items chưa có door_designs' as check_name,
    pi.id as project_item_id,
    pi.aluminum_system,
    pi.custom_width_mm,
    pi.custom_height_mm,
    pt.code as product_code,
    pt.name as product_name
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
WHERE pi.project_id = @project_id
  AND dd.id IS NULL
ORDER BY pi.id;

-- =====================================================
-- PHẦN 4: KIỂM TRA bom_items
-- =====================================================

-- 4.1. Kiểm tra bom_items đã được tạo chưa
SELECT 
    '4.1. BOM Items tổng số' as check_name,
    COUNT(*) as total_bom_items,
    COUNT(DISTINCT bi.design_id) as unique_designs_with_bom
FROM bom_items bi
INNER JOIN door_designs dd ON dd.id = bi.design_id
WHERE dd.project_id = @project_id;

-- 4.2. Kiểm tra door_designs chưa có bom_items
SELECT 
    '4.2. Door Designs chưa có BOM' as check_name,
    dd.id as door_design_id,
    dd.design_code,
    dd.project_item_id,
    dd.width_mm,
    dd.height_mm,
    dd.aluminum_system_id
FROM door_designs dd
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = @project_id
  AND bi.id IS NULL
ORDER BY dd.id;

-- =====================================================
-- PHẦN 5: TỔNG HỢP TÌNH TRẠNG
-- =====================================================

SELECT 
    '5. TỔNG HỢP TÌNH TRẠNG' as summary,
    (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id) as total_project_items,
    (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id AND custom_width_mm IS NOT NULL AND custom_height_mm IS NOT NULL) as items_with_dimensions,
    (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id AND (custom_width_mm IS NULL OR custom_height_mm IS NULL)) as items_missing_dimensions,
    (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id AND aluminum_system IS NOT NULL AND aluminum_system != '') as items_with_aluminum_system,
    (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id AND (aluminum_system IS NULL OR aluminum_system = '')) as items_missing_aluminum_system,
    (SELECT COUNT(*) FROM door_designs WHERE project_id = @project_id) as total_door_designs,
    (SELECT COUNT(*) FROM bom_items bi INNER JOIN door_designs dd ON dd.id = bi.design_id WHERE dd.project_id = @project_id) as total_bom_items;

-- =====================================================
-- PHẦN 6: KIỂM TRA CẤU TRÚC BẢNG
-- =====================================================

-- 6.1. Kiểm tra cột project_item_id trong door_designs
SELECT 
    '6.1. Cột project_item_id trong door_designs' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Cột tồn tại'
        ELSE '❌ Cột không tồn tại'
    END as status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'door_designs' 
  AND COLUMN_NAME = 'project_item_id';

-- 6.2. Kiểm tra cột structure_json trong door_designs
SELECT 
    '6.2. Cột structure_json trong door_designs' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Cột tồn tại'
        ELSE '❌ Cột không tồn tại'
    END as status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'door_designs' 
  AND COLUMN_NAME = 'structure_json';

-- 6.3. Kiểm tra cột status trong door_designs
SELECT 
    '6.3. Cột status trong door_designs' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Cột tồn tại'
        ELSE '❌ Cột không tồn tại'
    END as status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'door_designs' 
  AND COLUMN_NAME = 'status';

-- =====================================================
-- KẾT THÚC
-- =====================================================
SELECT '✅ Hoàn thành kiểm tra database' as result;











