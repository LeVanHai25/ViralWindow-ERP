-- =============================================================
-- Script tạo bảng financial_transactions nếu chưa tồn tại
-- và đồng bộ dữ liệu từ các nguồn hiện có
-- =============================================================

-- 1. Tạo bảng financial_transactions nếu chưa có
CREATE TABLE IF NOT EXISTS `financial_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_code` varchar(50) NOT NULL COMMENT 'Mã giao dịch: THU-2025-0001, CHI-2025-0001',
  `transaction_date` date NOT NULL COMMENT 'Ngày giao dịch',
  `transaction_type` enum('revenue','expense') NOT NULL COMMENT 'Loại: thu hoặc chi',
  `category` varchar(100) DEFAULT NULL COMMENT 'Danh mục: Tiền cọc, Thu công nợ, Chi phí vật tư...',
  `expense_type` varchar(50) DEFAULT NULL COMMENT 'Loại chi phí: material, labor, transport, other',
  `supplier` varchar(255) DEFAULT NULL COMMENT 'Nhà cung cấp (nếu là chi)',
  `amount` decimal(15,2) NOT NULL COMMENT 'Số tiền',
  `description` text DEFAULT NULL COMMENT 'Mô tả chi tiết',
  `project_id` int(11) DEFAULT NULL COMMENT 'ID dự án liên quan',
  `customer_id` int(11) DEFAULT NULL COMMENT 'ID khách hàng liên quan',
  `production_order_id` int(11) DEFAULT NULL COMMENT 'ID lệnh sản xuất liên quan',
  `payment_method` varchar(50) DEFAULT NULL COMMENT 'Phương thức thanh toán',
  `reference_number` varchar(100) DEFAULT NULL COMMENT 'Số tham chiếu để tránh duplicate',
  `status` enum('draft','posted','cancelled') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái: nháp, đã ghi sổ, đã hủy',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`),
  UNIQUE KEY `reference_number` (`reference_number`),
  KEY `idx_transaction_date` (`transaction_date`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Thêm cột status nếu bảng đã tồn tại nhưng chưa có cột status
ALTER TABLE `financial_transactions` 
ADD COLUMN IF NOT EXISTS `status` enum('draft','posted','cancelled') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái: nháp, đã ghi sổ, đã hủy' AFTER `reference_number`;

-- 2. Đồng bộ thu từ báo giá đã duyệt (tiền cọc)
INSERT IGNORE INTO financial_transactions 
(transaction_code, transaction_date, transaction_type, category, amount, description, project_id, customer_id, reference_number)
SELECT 
    CONCAT('THU-', YEAR(q.quotation_date), '-', LPAD((@row_num := @row_num + 1), 4, '0')) as transaction_code,
    q.quotation_date as transaction_date,
    'revenue' as transaction_type,
    'Tiền cọc báo giá' as category,
    q.advance_amount as amount,
    CONCAT('Thu tiền cọc từ báo giá ', q.quotation_code, ' - ', COALESCE(c.full_name, 'Khách hàng')) as description,
    q.project_id,
    q.customer_id,
    CONCAT('QUO-ADV-', q.id) as reference_number
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
CROSS JOIN (SELECT @row_num := (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(transaction_code, '-', -1) AS UNSIGNED)), 0) FROM financial_transactions WHERE transaction_type = 'revenue')) r
WHERE q.status = 'approved' AND q.advance_amount > 0
AND NOT EXISTS (
    SELECT 1 FROM financial_transactions ft 
    WHERE ft.reference_number = CONCAT('QUO-ADV-', q.id)
);

-- Reset row counter
SET @row_num := (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(transaction_code, '-', -1) AS UNSIGNED)), 0) FROM financial_transactions WHERE transaction_type = 'expense');

-- 3. Đồng bộ chi từ vật tư dự án
INSERT IGNORE INTO financial_transactions 
(transaction_code, transaction_date, transaction_type, category, expense_type, amount, description, project_id, reference_number)
SELECT 
    CONCAT('CHI-', YEAR(pm.created_at), '-', LPAD((@row_num := @row_num + 1), 4, '0')) as transaction_code,
    DATE(pm.created_at) as transaction_date,
    'expense' as transaction_type,
    'Chi phí vật tư' as category,
    'material' as expense_type,
    pm.total_cost as amount,
    CONCAT('Chi phí ', COALESCE(pm.material_name, pm.item_name, 'Vật tư'), ' cho dự án ', COALESCE(p.project_name, p.project_code)) as description,
    pm.project_id,
    CONCAT('PMAT-', pm.id) as reference_number
FROM project_materials pm
LEFT JOIN projects p ON pm.project_id = p.id
WHERE pm.total_cost > 0
AND NOT EXISTS (
    SELECT 1 FROM financial_transactions ft 
    WHERE ft.reference_number = CONCAT('PMAT-', pm.id)
);

-- 4. Hiển thị kết quả
SELECT 'Đồng bộ hoàn tất!' as message;
SELECT transaction_type, COUNT(*) as count, SUM(amount) as total_amount 
FROM financial_transactions 
GROUP BY transaction_type;
