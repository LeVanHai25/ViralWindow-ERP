-- =====================================================
-- VERIFY DATA BEFORE BOM EXTRACTION
-- Kiểm tra dữ liệu sản phẩm trước khi bóc tách BOM
-- =====================================================
-- ⚠️ LƯU Ý: Thay đổi project_id = 14 thành project_id của bạn nếu khác
-- =====================================================

SET @project_id = 14;  -- ⚠️ THAY ĐỔI NẾU CẦN

-- =====================================================
-- PHẦN 1: KIỂM TRA project_items
-- =====================================================

-- 1.1. Tổng số project_items
SELECT 
    '1.1. Tổng số project_items' as check_name,
    COUNT(*) as total_count
FROM project_items
WHERE project_id = @project_id;

-- 1.2. project_items có đủ kích thước
SELECT 
    '1.2. Project Items có đủ kích thước' as check_name,
    COUNT(*) as count_with_dimensions,
    COUNT(CASE WHEN custom_width_mm IS NULL OR custom_height_mm IS NULL THEN 1 END) as count_missing_dimensions
FROM project_items
WHERE project_id = @project_id;

-- 1.3. project_items có aluminum_system
SELECT 
    '1.3. Project Items có aluminum_system' as check_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN aluminum_system IS NOT NULL AND aluminum_system != '' THEN 1 END) as count_with_aluminum_system,
    COUNT(CASE WHEN aluminum_system IS NULL OR aluminum_system = '' THEN 1 END) as count_missing_aluminum_system
FROM project_items
WHERE project_id = @project_id;

-- 1.4. Chi tiết project_items thiếu dữ liệu
SELECT 
    '1.4. Chi tiết project_items thiếu dữ liệu' as check_name,
    pi.id as project_item_id,
    pt.code as product_code,
    pt.name as product_name,
    pi.custom_width_mm,
    pi.custom_height_mm,
    pi.aluminum_system,
    CASE 
        WHEN pi.custom_width_mm IS NULL OR pi.custom_height_mm IS NULL THEN '❌ Thiếu kích thước'
        WHEN pi.aluminum_system IS NULL OR pi.aluminum_system = '' THEN '❌ Thiếu aluminum_system'
        ELSE '✅ Đủ dữ liệu'
    END as status
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
WHERE pi.project_id = @project_id
  AND (
      pi.custom_width_mm IS NULL 
      OR pi.custom_height_mm IS NULL 
      OR pi.aluminum_system IS NULL 
      OR pi.aluminum_system = ''
  )
ORDER BY pi.id;

-- =====================================================
-- PHẦN 2: KIỂM TRA door_designs
-- =====================================================

-- 2.1. Tổng số door_designs
SELECT 
    '2.1. Tổng số door_designs' as check_name,
    COUNT(*) as total_count
FROM door_designs
WHERE project_id = @project_id;

-- 2.2. door_designs có liên kết với project_items
SELECT 
    '2.2. Door Designs có liên kết với project_items' as check_name,
    COUNT(*) as total_door_designs,
    COUNT(CASE WHEN project_item_id IS NOT NULL THEN 1 END) as count_with_project_item_id,
    COUNT(CASE WHEN project_item_id IS NULL THEN 1 END) as count_without_project_item_id
FROM door_designs
WHERE project_id = @project_id;

-- 2.3. door_designs có đủ thông tin
SELECT 
    '2.3. Door Designs có đủ thông tin' as check_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN width_mm IS NOT NULL AND height_mm IS NOT NULL THEN 1 END) as count_with_dimensions,
    COUNT(CASE WHEN width_mm IS NULL OR height_mm IS NULL THEN 1 END) as count_missing_dimensions,
    COUNT(CASE WHEN aluminum_system_id IS NOT NULL THEN 1 END) as count_with_aluminum_system_id,
    COUNT(CASE WHEN aluminum_system_id IS NULL THEN 1 END) as count_missing_aluminum_system_id
FROM door_designs
WHERE project_id = @project_id;

-- 2.4. Chi tiết door_designs thiếu dữ liệu
SELECT 
    '2.4. Chi tiết door_designs thiếu dữ liệu' as check_name,
    dd.id as door_design_id,
    dd.design_code,
    dd.project_item_id,
    dd.width_mm,
    dd.height_mm,
    dd.aluminum_system_id,
    a.code as aluminum_system_code,
    a.name as aluminum_system_name,
    CASE 
        WHEN dd.width_mm IS NULL OR dd.height_mm IS NULL THEN '❌ Thiếu kích thước'
        WHEN dd.aluminum_system_id IS NULL THEN '❌ Thiếu aluminum_system_id'
        ELSE '✅ Đủ dữ liệu'
    END as status
FROM door_designs dd
LEFT JOIN aluminum_systems a ON a.id = dd.aluminum_system_id
WHERE dd.project_id = @project_id
  AND (
      dd.width_mm IS NULL 
      OR dd.height_mm IS NULL 
      OR dd.aluminum_system_id IS NULL
  )
ORDER BY dd.id;

-- =====================================================
-- PHẦN 3: KIỂM TRA LIÊN KẾT project_items <-> door_designs
-- =====================================================

-- 3.1. project_items chưa có door_designs
SELECT 
    '3.1. Project Items chưa có door_designs' as check_name,
    pi.id as project_item_id,
    pt.code as product_code,
    pt.name as product_name,
    pi.custom_width_mm,
    pi.custom_height_mm,
    pi.aluminum_system,
    CASE 
        WHEN pi.custom_width_mm IS NULL OR pi.custom_height_mm IS NULL THEN '❌ Thiếu kích thước'
        WHEN pi.aluminum_system IS NULL OR pi.aluminum_system = '' THEN '❌ Thiếu aluminum_system'
        ELSE '✅ Đủ dữ liệu - Có thể tạo door_designs'
    END as reason
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
WHERE pi.project_id = @project_id
  AND dd.id IS NULL
ORDER BY pi.id;

-- 3.2. door_designs không có project_item_id
SELECT 
    '3.2. Door Designs không có project_item_id' as check_name,
    dd.id as door_design_id,
    dd.design_code,
    dd.project_item_id,
    dd.width_mm,
    dd.height_mm
FROM door_designs dd
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NULL
ORDER BY dd.id;

-- =====================================================
-- PHẦN 4: KIỂM TRA bom_items
-- =====================================================

-- 4.1. Tổng số bom_items
SELECT 
    '4.1. Tổng số bom_items' as check_name,
    COUNT(*) as total_count
FROM bom_items bi
INNER JOIN door_designs dd ON dd.id = bi.design_id
WHERE dd.project_id = @project_id;

-- 4.2. door_designs đã có bom_items
SELECT 
    '4.2. Door Designs đã có bom_items' as check_name,
    COUNT(DISTINCT dd.id) as total_door_designs,
    COUNT(DISTINCT CASE WHEN bi.id IS NOT NULL THEN dd.id END) as door_designs_with_bom,
    COUNT(DISTINCT CASE WHEN bi.id IS NULL THEN dd.id END) as door_designs_without_bom
FROM door_designs dd
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = @project_id;

-- 4.3. Chi tiết door_designs chưa có bom_items
SELECT 
    '4.3. Chi tiết door_designs chưa có bom_items' as check_name,
    dd.id as door_design_id,
    dd.design_code,
    dd.project_item_id,
    dd.width_mm,
    dd.height_mm,
    dd.aluminum_system_id,
    CASE 
        WHEN dd.width_mm IS NULL OR dd.height_mm IS NULL THEN '❌ Thiếu kích thước - Không thể bóc tách BOM'
        WHEN dd.aluminum_system_id IS NULL THEN '❌ Thiếu aluminum_system_id - Không thể bóc tách BOM'
        ELSE '✅ Đủ dữ liệu - Có thể bóc tách BOM'
    END as status
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
    (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id AND custom_width_mm IS NOT NULL AND custom_height_mm IS NOT NULL) as project_items_with_dimensions,
    (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id AND aluminum_system IS NOT NULL AND aluminum_system != '') as project_items_with_aluminum_system,
    (SELECT COUNT(*) FROM door_designs WHERE project_id = @project_id) as total_door_designs,
    (SELECT COUNT(*) FROM door_designs WHERE project_id = @project_id AND project_item_id IS NOT NULL) as door_designs_with_project_item_id,
    (SELECT COUNT(*) FROM door_designs WHERE project_id = @project_id AND width_mm IS NOT NULL AND height_mm IS NOT NULL AND aluminum_system_id IS NOT NULL) as door_designs_ready_for_bom,
    (SELECT COUNT(*) FROM bom_items bi INNER JOIN door_designs dd ON dd.id = bi.design_id WHERE dd.project_id = @project_id) as total_bom_items,
    (SELECT COUNT(DISTINCT bi.design_id) FROM bom_items bi INNER JOIN door_designs dd ON dd.id = bi.design_id WHERE dd.project_id = @project_id) as door_designs_with_bom;

-- =====================================================
-- PHẦN 6: HƯỚNG DẪN BƯỚC TIẾP THEO
-- =====================================================

SELECT 
    '6. HƯỚNG DẪN BƯỚC TIẾP THEO' as guide,
    CASE 
        WHEN (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id AND (custom_width_mm IS NULL OR custom_height_mm IS NULL)) > 0 
        THEN '⚠️ BƯỚC 1: Sửa các project_items thiếu kích thước (xem phần 1.4)'
        ELSE '✅ Tất cả project_items đã có kích thước'
    END as step1,
    CASE 
        WHEN (SELECT COUNT(*) FROM project_items WHERE project_id = @project_id AND (aluminum_system IS NULL OR aluminum_system = '')) > 0 
        THEN '⚠️ BƯỚC 2: Sửa các project_items thiếu aluminum_system (xem phần 1.4)'
        ELSE '✅ Tất cả project_items đã có aluminum_system'
    END as step2,
    CASE 
        WHEN (SELECT COUNT(*) FROM project_items pi LEFT JOIN door_designs dd ON dd.project_item_id = pi.id WHERE pi.project_id = @project_id AND dd.id IS NULL) > 0 
        THEN '⚠️ BƯỚC 3: Chạy lại script auto_create_door_designs_from_project_items.sql để tạo door_designs cho các project_items còn thiếu'
        ELSE '✅ Tất cả project_items đã có door_designs'
    END as step3,
    CASE 
        WHEN (SELECT COUNT(*) FROM door_designs WHERE project_id = @project_id AND (width_mm IS NULL OR height_mm IS NULL OR aluminum_system_id IS NULL)) > 0 
        THEN '⚠️ BƯỚC 4: Sửa các door_designs thiếu dữ liệu (xem phần 2.4)'
        ELSE '✅ Tất cả door_designs đã có đủ dữ liệu'
    END as step4,
    CASE 
        WHEN (SELECT COUNT(*) FROM door_designs dd LEFT JOIN bom_items bi ON bi.design_id = dd.id WHERE dd.project_id = @project_id AND bi.id IS NULL AND dd.width_mm IS NOT NULL AND dd.height_mm IS NOT NULL AND dd.aluminum_system_id IS NOT NULL) > 0 
        THEN '✅ BƯỚC 5: Có thể bắt đầu bóc tách BOM trong frontend (Bước 4: Bóc tách Vật tư)'
        ELSE '✅ Tất cả door_designs đã có BOM hoặc chưa sẵn sàng'
    END as step5;

-- =====================================================
-- KẾT THÚC
-- =====================================================
SELECT '✅ Hoàn thành kiểm tra dữ liệu' as result;











