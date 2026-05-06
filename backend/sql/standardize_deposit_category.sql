-- =====================================================
-- MIGRATION: Chuẩn hóa category phiếu thu đặt cọc
-- Ngày: 2026-01-31
-- Mục đích: Thống nhất tất cả phiếu thu đặt cọc về category = 'Tiền đặt cọc'
-- =====================================================

-- Xem các category hiện tại liên quan đến đặt cọc
SELECT DISTINCT category, COUNT(*) as count 
FROM financial_transactions 
WHERE transaction_type = 'revenue' 
  AND (category LIKE '%cọc%' OR category LIKE '%đặt cọc%')
GROUP BY category;

-- Cập nhật các category không chuẩn thành 'Tiền đặt cọc'
UPDATE financial_transactions 
SET category = 'Tiền đặt cọc'
WHERE transaction_type = 'revenue'
  AND category IN ('Tiền cọc báo giá', 'Tiền cọc', 'Đặt cọc', 'Cọc')
  AND category != 'Tiền đặt cọc';

-- Kiểm tra lại sau khi cập nhật
SELECT DISTINCT category, COUNT(*) as count 
FROM financial_transactions 
WHERE transaction_type = 'revenue' 
  AND (category LIKE '%cọc%' OR category LIKE '%đặt cọc%')
GROUP BY category;

-- Log các phiếu đã cập nhật
SELECT id, transaction_code, category, description, status 
FROM financial_transactions 
WHERE transaction_type = 'revenue' 
  AND category = 'Tiền đặt cọc'
ORDER BY id DESC
LIMIT 20;
