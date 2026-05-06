-- =====================================================
-- ADD HANDOVER COLUMNS TO PROJECTS TABLE
-- Migration để thêm các cột bàn giao vào bảng projects
-- =====================================================

-- Thêm cột handover_date (ngày bàn giao)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS handover_date DATE NULL;

-- Thêm cột handover_status (trạng thái bàn giao: pending/completed)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS handover_status VARCHAR(32) DEFAULT 'pending';

-- Thêm cột handover_notes (ghi chú bàn giao)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS handover_notes TEXT NULL;

-- Thêm cột progress_percent (tiến độ %)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percent INT DEFAULT 0;

-- =====================================================
SELECT 'Handover columns added successfully!' as result;
-- =====================================================
