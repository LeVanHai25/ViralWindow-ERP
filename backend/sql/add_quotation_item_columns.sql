-- Migration: Add missing columns to quotations and quotation_items tables
-- Run this script to add the new columns for storing complete quotation data

-- ========================================
-- BẢNG quotations: Thêm các cột mới
-- ========================================

-- Add version column (V1, V2, V3...)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 AFTER advance_amount;

-- Add parent_quotation_id (liên kết các version với nhau)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS parent_quotation_id INT DEFAULT NULL AFTER version;

-- Add creator_name
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS creator_name VARCHAR(100) DEFAULT NULL AFTER parent_quotation_id;

-- Add discount_percent
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0 AFTER creator_name;

-- Add vat_percent
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vat_percent DECIMAL(5,2) DEFAULT 10 AFTER discount_percent;

-- Add shipping_fee
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0 AFTER vat_percent;

-- Add foreign key for parent_quotation_id (optional - có thể bỏ nếu gây lỗi)
-- ALTER TABLE quotations ADD CONSTRAINT fk_parent_quotation FOREIGN KEY (parent_quotation_id) REFERENCES quotations(id) ON DELETE SET NULL;

-- ========================================
-- BẢNG quotation_items: Thêm các cột mới
-- ========================================

-- Add code column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS code VARCHAR(50) DEFAULT NULL AFTER item_type;

-- Add spec column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS spec TEXT DEFAULT NULL AFTER code;

-- Add glass column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS glass TEXT DEFAULT NULL AFTER spec;

-- Add accessories column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS accessories TEXT DEFAULT NULL AFTER glass;

-- Add width column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) DEFAULT 0 AFTER accessories;

-- Add height column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS height DECIMAL(10,2) DEFAULT 0 AFTER width;

-- Add area column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS area DECIMAL(10,4) DEFAULT 0 AFTER height;

-- Add accessory_price column if not exists
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS accessory_price DECIMAL(15,2) DEFAULT 0 AFTER area;

-- ========================================
-- Verify columns
-- ========================================
DESCRIBE quotations;
DESCRIBE quotation_items;
