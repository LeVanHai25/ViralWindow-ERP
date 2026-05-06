-- Migration: Add timestamp columns to projects table for timeline tracking
-- These columns store full datetime (with hours/minutes) when project moves to each stage

-- Add moved_to_installation_at if not exists
SET @dbname = DATABASE();
SET @tablename = 'projects';
SET @columnname = 'moved_to_installation_at';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
    ) = 0,
    CONCAT('ALTER TABLE ', @tablename, ' ADD ', @columnname, ' DATETIME NULL;'),
    'SELECT 1;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add handover_date if not exists  
SET @columnname = 'handover_date';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
    ) = 0,
    CONCAT('ALTER TABLE ', @tablename, ' ADD ', @columnname, ' DATETIME NULL;'),
    'SELECT 1;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add completed_at if not exists
SET @columnname = 'completed_at';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
    ) = 0,
    CONCAT('ALTER TABLE ', @tablename, ' ADD ', @columnname, ' DATETIME NULL;'),
    'SELECT 1;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify columns were added
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'projects' 
AND COLUMN_NAME IN ('moved_to_installation_at', 'handover_date', 'completed_at');
