-- Create accessory_categories table
CREATE TABLE IF NOT EXISTS accessory_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial categories for Accessories
INSERT IGNORE INTO accessory_categories (name) VALUES 
('Khóa'),
('Bản lề'),
('Tay nắm'),
('Phụ kiện lùa'),
('Phụ kiện khác');
