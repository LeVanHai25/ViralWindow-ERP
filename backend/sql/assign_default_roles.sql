-- ==================================================================
-- GÁN ROLE MẶC ĐỊNH CHO TẤT CẢ TÀI KHOẢN
-- ==================================================================

-- Bước 1: Kiểm tra users chưa có role
SELECT id, full_name, email, user_type, role_id 
FROM users 
WHERE role_id IS NULL 
ORDER BY created_at DESC;

-- Bước 2: Gán role mặc định dựa vào user_type
-- Admin → Super Admin (id = 1)
UPDATE users 
SET role_id = 1 
WHERE user_type = 'admin' AND role_id IS NULL;

-- User thường → Kinh doanh (id = 8) - role mặc định
UPDATE users 
SET role_id = 8 
WHERE user_type != 'admin' AND role_id IS NULL;

-- Bước 3: Verify tất cả users đã có role
SELECT 
    u.id, 
    u.full_name, 
    u.email, 
    u.user_type,
    u.role_id,
    r.name as role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;

-- Bước 4: Kiểm tra nếu còn NULL
SELECT COUNT(*) as users_without_role
FROM users 
WHERE role_id IS NULL;
