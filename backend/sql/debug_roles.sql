-- Check roles table data
SELECT * FROM roles ORDER BY id;

-- Check user with email ly@gmail.com
SELECT u.id, u.full_name, u.email, u.role_id, u.user_type,
       r.id as role_table_id, r.name as role_name, r.description
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'ly@gmail.com';

-- Check if there's duplicate or wrong role data
SELECT * FROM roles WHERE name LIKE '%Quyền%' OR name LIKE '%cấp phép%';
