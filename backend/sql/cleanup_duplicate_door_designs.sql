-- =====================================================
-- CLEANUP DUPLICATE door_designs
-- Xử lý các door_designs duplicate hoặc không cần thiết
-- =====================================================
-- ⚠️ LƯU Ý: Thay đổi project_id = 14 thành project_id của bạn nếu khác
-- =====================================================

SET @project_id = 14;  -- ⚠️ THAY ĐỔI NẾU CẦN

-- =====================================================
-- BƯỚC 1: KIỂM TRA door_designs CÓ design_code TRÙNG
-- =====================================================

SELECT 
    'BƯỚC 1: Door Designs có design_code trùng' as step,
    design_code,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') as door_design_ids,
    GROUP_CONCAT(project_item_id ORDER BY id SEPARATOR ', ') as project_item_ids
FROM door_designs
WHERE project_id = @project_id
GROUP BY design_code
HAVING COUNT(*) > 1
ORDER BY count DESC, design_code;

-- =====================================================
-- BƯỚC 2: KIỂM TRA door_designs KHÔNG CÓ project_item_id
-- =====================================================

SELECT 
    'BƯỚC 2: Door Designs không có project_item_id' as step,
    COUNT(*) as total_count,
    COUNT(CASE WHEN design_code LIKE 'CT%' THEN 1 END) as count_with_ct_code,
    COUNT(CASE WHEN design_code NOT LIKE 'CT%' THEN 1 END) as count_with_other_code
FROM door_designs
WHERE project_id = @project_id
  AND project_item_id IS NULL;

-- =====================================================
-- BƯỚC 3: XEM CHI TIẾT door_designs KHÔNG CÓ project_item_id
-- =====================================================

SELECT 
    'BƯỚC 3: Chi tiết door_designs không có project_item_id' as step,
    dd.id as door_design_id,
    dd.design_code,
    dd.project_item_id,
    dd.width_mm,
    dd.height_mm,
    dd.aluminum_system_id,
    COUNT(bi.id) as bom_items_count,
    CASE 
        WHEN COUNT(bi.id) > 0 THEN '⚠️ Có BOM - Không nên xóa'
        ELSE '✅ Không có BOM - Có thể xóa'
    END as can_delete
FROM door_designs dd
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NULL
GROUP BY dd.id, dd.design_code, dd.project_item_id, dd.width_mm, dd.height_mm, dd.aluminum_system_id
ORDER BY bom_items_count DESC, dd.id
LIMIT 20;  -- Chỉ xem 20 dòng đầu

-- =====================================================
-- BƯỚC 4: XÓA door_designs KHÔNG CÓ project_item_id VÀ KHÔNG CÓ BOM
-- =====================================================
-- ⚠️ CHẠY CẨN THẬN - Script này sẽ XÓA dữ liệu
-- Chỉ xóa các door_designs không có project_item_id và không có bom_items

-- Kiểm tra trước khi xóa
SELECT 
    'BƯỚC 4: Sẽ xóa các door_designs sau' as step,
    COUNT(*) as count_to_delete
FROM door_designs dd
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NULL
  AND bi.id IS NULL;

-- XÓA các door_designs không có project_item_id và không có bom_items
-- ⚠️ BỎ COMMENT DÒNG DƯỚI ĐỂ THỰC SỰ XÓA
/*
DELETE dd FROM door_designs dd
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NULL
  AND bi.id IS NULL;
*/

-- =====================================================
-- BƯỚC 5: CẬP NHẬT design_code CHO CÁC door_designs CÓ project_item_id
-- =====================================================
-- Đảm bảo design_code là unique bằng cách thêm project_item_id

-- Kiểm tra các door_designs có project_item_id nhưng design_code có thể trùng
SELECT 
    'BƯỚC 5: Door Designs có project_item_id nhưng design_code có thể trùng' as step,
    dd.id as door_design_id,
    dd.design_code,
    dd.project_item_id,
    pt.code as product_code,
    CASE 
        WHEN dd.design_code = pt.code THEN '⚠️ Có thể trùng - Nên cập nhật'
        ELSE '✅ OK'
    END as status
FROM door_designs dd
INNER JOIN project_items pi ON pi.id = dd.project_item_id
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NOT NULL
  AND dd.design_code = pt.code
ORDER BY dd.id;

-- Cập nhật design_code để đảm bảo unique
-- ⚠️ BỎ COMMENT DÒNG DƯỚI ĐỂ THỰC SỰ CẬP NHẬT
/*
UPDATE door_designs dd
INNER JOIN project_items pi ON pi.id = dd.project_item_id
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
SET dd.design_code = CONCAT(COALESCE(pt.code, 'DOOR'), '-', pi.id)
WHERE dd.project_id = @project_id
  AND dd.project_item_id IS NOT NULL
  AND dd.design_code = pt.code;
*/

-- =====================================================
-- BƯỚC 6: KIỂM TRA KẾT QUẢ
-- =====================================================

SELECT 
    'BƯỚC 6: Kết quả sau khi dọn dẹp' as step,
    COUNT(*) as total_door_designs,
    COUNT(CASE WHEN project_item_id IS NOT NULL THEN 1 END) as door_designs_with_project_item_id,
    COUNT(CASE WHEN project_item_id IS NULL THEN 1 END) as door_designs_without_project_item_id,
    COUNT(DISTINCT design_code) as unique_design_codes,
    COUNT(*) - COUNT(DISTINCT design_code) as duplicate_design_codes
FROM door_designs
WHERE project_id = @project_id;

-- =====================================================
-- KẾT THÚC
-- =====================================================
SELECT '✅ Hoàn thành kiểm tra door_designs' as result;











