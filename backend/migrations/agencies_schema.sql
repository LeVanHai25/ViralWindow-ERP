-- Migration: Agencies Schema
-- Chuyển từ bảng units sang agencies với đầy đủ tính năng

-- 1. Tạo bảng agencies (đại lý/chi nhánh)
CREATE TABLE IF NOT EXISTS agencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    region VARCHAR(100),                    -- Khu vực địa lý
    manager_name VARCHAR(100),              -- Người quản lý
    manager_phone VARCHAR(20),
    logo_url VARCHAR(255),                  -- Logo đại lý
    notes TEXT,
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng lịch sử chuyển đổi đại lý (audit log)
CREATE TABLE IF NOT EXISTS customer_agency_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    from_agency_id INT,                     -- NULL nếu lần đầu gán
    to_agency_id INT NOT NULL,
    transferred_by INT,                     -- user_id người thực hiện
    reason TEXT,                            -- Lý do chuyển
    transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 3. Chèn dữ liệu mẫu agencies (migrate từ units)
INSERT INTO agencies (code, name, address, region, status) VALUES
('HQ', 'Viralwindow - Trụ sở chính', 'Hà Nội', 'Hà Nội', 'active'),
('HN', 'Chi nhánh Hà Nội', 'Hà Nội', 'Miền Bắc', 'active'),
('ND', 'Chi nhánh Nam Định', 'Nam Định', 'Miền Bắc', 'active'),
('HNA', 'Chi nhánh Hà Nam', 'Hà Nam', 'Miền Bắc', 'active');
