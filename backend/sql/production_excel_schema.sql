-- =====================================================
-- PRODUCTION EXCEL VIEW - DATABASE SCHEMA
-- =====================================================
-- Phase 2: Create tables for Production Excel View
-- Tables: order_material_status, order_issues, order_events
-- Foreign Key: order_id → projects.id
-- =====================================================

-- 1. ORDER MATERIAL STATUS (Trạng thái vật tư theo từng loại)
-- Mỗi đơn hàng có nhiều loại vật tư (KINH/NHOM/PHUKIEN/VATTUPHU)
CREATE TABLE IF NOT EXISTS order_material_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT 'FK to projects.id',
    material_type ENUM('KINH','NHOM','PHUKIEN','VATTUPHU') NOT NULL COMMENT 'Loại vật tư',
    status ENUM('MISSING','ORDERED','ARRIVED','ISSUED','OK') DEFAULT 'MISSING' COMMENT 'Trạng thái',
    plan_date DATE NULL COMMENT 'Ngày dự kiến',
    actual_date DATE NULL COMMENT 'Ngày thực tế',
    source_type ENUM('manual','stock_document','purchase_request') DEFAULT 'manual' COMMENT 'Nguồn cập nhật',
    source_id INT NULL COMMENT 'ID phiếu kho/yêu cầu mua nếu auto-sync',
    note TEXT NULL COMMENT 'Ghi chú',
    updated_by INT NULL COMMENT 'Người cập nhật cuối',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_order_material (order_id, material_type),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_source (source_type, source_id),
    
    CONSTRAINT fk_oms_order FOREIGN KEY (order_id) 
        REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Trạng thái vật tư theo loại cho Production Excel View';

-- 2. ORDER ISSUES (Vướng mắc/Problems)
CREATE TABLE IF NOT EXISTS order_issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT 'FK to projects.id',
    title VARCHAR(255) NOT NULL COMMENT 'Tiêu đề vướng mắc',
    content TEXT NULL COMMENT 'Nội dung chi tiết',
    severity ENUM('low','medium','high','critical') DEFAULT 'medium' COMMENT 'Mức độ',
    status ENUM('open','in_progress','resolved','closed') DEFAULT 'open' COMMENT 'Trạng thái',
    assigned_to INT NULL COMMENT 'Người được giao xử lý',
    resolved_by INT NULL COMMENT 'Người giải quyết',
    resolved_at TIMESTAMP NULL COMMENT 'Thời điểm giải quyết',
    created_by INT NULL COMMENT 'Người tạo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_severity (severity),
    
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) 
        REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Vướng mắc của đơn hàng cho Production Excel View';

-- 3. ORDER EVENTS (Timeline / Audit Log)
CREATE TABLE IF NOT EXISTS order_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT 'FK to projects.id',
    event_type VARCHAR(50) NOT NULL COMMENT 'Loại sự kiện: CREATE, UPDATE, STATUS_CHANGE, MATERIAL_UPDATE...',
    event_title VARCHAR(255) NULL COMMENT 'Tiêu đề sự kiện để hiển thị timeline',
    payload_json JSON NULL COMMENT 'Dữ liệu chi tiết (old value, new value, etc)',
    created_by INT NULL COMMENT 'Người thực hiện',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at),
    
    CONSTRAINT fk_oe_order FOREIGN KEY (order_id) 
        REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Timeline và audit log cho Production Excel View';

-- =====================================================
-- INITIAL DATA / MIGRATION
-- =====================================================

-- Insert initial material status for existing projects in production
INSERT IGNORE INTO order_material_status (order_id, material_type, status, note, updated_by)
SELECT 
    p.id,
    mt.type,
    'MISSING',
    'Auto-created from migration',
    1
FROM projects p
CROSS JOIN (
    SELECT 'KINH' AS type UNION ALL
    SELECT 'NHOM' UNION ALL
    SELECT 'PHUKIEN' UNION ALL
    SELECT 'VATTUPHU'
) mt
WHERE p.status IN ('in_production', 'designing', 'quotation_approved', 'installation')
ON DUPLICATE KEY UPDATE order_id = order_id;

-- =====================================================
-- VIEWS (Optional - for reporting)
-- =====================================================

-- View: Order summary with material risk
CREATE OR REPLACE VIEW v_order_excel_summary AS
SELECT 
    p.id,
    p.project_code AS code,
    p.project_name AS name,
    p.created_at,
    p.deadline AS plan_delivery_date,
    p.status AS project_status,
    -- Check if late
    CASE WHEN p.deadline < CURDATE() AND p.status NOT IN ('completed','cancelled') 
         THEN 1 ELSE 0 END AS is_late,
    -- Material risk level
    CASE 
        WHEN EXISTS (SELECT 1 FROM order_material_status oms WHERE oms.order_id = p.id AND oms.status = 'MISSING') 
        THEN 'high'
        WHEN EXISTS (SELECT 1 FROM order_material_status oms WHERE oms.order_id = p.id AND oms.status = 'ORDERED') 
        THEN 'medium'
        ELSE 'low'
    END AS material_risk,
    -- Has open issues
    (SELECT COUNT(*) FROM order_issues oi WHERE oi.order_id = p.id AND oi.status IN ('open','in_progress')) AS open_issues_count
FROM projects p
WHERE p.status NOT IN ('cancelled', 'closed');

SELECT 'Production Excel View schema created successfully!' AS result;
