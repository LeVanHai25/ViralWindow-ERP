-- =====================================================
-- FIX PROJECT ITEMS MISSING aluminum_system
-- Sửa các project_items thiếu aluminum_system cho project_id = 14
-- =====================================================
-- ⚠️ LƯU Ý: Thay đổi project_id = 14 thành project_id của bạn nếu khác
-- =====================================================

SET @project_id = 14;  -- ⚠️ THAY ĐỔI NẾU CẦN

-- =====================================================
-- BƯỚC 1: KIỂM TRA CÁC project_items THIẾU aluminum_system
-- =====================================================

SELECT 
    'BƯỚC 1: Project Items thiếu aluminum_system' as step,
    pi.id as project_item_id,
    pt.code as product_code,
    pt.name as product_name,
    pi.aluminum_system as current_aluminum_system,
    pi.snapshot_config
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
WHERE pi.project_id = @project_id
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '')
ORDER BY pi.id;

-- =====================================================
-- BƯỚC 2: XEM DANH SÁCH aluminum_systems CÓ SẴN
-- =====================================================

SELECT 
    'BƯỚC 2: Danh sách aluminum_systems có sẵn' as step,
    id,
    code,
    name,
    brand
FROM aluminum_systems
WHERE is_active = 1
ORDER BY code, name;

-- =====================================================
-- BƯỚC 3: EXTRACT aluminum_system TỪ snapshot_config (NẾU CÓ)
-- =====================================================

-- Kiểm tra xem snapshot_config có chứa aluminum_system không
SELECT 
    'BƯỚC 3: Kiểm tra aluminum_system trong snapshot_config' as step,
    pi.id as project_item_id,
    pt.code as product_code,
    JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system') as snapshot_aluminum_system,
    JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system_code') as snapshot_aluminum_system_code,
    JSON_EXTRACT(pi.snapshot_config, '$.system') as snapshot_system
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
WHERE pi.project_id = @project_id
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '')
  AND pi.snapshot_config IS NOT NULL
ORDER BY pi.id;

-- =====================================================
-- BƯỚC 4: TỰ ĐỘNG EXTRACT VÀ CẬP NHẬT aluminum_system
-- =====================================================
-- ⚠️ CHẠY CẨN THẬN - Script này sẽ UPDATE dữ liệu

-- Cập nhật aluminum_system từ snapshot_config nếu có
UPDATE project_items pi
SET aluminum_system = COALESCE(
    pi.aluminum_system,
    JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system')),
    JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system_code')),
    JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.system'))
)
WHERE pi.project_id = @project_id
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '')
  AND pi.snapshot_config IS NOT NULL;

-- =====================================================
-- BƯỚC 5: CẬP NHẬT aluminum_system TỪ door_designs (NẾU CÓ)
-- =====================================================
-- Nếu project_item đã có door_designs với aluminum_system_id,
-- có thể lấy aluminum_system từ đó

UPDATE project_items pi
INNER JOIN door_designs dd ON dd.project_item_id = pi.id
INNER JOIN aluminum_systems a ON a.id = dd.aluminum_system_id
SET pi.aluminum_system = a.code
WHERE pi.project_id = @project_id
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '')
  AND dd.aluminum_system_id IS NOT NULL;

-- =====================================================
-- BƯỚC 6: CẬP NHẬT aluminum_system TỪ product_templates (NẾU CÓ)
-- =====================================================
-- ⚠️ ĐÃ COMMENT - Cột default_aluminum_system không tồn tại trong product_templates
-- Nếu product_template có aluminum_system mặc định trong tương lai, có thể bỏ comment phần này

/*
UPDATE project_items pi
INNER JOIN product_templates pt ON pt.id = pi.product_template_id
SET pi.aluminum_system = pt.default_aluminum_system
WHERE pi.project_id = @project_id
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '')
  AND pt.default_aluminum_system IS NOT NULL
  AND pt.default_aluminum_system != '';
*/

-- =====================================================
-- BƯỚC 7: KIỂM TRA KẾT QUẢ
-- =====================================================

SELECT 
    'BƯỚC 7: Kết quả sau khi sửa' as step,
    COUNT(*) as total_project_items,
    COUNT(CASE WHEN aluminum_system IS NOT NULL AND aluminum_system != '' THEN 1 END) as items_with_aluminum_system,
    COUNT(CASE WHEN aluminum_system IS NULL OR aluminum_system = '' THEN 1 END) as items_still_missing_aluminum_system
FROM project_items
WHERE project_id = @project_id;

-- Chi tiết các project_items vẫn thiếu aluminum_system (nếu có)
SELECT 
    'Chi tiết project_items vẫn thiếu aluminum_system' as note,
    pi.id as project_item_id,
    pt.code as product_code,
    pt.name as product_name,
    pi.aluminum_system,
    '⚠️ Cần cập nhật thủ công' as action_required
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
WHERE pi.project_id = @project_id
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '')
ORDER BY pi.id;

-- =====================================================
-- BƯỚC 8: HƯỚNG DẪN CẬP NHẬT THỦ CÔNG (NẾU CẦN)
-- =====================================================
-- Nếu vẫn còn project_items thiếu aluminum_system,
-- bạn cần cập nhật thủ công bằng cách:

-- 1. Xem danh sách aluminum_systems có sẵn (BƯỚC 2)
-- 2. Cập nhật project_items với code từ aluminum_systems
-- 
-- Ví dụ:
-- UPDATE project_items 
-- SET aluminum_system = 'XINGFA-55'  -- Thay bằng code thực tế
-- WHERE id = 11;  -- Thay bằng project_item_id thực tế

-- =====================================================
-- KẾT THÚC
-- =====================================================
SELECT '✅ Hoàn thành sửa aluminum_system cho project_items' as result;

