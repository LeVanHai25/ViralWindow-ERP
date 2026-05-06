-- Add supplier_id column to inventory table for glass supplier support
-- Run this migration to enable supplier feature for glass items

-- Add supplier_id column if not exists
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS supplier_id INT NULL AFTER notes;

-- Add foreign key constraint (optional, for data integrity)
-- ALTER TABLE inventory 
-- ADD CONSTRAINT fk_inventory_supplier 
-- FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'inventory' AND COLUMN_NAME = 'supplier_id';
