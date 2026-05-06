-- Tạo bảng inventory_transactions nếu chưa tồn tại
-- Bảng này lưu lịch sử nhập/xuất kho

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inventory_id INT NOT NULL,
    project_id INT NULL COMMENT 'ID dự án (nếu xuất kho cho dự án)',
    transaction_type ENUM('import', 'export') NOT NULL COMMENT 'Loại giao dịch: import (nhập kho) hoặc export (xuất kho)',
    quantity DECIMAL(10, 2) NOT NULL COMMENT 'Số lượng',
    notes TEXT NULL COMMENT 'Ghi chú',
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày giờ giao dịch',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    INDEX idx_inventory_id (inventory_id),
    INDEX idx_project_id (project_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử giao dịch nhập/xuất kho';

