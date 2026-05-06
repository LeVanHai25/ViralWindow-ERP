CREATE TABLE IF NOT EXISTS other_item_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial data
INSERT IGNORE INTO other_item_categories (name) VALUES 
('Ke'), 
('Gioăng'), 
('Nhựa ốp'), 
('Keo'), 
('Khác');
