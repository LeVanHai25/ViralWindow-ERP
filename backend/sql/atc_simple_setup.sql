-- =====================================================
-- ATC SIMPLE SETUP - FIXED (BỎ QUA LỖI DUPLICATE)
-- Chạy từng phần một nếu cần
-- =====================================================

-- =====================================================
-- PHẦN 1: TẠO BẢNG MỚI
-- =====================================================

-- 1A. Bảng profile nhôm (sẽ DROP và tạo lại)
DROP TABLE IF EXISTS atc_aluminum_profiles;
CREATE TABLE atc_aluminum_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  aluminum_system VARCHAR(64) NOT NULL,
  role VARCHAR(64) NOT NULL,
  unit VARCHAR(10) DEFAULT 'm',
  price_per_m DECIMAL(12,2) DEFAULT 0,
  is_active TINYINT DEFAULT 1
);

-- 1B. Bảng loại kính
DROP TABLE IF EXISTS atc_glass_types;
CREATE TABLE atc_glass_types (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  thickness_mm INT NOT NULL,
  type VARCHAR(64) NOT NULL,
  price_per_m2 DECIMAL(12,2) DEFAULT 0,
  is_active TINYINT DEFAULT 1
);

-- 1C. Bảng BOM rules
DROP TABLE IF EXISTS atc_product_bom_profiles;
CREATE TABLE atc_product_bom_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_template_id BIGINT NOT NULL,
  profile_id BIGINT NOT NULL,
  formula VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  waste_percent DECIMAL(5,2) DEFAULT 2,
  sort_order INT DEFAULT 0
);

-- 1D. Bảng accessory rules
DROP TABLE IF EXISTS atc_product_accessory_rules;
CREATE TABLE atc_product_accessory_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_type VARCHAR(64) NOT NULL,
  accessory_id BIGINT NOT NULL,
  quantity_rule VARCHAR(64) NOT NULL,
  default_qty DECIMAL(10,2) DEFAULT 1,
  notes VARCHAR(255) NULL
);

-- =====================================================
-- PHẦN 2: THÊM DATA PROFILE NHÔM
-- =====================================================
INSERT INTO atc_aluminum_profiles (code, name, aluminum_system, role, price_per_m) VALUES
('XF55_KB_DUNG', 'Khung bao đứng XF55', 'XINGFA_55', 'frame_vertical', 185000),
('XF55_KB_NGANG', 'Khung bao ngang XF55', 'XINGFA_55', 'frame_horizontal', 185000),
('XF55_CD_DUNG', 'Cánh đứng XF55', 'XINGFA_55', 'leaf_vertical', 165000),
('XF55_CD_NGANG', 'Cánh ngang XF55', 'XINGFA_55', 'leaf_horizontal', 165000),
('XF55_MULLION', 'Đố giữa XF55', 'XINGFA_55', 'mullion', 175000),
('XF93_KB_DUNG', 'Khung bao đứng XF93', 'XINGFA_93', 'frame_vertical', 220000),
('XF93_KB_NGANG', 'Khung bao ngang XF93', 'XINGFA_93', 'frame_horizontal', 220000),
('XF93_CD_DUNG', 'Cánh đứng XF93', 'XINGFA_93', 'leaf_vertical', 200000),
('XF93_CD_NGANG', 'Cánh ngang XF93', 'XINGFA_93', 'leaf_horizontal', 200000),
('PMI_KB_DUNG', 'Khung bao đứng PMI', 'PMI', 'frame_vertical', 195000),
('PMI_KB_NGANG', 'Khung bao ngang PMI', 'PMI', 'frame_horizontal', 195000),
('PMI_CD_DUNG', 'Cánh đứng PMI', 'PMI', 'leaf_vertical', 175000),
('PMI_CD_NGANG', 'Cánh ngang PMI', 'PMI', 'leaf_horizontal', 175000);

-- =====================================================
-- PHẦN 3: THÊM DATA KÍNH
-- =====================================================
INSERT INTO atc_glass_types (code, name, thickness_mm, type, price_per_m2) VALUES
('TEMPERED_8', 'Kính cường lực 8mm', 8, 'tempered', 520000),
('TEMPERED_10', 'Kính cường lực 10mm', 10, 'tempered', 650000),
('TEMPERED_12', 'Kính cường lực 12mm', 12, 'tempered', 780000),
('CLEAR_5', 'Kính trắng 5mm', 5, 'clear', 180000),
('CLEAR_6', 'Kính trắng 6mm', 6, 'clear', 220000),
('LAMINATED_6_6', 'Kính dán 6+6', 12, 'laminated', 850000),
('LOW_E_8', 'Kính Low-E 8mm', 8, 'low_e', 720000);

-- =====================================================
-- KIỂM TRA DATA
-- =====================================================
SELECT 'Profiles:' as info, COUNT(*) as total FROM atc_aluminum_profiles;
SELECT 'Glass:' as info, COUNT(*) as total FROM atc_glass_types;

-- =====================================================
-- XONG PHẦN 1!
-- TIẾP TỤC CHẠY FILE: product_templates_and_bom.sql
-- =====================================================
