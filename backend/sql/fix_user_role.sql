-- Fix user Van Thi Cam Ly role to "Kinh doanh"

-- Bước 1: Kiểm tra role ID của "Kinh doanh"
SELECT id, name FROM roles WHERE name = 'Kinh doanh';

-- Bước 2: Kiểm tra user hiện tại
SELECT id, full_name, email, role_id FROM users WHERE email = 'ly@gmail.com';

-- Bước 3: Update user role_id = 8 (Kinh doanh)
UPDATE users SET role_id = 8 WHERE email = 'ly@gmail.com';

-- Bước 4: Verify update
SELECT u.id, u.full_name, u.email, u.role_id, r.name as role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'ly@gmail.com';
