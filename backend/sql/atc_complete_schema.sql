-- =====================================================
-- ATC STYLE COMPLETE DATABASE SCHEMA - SAFE VERSION
-- Tạo bảng mới với prefix atc_ để tránh conflict
-- =====================================================

-- =====================================================
-- 1. atc_aluminum_profiles (profile nhôm + giá)
-- =====================================================
DROP TABLE IF EXISTS atc_aluminum_profiles;
CREATE TABLE atc_aluminum_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  aluminum_system VARCHAR(64) NOT NULL,
  role VARCHAR(64) NOT NULL,
  unit VARCHAR(10) DEFAULT 'm',
  price_per_m DECIMAL(12,2) DEFAULT 0,
  weight_per_m DECIMAL(8,4) NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_profile_code (code),
  INDEX idx_aluminum_system (aluminum_system),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 2. atc_glass_types (loại kính + giá)
-- =====================================================
DROP TABLE IF EXISTS atc_glass_types;
CREATE TABLE atc_glass_types (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  thickness_mm INT NOT NULL,
  type VARCHAR(64) NOT NULL,
  price_per_m2 DECIMAL(12,2) DEFAULT 0,
  is_active TINYINT DEFAULT 1,
  
  UNIQUE KEY uk_glass_code (code),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 3. atc_product_bom_profiles (mapping template → profile)
-- =====================================================
DROP TABLE IF EXISTS atc_product_bom_profiles;
CREATE TABLE atc_product_bom_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_template_id BIGINT NOT NULL,
  profile_id BIGINT NOT NULL,
  formula VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  waste_percent DECIMAL(5,2) DEFAULT 2,
  notes VARCHAR(255) NULL,
  sort_order INT DEFAULT 0,
  
  INDEX idx_template (product_template_id),
  INDEX idx_profile (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 4. atc_product_accessory_rules
-- =====================================================
DROP TABLE IF EXISTS atc_product_accessory_rules;
CREATE TABLE atc_product_accessory_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_type VARCHAR(64) NOT NULL,
  accessory_id BIGINT NOT NULL,
  quantity_rule VARCHAR(64) NOT NULL,
  default_qty DECIMAL(10,2) DEFAULT 1,
  notes VARCHAR(255) NULL,
  
  INDEX idx_product_type (product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 5. ALTER project_items - thêm cột status và calc_cache
-- =====================================================
-- Kiểm tra bảng project_items tồn tại
SET @table_exists := (SELECT COUNT(*) FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_items');

-- Nếu tồn tại, thêm các cột cần thiết
-- Dùng procedure để tránh lỗi
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS add_columns_to_project_items()
BEGIN
  -- status
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_items' AND COLUMN_NAME = 'status') THEN
    ALTER TABLE project_items ADD COLUMN status VARCHAR(32) DEFAULT 'DESIGNING';
  END IF;
  
  -- source_quotation_id
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_items' AND COLUMN_NAME = 'source_quotation_id') THEN
    ALTER TABLE project_items ADD COLUMN source_quotation_id BIGINT NULL;
  END IF;

  -- calc_cache
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_items' AND COLUMN_NAME = 'calc_cache') THEN
    ALTER TABLE project_items ADD COLUMN calc_cache JSON NULL;
  END IF;

  -- name
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_items' AND COLUMN_NAME = 'name') THEN
    ALTER TABLE project_items ADD COLUMN name VARCHAR(255) NULL;
  END IF;
END //
DELIMITER ;

CALL add_columns_to_project_items();
DROP PROCEDURE IF EXISTS add_columns_to_project_items;

-- =====================================================
-- INSERT SAMPLE DATA
-- =====================================================

-- Sample Aluminum Profiles
INSERT INTO atc_aluminum_profiles (code, name, aluminum_system, role, price_per_m) VALUES
('XF55_KB_DUNG', 'Khung bao đứng XF55', 'XINGFA_55', 'frame_vertical', 185000),
('XF55_KB_NGANG', 'Khung bao ngang XF55', 'XINGFA_55', 'frame_horizontal', 185000),
('XF55_CD_DUNG', 'Cánh đứng XF55', 'XINGFA_55', 'leaf_vertical', 165000),
('XF55_CD_NGANG', 'Cánh ngang XF55', 'XINGFA_55', 'leaf_horizontal', 165000),
('XF55_MULLION', 'Đố giữa XF55', 'XINGFA_55', 'mullion', 175000),
('XF93_KB_DUNG', 'Khung bao đứng XF93', 'XINGFA_93', 'frame_vertical', 220000),
('XF93_KB_NGANG', 'Khung bao ngang XF93', 'XINGFA_93', 'frame_horizontal', 220000),
('XF93_CD_DUNG', 'Cánh đứng XF93', 'XINGFA_93', 'leaf_vertical', 200000),
('XF93_CD_NGANG', 'Cánh ngang XF93', 'XINGFA_93', 'leaf_horizontal', 200000);

-- Sample Glass Types
INSERT INTO atc_glass_types (code, name, thickness_mm, type, price_per_m2) VALUES
('TEMPERED_8', 'Kính cường lực 8mm', 8, 'tempered', 520000),
('TEMPERED_10', 'Kính cường lực 10mm', 10, 'tempered', 650000),
('TEMPERED_12', 'Kính cường lực 12mm', 12, 'tempered', 780000),
('CLEAR_5', 'Kính trắng 5mm', 5, 'clear', 180000),
('CLEAR_6', 'Kính trắng 6mm', 6, 'clear', 220000),
('LAMINATED_6_6', 'Kính dán 6+6', 12, 'laminated', 850000),
('LOW_E_8', 'Kính Low-E 8mm', 8, 'low_e', 720000);

-- =====================================================
SELECT 'ATC Schema created successfully!' as result;
-- =====================================================
