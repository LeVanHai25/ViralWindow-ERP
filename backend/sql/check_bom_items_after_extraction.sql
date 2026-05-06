-- =====================================================
-- CHECK BOM ITEMS AFTER EXTRACTION
-- Kiểm tra BOM items sau khi bóc tách
-- =====================================================
-- ⚠️ LƯU Ý: Thay đổi project_id = 14 thành project_id của bạn nếu khác
-- =====================================================

SET @project_id = 14;  -- ⚠️ THAY ĐỔI NẾU CẦN

-- =====================================================
-- KIỂM TRA BOM ITEMS CHO CÁC door_designs CÓ project_item_id
-- =====================================================

SELECT 
    dd.id as door_design_id,
    dd.design_code,
    dd.project_item_id,
    COUNT(bi.id) as bom_items_count,
    SUM(CASE WHEN bi.item_type = 'frame' THEN 1 ELSE 0 END) as aluminum_items,
    SUM(CASE WHEN bi.item_type = 'glass' THEN 1 ELSE 0 END) as glass_items,
    SUM(CASE WHEN bi.item_type = 'accessory' THEN 1 ELSE 0 END) as accessory_items,
    SUM(CASE WHEN bi.item_type = 'gasket' THEN 1 ELSE 0 END) as gasket_items,
    CASE 
        WHEN COUNT(bi.id) > 0 THEN '✅ Đã có BOM'
        ELSE '❌ Chưa có BOM'
    END as status
FROM door_designs dd
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NOT NULL
GROUP BY dd.id, dd.design_code, dd.project_item_id
ORDER BY dd.id;

-- =====================================================
-- TỔNG HỢP BOM ITEMS
-- =====================================================

SELECT 
    'TỔNG HỢP BOM ITEMS' as summary,
    COUNT(DISTINCT dd.id) as total_door_designs,
    COUNT(DISTINCT CASE WHEN bi.id IS NOT NULL THEN dd.id END) as door_designs_with_bom,
    COUNT(DISTINCT CASE WHEN bi.id IS NULL THEN dd.id END) as door_designs_without_bom,
    COUNT(bi.id) as total_bom_items,
    SUM(CASE WHEN bi.item_type = 'frame' THEN 1 ELSE 0 END) as total_aluminum_items,
    SUM(CASE WHEN bi.item_type = 'glass' THEN 1 ELSE 0 END) as total_glass_items,
    SUM(CASE WHEN bi.item_type = 'accessory' THEN 1 ELSE 0 END) as total_accessory_items
FROM door_designs dd
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NOT NULL;

-- =====================================================
-- CHI TIẾT BOM ITEMS CHO TỪNG door_design
-- =====================================================

SELECT 
    dd.id as door_design_id,
    dd.design_code,
    bi.item_type,
    bi.item_code,
    bi.item_name,
    bi.length_mm,
    bi.quantity,
    bi.unit,
    bi.weight_kg,
    bi.area_m2
FROM door_designs dd
INNER JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NOT NULL
ORDER BY dd.id, 
    CASE bi.item_type 
        WHEN 'frame' THEN 1 
        WHEN 'glass' THEN 2 
        WHEN 'accessory' THEN 3 
        ELSE 4 
    END,
    bi.item_code;

-- =====================================================
-- KẾT THÚC
-- =====================================================
SELECT '✅ Hoàn thành kiểm tra BOM items' as result;











