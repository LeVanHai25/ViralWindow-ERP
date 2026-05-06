-- ============================================
-- Migration: Add VAT, Discount, Shipping columns to quotations table
-- Fix bug where VAT/discount values are not saved when updating quotation
-- Date: 2026-01-05
-- ============================================

-- Add discount_percent column (default 0)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0;

-- Add vat_percent column (default 10 for Vietnam VAT)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vat_percent DECIMAL(5,2) DEFAULT 10;

-- Add shipping_fee column (default 0)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0;

-- Add creator_name column if not exists
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS creator_name VARCHAR(255) NULL;

-- Verify columns were added
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'quotations' 
  AND COLUMN_NAME IN ('discount_percent', 'vat_percent', 'shipping_fee', 'creator_name');

-- Show success message
SELECT 'SUCCESS: VAT, Discount, Shipping Fee columns added to quotations table' AS result;
