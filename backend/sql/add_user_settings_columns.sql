-- =====================================================
-- Migration: Add User Settings Columns
-- Purpose: Support Language, Timezone, Date Format preferences
-- Created: 2026-02-07
-- =====================================================

-- Add timezone column
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh';

-- Add date_format column
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY';

-- Add language column
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'vi';

-- Add remember_me preference column
ALTER TABLE users ADD COLUMN IF NOT EXISTS remember_me TINYINT(1) DEFAULT 0;

-- =====================================================
-- Verify columns were added
-- =====================================================
DESCRIBE users;
