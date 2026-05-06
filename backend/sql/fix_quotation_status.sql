-- Fix Quotation Status Script
-- Cập nhật status cho các báo giá đã chốt hợp đồng nhưng status chưa được update

-- 1. Xem status hiện tại của các quotations
SELECT id, quotation_code, status, project_id, total_amount, created_at 
FROM quotations 
ORDER BY id DESC;

-- 2. Xem các dự án đã có project_code bắt đầu bằng VR (đã chốt hợp đồng)
-- và quotation của chúng
SELECT 
    q.id as quotation_id,
    q.quotation_code,
    q.status as current_status,
    p.id as project_id,
    p.project_code,
    p.contract_locked,
    CASE 
        WHEN p.project_code LIKE 'VR%' AND p.project_code NOT LIKE 'VRBG%' THEN 'contract_signed'
        WHEN p.contract_locked = 1 THEN 'contract_signed'
        ELSE q.status
    END as should_be_status
FROM quotations q
LEFT JOIN projects p ON q.project_id = p.id
ORDER BY q.id DESC;

-- 3. Update status cho các quotation có dự án đã chốt hợp đồng
-- (project_code bắt đầu bằng VR nhưng không phải VRBG, hoặc contract_locked = 1)
UPDATE quotations q
INNER JOIN projects p ON q.project_id = p.id
SET q.status = 'contract_signed'
WHERE (p.project_code LIKE 'VR%' AND p.project_code NOT LIKE 'VRBG%')
   OR p.contract_locked = 1;

-- 4. Update cụ thể cho các quotation (nếu cần)
-- UPDATE quotations SET status = 'contract_signed' WHERE quotation_code = 'VRBG001';
-- UPDATE quotations SET status = 'contract_signed' WHERE quotation_code = 'VRBG002';
-- UPDATE quotations SET status = 'contract_signed' WHERE quotation_code = 'VRBG003';

-- 5. Verify lại sau khi update
SELECT id, quotation_code, status, project_id 
FROM quotations 
ORDER BY id DESC;
