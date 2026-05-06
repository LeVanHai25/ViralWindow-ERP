-- =====================================================
-- BỔ SUNG PERMISSION CODES CHO ĐẦY ĐỦ CHỨC NĂNG
-- ViralWindow RBAC System - Updated 2026-02-09
-- =====================================================

-- Kiểm tra và thêm các permissions còn thiếu
-- (Sử dụng INSERT IGNORE để tránh lỗi trùng lặp)

INSERT IGNORE INTO permissions (code, name, module, sort_order) VALUES
-- === SẢN PHẨM (Products) - Thiếu trong bản gốc ===
('products.view', 'Xem sản phẩm', 'Sản phẩm', 25),
('products.manage', 'Quản lý sản phẩm', 'Sản phẩm', 26),

-- === THIẾT KẾ - Bổ sung thêm ===
('design.create', 'Tạo thiết kế mới', 'Thiết kế', 24),

-- === THEO DÕI DỰ ÁN - Bổ sung ===
('production.tracking', 'Theo dõi tiến độ dự án', 'Sản xuất', 53),

-- === THÔNG BÁO (Notifications) ===
('notifications.view', 'Xem thông báo', 'Thông báo', 120),
('notifications.manage', 'Quản lý thông báo', 'Thông báo', 121);

-- =====================================================
-- Thông báo: Chạy lệnh này trong MySQL/MariaDB
-- =====================================================
-- Sau khi chạy xong, refreshlại trang admin-management.html
-- để thấy các quyền mới trong menu Phân quyền
