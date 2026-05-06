-- ============================================
-- SQL Script: Reset Danh mục Sản phẩm
-- Xóa toàn bộ dữ liệu cũ và thêm danh mục mới
-- Ngày tạo: 2025-12-23
-- ============================================

-- BƯỚC 1: XÓA DỮ LIỆU CŨ
-- ============================================
-- Lưu ý: Tắt foreign key check tạm thời

SET FOREIGN_KEY_CHECKS = 0;

-- Xóa BOM rules liên quan (nếu có) - SKIP nếu bảng không tồn tại
-- DELETE FROM bom_rules WHERE product_template_id IS NOT NULL;

-- Xóa product_templates cũ
DELETE FROM product_templates;

-- Reset AUTO_INCREMENT
ALTER TABLE product_templates AUTO_INCREMENT = 1;

-- ============================================
-- BƯỚC 2: THÊM DANH MỤC SẢN PHẨM MỚI
-- ============================================

-- =========================================
-- 1) CỬA ĐI (DOOR)
-- =========================================

-- A. Cửa đi mở quay
INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('DOOR_SWING_1C', 'Cửa đi mở quay 1 cánh', 'door', 'door_swing', 'swing', 'door_swing_single', 'XINGFA_55', 1000, 2200, 1),
('DOOR_SWING_2C', 'Cửa đi mở quay 2 cánh', 'door', 'door_swing', 'swing', 'door_swing_double', 'XINGFA_55', 1800, 2200, 2),
('DOOR_SWING_4C', 'Cửa đi mở quay 4 cánh', 'door', 'door_swing', 'swing', 'door_swing_quad', 'XINGFA_55', 3600, 2200, 3),
('DOOR_SWING_1C_VACH', 'Cửa đi mở quay 1 cánh + vách liền', 'door', 'door_swing', 'swing', 'door_swing_sidelight', 'XINGFA_55', 1500, 2200, 4),
('DOOR_SWING_2C_VACH', 'Cửa đi mở quay 2 cánh + vách liền', 'door', 'door_swing', 'swing', 'door_swing_sidelight', 'XINGFA_55', 2400, 2200, 5),
('DOOR_SWING_4C_VACH', 'Cửa đi mở quay 4 cánh + vách liền', 'door', 'door_swing', 'swing', 'door_swing_sidelight', 'XINGFA_55', 4200, 2200, 6),
('DOOR_SWING_1C_FIX_TREN', 'Cửa đi mở quay 1 cánh + fix trên', 'door', 'door_swing', 'swing', 'door_swing_transom', 'XINGFA_55', 1000, 2700, 7),
('DOOR_SWING_2C_FIX_TREN', 'Cửa đi mở quay 2 cánh + fix trên', 'door', 'door_swing', 'swing', 'door_swing_transom', 'XINGFA_55', 1800, 2700, 8),
('DOOR_SWING_4C_FIX_TREN', 'Cửa đi mở quay 4 cánh + fix trên', 'door', 'door_swing', 'swing', 'door_swing_transom', 'XINGFA_55', 3600, 2700, 9),
('DOOR_SWING_2C_FIX_VACH', 'Cửa đi mở quay 2 cánh + fix trên + vách liền', 'door', 'door_swing', 'swing', 'door_swing_combo', 'XINGFA_55', 2400, 2700, 10),
('DOOR_SWING_4C_FIX_VACH', 'Cửa đi mở quay 4 cánh + fix trên + vách liền', 'door', 'door_swing', 'swing', 'door_swing_combo', 'XINGFA_55', 4200, 2700, 11);

-- B. Cửa đi lùa / trượt
INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('DOOR_SLIDE_2C', 'Cửa đi lùa 2 cánh', 'door', 'door_slide', 'slide', 'door_slide_double', 'XINGFA_93', 2000, 2200, 20),
('DOOR_SLIDE_3C', 'Cửa đi lùa 3 cánh', 'door', 'door_slide', 'slide', 'door_slide_triple', 'XINGFA_93', 3000, 2200, 21),
('DOOR_SLIDE_4C', 'Cửa đi lùa 4 cánh', 'door', 'door_slide', 'slide', 'door_slide_quad', 'XINGFA_93', 4000, 2200, 22),
('DOOR_SLIDE_6C', 'Cửa đi lùa 6 cánh', 'door', 'door_slide', 'slide', 'door_slide_six', 'XINGFA_93', 6000, 2200, 23),
('DOOR_SLIDE_2C_FIX', 'Cửa đi lùa 2 cánh + fix', 'door', 'door_slide', 'slide', 'door_slide_fix', 'XINGFA_93', 3000, 2200, 24),
('DOOR_SLIDE_4C_FIX', 'Cửa đi lùa 4 cánh + fix', 'door', 'door_slide', 'slide', 'door_slide_fix', 'XINGFA_93', 5000, 2200, 25),
('DOOR_SLIDE_CHIA_O', 'Cửa đi lùa có chia đố (chia ô)', 'door', 'door_slide', 'slide', 'door_slide_divided', 'XINGFA_93', 2000, 2200, 26);

-- C. Cửa xếp trượt (folding)
INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('DOOR_FOLD_3C', 'Cửa xếp trượt 3 cánh', 'door', 'door_fold', 'folding', 'door_fold', 'XINGFA_55', 2700, 2200, 30),
('DOOR_FOLD_4C', 'Cửa xếp trượt 4 cánh', 'door', 'door_fold', 'folding', 'door_fold', 'XINGFA_55', 3600, 2200, 31),
('DOOR_FOLD_6C', 'Cửa xếp trượt 6 cánh', 'door', 'door_fold', 'folding', 'door_fold', 'XINGFA_55', 5400, 2200, 32),
('DOOR_FOLD_FIX', 'Cửa xếp trượt có fix/vách', 'door', 'door_fold', 'folding', 'door_fold_fix', 'XINGFA_55', 4000, 2200, 33);

-- D. Mẫu đặc biệt
INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('DOOR_MBC', 'Cửa đi mẹ bồng con', 'door', 'door_special', 'swing', 'door_special', 'XINGFA_55', 1500, 2200, 40),
('DOOR_VOM', 'Cửa đi vòm / bán nguyệt', 'door', 'door_special', 'swing', 'door_special', 'XINGFA_55', 1200, 2500, 41),
('DOOR_CHIA_O', 'Cửa đi chia nhiều đố / nhiều ô', 'door', 'door_special', 'swing', 'door_special', 'XINGFA_55', 1200, 2200, 42),
('DOOR_PANO', 'Cửa đi pano (kính + pano nhôm)', 'door', 'door_special', 'swing', 'door_pano', 'XINGFA_55', 1000, 2200, 43);

-- =========================================
-- 2) CỬA SỔ (WINDOW)
-- =========================================

-- A. Cửa sổ mở hất
INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('WIN_TILT_1C', 'Cửa sổ mở hất 1 cánh', 'window', 'window_tilt', 'tilt', 'window_tilt', 'XINGFA_55', 600, 800, 50),
('WIN_TILT_2C', 'Cửa sổ mở hất 2 cánh', 'window', 'window_tilt', 'tilt', 'window_tilt', 'XINGFA_55', 1200, 800, 51),
('WIN_TILT_1C_FIX', 'Cửa sổ mở hất 1 cánh + fix', 'window', 'window_tilt', 'tilt', 'window_tilt_fix', 'XINGFA_55', 1200, 1200, 52),
('WIN_TILT_2C_FIX', 'Cửa sổ mở hất 2 cánh + fix', 'window', 'window_tilt', 'tilt', 'window_tilt_fix', 'XINGFA_55', 1800, 1200, 53),
('WIN_TILT_CHIA_O', 'Cửa sổ mở hất chia đố', 'window', 'window_tilt', 'tilt', 'window_tilt_divided', 'XINGFA_55', 1200, 1200, 54);

-- B. Cửa sổ mở quay
INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('WIN_SWING_1C', 'Cửa sổ mở quay 1 cánh', 'window', 'window_swing', 'swing', 'window_swing', 'XINGFA_55', 600, 1200, 60),
('WIN_SWING_2C', 'Cửa sổ mở quay 2 cánh', 'window', 'window_swing', 'swing', 'window_swing', 'XINGFA_55', 1200, 1200, 61),
('WIN_SWING_FIX', 'Cửa sổ mở quay 1/2 cánh + fix', 'window', 'window_swing', 'swing', 'window_swing_fix', 'XINGFA_55', 1500, 1200, 62),
('WIN_SWING_CHIA_O', 'Cửa sổ mở quay chia đố', 'window', 'window_swing', 'swing', 'window_swing_divided', 'XINGFA_55', 1200, 1200, 63);

-- C. Cửa sổ lùa
INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('WIN_SLIDE_2C', 'Cửa sổ lùa 2 cánh', 'window', 'window_slide', 'slide', 'window_slide', 'XINGFA_93', 1200, 1200, 70),
('WIN_SLIDE_3C', 'Cửa sổ lùa 3 cánh', 'window', 'window_slide', 'slide', 'window_slide', 'XINGFA_93', 1800, 1200, 71),
('WIN_SLIDE_4C', 'Cửa sổ lùa 4 cánh', 'window', 'window_slide', 'slide', 'window_slide', 'XINGFA_93', 2400, 1200, 72),
('WIN_SLIDE_FIX', 'Cửa sổ lùa có fix', 'window', 'window_slide', 'slide', 'window_slide_fix', 'XINGFA_93', 1800, 1200, 73),
('WIN_SLIDE_CHIA_O', 'Cửa sổ lùa chia đố', 'window', 'window_slide', 'slide', 'window_slide_divided', 'XINGFA_93', 1200, 1200, 74);

-- D. Cửa sổ đặc biệt
INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('WIN_VOM', 'Cửa sổ vòm', 'window', 'window_special', 'fixed', 'window_special', 'XINGFA_55', 800, 1000, 80),
('WIN_CHIA_O', 'Cửa sổ nhiều ô / chia đố phức tạp', 'window', 'window_special', 'fixed', 'window_special', 'XINGFA_55', 1200, 1200, 81);

-- =========================================
-- 3) VÁCH / FIX (PARTITION / FIXED)
-- =========================================

INSERT INTO product_templates (code, name, product_type, category, sub_type, family, aluminum_system, default_width_mm, default_height_mm, display_order) VALUES
('FIX_1O', 'Vách kính cố định 1 ô', 'glass_wall', 'glass_wall', 'fixed', 'fix_single', 'XINGFA_55', 800, 2200, 90),
('FIX_2O', 'Vách cố định 2 ô', 'glass_wall', 'glass_wall', 'fixed', 'fix_double', 'XINGFA_55', 1600, 2200, 91),
('FIX_MULTI', 'Vách cố định nhiều ô', 'glass_wall', 'glass_wall', 'fixed', 'fix_multi', 'XINGFA_55', 2400, 2200, 92),
('FIX_CHIA_NGANG', 'Vách chia đố ngang', 'glass_wall', 'glass_wall', 'fixed', 'fix_horizontal', 'XINGFA_55', 1200, 2200, 93),
('FIX_CHIA_DOC', 'Vách chia đố dọc', 'glass_wall', 'glass_wall', 'fixed', 'fix_vertical', 'XINGFA_55', 1200, 2200, 94),
('FIX_CARO', 'Vách chia đố caro', 'glass_wall', 'glass_wall', 'fixed', 'fix_caro', 'XINGFA_55', 1600, 2200, 95),
('FIX_TOP', 'Fix trên (ô fix phía trên cửa)', 'glass_wall', 'glass_wall', 'fixed', 'fix_transom', 'XINGFA_55', 1200, 500, 96),
('FIX_SIDE', 'Fix bên (ô fix bên trái/phải)', 'glass_wall', 'glass_wall', 'fixed', 'fix_sidelight', 'XINGFA_55', 400, 2200, 97),
('DOOR_VACH_COMBO', 'Cửa + vách liền (combo)', 'glass_wall', 'glass_wall', 'combo', 'door_sidelight', 'XINGFA_55', 2000, 2200, 98);

-- Bật lại foreign key check
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- BƯỚC 3: KIỂM TRA KẾT QUẢ
-- ============================================

-- Đếm tổng số sản phẩm mới
SELECT 'Tổng số sản phẩm:' AS info, COUNT(*) AS count FROM product_templates;

-- Đếm theo product_type
SELECT product_type, COUNT(*) AS count 
FROM product_templates 
GROUP BY product_type 
ORDER BY product_type;

-- Đếm theo category
SELECT category, COUNT(*) AS count 
FROM product_templates 
GROUP BY category 
ORDER BY category;

-- Danh sách chi tiết
SELECT id, code, name, product_type, category, sub_type 
FROM product_templates 
ORDER BY display_order;
