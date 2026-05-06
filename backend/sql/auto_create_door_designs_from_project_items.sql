-- =====================================================
-- AUTO CREATE door_designs FROM project_items
-- Tự động tạo door_designs cho các project_items chưa có
-- =====================================================
-- ⚠️ LƯU Ý: Thay đổi project_id = 14 thành project_id của bạn nếu khác
-- =====================================================

SET @project_id = 14;  -- ⚠️ THAY ĐỔI NẾU CẦN

-- =====================================================
-- BƯỚC 1: KIỂM TRA project_items CHƯA CÓ door_designs
-- =====================================================

SELECT 
    'BƯỚC 1: Project Items chưa có door_designs' as step,
    pi.id as project_item_id,
    pi.project_id,
    pi.aluminum_system,
    pi.custom_width_mm,
    pi.custom_height_mm,
    pt.code as product_code,
    pt.name as product_name,
    pt.product_type,
    a.id as aluminum_system_id
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN aluminum_systems a ON (a.code = pi.aluminum_system OR a.id = CAST(pi.aluminum_system AS UNSIGNED))
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
WHERE pi.project_id = @project_id
  AND dd.id IS NULL
ORDER BY pi.id;

-- =====================================================
-- BƯỚC 2: KIỂM TRA aluminum_system_id TRƯỚC KHI TẠO door_designs
-- =====================================================

-- 2.1. Kiểm tra các project_items không có aluminum_system_id hợp lệ
SELECT 
    '2.1. Project Items không có aluminum_system_id hợp lệ' as check_name,
    pi.id as project_item_id,
    pi.aluminum_system as aluminum_system_value,
    pt.code as product_code,
    pt.name as product_name,
    a.id as found_aluminum_system_id,
    a.code as found_aluminum_code,
    CASE 
        WHEN a.id IS NULL THEN '❌ Không tìm thấy aluminum_system trong bảng aluminum_systems'
        ELSE '✅ Có aluminum_system_id hợp lệ'
    END as status
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN aluminum_systems a ON (
    a.code = pi.aluminum_system 
    OR (pi.aluminum_system REGEXP '^[0-9]+$' AND a.id = CAST(pi.aluminum_system AS UNSIGNED))
    OR a.name = pi.aluminum_system
)
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
WHERE pi.project_id = @project_id
  AND dd.id IS NULL
  AND (
      (pi.custom_width_mm IS NOT NULL AND pi.custom_height_mm IS NOT NULL)
      OR 
      (pi.snapshot_config IS NOT NULL AND (
          JSON_EXTRACT(pi.snapshot_config, '$.size.w') IS NOT NULL OR
          JSON_EXTRACT(pi.snapshot_config, '$.width_mm') IS NOT NULL
      ))
      OR
      (pt.default_width_mm IS NOT NULL AND pt.default_height_mm IS NOT NULL)
  )
ORDER BY a.id IS NULL DESC, pi.id;

-- =====================================================
-- BƯỚC 3: TẠO door_designs TỪ project_items
-- =====================================================
-- ⚠️ CHẠY CẨN THẬN - Script này sẽ INSERT dữ liệu mới

-- Kiểm tra xem cột project_item_id có tồn tại không
SET @has_project_item_id = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'door_designs' 
      AND COLUMN_NAME = 'project_item_id'
);

-- Kiểm tra xem cột structure_json có tồn tại không
SET @has_structure_json = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'door_designs' 
      AND COLUMN_NAME = 'structure_json'
);

-- Kiểm tra xem cột status có tồn tại không
SET @has_status = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'door_designs' 
      AND COLUMN_NAME = 'status'
);

-- Tạo door_designs cho các project_items chưa có
-- ⚠️ LƯU Ý: Nếu bảng door_designs không có cột project_item_id, structure_json, hoặc status,
-- hãy chạy script add_project_item_id_column.sql trước, hoặc chỉnh sửa INSERT statement bên dưới

-- PHƯƠNG ÁN 1: INSERT với tất cả các cột (nếu tất cả đều tồn tại)
-- ⚠️ ĐÃ COMMENT - Sử dụng PHƯƠNG ÁN 2 thay thế
/*
INSERT INTO door_designs (
    project_id,
    project_item_id,
    design_code,
    door_type,
    width_mm,
    height_mm,
    aluminum_system_id,
    structure_json,
    status
)
SELECT 
    pi.project_id,
    pi.id as project_item_id,
    COALESCE(pt.code, CONCAT('DOOR-', pi.id)) as design_code,
    CASE 
        WHEN pt.product_type LIKE '%sliding%' OR pt.product_type LIKE '%lùa%' THEN 'sliding'
        WHEN pt.product_type LIKE '%tilt%' THEN 'tilt'
        WHEN pt.product_type LIKE '%folding%' THEN 'folding'
        WHEN pt.product_type LIKE '%fixed%' THEN 'fixed'
        ELSE 'swing'
    END as door_type,
    COALESCE(
        pi.custom_width_mm,
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.size.w') AS UNSIGNED),
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.width_mm') AS UNSIGNED),
        pt.default_width_mm,
        1200
    ) as width_mm,
    COALESCE(
        pi.custom_height_mm,
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.size.h') AS UNSIGNED),
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.height_mm') AS UNSIGNED),
        pt.default_height_mm,
        2200
    ) as height_mm,
    a.id as aluminum_system_id,
    pt.structure_json,
    'designing' as status
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN aluminum_systems a ON (a.code = pi.aluminum_system OR a.id = CAST(pi.aluminum_system AS UNSIGNED))
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
WHERE pi.project_id = @project_id
  AND dd.id IS NULL
  AND (
      -- Chỉ tạo nếu có đủ thông tin
      (pi.custom_width_mm IS NOT NULL AND pi.custom_height_mm IS NOT NULL)
      OR 
      (pi.snapshot_config IS NOT NULL AND (
          JSON_EXTRACT(pi.snapshot_config, '$.size.w') IS NOT NULL OR
          JSON_EXTRACT(pi.snapshot_config, '$.width_mm') IS NOT NULL
      ))
      OR
      (pt.default_width_mm IS NOT NULL AND pt.default_height_mm IS NOT NULL)
  );
*/

-- PHƯƠNG ÁN 2: INSERT không có structure_json và status
-- ✅ ĐANG SỬ DỤNG - Phù hợp với bảng door_designs không có các cột tùy chọn
-- ⚠️ LƯU Ý: Chỉ INSERT các record có aluminum_system_id hợp lệ để tránh lỗi foreign key constraint
-- ⚠️ LƯU Ý: Sử dụng INSERT IGNORE để tránh lỗi duplicate design_code
INSERT IGNORE INTO door_designs (
    project_id,
    project_item_id,
    design_code,
    door_type,
    width_mm,
    height_mm,
    aluminum_system_id
)
SELECT 
    pi.project_id,
    pi.id as project_item_id,
    -- Tạo design_code unique bằng cách thêm project_item_id
    COALESCE(
        CONCAT(pt.code, '-', pi.id),
        CONCAT('DOOR-', pi.id)
    ) as design_code,
    CASE 
        WHEN pt.product_type LIKE '%sliding%' OR pt.product_type LIKE '%lùa%' THEN 'sliding'
        WHEN pt.product_type LIKE '%tilt%' THEN 'tilt'
        WHEN pt.product_type LIKE '%folding%' THEN 'folding'
        WHEN pt.product_type LIKE '%fixed%' THEN 'fixed'
        ELSE 'swing'
    END as door_type,
    COALESCE(
        pi.custom_width_mm,
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.size.w') AS UNSIGNED),
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.width_mm') AS UNSIGNED),
        pt.default_width_mm,
        1200
    ) as width_mm,
    COALESCE(
        pi.custom_height_mm,
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.size.h') AS UNSIGNED),
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.height_mm') AS UNSIGNED),
        pt.default_height_mm,
        2200
    ) as height_mm,
    a.id as aluminum_system_id
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN aluminum_systems a ON (
    a.code = pi.aluminum_system 
    OR (pi.aluminum_system REGEXP '^[0-9]+$' AND a.id = CAST(pi.aluminum_system AS UNSIGNED))
    OR a.name = pi.aluminum_system
)
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
WHERE pi.project_id = @project_id
  AND dd.id IS NULL
  AND (
      (pi.custom_width_mm IS NOT NULL AND pi.custom_height_mm IS NOT NULL)
      OR 
      (pi.snapshot_config IS NOT NULL AND (
          JSON_EXTRACT(pi.snapshot_config, '$.size.w') IS NOT NULL OR
          JSON_EXTRACT(pi.snapshot_config, '$.width_mm') IS NOT NULL
      ))
      OR
      (pt.default_width_mm IS NOT NULL AND pt.default_height_mm IS NOT NULL)
  )
  -- ⚠️ QUAN TRỌNG: Chỉ INSERT các record có aluminum_system_id hợp lệ
  AND a.id IS NOT NULL;

-- =====================================================
-- BƯỚC 3.1: KIỂM TRA CÁC project_items CÓ design_code ĐÃ TỒN TẠI
-- =====================================================
-- Query này hiển thị các project_items có design_code đã tồn tại trong door_designs
-- (có thể do đã được tạo trước đó hoặc do duplicate)

SELECT 
    'BƯỚC 3.1: Project Items có design_code đã tồn tại' as check_name,
    pi.id as project_item_id,
    COALESCE(
        CONCAT(pt.code, '-', pi.id),
        CONCAT('DOOR-', pi.id)
    ) as design_code,
    pt.code as product_code,
    pt.name as product_name,
    dd.id as existing_door_design_id,
    dd.design_code as existing_design_code,
    CASE 
        WHEN dd.id IS NOT NULL THEN '✅ Đã có door_designs'
        ELSE '❌ Chưa có door_designs'
    END as status
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN door_designs dd ON (
    dd.project_id = pi.project_id 
    AND dd.design_code = COALESCE(
        CONCAT(pt.code, '-', pi.id),
        CONCAT('DOOR-', pi.id)
    )
)
WHERE pi.project_id = @project_id
ORDER BY dd.id IS NULL DESC, pi.id;

-- Nếu cột project_item_id không tồn tại, tạo lại với cấu trúc đơn giản hơn
-- (Trường hợp này ít xảy ra vì đã có migration script)
-- Nhưng để an toàn, có thể chạy riêng script add_project_item_id_column.sql trước

-- =====================================================
-- BƯỚC 4: KIỂM TRA KẾT QUẢ
-- =====================================================

SELECT 
    'BƯỚC 4: Kết quả sau khi tạo door_designs' as step,
    COUNT(*) as total_project_items,
    COUNT(dd.id) as items_with_door_designs,
    COUNT(*) - COUNT(dd.id) as items_without_door_designs
FROM project_items pi
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
WHERE pi.project_id = @project_id;

-- Chi tiết các project_items vẫn chưa có door_designs (nếu có)
SELECT 
    'Chi tiết project_items vẫn chưa có door_designs' as note,
    pi.id as project_item_id,
    pi.aluminum_system,
    pi.custom_width_mm,
    pi.custom_height_mm,
    pt.code as product_code,
    CASE 
        WHEN pi.custom_width_mm IS NULL AND pi.custom_height_mm IS NULL THEN '❌ Thiếu kích thước'
        WHEN pi.aluminum_system IS NULL OR pi.aluminum_system = '' THEN '❌ Thiếu aluminum_system'
        ELSE '✅ Đủ dữ liệu (có thể do lỗi khác)'
    END as reason
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
WHERE pi.project_id = @project_id
  AND dd.id IS NULL
ORDER BY pi.id;

-- =====================================================
-- KẾT THÚC
-- =====================================================
SELECT '✅ Hoàn thành tạo door_designs từ project_items' as result;

