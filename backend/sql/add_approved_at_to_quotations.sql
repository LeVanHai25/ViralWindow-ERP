-- ============================================================
-- Migration: Thêm cột approved_at vào bảng quotations
-- Mục đích: Ghi lại chính xác thời điểm chốt hợp đồng
-- Tác giả: Senior Software Architect
-- Ngày: 2026-03-29
-- ============================================================

-- Bước 1: Thêm cột approved_at
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL 
COMMENT 'Thời điểm chốt hợp đồng (khi status chuyển sang approved)' 
AFTER status;

-- Bước 2: Backfill dữ liệu cũ
-- Các quotation đã approved trước khi có cột này sẽ dùng updated_at làm approved_at
UPDATE quotations 
SET approved_at = updated_at 
WHERE status = 'approved' AND approved_at IS NULL;

-- Kiểm tra kết quả
SELECT 
    id, quotation_code, status, 
    quotation_date,
    approved_at,
    updated_at
FROM quotations 
WHERE status = 'approved'
ORDER BY approved_at DESC
LIMIT 10;
