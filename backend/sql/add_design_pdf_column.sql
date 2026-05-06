-- Add design_pdf_url column to quotation_items table
-- Run this script in MySQL to add support for design PDF uploads

ALTER TABLE quotation_items 
ADD COLUMN design_pdf_url VARCHAR(500) NULL AFTER image_url;

-- Verify the change
DESCRIBE quotation_items;
