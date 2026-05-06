-- Script to drop all employee-related tables
-- Run this script to remove all employee, timekeeping, salary, and commission tables

-- Drop foreign key constraints first
SET FOREIGN_KEY_CHECKS = 0;

-- Drop commissions table (has foreign key to employees)
DROP TABLE IF EXISTS commissions;

-- Drop salaries table (has foreign key to employees)
DROP TABLE IF EXISTS salaries;

-- Drop timekeeping table (has foreign key to employees)
DROP TABLE IF EXISTS timekeeping;

-- Drop employees table
DROP TABLE IF EXISTS employees;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify tables are dropped
SELECT 'Employee-related tables have been dropped successfully' AS message;















