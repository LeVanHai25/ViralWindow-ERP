-- =====================================================
-- FILE 1: XÓA BẢNG CŨ
-- Chạy file này TRƯỚC KHI chạy file tạo mới
-- QUAN TRỌNG: BỎ TICK "Bật kiểm tra khóa ngoại" trong phpMyAdmin!
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS item_bom_lines;
DROP TABLE IF EXISTS item_bom_versions;
DROP TABLE IF EXISTS item_structure_consumables;
DROP TABLE IF EXISTS item_structure_hardware;
DROP TABLE IF EXISTS item_structure_glass;
DROP TABLE IF EXISTS item_structure_aluminum;
DROP TABLE IF EXISTS item_config;
DROP TABLE IF EXISTS item_versions;
DROP TABLE IF EXISTS item_type_system_rules;
DROP TABLE IF EXISTS item_type_rules;
DROP TABLE IF EXISTS project_items_v2;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ Đã xóa tất cả bảng ACT Style cũ!' as result;
