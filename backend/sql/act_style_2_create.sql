-- =====================================================
-- FILE 2: TẠO BẢNG MỚI
-- Chạy file này SAU KHI chạy file xóa (act_style_1_drop.sql)
-- =====================================================

-- 1. project_items_v2
CREATE TABLE project_items_v2 (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  item_type ENUM('door','window','railing','glass_partition','glass_roof','stair') NOT NULL DEFAULT 'door',
  item_code VARCHAR(50) NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  source_type ENUM('quotation', 'catalog', 'manual') DEFAULT 'manual',
  source_quotation_id BIGINT NULL,
  source_quotation_item_id BIGINT NULL,
  status ENUM('draft','configured','structured','bom_generated','priced','locked') DEFAULT 'draft',
  current_version_id BIGINT NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project (project_id),
  INDEX idx_type (item_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. item_versions
CREATE TABLE item_versions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_item_id BIGINT NOT NULL,
  version_number INT NOT NULL DEFAULT 1,
  status ENUM('draft', 'confirmed', 'locked') DEFAULT 'draft',
  description VARCHAR(255) NULL,
  created_by VARCHAR(100) NULL,
  confirmed_at DATETIME NULL,
  confirmed_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_item_version (project_item_id, version_number),
  INDEX idx_item (project_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. item_config
CREATE TABLE item_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_version_id BIGINT NOT NULL,
  width_mm INT NULL,
  height_mm INT NULL,
  depth_mm INT NULL,
  length_mm INT NULL,
  slope_deg DECIMAL(5,2) NULL,
  leaf_count INT NULL,
  open_direction ENUM('left', 'right', 'both') NULL,
  open_style ENUM('swing_in', 'swing_out', 'sliding', 'fixed', 'tilt_turn') NULL,
  span_count INT NULL,
  post_spacing_mm INT NULL,
  handrail_height_mm INT NULL,
  rafter_count INT NULL,
  aluminum_system VARCHAR(50) NULL,
  default_glass_type VARCHAR(50) NULL,
  extra_params JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_version (item_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. item_structure_aluminum
CREATE TABLE item_structure_aluminum (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_version_id BIGINT NOT NULL,
  profile_code VARCHAR(50) NOT NULL,
  profile_name VARCHAR(255) NULL,
  position ENUM('frame_top','frame_bottom','frame_left','frame_right','sash_top','sash_bottom','sash_left','sash_right','mullion','transom','post','rail','handrail','infill_frame','rafter','purlin','ridge','other') NOT NULL,
  direction ENUM('horizontal', 'vertical', 'inclined') NOT NULL,
  length_formula VARCHAR(100) NULL,
  cut_angle VARCHAR(20) NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_version (item_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. item_structure_glass
CREATE TABLE item_structure_glass (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_version_id BIGINT NOT NULL,
  glass_type_code VARCHAR(50) NOT NULL,
  glass_type_name VARCHAR(255) NULL,
  position ENUM('sash', 'fixed', 'panel', 'roof', 'railing') NOT NULL,
  width_formula VARCHAR(100) NULL,
  height_formula VARCHAR(100) NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_version (item_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. item_structure_hardware
CREATE TABLE item_structure_hardware (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_version_id BIGINT NOT NULL,
  hardware_code VARCHAR(50) NOT NULL,
  hardware_name VARCHAR(255) NULL,
  quantity_formula VARCHAR(100) NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_version (item_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. item_structure_consumables
CREATE TABLE item_structure_consumables (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_version_id BIGINT NOT NULL,
  material_code VARCHAR(50) NOT NULL,
  material_name VARCHAR(255) NULL,
  unit ENUM('m', 'pcs', 'kg', 'tube', 'roll') DEFAULT 'm',
  quantity_formula VARCHAR(100) NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_version (item_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. item_bom_versions
CREATE TABLE item_bom_versions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_item_id BIGINT NOT NULL,
  source_item_version_id BIGINT NOT NULL,
  bom_version_number INT NOT NULL DEFAULT 1,
  status ENUM('draft', 'confirmed', 'exported') DEFAULT 'draft',
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  generated_by VARCHAR(100) NULL,
  confirmed_at DATETIME NULL,
  confirmed_by VARCHAR(100) NULL,
  total_aluminum_kg DECIMAL(12,3) NULL,
  total_glass_m2 DECIMAL(12,3) NULL,
  total_cost DECIMAL(15,2) NULL,
  UNIQUE KEY uk_item_bom (project_item_id, bom_version_number),
  INDEX idx_source (source_item_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. item_bom_lines
CREATE TABLE item_bom_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  bom_version_id BIGINT NOT NULL,
  material_group ENUM('aluminum', 'glass', 'hardware', 'consumable') NOT NULL,
  material_code VARCHAR(50) NOT NULL,
  material_name VARCHAR(255) NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  cut_length_mm INT NULL,
  cut_angle VARCHAR(20) NULL,
  weight_kg DECIMAL(10,3) NULL,
  width_mm INT NULL,
  height_mm INT NULL,
  area_m2 DECIMAL(10,6) NULL,
  position VARCHAR(50) NULL,
  source_structure_table VARCHAR(50) NULL,
  source_structure_id BIGINT NULL,
  unit_price DECIMAL(15,2) NULL,
  total_price DECIMAL(15,2) NULL,
  formula_used VARCHAR(255) NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bom (bom_version_id),
  INDEX idx_group (material_group),
  INDEX idx_material (material_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. item_type_rules
CREATE TABLE item_type_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_type ENUM('door', 'window', 'railing', 'glass_partition', 'glass_roof', 'stair') NOT NULL,
  rule_category ENUM('structure', 'bom', 'pricing') NOT NULL,
  rule_code VARCHAR(50) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  formula TEXT NULL,
  parameters JSON NULL,
  priority INT DEFAULT 0,
  is_active TINYINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  UNIQUE KEY uk_type_rule (item_type, rule_category, rule_code),
  INDEX idx_type (item_type, rule_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. item_type_system_rules
CREATE TABLE item_type_system_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_type ENUM('door', 'window', 'railing', 'glass_partition', 'glass_roof', 'stair') NOT NULL,
  aluminum_system VARCHAR(50) NOT NULL,
  rule_category ENUM('structure', 'bom', 'pricing') NOT NULL,
  rule_code VARCHAR(50) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  formula TEXT NULL,
  parameters JSON NULL,
  priority INT DEFAULT 10,
  is_active TINYINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  UNIQUE KEY uk_type_system_rule (item_type, aluminum_system, rule_category, rule_code),
  INDEX idx_type_system (item_type, aluminum_system, rule_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT '✅ Đã tạo 11 bảng ACT Style mới!' as result;
