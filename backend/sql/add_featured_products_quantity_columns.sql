-- =====================================================
-- ADD FEATURED PRODUCTS AND QUANTITY COLUMNS
-- =====================================================
-- Add columns to order_material_status for Production Excel View
-- Columns: featured_products, quantity
-- =====================================================

-- Add featured_products column (Sản phẩm đặc chưng)
ALTER TABLE order_material_status 
ADD COLUMN IF NOT EXISTS featured_products VARCHAR(500) NULL 
COMMENT 'Sản phẩm đặc chưng cho loại vật tư này'
AFTER note;

-- Add quantity column (Khối lượng)
ALTER TABLE order_material_status 
ADD COLUMN IF NOT EXISTS quantity DECIMAL(15,3) NULL 
COMMENT 'Khối lượng vật tư (kg hoặc đơn vị phù hợp)'
AFTER featured_products;

-- Verify columns were added
DESCRIBE order_material_status;

SELECT 'Columns featured_products and quantity added successfully!' AS result;
