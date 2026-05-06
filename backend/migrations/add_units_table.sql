-- Migration: Add units table and unit_id to customers
-- File: add_units_table.sql

-- 1. Create units table (Đơn vị/Chi nhánh)
CREATE TABLE IF NOT EXISTS units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    address VARCHAR(255),
    phone VARCHAR(20),
    manager_name VARCHAR(100),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Add unit_id column to customers table
ALTER TABLE customers 
ADD COLUMN unit_id INT DEFAULT NULL,
ADD FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;

-- 3. Insert default units (sample data)
INSERT INTO units (name, code, address, status) VALUES
('Chi nhánh Hà Nội', 'HN', 'Hà Nội', 'active'),
('Chi nhánh Nam Định', 'ND', 'Nam Định', 'active'),
('Chi nhánh Hà Nam', 'HNA', 'Hà Nam', 'active'),
('Chi nhánh Viralwindow', 'VW', 'Trụ sở chính', 'active');

-- 4. Update existing customers to default unit (Viralwindow)
UPDATE customers SET unit_id = (SELECT id FROM units WHERE code = 'VW' LIMIT 1) WHERE unit_id IS NULL;
