-- ============================================
-- THÊM CỘT aluminum_system VÀO BẢNG aluminum_systems
-- Chạy trong phpMyAdmin
-- ============================================

-- Thêm cột aluminum_system
ALTER TABLE `aluminum_systems` 
ADD COLUMN `aluminum_system` VARCHAR(100) NULL COMMENT 'Hệ nhôm (VRA, VRE, Thủy lực, Mặt dựng...)' 
AFTER `code`;

-- Kiểm tra kết quả
DESCRIBE `aluminum_systems`;








