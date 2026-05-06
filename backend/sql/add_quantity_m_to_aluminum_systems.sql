-- Thêm cột quantity (số lượng cây/thanh) vào bảng aluminum_systems
ALTER TABLE aluminum_systems 
ADD COLUMN quantity INT NULL DEFAULT 0 COMMENT 'Số lượng tồn kho (số cây/thanh)' AFTER length_m;

-- Thêm cột quantity_m (số lượng mét) vào bảng aluminum_systems (để tương thích)
ALTER TABLE aluminum_systems 
ADD COLUMN quantity_m DECIMAL(10, 2) NULL DEFAULT 0 COMMENT 'Số lượng tồn kho (mét)' AFTER quantity;

-- Cập nhật giá trị mặc định: quantity = 0 nếu chưa có
UPDATE aluminum_systems 
SET quantity = 0 
WHERE quantity IS NULL;

