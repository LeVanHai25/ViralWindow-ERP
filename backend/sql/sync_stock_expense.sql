-- =============================================================
-- Script đồng bộ phiếu chi từ các phiếu kho đã hạch toán
-- Chạy script này để tạo phiếu chi cho các phiếu đã posted TRƯỚC khi có code tự động
-- =============================================================

-- Thiết lập biến để tính số thứ tự phiếu chi
SET @row_num := (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(transaction_code, '-', -1) AS UNSIGNED)), 0) 
                 FROM financial_transactions 
                 WHERE transaction_type = 'expense');
SET @current_year := YEAR(CURDATE());

-- INSERT phiếu chi từ các phiếu kho đã hạch toán nhưng chưa có phiếu chi
INSERT INTO financial_transactions 
(transaction_code, transaction_date, transaction_type, category, expense_type,
 amount, description, project_id, reference_number, status)
SELECT 
    CONCAT('CHI-', @current_year, '-', LPAD((@row_num := @row_num + 1), 4, '0')) as transaction_code,
    COALESCE(DATE(sd.posted_at), DATE(sd.created_at)) as transaction_date,
    'expense' as transaction_type,
    CASE sd.doc_type 
        WHEN 'import' THEN 'Chi phí nhập kho'
        WHEN 'export' THEN 'Chi phí xuất kho'
        ELSE 'Chi phí kho khác'
    END as category,
    CASE sd.doc_type 
        WHEN 'import' THEN 'purchase'
        ELSE 'material'
    END as expense_type,
    sd.total_value as amount,
    CONCAT(
        CASE sd.doc_type 
            WHEN 'import' THEN 'Nhập kho'
            WHEN 'export' THEN 'Xuất kho'
            ELSE 'Phiếu kho'
        END,
        ' theo phiếu ', sd.doc_no,
        CASE WHEN p.project_name IS NOT NULL THEN CONCAT(' - Dự án: ', p.project_name) ELSE '' END,
        CASE WHEN s.name IS NOT NULL THEN CONCAT(' - NCC: ', s.name) ELSE '' END
    ) as description,
    sd.project_id,
    CONCAT('STOCK-', sd.doc_no) as reference_number,
    'draft' as status
FROM stock_documents sd
LEFT JOIN projects p ON sd.project_id = p.id
LEFT JOIN suppliers s ON sd.supplier_id = s.id
WHERE sd.status = 'posted'
  AND sd.doc_type IN ('import', 'export')
  AND sd.total_value > 0
  AND NOT EXISTS (
      SELECT 1 FROM financial_transactions ft 
      WHERE ft.reference_number = CONCAT('STOCK-', sd.doc_no)
  );

-- Hiển thị kết quả
SELECT CONCAT('Đã tạo ', @row_num - (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(transaction_code, '-', -1) AS UNSIGNED)), 0) 
                                      FROM financial_transactions 
                                      WHERE transaction_type = 'expense' 
                                        AND transaction_code NOT LIKE CONCAT('CHI-', @current_year, '-', LPAD(@row_num, 4, '0'))), 
              ' phiếu chi từ phiếu kho đã hạch toán') as result;

-- Kiểm tra số lượng phiếu chi mới được tạo
SELECT 'Phiếu chi mới tạo từ phiếu kho:' as info;
SELECT transaction_code, transaction_date, category, amount, description, reference_number
FROM financial_transactions 
WHERE reference_number LIKE 'STOCK-%'
ORDER BY created_at DESC
LIMIT 20;
