-- Tạo bảng purchase_requests để lưu trữ các phiếu yêu cầu vật tư
CREATE TABLE IF NOT EXISTS purchase_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Mã phiếu yêu cầu (tự động tạo)',
    project_id INT NULL COMMENT 'ID dự án (nếu có)',
    project_name VARCHAR(255) NULL COMMENT 'Tên dự án',
    order_code VARCHAR(100) NULL COMMENT 'Mã đơn hàng',
    product_type VARCHAR(100) NULL COMMENT 'Chủng loại',
    color VARCHAR(100) NULL COMMENT 'Màu sắc',
    delivery_address TEXT NULL COMMENT 'Địa chỉ giao hàng',
    created_date DATE NULL COMMENT 'Ngày tạo',
    required_date DATE NULL COMMENT 'Ngày cần vật tư về',
    
    -- Dữ liệu vật tư (JSON)
    nhom_data JSON NULL COMMENT 'Dữ liệu nhôm (JSON)',
    vattu_data JSON NULL COMMENT 'Dữ liệu vật tư phụ (JSON)',
    phukien_data JSON NULL COMMENT 'Dữ liệu phụ kiện (JSON)',
    kinh_data JSON NULL COMMENT 'Dữ liệu kính (JSON)',
    
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'completed') DEFAULT 'draft' COMMENT 'Trạng thái phiếu',
    notes TEXT NULL COMMENT 'Ghi chú',
    
    created_by INT NULL COMMENT 'Người tạo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_request_code (request_code),
    INDEX idx_project_id (project_id),
    INDEX idx_status (status),
    INDEX idx_created_date (created_date),
    INDEX idx_required_date (required_date),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phiếu yêu cầu vật tư';










