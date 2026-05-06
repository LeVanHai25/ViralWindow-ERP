-- =====================================================
-- ACT STYLE DEPRECATION SCRIPT
-- Chạy sau khi đã xác nhận hệ thống mới hoạt động ổn định
-- =====================================================

-- ⚠️ CẢNH BÁO: Script này sẽ RENAME các bảng cũ
-- Bước 1: Backup trước khi chạy
-- Bước 2: Rename (không xóa) để có thể rollback
-- Bước 3: Sau 30 ngày, nếu không có vấn đề, mới DROP

-- =====================================================
-- BƯỚC 1: BACKUP (chạy bằng mysqldump trước)
-- =====================================================
-- mysqldump -u root viral_window_db door_designs project_items > backup_old_tables.sql

-- =====================================================
-- BƯỚC 2: RENAME BẢNG CŨ (có thể rollback)
-- =====================================================

-- Rename door_designs -> _deprecated_door_designs
-- RENAME TABLE door_designs TO _deprecated_door_designs;

-- Rename project_items cũ -> _deprecated_project_items
-- RENAME TABLE project_items TO _deprecated_project_items;

-- =====================================================
-- BƯỚC 3: TẠO VIEW CHO BACKWARD COMPATIBILITY
-- =====================================================

-- View door_designs trỏ về project_items_v2 (cho code cũ)
CREATE OR REPLACE VIEW door_designs_compat AS
SELECT 
    pi.id,
    pi.project_id,
    pi.item_code as design_code,
    ic.width_mm,
    ic.height_mm,
    ic.leaf_count as number_of_panels,
    ic.open_style as door_type,
    ic.aluminum_system as aluminum_system_code,
    pi.status,
    pi.created_at,
    pi.updated_at
FROM project_items_v2 pi
LEFT JOIN item_versions iv ON iv.id = pi.current_version_id
LEFT JOIN item_config ic ON ic.item_version_id = iv.id
WHERE pi.item_type IN ('door', 'window');

-- =====================================================
-- BƯỚC 4: XÓA BẢNG CŨ (sau 30 ngày)
-- =====================================================

-- DROP TABLE IF EXISTS _deprecated_door_designs;
-- DROP TABLE IF EXISTS _deprecated_project_items;

-- =====================================================
-- ROLLBACK (nếu cần)
-- =====================================================
-- RENAME TABLE _deprecated_door_designs TO door_designs;
-- RENAME TABLE _deprecated_project_items TO project_items;

SELECT '✅ Deprecation script sẵn sàng. Uncomment từng bước khi cần chạy.' as result;
