-- =====================================================
-- MIGRATION: Aluminum Scrap Management System v2
-- =====================================================
-- Phase 0 + Phase 1: Schema upgrades for bar-based inventory
-- Run this script to upgrade aluminum_systems and aluminum_scraps
-- =====================================================

-- =====================================================
-- PHASE 0: Add standard_length_cm to aluminum_systems
-- =====================================================

-- Add standard bar length column (default 600cm = 6m)
ALTER TABLE aluminum_systems 
ADD COLUMN IF NOT EXISTS standard_length_cm INT DEFAULT 600 COMMENT 'Chiều dài cây chuẩn (cm), default 600 = 6m';

-- Verify the column was added
SELECT 'Phase 0: Added standard_length_cm to aluminum_systems' AS status;


-- =====================================================
-- PHASE 1: Upgrade aluminum_scraps table
-- =====================================================

-- 1.1 Add status column (VARCHAR to avoid ENUM migration issues)
ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'available' COMMENT 'available|reserved|used|scrapped';

-- 1.2 Add system_id for linking to aluminum_systems
ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS system_id INT NULL COMMENT 'FK to aluminum_systems.id';

-- 1.3 Add source document traceability
ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS source_doc_id INT NULL COMMENT 'FK to stock_documents.id - phiếu sinh ra scrap';

-- 1.4 Add source project (where scrap was created)
ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS source_project_id INT NULL COMMENT 'FK to projects.id - dự án sinh ra scrap';

-- 1.5 Add usage tracking
ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS used_project_id INT NULL COMMENT 'FK to projects.id - dự án sử dụng scrap';

ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS used_doc_id INT NULL COMMENT 'FK to stock_documents.id - phiếu sử dụng scrap';

ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS used_at DATETIME NULL COMMENT 'Thời điểm sử dụng';

ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS used_by INT NULL COMMENT 'User ID sử dụng';

-- 1.6 Add note
ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS note TEXT NULL COMMENT 'Ghi chú';

-- 1.7 Add created_by if not exists
ALTER TABLE aluminum_scraps 
ADD COLUMN IF NOT EXISTS created_by INT NULL COMMENT 'User ID tạo scrap';


-- =====================================================
-- PHASE 1.2: Backfill status from is_used
-- =====================================================

-- Update status based on existing is_used values
UPDATE aluminum_scraps 
SET status = CASE 
    WHEN is_used = 1 THEN 'used'
    ELSE 'available'
END
WHERE status IS NULL OR status = '';

-- Set default for any NULL status
UPDATE aluminum_scraps 
SET status = 'available' 
WHERE status IS NULL;

SELECT 'Phase 1.2: Backfilled status from is_used' AS status;


-- =====================================================
-- PHASE 1.3: Add indexes for performance
-- =====================================================

-- Index for filtering by system and status
CREATE INDEX IF NOT EXISTS idx_scraps_system_status 
ON aluminum_scraps (system_id, status);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_scraps_status_created 
ON aluminum_scraps (status, created_at);

-- Index for document traceability
CREATE INDEX IF NOT EXISTS idx_scraps_source_doc 
ON aluminum_scraps (source_doc_id);

SELECT 'Phase 1.3: Created indexes' AS status;


-- =====================================================
-- PHASE 1.4: Modify stock_document_lines for aluminum
-- =====================================================

-- Add aluminum-specific columns to stock_document_lines
ALTER TABLE stock_document_lines
ADD COLUMN IF NOT EXISTS system_id INT NULL COMMENT 'FK aluminum_systems.id for aluminum lines';

ALTER TABLE stock_document_lines
ADD COLUMN IF NOT EXISTS need_cm INT NULL COMMENT 'Aluminum: cm cần dùng (user input converted)';

ALTER TABLE stock_document_lines
ADD COLUMN IF NOT EXISTS bars_deducted INT NULL COMMENT 'Aluminum: số cây đã trừ';

ALTER TABLE stock_document_lines
ADD COLUMN IF NOT EXISTS scrap_created_cm INT NULL COMMENT 'Aluminum: cm thừa đã sinh';

ALTER TABLE stock_document_lines
ADD COLUMN IF NOT EXISTS scrap_used_cm INT NULL COMMENT 'Aluminum: cm thừa đã sử dụng';

ALTER TABLE stock_document_lines
ADD COLUMN IF NOT EXISTS use_scrap TINYINT(1) DEFAULT 0 COMMENT 'Ưu tiên dùng nhôm thừa';

SELECT 'Phase 1.4: Added aluminum columns to stock_document_lines' AS status;


-- =====================================================
-- PHASE 1.5: Add meta_json to stock_ledger
-- =====================================================

ALTER TABLE stock_ledger
ADD COLUMN IF NOT EXISTS meta_json JSON NULL COMMENT 'Metadata for special calculations (aluminum, etc.)';

SELECT 'Phase 1.5: Added meta_json to stock_ledger' AS status;


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check aluminum_systems columns
SELECT 'aluminum_systems columns:' AS info;
SHOW COLUMNS FROM aluminum_systems LIKE 'standard_length_cm';

-- Check aluminum_scraps columns  
SELECT 'aluminum_scraps columns:' AS info;
SHOW COLUMNS FROM aluminum_scraps;

-- Check stock_document_lines columns
SELECT 'stock_document_lines aluminum columns:' AS info;
SHOW COLUMNS FROM stock_document_lines LIKE '%cm';
SHOW COLUMNS FROM stock_document_lines LIKE 'bars%';
SHOW COLUMNS FROM stock_document_lines LIKE 'system_id';

-- Summary
SELECT 
    'Migration Complete!' AS status,
    (SELECT COUNT(*) FROM aluminum_scraps WHERE status = 'available') AS available_scraps,
    (SELECT COUNT(*) FROM aluminum_scraps WHERE status = 'used') AS used_scraps,
    (SELECT COUNT(*) FROM aluminum_systems) AS total_aluminum_systems;
