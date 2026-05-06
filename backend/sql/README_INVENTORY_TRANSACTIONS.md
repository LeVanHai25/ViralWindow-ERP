# Migration: Tạo bảng inventory_transactions

## Mô tả
Tạo bảng `inventory_transactions` để lưu lịch sử nhập/xuất kho.

## Cách chạy migration

### Cách 1: Sử dụng MySQL Command Line
```bash
mysql -u root -p your_database_name < backend/sql/create_inventory_transactions_table.sql
```

### Cách 2: Chạy trực tiếp trong MySQL
```sql
USE your_database_name;

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inventory_id INT NOT NULL,
    transaction_type ENUM('import', 'export') NOT NULL COMMENT 'Loại giao dịch: import (nhập kho) hoặc export (xuất kho)',
    quantity DECIMAL(10, 2) NOT NULL COMMENT 'Số lượng',
    notes TEXT NULL COMMENT 'Ghi chú',
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày giờ giao dịch',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    INDEX idx_inventory_id (inventory_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử giao dịch nhập/xuất kho';
```

## Kiểm tra sau khi migration

```sql
-- Xem cấu trúc bảng
DESCRIBE inventory_transactions;

-- Hoặc
SHOW CREATE TABLE inventory_transactions;

-- Kiểm tra dữ liệu
SELECT * FROM inventory_transactions LIMIT 5;
```

## Lưu ý
- Bảng này cần bảng `inventory` đã tồn tại
- Foreign key sẽ tự động xóa các transaction khi xóa inventory item
- Có index để tối ưu truy vấn theo inventory_id, transaction_type, và transaction_date



















