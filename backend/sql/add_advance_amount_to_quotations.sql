-- Add advance_amount column to quotations table
-- This column stores the advance payment amount (typically 30% of subtotal)

ALTER TABLE quotations 
ADD COLUMN advance_amount DECIMAL(15, 2) DEFAULT 0 AFTER notes;

-- Update existing quotations to have 30% of subtotal as advance_amount
UPDATE quotations 
SET advance_amount = ROUND(subtotal * 0.3, 2)
WHERE advance_amount IS NULL OR advance_amount = 0;
