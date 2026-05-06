-- =============================================================
-- FINANCIAL TRANSACTION ITEMS SCHEMA
-- Bảng chi tiết phiếu thu/chi (sản phẩm, vật tư, dịch vụ)
-- =============================================================
-- 
-- @author ViralWindow Development Team (Senior Developer)
-- @version 2.0
-- =============================================================

-- 1. Tạo bảng chi tiết phiếu thu/chi
CREATE TABLE IF NOT EXISTS financial_transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL COMMENT 'FK phiếu thu/chi',
    
    -- Thông tin sản phẩm/vật tư
    item_type ENUM('product', 'material', 'service', 'deposit', 'labor', 'transport', 'other') 
        NOT NULL DEFAULT 'other' COMMENT 'Loại: sản phẩm, vật tư, dịch vụ, đặt cọc, nhân công, vận chuyển, khác',
    item_name VARCHAR(255) NOT NULL COMMENT 'Tên sản phẩm/vật tư',
    item_code VARCHAR(50) NULL COMMENT 'Mã vật tư (nếu có)',
    specification VARCHAR(255) NULL COMMENT 'Quy cách: 1200x2400, màu xám...',
    
    -- Số lượng và giá
    quantity DECIMAL(15,3) DEFAULT 1 COMMENT 'Số lượng',
    unit VARCHAR(20) DEFAULT 'cái' COMMENT 'Đơn vị tính',
    unit_price DECIMAL(15,2) DEFAULT 0 COMMENT 'Đơn giá (VNĐ)',
    discount_percent DECIMAL(5,2) DEFAULT 0 COMMENT 'Giảm giá %',
    amount DECIMAL(15,2) NOT NULL COMMENT 'Thành tiền = quantity * unit_price * (1 - discount%)',
    
    -- Nguồn tham chiếu (truy vết)
    source_type VARCHAR(50) NULL COMMENT 'quotation_item, stock_document_line, purchase_request_item, project_material',
    source_id INT NULL COMMENT 'ID nguồn',
    
    -- Metadata
    note TEXT NULL COMMENT 'Ghi chú dòng',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (transaction_id) REFERENCES financial_transactions(id) ON DELETE CASCADE,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_source (source_type, source_id),
    INDEX idx_item_type (item_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Sửa constraint reference_number - cho phép NULL và xử lý duplicate
-- Xóa constraint UNIQUE cũ nếu có (có thể gây lỗi nếu không tồn tại, ignore)
-- ALTER TABLE financial_transactions DROP INDEX reference_number;

-- Tạo index mới cho phép NULL duplicates nhưng unique cho non-NULL values
-- MySQL tự động cho phép multiple NULLs với UNIQUE index
ALTER TABLE financial_transactions MODIFY COLUMN reference_number VARCHAR(100) NULL;

-- 3. Thêm cột deleted_at cho soft delete (optional)
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp';

-- 4. Thêm cột approved_by và approved_at nếu cần
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS approved_by INT NULL COMMENT 'Người duyệt',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL COMMENT 'Thời điểm duyệt';

-- 5. Hiển thị kết quả
SELECT 'Tạo bảng financial_transaction_items thành công!' as message;
DESCRIBE financial_transaction_items;
