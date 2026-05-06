-- Script để sửa quantity của kính từ m² sang tấm (số nguyên)
-- Chạy script này để đảm bảo quantity là số tấm, không phải m²

-- Bước 1: Kiểm tra dữ liệu hiện tại
SELECT id, item_code, item_name, quantity, unit, item_type 
FROM inventory 
WHERE item_type = 'glass';

-- Bước 2: Cập nhật quantity - chuyển từ string "X.XX m²" sang số tấm
-- Lưu ý: Nếu quantity đang là string có chứa "m²", script này sẽ extract số
-- Nếu quantity đã là số, giữ nguyên

UPDATE inventory 
SET quantity = CAST(
    CASE 
        -- Nếu quantity là string có chứa "m²", extract số đầu tiên
        WHEN quantity REGEXP '^[0-9]+\.?[0-9]*' THEN 
            CAST(REGEXP_SUBSTR(CAST(quantity AS CHAR), '^[0-9]+\.?[0-9]*') AS DECIMAL(10,2))
        -- Nếu quantity đã là số, giữ nguyên
        ELSE CAST(quantity AS DECIMAL(10,2))
    END AS DECIMAL(10,2)
)
WHERE item_type = 'glass';

-- Bước 3: Cập nhật unit từ "glass" hoặc "m²" sang "tấm"
UPDATE inventory 
SET unit = 'tấm'
WHERE item_type = 'glass' AND (unit = 'glass' OR unit = 'm²' OR unit = 'm2');

-- Bước 4: Kiểm tra kết quả
SELECT id, item_code, item_name, quantity, unit, item_type 
FROM inventory 
WHERE item_type = 'glass';

-- Lưu ý: 
-- - Nếu quantity hiện tại là "4.00 m²", sau khi chạy sẽ thành 4.00 (số)
-- - Nếu bạn muốn làm tròn thành số nguyên (4 tấm), chạy thêm:
-- UPDATE inventory SET quantity = ROUND(quantity) WHERE item_type = 'glass';










