-- =====================================================
-- FIX MISSING aluminum_system_id
-- Sửa các project_items không có aluminum_system_id hợp lệ
-- =====================================================
-- ⚠️ LƯU Ý: Thay đổi project_id = 14 thành project_id của bạn nếu khác
-- =====================================================

SET @project_id = 14;  -- ⚠️ THAY ĐỔI NẾU CẦN

-- =====================================================
-- BƯỚC 1: KIỂM TRA CÁC project_items KHÔNG CÓ aluminum_system_id HỢP LỆ
-- =====================================================

SELECT 
    'BƯỚC 1: Project Items không có aluminum_system_id hợp lệ' as step,
    pi.id as project_item_id,
    pi.aluminum_system as current_aluminum_system,
    pt.code as product_code,
    pt.name as product_name,
    a.id as found_aluminum_system_id,
    a.code as found_aluminum_code,
    a.name as found_aluminum_name
FROM project_items pi
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
LEFT JOIN aluminum_systems a ON (
    a.code = pi.aluminum_system 
    OR a.id = CAST(pi.aluminum_system AS UNSIGNED)
    OR a.name = pi.aluminum_system
)
WHERE pi.project_id = @project_id
  AND pi.aluminum_system IS NOT NULL
  AND pi.aluminum_system != ''
  AND a.id IS NULL
ORDER BY pi.id;

-- =====================================================
-- BƯỚC 2: XEM TẤT CẢ aluminum_systems CÓ SẴN
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
-- BƯỚC 3: GỢI Ý SỬA (MANUAL)
-- =====================================================
-- ⚠️ Bạn cần tự sửa thủ công các project_items không có aluminum_system_id hợp lệ
-- Cách sửa:
-- 1. Xem kết quả BƯỚC 1 để biết project_items nào cần sửa
-- 2. Xem kết quả BƯỚC 2 để biết aluminum_systems nào có sẴN
-- 3. Cập nhật project_items.aluminum_system bằng code hoặc name từ aluminum_systems
-- 
-- Ví dụ:
-- UPDATE project_items 
-- SET aluminum_system = 'XINGFA-55'  -- Thay bằng code thực tế từ aluminum_systems
-- WHERE id = 123;  -- Thay bằng project_item_id thực tế

-- =====================================================
-- BƯỚC 4: TỰ ĐỘNG SỬA (NẾU CÓ THỂ MATCH THEO CODE HOẶC NAME)
-- =====================================================
-- ⚠️ Script này sẽ cố gắng match aluminum_system theo code hoặc name
-- Chỉ chạy nếu bạn chắc chắn muốn tự động sửa

-- Cập nhật aluminum_system từ snapshot_config nếu có
UPDATE project_items pi
SET aluminum_system = COALESCE(
    pi.aluminum_system,
    JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system')),
    JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system_code')),
    JSON_UNQUOTE(JSON_EXTRACT(pi.snapshot_config, '$.system'))
)
WHERE pi.project_id = @project_id
  AND pi.snapshot_config IS NOT NULL
  AND (pi.aluminum_system IS NULL OR pi.aluminum_system = '');

-- =====================================================
-- BƯỚC 5: KIỂM TRA KẾT QUẢ
-- =====================================================

SELECT 
    'BƯỚC 5: Kết quả sau khi sửa' as step,
    COUNT(*) as total_project_items,
    COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as items_with_valid_aluminum_system,
    COUNT(CASE WHEN a.id IS NULL AND pi.aluminum_system IS NOT NULL AND pi.aluminum_system != '' THEN 1 END) as items_with_invalid_aluminum_system,
    COUNT(CASE WHEN pi.aluminum_system IS NULL OR pi.aluminum_system = '' THEN 1 END) as items_without_aluminum_system
FROM project_items pi
LEFT JOIN aluminum_systems a ON (
    a.code = pi.aluminum_system 
    OR a.id = CAST(pi.aluminum_system AS UNSIGNED)
    OR a.name = pi.aluminum_system
)
WHERE pi.project_id = @project_id;

-- =====================================================
-- KẾT THÚC
-- =====================================================
SELECT '✅ Hoàn thành kiểm tra aluminum_system_id' as result;











