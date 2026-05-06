-- =====================================================
-- DESIGN WORKFLOW DATABASE SCHEMA
-- Version: 2.0 (Senior Reviewed)
-- Author: ViralWindow Development Team
-- Date: 2026-01-16
-- =====================================================

-- =====================================================
-- 1. DESIGN REVISIONS - Core entity với State Machine
-- =====================================================
CREATE TABLE IF NOT EXISTS design_revisions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    revision_no INT DEFAULT 1,
    
    -- State Machine
    status ENUM('received', 'editing', 'locked', 'bom_created', 'pr_created') DEFAULT 'received',
    
    -- ✅ Revision tracking (Senior feedback #2.1)
    is_active BOOLEAN DEFAULT TRUE,           -- Chỉ 1 revision active cho 1 project
    parent_revision_id INT NULL,              -- Revision tạo từ bản chốt nào
    locked_hash VARCHAR(64) NULL,             -- SHA256 checksum của units/specs để chống sửa lén
    
    -- Nhận từ khách
    received_by INT,
    received_at DATETIME,
    received_channel ENUM('email', 'zalo', 'direct', 'other') DEFAULT 'direct',
    received_notes TEXT,
    
    -- Checklist đầu vào
    input_checklist JSON,                     -- {has_layout: true, has_dimensions: true, ...}
    
    -- Phân công
    assigned_to INT,
    deadline_at DATETIME,
    started_editing_at DATETIME,
    
    -- Chốt thiết kế
    locked_by INT,
    locked_at DATETIME,
    locked_checklist JSON,                    -- {has_all_dimensions: true, has_profile: true, ...}
    locked_file_id INT NULL,                  -- FK to design_files
    approved_by INT NULL,                     -- Nếu cần 2 bước duyệt
    approved_at DATETIME NULL,
    
    -- Ghi chú
    notes TEXT,
    
    -- ✅ Concurrency control (Senior feedback #4.3)
    row_version INT DEFAULT 1,
    
    -- Audit
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_revision_id) REFERENCES design_revisions(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- ✅ Unique/Index (Senior feedback #2.1)
    UNIQUE KEY unique_project_revision (project_id, revision_no),
    INDEX idx_project_status_active (project_id, status, is_active),
    INDEX idx_assigned_deadline (assigned_to, deadline_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- 2. DESIGN FILES - Tách riêng thay vì JSON (Senior feedback #2.2)
-- =====================================================
CREATE TABLE IF NOT EXISTS design_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    revision_id INT NOT NULL,
    
    file_type ENUM('input', 'draft', 'locked', 'reference', 'other') DEFAULT 'input',
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INT,                            -- bytes
    mime_type VARCHAR(100),
    
    -- Metadata
    description TEXT,
    is_locked_file BOOLEAN DEFAULT FALSE,     -- File chốt thiết kế
    
    -- Audit
    uploaded_by INT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (revision_id) REFERENCES design_revisions(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_revision_type (revision_id, file_type),
    INDEX idx_is_locked (revision_id, is_locked_file)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- 3. DESIGN UNITS - Units/Modules kỹ thuật
-- =====================================================
CREATE TABLE IF NOT EXISTS design_units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    design_revision_id INT NOT NULL,
    
    -- Unit identification
    unit_code VARCHAR(50) NOT NULL,           -- CW-01, VK-02
    unit_type ENUM('cua', 'vach', 'o_kinh', 'cua_nhom', 'cua_kinh', 'other') DEFAULT 'cua',
    
    -- ✅ Kích thước - chuẩn hóa mm (Senior feedback #2.3)
    width DECIMAL(10,2),                      -- mm
    height DECIMAL(10,2),                     -- mm
    depth DECIMAL(10,2) NULL,                 -- mm (độ dày, nếu có)
    qty INT DEFAULT 1,
    area DECIMAL(10,4) AS (width * height / 1000000) STORED, -- m² auto-calc
    
    -- Thông số kỹ thuật
    profile_system_id INT NULL,               -- FK to catalog
    profile_system VARCHAR(100),              -- Xingfa, VMA, PMI (snapshot)
    profile_color VARCHAR(100),
    
    glass_type_id INT NULL,                   -- FK to catalog
    glass_type VARCHAR(100),                  -- snapshot
    glass_thickness INT,                      -- mm
    
    hardware_set_id INT NULL,                 -- FK to catalog
    hardware_set VARCHAR(200),                -- snapshot
    
    -- Cấu hình
    num_panels INT DEFAULT 1,
    opening_direction ENUM('left', 'right', 'both', 'fixed', 'sliding', 'other') DEFAULT 'fixed',
    
    -- Ghi chú
    position_note TEXT,                       -- Vị trí lắp đặt
    install_note TEXT,                        -- Ghi chú thi công
    
    -- ✅ Mở rộng không đổi schema (Senior feedback #2.3)
    spec_json JSON NULL,                      -- Các thông số bổ sung
    
    -- ✅ Concurrency control (Senior feedback #4.3)
    row_version INT DEFAULT 1,
    
    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (design_revision_id) REFERENCES design_revisions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- ✅ Unique/Index (Senior feedback #2.3)
    UNIQUE KEY unique_revision_unit_code (design_revision_id, unit_code),
    INDEX idx_revision_type (design_revision_id, unit_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- 4. DESIGN BOM - Bill of Materials
-- =====================================================
CREATE TABLE IF NOT EXISTS design_bom (
    id INT PRIMARY KEY AUTO_INCREMENT,
    design_revision_id INT NOT NULL,
    
    -- ✅ BOM versioning (Senior feedback #2.4)
    bom_version INT DEFAULT 1,
    
    status ENUM('created', 'validated', 'frozen') DEFAULT 'created',
    
    -- Generation
    generated_by INT,
    generated_at DATETIME,
    generation_method ENUM('auto', 'manual', 'hybrid') DEFAULT 'auto',
    
    -- Validation
    validated_by INT,
    validated_at DATETIME,
    validation_errors JSON,                   -- [{line_id, error_code, message}]
    validation_warnings JSON,
    
    -- Freeze
    frozen_by INT,
    frozen_at DATETIME,
    
    -- Concurrency
    row_version INT DEFAULT 1,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (design_revision_id) REFERENCES design_revisions(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (frozen_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- ✅ Unique per revision + version (Senior feedback #2.4)
    UNIQUE KEY unique_revision_bom_version (design_revision_id, bom_version),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- 5. DESIGN BOM LINES - Chi tiết BOM với Material FK
-- =====================================================
CREATE TABLE IF NOT EXISTS design_bom_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bom_id INT NOT NULL,
    
    -- ✅ Traceability (Senior feedback - điểm sống còn)
    source_unit_id INT NULL,                  -- Từ unit nào
    
    -- ✅ Material FK thay cho text (Senior feedback #2.5)
    material_type ENUM('aluminum', 'glass', 'accessory', 'hardware', 'gasket', 'other') NOT NULL,
    material_id INT NULL,                     -- FK to inventory/materials catalog
    
    -- Snapshot fields (để lịch sử không bị ảnh hưởng khi catalog thay đổi)
    material_code_snapshot VARCHAR(100) NOT NULL,
    material_name_snapshot VARCHAR(255) NOT NULL,
    uom_snapshot VARCHAR(20) NOT NULL,        -- m, m2, cái, bộ
    
    -- Quantity & Calculation
    qty DECIMAL(10,3) NOT NULL,
    waste_factor DECIMAL(5,2) DEFAULT 0,      -- % hao hụt
    qty_with_waste DECIMAL(10,3) AS (qty * (1 + waste_factor/100)) STORED,
    unit_price DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) AS (qty_with_waste * unit_price) STORED,
    
    vendor_id INT NULL,
    
    -- ✅ Manual override với đầy đủ snapshot (Senior feedback #2.6)
    is_manual_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    override_by INT,
    override_at DATETIME,
    
    -- Original values (trước override)
    original_qty DECIMAL(10,3),
    original_uom VARCHAR(20),
    original_vendor_id INT,
    original_waste_factor DECIMAL(5,2),
    
    -- Concurrency
    row_version INT DEFAULT 1,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bom_id) REFERENCES design_bom(id) ON DELETE CASCADE,
    FOREIGN KEY (source_unit_id) REFERENCES design_units(id) ON DELETE SET NULL,
    FOREIGN KEY (override_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- ✅ Index for traceability (Senior feedback #2.5)
    INDEX idx_bom_material (bom_id, material_id),
    INDEX idx_source_unit (source_unit_id),
    INDEX idx_material_type (bom_id, material_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- 6. DESIGN PURCHASE REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS design_purchase_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pr_code VARCHAR(50) NOT NULL,             -- PR-2026-001
    
    project_id INT NOT NULL,
    design_revision_id INT NOT NULL,
    bom_id INT NOT NULL,
    
    -- ✅ Snapshot để đọc báo cáo khỏi join nhiều (Senior feedback #2.7)
    revision_no_snapshot INT,
    bom_version_snapshot INT,
    
    status ENUM('draft', 'submitted', 'approved', 'ordered', 'received', 'cancelled') DEFAULT 'draft',
    pr_type ENUM('full_bom', 'shortage_only', 'adjustment', 'supplement') DEFAULT 'shortage_only',
    
    -- ✅ Inventory policy (Senior feedback #2.7)
    inventory_policy ENUM('available', 'on_hand', 'net_shortage') DEFAULT 'available',
    -- available = on_hand - reserved
    -- net_shortage = required - (available + on_order_allocatable)
    
    reason TEXT,
    notes TEXT,
    
    -- Workflow
    created_by INT,
    submitted_by INT,
    submitted_at DATETIME,
    approved_by INT,
    approved_at DATETIME,
    rejected_by INT,
    rejected_at DATETIME,
    rejection_reason TEXT,
    
    -- Concurrency
    row_version INT DEFAULT 1,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (design_revision_id) REFERENCES design_revisions(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_id) REFERENCES design_bom(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_pr_code (pr_code),
    INDEX idx_project_status (project_id, status),
    INDEX idx_bom_type_status (bom_id, pr_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- 7. DESIGN PR LINES với Inventory Snapshot
-- =====================================================
CREATE TABLE IF NOT EXISTS design_pr_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pr_id INT NOT NULL,
    
    -- ✅ Traceability (Senior feedback điểm sống còn)
    bom_line_id INT NOT NULL,                 -- FK to design_bom_lines
    
    -- Material info (snapshot from bom_line)
    material_id INT,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    
    qty DECIMAL(10,3) NOT NULL,
    needed_by_date DATE,
    vendor_id INT,
    
    -- ✅ Inventory Snapshot tại thời điểm tạo PR (Senior feedback #2.8)
    snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    qty_on_hand DECIMAL(10,3) DEFAULT 0,
    qty_reserved DECIMAL(10,3) DEFAULT 0,
    qty_available DECIMAL(10,3) DEFAULT 0,    -- = on_hand - reserved
    qty_on_order DECIMAL(10,3) DEFAULT 0,
    qty_shortage DECIMAL(10,3) DEFAULT 0,     -- = required - available
    
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pr_id) REFERENCES design_purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_line_id) REFERENCES design_bom_lines(id) ON DELETE CASCADE,
    
    INDEX idx_pr_material (pr_id, material_id),
    INDEX idx_bom_line (bom_line_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- 8. DESIGN AUDIT LOGS với Request Tracing
-- =====================================================
CREATE TABLE IF NOT EXISTS design_audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- ✅ Request tracing (Senior feedback #2.9)
    request_id VARCHAR(36) NULL,              -- UUID
    
    entity_type ENUM('revision', 'unit', 'file', 'bom', 'bom_line', 'pr', 'pr_line') NOT NULL,
    entity_id INT NOT NULL,
    
    action VARCHAR(50) NOT NULL,              -- created, updated, locked, unlocked, etc.
    action_detail TEXT,
    
    -- Before/After values
    old_values JSON,
    new_values JSON,
    
    -- Context
    reason TEXT,
    
    -- User & Session
    user_id INT,
    user_name VARCHAR(100),                   -- Snapshot
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_user_action (user_id, action),
    INDEX idx_request (request_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- 9. INVENTORY RESERVATION (cho Shortage chính xác)
-- =====================================================
CREATE TABLE IF NOT EXISTS design_inventory_reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    project_id INT NOT NULL,
    design_revision_id INT NOT NULL,
    bom_id INT,
    
    material_id INT NOT NULL,
    qty_reserved DECIMAL(10,3) NOT NULL,
    
    status ENUM('active', 'released', 'consumed') DEFAULT 'active',
    
    reserved_by INT,
    reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    released_at DATETIME,
    
    notes TEXT,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (design_revision_id) REFERENCES design_revisions(id) ON DELETE CASCADE,
    FOREIGN KEY (reserved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_project_material (project_id, material_id, status),
    INDEX idx_material_status (material_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- AUTO-INCREMENT PR Code
-- =====================================================
CREATE TABLE IF NOT EXISTS design_pr_sequence (
    year INT PRIMARY KEY,
    last_number INT DEFAULT 0
) ENGINE=InnoDB;

DELIMITER //
CREATE TRIGGER IF NOT EXISTS before_design_pr_insert
BEFORE INSERT ON design_purchase_requests
FOR EACH ROW
BEGIN
    DECLARE current_year INT;
    DECLARE next_number INT;
    
    SET current_year = YEAR(CURDATE());
    
    INSERT INTO design_pr_sequence (year, last_number) 
    VALUES (current_year, 0)
    ON DUPLICATE KEY UPDATE last_number = last_number;
    
    UPDATE design_pr_sequence 
    SET last_number = last_number + 1 
    WHERE year = current_year;
    
    SELECT last_number INTO next_number 
    FROM design_pr_sequence 
    WHERE year = current_year;
    
    IF NEW.pr_code IS NULL OR NEW.pr_code = '' THEN
        SET NEW.pr_code = CONCAT('PR-', current_year, '-', LPAD(next_number, 4, '0'));
    END IF;
END//
DELIMITER ;


-- =====================================================
-- SAMPLE DATA: Lock Checklist Definition
-- =====================================================
-- Checklist items for locking design (stored in app config or code)
-- {
--   "has_all_dimensions": "Tất cả units có W/H",
--   "has_profile_system": "Hệ nhôm xác định",
--   "has_profile_color": "Màu sơn xác định",
--   "has_glass_spec": "Kính xác định (dày/loại)",
--   "has_hardware": "Phụ kiện chính xác định",
--   "has_locked_file": "Có file bản vẽ chốt (PDF)"
-- }

SELECT 'Design Workflow Schema created successfully!' AS message;
