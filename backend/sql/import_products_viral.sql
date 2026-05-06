-- =====================================================
-- IMPORT SẢN PHẨM PHỤ KIỆN VÀ VẬT TƯ PHỤ VIRALWINDOW
-- Ngày tạo: 2025-12-18
-- =====================================================

-- Xóa dữ liệu cũ nếu cần (optional - comment out if you don't want to delete)
-- DELETE FROM accessories WHERE code LIKE 'VR%' OR code LIKE 'NG%' OR code LIKE 'J%' OR code LIKE 'L%';

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- =====================================================
-- PHẦN 1: PHỤ KIỆN
-- Danh mục: Khóa, Bản lề, Tay nắm, Phụ kiện lùa, Phụ kiện khác
-- =====================================================

-- 1.1 TAY NẮM
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('VR001', 'Tay nắm cửa sổ + lưỡi gà', 'Tay nắm', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR001-LG', 'Lưỡi gà', 'Tay nắm', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR003', 'Tay nắm cửa đi Galaxy', 'Tay nắm', 'Bộ', 0.00, 0.00, 0, 10, 1),
('VR013', 'Tay nắm cửa lùa 450', 'Tay nắm', 'Cái', 0.00, 0.00, 0, 10, 1);

-- 1.2 KHÓA
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('VR004', 'Thân khóa đa điểm Xingfa', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR005', 'Thân khóa đơn điểm Xingfa', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR006', 'Lõi khóa mở ngoài XF47/32', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR007', 'Lõi khóa mở trong 1 đầu chìa', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR012', 'Thân khóa móc đôi 120 (bao gồm miệng đón khóa)', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR018', 'Nắp lõi khóa cửa lùa', 'Khóa', 'Bộ', 0.00, 0.00, 0, 10, 1),
('VR019', 'Lõi khóa 30/30 (lõi cửa lùa 94)', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR020', 'Lõi khóa 37/37 (Lõi cửa lùa 120)', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1);

-- 1.3 BẢN LỀ
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('VR008', 'Bản lề chữ A mở hất/ mở quay 12 rãnh 22', 'Bản lề', 'Cặp', 0.00, 0.00, 0, 10, 1),
('VR010-L', 'Bản lề cửa đi xingfa bi đũa C-K (L)', 'Bản lề', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR010-R', 'Bản lề cửa đi xingfa bi đũa C-K (R)', 'Bản lề', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR011-L', 'Bản lề cửa đi xingfa bi đũa C-C (L)', 'Bản lề', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR011-R', 'Bản lề cửa đi xingfa bi đũa C-C (R)', 'Bản lề', 'Cái', 0.00, 0.00, 0, 10, 1);

-- 1.4 PHỤ KIỆN LÙA
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('VR009', 'Thanh chống sao', 'Phụ kiện lùa', 'Cặp', 0.00, 0.00, 0, 10, 1),
('VR014', 'Bánh xe 2 bánh hệ 120', 'Phụ kiện lùa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR014-CAO', 'Bánh xe cao 2 bánh - cao 24mm', 'Phụ kiện lùa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR027', 'Bánh xe chống rung (dẫn hướng cửa lùa)', 'Phụ kiện lùa', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR027-CD', 'Chống đập cửa Lùa', 'Phụ kiện lùa', 'Chiếc', 0.00, 0.00, 0, 10, 1);

-- 1.5 PHỤ KIỆN KHÁC (Bộ chuyển động, chốt)
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('VR015', 'Bộ chuyển động 5 thứ xingfa CỬA SỔ', 'Phụ kiện khác', 'Bộ', 0.00, 0.00, 0, 10, 1),
('VR016', 'Bộ chuyển động cửa đi 5 thứ châu âu', 'Phụ kiện khác', 'Bộ', 0.00, 0.00, 0, 10, 1),
('VR017', 'Bộ chuyển động 5 thứ cửa lùa', 'Phụ kiện khác', 'Bộ', 0.00, 0.00, 0, 10, 1),
('VR017-CP', 'Bộ chốt cánh phụ 3 thứ Xingfa', 'Phụ kiện khác', 'Bộ', 0.00, 0.00, 0, 10, 1),
('VR021', 'Bộ chốt cánh phụ 5 thứ châu Âu', 'Phụ kiện khác', 'Bộ', 0.00, 0.00, 0, 10, 1),
('VR022', 'Bộ chốt cánh phụ 5 thứ xingfa', 'Phụ kiện khác', 'Bộ', 0.00, 0.00, 0, 10, 1),
('VR023', 'Chốt âm đa điểm to', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR024', 'Chốt âm đa điểm nhỏ', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR025', 'Miệng đón khóa cửa đi 1 cánh', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 10, 1),
('VR026', 'Miệng đón khóa cửa đi 2 cánh', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 10, 1);

-- =====================================================
-- PHẦN 2: PHỤ KIỆN NGOÀI (CMECH, DAISHIN)
-- =====================================================

-- 2.1 CMECH
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('CM-CB', 'Chốt bật Cmech', 'Phụ kiện khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-BXD', 'Bánh xe đôi cmech', 'Phụ kiện lùa', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-CDCL', 'Chống đập cửa Lùa cmech', 'Phụ kiện lùa', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-VH', 'Vấu hãm thanh chuyển động cửa lùa Cmech', 'Phụ kiện lùa', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-DCC', 'Đầu chia chuyển động Cmech', 'Phụ kiện khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-DKB7', 'Đầu khóa biên cao 7mm', 'Phụ kiện khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-DBCL', 'Đầu biên cửa lùa cmech', 'Phụ kiện khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-DKBCL', 'Đầu khóa biên cửa lùa', 'Phụ kiện khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-TCDB', 'T chia chuyển động đầu biên', 'Phụ kiện khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-BL4D-B', 'Bản lề 4D Cmech màu bạc (010)', 'Bản lề', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-BL4D-D', 'Bản lề 4D Cmech màu đồng (012)', 'Bản lề', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-BLA', 'Bản lề A Cmech', 'Bản lề', 'Cái', 0.00, 0.00, 0, 10, 1),
('CM-BLC65', 'Bản lề cối Cmech hệ 65', 'Bản lề', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-CS', 'Chống sao Cmech', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 10, 1),
('CM-LK', 'Lõi khóa Cmech (0124)', 'Khóa', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('CM-TDD', 'Thân đơn điểm Cmech', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1),
('CM-TKD', 'Thân khóa đa điểm Cmech', 'Khóa', 'Cái', 0.00, 0.00, 0, 10, 1),
('CM-V2C', 'Vấu cửa 2 cánh', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 10, 1);

-- 2.2 DAISHIN
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('DS-BLCC', 'Bản Lề cửa Đi Daishin C - C', 'Bản lề', 'Cái', 0.00, 0.00, 0, 10, 1),
('DS-BLCK', 'Bản Lề cửa Đi Daishin C - K', 'Bản lề', 'Cái', 0.00, 0.00, 0, 10, 1),
('DS-BXCL', 'Bánh xe cửa lùa Daishin', 'Phụ kiện lùa', 'Cái', 0.00, 0.00, 0, 10, 1),
('DS-DH', 'Dẫn hướng cửa lùa Daishin', 'Phụ kiện lùa', 'Cái', 0.00, 0.00, 0, 10, 1),
('DS-BLA', 'Bản lề A quay/ hất daishin', 'Bản lề', 'Cái', 0.00, 0.00, 0, 10, 1),
('DS-BCD5', 'Bộ chuyển động 5 thứ Daishin (NHÔM) CỬA LÙA', 'Phụ kiện lùa', 'Chiếc', 0.00, 0.00, 0, 10, 1);

-- 2.3 KHÁC
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('PK-TCSL', 'Tay cửa lùa skyline', 'Tay nắm', 'Cặp', 0.00, 0.00, 0, 10, 1),
('PK-TNCTN', 'Tay nắm cửa trượt nâng', 'Tay nắm', 'Chiếc', 0.00, 0.00, 0, 10, 1);

-- =====================================================
-- PHẦN 3: VẬT TƯ PHỤ - KE
-- =====================================================

-- 3.1 KE TĂNG CỨNG
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('KE-TC8', 'Ke tăng cứng 8', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TC11', 'Ke tăng cứng 11', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TC12.5', 'Ke tăng cứng 12,5', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TC13', 'Ke tăng cứng 13', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TC14', 'Ke tăng cứng 14', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TC16', 'Ke tăng cứng viral 16', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TC22', 'Ke tăng cứng 22', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1);

-- 3.2 KE TOMAHUK
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('KE-TM14x22', 'Ke tomahuk 14 * 22', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM14x42', 'Ke tomahuk khung bao cửa sổ 14 * 42', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM14x50', 'Ke tomahuk 14 * 50', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM14x52', 'Ke tomahuk 14 * 52', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM20x31', 'Ke tomahuk 20 * 31', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM20x36', 'Ke tomahuk 20 * 36', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM25x14', 'Ke tomahuk 25 * 14', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM25x23', 'Ke tomahuk 25 * 23', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM25x40', 'Ke tomahuk 25 * 40', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM25x42', 'Ke tomahuk 25 * 42', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM25x43', 'Ke tomahuk 25 * 43', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM25x60', 'Ke tomahuk 25 * 60', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM31x42-CD', 'Ke tomahuk 31 * 42 cửa đi', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM36x42', 'Ke tomahuk 36 * 42 cánh cửa VRA 55', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM31x42-CS', 'Ke tomahuk 31 * 42 (cánh cửa sổ 55)', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM31x43', 'Ke tomahuk 31 * 43', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM31x60', 'Ke tomahuk 31 * 60', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM34x60', 'Ke tomahuk 34 * 60', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM36x60', 'Ke tomahuk 36 * 60', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-TM38x60', 'Ke tomahuk 38 * 60', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1);

-- 3.3 KE VĨNH CỬU
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('KE-VC14x20', 'Ke vĩnh cửu 14 * 20', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC14x23', 'Ke vĩnh cửu 14 * 23', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC14x30', 'Ke vĩnh cửu 14 * 30', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC14x40', 'Ke vĩnh cửu 14 * 40', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC14x43', 'Ke vĩnh cửu 14 * 43', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC14x51', 'Ke vĩnh cửu 14 * 51', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC17x21', 'Ke vĩnh cửu 17 * 21', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC25x23', 'Ke vĩnh cửu 25 * 23', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC25x30', 'Ke vĩnh cửu 25 * 30', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC25x40', 'Ke vĩnh cửu 25 * 40', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC31x40', 'Ke vĩnh cửu 31 * 40', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC31x42', 'Ke vĩnh cửu 31 * 42', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-VC32x60', 'Ke vĩnh cửu 32 * 60', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1);

-- 3.4 KE KHÁC
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('KE-CL12006', 'Ke cánh hệ lùa 12006 (31*42.3)', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1),
('KE-LDT', 'Ke L bắt đố T', 'Ke', 'Cái', 0.00, 0.00, 0, 50, 1);

-- =====================================================
-- PHẦN 4: VẬT TƯ PHỤ - GIOĂNG
-- =====================================================
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('GL-5x6', 'Gioăng Lông 5*6 màu ghi', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('GL-5x9', 'Gioăng Lông 5*9 màu ghi', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('GL-8x6', 'Gioăng Lông 8*6 màu ghi', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('GL-5x4-D', 'Gioăng Lông 5*4 màu đen', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('GL-5x7-D', 'Gioăng Lông 5*7 màu đen', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J01', 'Gioăng ống khung cánh XF55 J01', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J-CCCS', 'Gioăng chèn chân sập Châu Âu', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('NG-55C', 'Nối góc gioăng 55 rãnh C', 'Gioăng', 'Cái', 0.00, 0.00, 0, 50, 1),
('NG11', 'Gioang nối góc trung gian hệ 65 JJ011', 'Gioăng', 'Cái', 0.00, 0.00, 0, 50, 1),
('J02', 'Gioăng khung cánh C65D - PMI', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J04', 'Gioăng khung bịt rãnh C', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J10', 'Gioăng J10 (gioăng khung cách 65)', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J11', 'Gioăng trung gian C65 C55', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J12', 'Gioăng chống đập L94', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J15', 'Gioăng J15', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J-KCL94', 'Gioăng khung cửa lùa 94', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('J-DCC', 'Gioăng đầu cánh cửa lùa', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('L6', 'Gioăng chèn kính L6', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('L7', 'Gioăng chèn kính L7', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('L8', 'Gioăng chèn kính L8', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('L9', 'Gioăng chèn kính L9', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('L12', 'Gioăng L12 (gioăng chèn kính khe hở kính 9)', 'Gioăng', 'Cuộn', 0.00, 0.00, 0, 10, 1);

-- =====================================================
-- PHẦN 5: VẬT TƯ PHỤ - KEO
-- =====================================================
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('KEO-A500D', 'Keo Apolo A500 đen', 'Keo', 'Chai', 0.00, 0.00, 0, 10, 1),
('KEO-XAM', 'Keo màu xám', 'Keo', 'Chai', 0.00, 0.00, 0, 10, 1),
('KEO-A500TS', 'Keo trắng sữa a500', 'Keo', 'Chai', 0.00, 0.00, 0, 10, 1),
('KEO-A500TT', 'Keo trắng trong A500', 'Keo', 'Chai', 0.00, 0.00, 0, 10, 1),
('KEO-PU88', 'Keo PU 88', 'Keo', 'Chai', 0.00, 0.00, 0, 10, 1),
('KEO-XXKCC', 'Keo xúc xích Kcc', 'Keo', 'Cái', 0.00, 0.00, 0, 10, 1),
('KEO-SS621', 'Keo xúc xích SS621', 'Keo', 'Cái', 0.00, 0.00, 0, 10, 1);

-- =====================================================
-- PHẦN 6: VẬT TƯ PHỤ - NHỰA ỐP / BỊT
-- =====================================================
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
('NO-DDDXF-T', 'Bịt đầu đố động Xingfa Trái', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-DDDXF-P', 'Bịt đầu đố động Xingfa Phải', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-DDD65', 'Bịt đố động hệ 65', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-DDD65-2V', 'Bịt đố động hệ 65 2 vế', 'Nhựa ốp', 'Cặp', 0.00, 0.00, 0, 50, 1),
('NO-TDP', 'Bịt đố động trên dưới phải', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-TDT', 'Bịt đố động trên dưới Trái', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-HDK94', 'Bịt hèm đón khóa 94 (nhựa)', 'Nhựa ốp', 'Kg', 0.00, 0.00, 0, 10, 1),
('NO-OMRC', 'Bịt nhựa ốp móc rãnh C (1 cuộn 300m)', 'Nhựa ốp', 'Cuộn', 0.00, 0.00, 0, 5, 1),
('NO-OC-T', 'Bịt ốp chân (bịt đáy cửa đi) vế T', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-OC-P', 'Bịt ốp chân (bịt đáy cửa đi) vế P', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-OCC-P', 'Bịt ốp chân cánh Phải', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-OCC-T', 'Bịt ốp chân cánh trái', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-ODC65', 'Bịt ốp đáy cửa 65', 'Nhựa ốp', 'Cặp', 0.00, 0.00, 0, 50, 1),
('NO-OM94', 'Bịt ốp móc 94 (cây 3m)', 'Nhựa ốp', 'Cây', 0.00, 0.00, 0, 20, 1),
('NO-NCL93', 'Nhựa bịt cửa lùa 93 (trên dưới)', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),
('NO-BDKCL', 'Nhựa bịt đón khóa cửa lùa', 'Nhựa ốp', 'Cây', 0.00, 0.00, 0, 20, 1);

-- =====================================================
-- PHẦN 7: VẬT TƯ PHỤ - KHÁC
-- =====================================================
INSERT INTO `accessories` (`code`, `name`, `category`, `unit`, `purchase_price`, `sale_price`, `stock_quantity`, `min_stock_level`, `is_active`) VALUES
-- Áo / Trang phục
('VT-AK', 'Áo khoác công trình', 'Khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('VT-APL', 'Áo phông size L', 'Khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('VT-APXL', 'Áo phông size XL', 'Khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),
('VT-APXXL', 'Áo phông size XXL', 'Khác', 'Chiếc', 0.00, 0.00, 0, 10, 1),

-- Vật tư
('VT-BBH', 'Bìa bọc hàng', 'Khác', 'Tờ', 0.00, 0.00, 0, 100, 1),
('VT-BAC', 'Bộ ấm chén', 'Khác', 'Bộ', 0.00, 0.00, 0, 5, 1),
('VT-DHCL93', 'Dẫn hướng cửa lùa 93 Xingfa', 'Phụ kiện lùa', 'Cái', 0.00, 0.00, 0, 20, 1),
('VT-DH65', 'Dẫn hướng xingfa 65 (nhựa)', 'Phụ kiện lùa', 'Chiếc', 0.00, 0.00, 0, 20, 1),

-- Đầu biên
('DB-CCPCM', 'Đầu biên chốt cánh phụ Cmech', 'Khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('DB-CMD', 'Đầu biên Cmech đen', 'Khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('DB-DS', 'Đầu biên Daishin', 'Khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('DB-65B', 'Đầu biên hệ 65 nhôm bạc', 'Khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('DB-VR', 'Đầu biên Viral', 'Khác', 'Cái', 0.00, 0.00, 0, 50, 1),

-- Đệm chống xệ
('DCX-CN', 'Đệm chống xệ chữ nhật', 'Khác', 'Chiếc', 0.00, 0.00, 0, 100, 1),
('DCX-CM', 'Đệm chống xệ Cmech (Nhựa)', 'Khác', 'Cái', 0.00, 0.00, 0, 100, 1),
('DCX-65CM', 'Đệm chống xệ hệ 65 Cmech nhôm', 'Khác', 'Cái', 0.00, 0.00, 0, 100, 1),
('DCX-V', 'Đệm chống xệ vuông', 'Khác', 'Cái', 0.00, 0.00, 0, 100, 1),
('DCX-DH93', 'Đệm dẫn hướng trên cửa lùa 93', 'Khác', 'Cái', 0.00, 0.00, 0, 50, 1),

-- Lưỡi và Ray
('VT-LCM', 'Lưỡi chống muỗi', 'Khác', 'M2', 0.00, 0.00, 0, 100, 1),
('VT-RI', 'Ray inox', 'Phụ kiện lùa', 'Cây', 0.00, 0.00, 0, 20, 1),

-- Nắp bịt
('NB-HTN-CN', 'Nắp bịt hố thoát nước chữ nhật', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 100, 1),
('NB-HTN-T', 'Nắp Hố thoát nước tròn', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 100, 1),
('NB-LV', 'Nắp bịt lỗ vít', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 200, 1),

-- Nêm
('VT-NV', 'Nêm vát', 'Khác', 'Kg', 0.00, 0.00, 0, 20, 1),
('VT-NB5', 'Nêm bằng 5mm', 'Khác', 'Kg', 0.00, 0.00, 0, 20, 1),
('VT-NB3', 'Nêm bằng 3mm', 'Khác', 'Kg', 0.00, 0.00, 0, 20, 1),

-- Thanh chuyển động
('VT-TDD', 'T đa điểm (T chuyển động)', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('VT-TCD', 'Thanh chuyển động', 'Phụ kiện khác', 'Cây', 0.00, 0.00, 0, 20, 1),
('VT-TDCL93', 'Trên dưới cửa lùa 93', 'Nhựa ốp', 'Cái', 0.00, 0.00, 0, 50, 1),

-- Vấu
('VAU-1C-CM', 'Vấu 1 cánh Cmech', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('VAU-1C-KL', 'Vấu 1 cánh Kin Long', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('VAU-CD-DS', 'Vấu cửa đi Daishin/ VIRAL', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('VAU-CS-DS', 'Vấu cửa sổ Daishin/ Viral', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('VAU-CS-VR', 'Vấu cửa sổ Viral', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('VAU-2C-CM', 'Vấu hãm cửa 2 cánh Cmech', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('VAU-2C-KL', 'Vấu hãm cửa 2 cánh không logo', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),
('VAU-2C-KLG', 'Vấu hãm cửa 2 cánh Kinlong', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 50, 1),

-- Tem và Băng dính
('VT-TD', 'Tem dán', 'Khác', 'Cuộn', 0.00, 0.00, 0, 10, 1),
('VT-HC-D', 'Hố chốt đồng', 'Phụ kiện khác', 'Cái', 0.00, 0.00, 0, 100, 1),
('VT-BDG', 'Băng dính giấy', 'Khác', 'Cuộn', 0.00, 0.00, 0, 20, 1),

-- Chốt
('VT-CCPDV', 'Chốt cánh phụ đen vuông', 'Phụ kiện khác', 'Chiếc', 0.00, 0.00, 0, 50, 1),
('VT-DCCP', 'Đệm chốt cách phụ', 'Khác', 'Chiếc', 0.00, 0.00, 0, 100, 1),

-- Vít
('VT-VRTNCL', 'Vít rút tay nắm cửa lùa', 'Khác', 'Cái', 0.00, 0.00, 0, 200, 1);

-- =====================================================
-- THỐNG KÊ
-- =====================================================
-- Tổng số sản phẩm đã import:
-- - Phụ kiện Viralwindow: ~30 items
-- - Phụ kiện Cmech/Daishin: ~25 items  
-- - Ke: ~42 items
-- - Gioăng: ~22 items
-- - Keo: 7 items
-- - Nhựa ốp: ~20 items
-- - Vật tư phụ khác: ~40 items
-- TỔNG: ~186 items

SELECT 'Import completed!' AS message, COUNT(*) AS total_new_products 
FROM accessories 
WHERE code LIKE 'VR%' 
   OR code LIKE 'CM%' 
   OR code LIKE 'DS%' 
   OR code LIKE 'KE%' 
   OR code LIKE 'GL%' 
   OR code LIKE 'J%' 
   OR code LIKE 'L%' 
   OR code LIKE 'KEO%' 
   OR code LIKE 'NO%' 
   OR code LIKE 'VT%'
   OR code LIKE 'DB%'
   OR code LIKE 'DCX%'
   OR code LIKE 'NB%'
   OR code LIKE 'VAU%'
   OR code LIKE 'NG%'
   OR code LIKE 'PK%';
