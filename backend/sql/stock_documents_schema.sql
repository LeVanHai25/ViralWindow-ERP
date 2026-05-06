-- =====================================================
-- STOCK DOCUMENTS SCHEMA
-- =====================================================
-- Quản lý kho theo mô hình KiotViet
-- Mọi biến động tồn kho qua PHIẾU
-- 
-- @author ViralWindow Development Team
-- @version 1.0 (MVP)
-- =====================================================

-- Bảng phiếu kho chính
CREATE TABLE IF NOT EXISTS stock_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_no VARCHAR(50) UNIQUE NOT NULL COMMENT 'Mã phiếu: PN-2026-0001, PX-2026-0001, KK-2026-0001',
    doc_type ENUM('import', 'export', 'stocktake', 'adjust') NOT NULL COMMENT 'Loại phiếu',
    warehouse_id INT DEFAULT 1 COMMENT 'Kho (mặc định kho chính)',
    
    -- Liên kết
    project_id INT NULL COMMENT 'Dự án (cho phiếu xuất)',
    supplier_id INT NULL COMMENT 'Nhà cung cấp (cho phiếu nhập)',
    
    -- Trạng thái MVP: draft -> posted -> cancelled
    status ENUM('draft', 'posted', 'cancelled') DEFAULT 'draft' COMMENT 'Trạng thái phiếu',
    
    -- Tổng hợp
    total_qty DECIMAL(15,3) DEFAULT 0 COMMENT 'Tổng số lượng',
    total_value DECIMAL(15,2) DEFAULT 0 COMMENT 'Tổng giá trị',
    
    -- Metadata
    note TEXT COMMENT 'Ghi chú',
    created_by INT NOT NULL COMMENT 'Người tạo',
    posted_by INT NULL COMMENT 'Người hạch toán',
    cancelled_by INT NULL COMMENT 'Người hủy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    posted_at TIMESTAMP NULL COMMENT 'Thời điểm hạch toán',
    cancelled_at TIMESTAMP NULL COMMENT 'Thời điểm hủy',
    balanced_at TIMESTAMP NULL COMMENT 'Thời điểm cân bằng kho (cho stocktake)',
    cancel_reason TEXT NULL COMMENT 'Lý do hủy',
    
    -- Optimistic locking
    row_version INT DEFAULT 1,
    
    -- Foreign keys
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_doc_type_status (doc_type, status),
    INDEX idx_created_at (created_at),
    INDEX idx_project_id (project_id),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_doc_no (doc_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Bảng chi tiết phiếu kho (lines)
CREATE TABLE IF NOT EXISTS stock_document_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL COMMENT 'FK phiếu kho',
    
    -- Vật tư (MVP: dùng item_type + item_id, sau này có thể gom về items master)
    item_type ENUM('accessory', 'aluminum', 'glass', 'other') NOT NULL COMMENT 'Loại vật tư',
    item_id INT NOT NULL COMMENT 'ID vật tư trong bảng tương ứng',
    
    -- Snapshot thông tin vật tư tại thời điểm tạo (để audit)
    item_code VARCHAR(50) COMMENT 'Mã vật tư snapshot',
    item_name VARCHAR(255) COMMENT 'Tên vật tư snapshot',
    
    -- Số lượng
    qty DECIMAL(15,3) NOT NULL COMMENT 'Số lượng (> 0)',
    unit VARCHAR(20) DEFAULT 'cái' COMMENT 'Đơn vị tính',
    
    -- Giá (cho phiếu nhập)
    unit_price DECIMAL(15,2) DEFAULT 0 COMMENT 'Đơn giá',
    line_total DECIMAL(15,2) DEFAULT 0 COMMENT 'Thành tiền = qty * unit_price',
    
    -- Kiểm kho: số thực tế vs hệ thống
    qty_system DECIMAL(15,3) NULL COMMENT 'Tồn hệ thống (cho stocktake)',
    qty_actual DECIMAL(15,3) NULL COMMENT 'Thực tế (cho stocktake)',
    qty_diff DECIMAL(15,3) NULL COMMENT 'Chênh lệch = actual - system',
    
    note TEXT COMMENT 'Ghi chú dòng',
    
    -- Constraints
    FOREIGN KEY (document_id) REFERENCES stock_documents(id) ON DELETE CASCADE,
    INDEX idx_document_id (document_id),
    INDEX idx_item (item_type, item_id),
    
    CONSTRAINT chk_qty_positive CHECK (qty > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Bảng sổ kho / ledger (audit trail)
CREATE TABLE IF NOT EXISTS stock_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Liên kết phiếu
    document_id INT NOT NULL COMMENT 'FK phiếu kho',
    document_line_id INT NULL COMMENT 'FK dòng phiếu (optional)',
    
    -- Kho
    warehouse_id INT DEFAULT 1 COMMENT 'Kho',
    
    -- Vật tư
    item_type ENUM('accessory', 'aluminum', 'glass', 'other') NOT NULL,
    item_id INT NOT NULL,
    
    -- Biến động
    qty_in DECIMAL(15,3) DEFAULT 0 COMMENT 'Số lượng nhập (+)',
    qty_out DECIMAL(15,3) DEFAULT 0 COMMENT 'Số lượng xuất (-)',
    balance_after DECIMAL(15,3) NOT NULL COMMENT 'Tồn sau giao dịch',
    
    -- Metadata
    transaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm giao dịch',
    user_id INT COMMENT 'Người thực hiện',
    note TEXT COMMENT 'Ghi chú',
    
    -- Indexes
    FOREIGN KEY (document_id) REFERENCES stock_documents(id),
    INDEX idx_item_transaction (item_type, item_id, transaction_at),
    INDEX idx_warehouse_item (warehouse_id, item_type, item_id),
    INDEX idx_transaction_at (transaction_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- TRIGGERS: Auto-generate doc_no
-- =====================================================

DELIMITER //

-- Trigger tạo mã phiếu tự động
CREATE TRIGGER IF NOT EXISTS trg_stock_documents_before_insert
BEFORE INSERT ON stock_documents
FOR EACH ROW
BEGIN
    DECLARE prefix VARCHAR(10);
    DECLARE year_str VARCHAR(4);
    DECLARE next_seq INT;
    
    -- Xác định prefix theo loại phiếu
    CASE NEW.doc_type
        WHEN 'import' THEN SET prefix = 'PN';
        WHEN 'export' THEN SET prefix = 'PX';
        WHEN 'stocktake' THEN SET prefix = 'KK';
        WHEN 'adjust' THEN SET prefix = 'DC';
        ELSE SET prefix = 'XX';
    END CASE;
    
    -- Lấy năm hiện tại
    SET year_str = YEAR(CURRENT_DATE);
    
    -- Lấy sequence tiếp theo trong năm
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(doc_no, LENGTH(CONCAT(prefix, '-', year_str, '-')) + 1) AS UNSIGNED)
    ), 0) + 1 INTO next_seq
    FROM stock_documents
    WHERE doc_no LIKE CONCAT(prefix, '-', year_str, '-%');
    
    -- Generate doc_no: PN-2026-0001
    IF NEW.doc_no IS NULL OR NEW.doc_no = '' THEN
        SET NEW.doc_no = CONCAT(prefix, '-', year_str, '-', LPAD(next_seq, 4, '0'));
    END IF;
END//

DELIMITER ;


-- =====================================================
-- VIEW: Tồn kho hiện tại
-- =====================================================
CREATE OR REPLACE VIEW v_stock_onhand AS
SELECT 
    l.warehouse_id,
    l.item_type,
    l.item_id,
    -- Lấy balance_after của giao dịch cuối cùng
    (SELECT balance_after 
     FROM stock_ledger l2 
     WHERE l2.warehouse_id = l.warehouse_id 
       AND l2.item_type = l.item_type 
       AND l2.item_id = l.item_id 
     ORDER BY l2.transaction_at DESC, l2.id DESC 
     LIMIT 1) AS qty_on_hand,
    0 AS qty_reserved, -- Phase 2: sẽ tính từ reservation
    (SELECT balance_after 
     FROM stock_ledger l2 
     WHERE l2.warehouse_id = l.warehouse_id 
       AND l2.item_type = l.item_type 
       AND l2.item_id = l.item_id 
     ORDER BY l2.transaction_at DESC, l2.id DESC 
     LIMIT 1) AS qty_available -- Phase 1: available = on_hand
FROM stock_ledger l
GROUP BY l.warehouse_id, l.item_type, l.item_id;


-- =====================================================
-- SAMPLE DATA (optional - for testing)
-- =====================================================

-- Uncomment để test:
-- INSERT INTO stock_documents (doc_no, doc_type, warehouse_id, note, created_by)
-- VALUES ('', 'import', 1, 'Phiếu nhập test', 1);
