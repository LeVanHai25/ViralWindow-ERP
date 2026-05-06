-- Tạo bảng gán ca làm việc cho nhân viên
CREATE TABLE IF NOT EXISTS user_shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    shift_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_shift (user_id),
    KEY idx_shift (shift_id)
);
        
