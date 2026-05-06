-- =====================================================
-- Script kiểm tra cấu tạo sản phẩm - PHIÊN BẢN ĐƠN GIẢN
-- =====================================================
-- HƯỚNG DẪN: 
-- 1. Chạy từng query một (copy từng phần và chạy riêng)
-- 2. Thay số 14 bằng project_id bạn muốn kiểm tra
-- 3. Hoặc xóa dòng WHERE để xem tất cả dự án

-- =====================================================
-- QUERY 1: Kiểm tra các sản phẩm trong project_items
-- =====================================================
SELECT 
    pi.id as project_item_id,
    pi.project_id,
    p.project_name,
    pi.quantity,
    pi.aluminum_system,
    pi.custom_width_mm as width_mm,
    pi.custom_height_mm as height_mm,
    pi.custom_glass_type as glass_type,
    pt.code as template_code,
    pt.name as template_name,
    pt.product_type as door_type,
    a.name as aluminum_system_name,
    CASE 
        WHEN pi.custom_width_mm IS NULL OR pi.custom_height_mm IS NULL THEN '❌ Thiếu kích thước'
        WHEN pi.aluminum_system IS NULL THEN '❌ Thiếu hệ nhôm'
        WHEN pt.structure_json IS NULL THEN '⚠️ Template chưa có cấu tạo'
        ELSE '✅ Đầy đủ'
    END as status
FROM project_items pi
LEFT JOIN projects p ON pi.project_id = p.id
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN aluminum_systems a ON a.code = pi.aluminum_system OR a.id = pi.aluminum_system
WHERE pi.project_id = 14
ORDER BY pi.project_id, pi.id;

-- =====================================================
-- QUERY 2: Kiểm tra door_designs đã được tạo chưa
-- =====================================================
SELECT 
    dd.id as door_design_id,
    dd.project_id,
    dd.project_item_id,
    dd.design_code,
    dd.door_type,
    dd.width_mm,
    dd.height_mm,
    dd.aluminum_system_id,
    pi.id as project_item_id_check,
    CASE 
        WHEN dd.project_item_id IS NULL THEN '⚠️ Chưa link với project_item'
        WHEN dd.width_mm IS NULL OR dd.height_mm IS NULL THEN '❌ Thiếu kích thước'
        WHEN dd.aluminum_system_id IS NULL THEN '❌ Thiếu hệ nhôm'
        ELSE '✅ Đầy đủ'
    END as status
FROM door_designs dd
LEFT JOIN project_items pi ON pi.id = dd.project_item_id
WHERE dd.project_id = 14
ORDER BY dd.project_id, dd.id;

-- =====================================================
-- QUERY 3: Kiểm tra BOM đã được bóc tách chưa
-- =====================================================
SELECT 
    bi.design_id,
    dd.project_item_id,
    COUNT(bi.id) as bom_items_count,
    SUM(CASE WHEN bi.item_type = 'frame' OR bi.item_type = 'mullion' THEN 1 ELSE 0 END) as aluminum_items,
    SUM(CASE WHEN bi.item_type = 'glass' THEN 1 ELSE 0 END) as glass_items,
    SUM(CASE WHEN bi.item_type = 'accessory' THEN 1 ELSE 0 END) as accessory_items,
    CASE 
        WHEN COUNT(bi.id) = 0 THEN '❌ Chưa có BOM'
        WHEN SUM(CASE WHEN bi.item_type = 'frame' OR bi.item_type = 'mullion' THEN 1 ELSE 0 END) = 0 THEN '⚠️ Thiếu nhôm'
        WHEN SUM(CASE WHEN bi.item_type = 'glass' THEN 1 ELSE 0 END) = 0 THEN '⚠️ Thiếu kính'
        ELSE '✅ Đã bóc tách'
    END as bom_status
FROM bom_items bi
LEFT JOIN door_designs dd ON dd.id = bi.design_id
WHERE dd.project_id = 14
GROUP BY bi.design_id, dd.project_item_id
ORDER BY bi.design_id;

-- =====================================================
-- QUERY 4: Tổng hợp - Kiểm tra tất cả sản phẩm
-- =====================================================
SELECT 
    pi.id as project_item_id,
    p.project_name,
    pi.quantity,
    CONCAT(COALESCE(pi.custom_width_mm, 0), ' x ', COALESCE(pi.custom_height_mm, 0)) as dimensions,
    pi.aluminum_system,
    pt.code as template_code,
    dd.id as door_design_id,
    COUNT(bi.id) as bom_items_count,
    CASE 
        WHEN dd.id IS NULL THEN '❌ Chưa tạo door_design'
        WHEN COUNT(bi.id) = 0 THEN '⚠️ Chưa bóc tách BOM'
        WHEN COUNT(bi.id) > 0 THEN '✅ Đã bóc tách BOM'
        ELSE '❓ Không xác định'
    END as overall_status
FROM project_items pi
LEFT JOIN projects p ON pi.project_id = p.id
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN door_designs dd ON dd.project_item_id = pi.id
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE pi.project_id = 14
GROUP BY pi.id, p.project_name, pi.quantity, pi.custom_width_mm, pi.custom_height_mm, 
         pi.aluminum_system, pt.code, dd.id
ORDER BY pi.id;











