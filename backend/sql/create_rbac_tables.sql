-- =====================================================
-- RBAC (Role-Based Access Control) Tables
-- Hệ thống Phân Quyền Người Dùng cho ViralWindow
-- Created: 2026-01-24
-- =====================================================

-- 1. Bảng Chức Vụ (Roles)
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE COMMENT 'TRUE = không thể xóa (role hệ thống)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng Danh Sách Quyền (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã quyền: module.action',
    name VARCHAR(150) NOT NULL COMMENT 'Tên hiển thị tiếng Việt',
    module VARCHAR(50) NOT NULL COMMENT 'Nhóm chức năng',
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Liên Kết Chức Vụ - Quyền
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 4. Cập nhật bảng users - thêm cột role_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT NULL AFTER user_type;
ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

-- =====================================================
-- INSERT DỮ LIỆU MẪU
-- =====================================================

-- Tạo các chức vụ mặc định
INSERT INTO roles (name, description, is_system) VALUES
('Super Admin', 'Quản trị viên cao nhất - Full quyền hệ thống', TRUE),
('Quản lý', 'Quản lý công ty - Có hầu hết các quyền', FALSE),
('Kế toán', 'Bộ phận kế toán - Quản lý tài chính', FALSE),
('Thiết kế', 'Nhân viên thiết kế - Xử lý bản vẽ, BOM', FALSE),
('Sản xuất', 'Bộ phận sản xuất - Theo dõi sản xuất', FALSE),
('Kho', 'Nhân viên kho - Quản lý kho hàng', FALSE),
('Lắp đặt', 'Đội lắp đặt - Bàn giao công trình', FALSE),
('Kinh doanh', 'Bộ phận kinh doanh - Báo giá, dự án', FALSE);

-- Tạo danh sách permissions theo module
INSERT INTO permissions (code, name, module, sort_order) VALUES
-- Dashboard
('dashboard.view', 'Xem Dashboard', 'Dashboard', 1),

-- Dự án (Projects)
('projects.view', 'Xem danh sách dự án', 'Dự án', 10),
('projects.create', 'Tạo dự án mới', 'Dự án', 11),
('projects.edit', 'Chỉnh sửa dự án', 'Dự án', 12),
('projects.delete', 'Xóa dự án', 'Dự án', 13),
('projects.cancel', 'Hủy dự án', 'Dự án', 14),
('projects.restore', 'Khôi phục dự án', 'Dự án', 15),

-- Thiết kế (Design)
('design.view', 'Xem thiết kế', 'Thiết kế', 20),
('design.edit', 'Chỉnh sửa thiết kế', 'Thiết kế', 21),
('design.approve', 'Duyệt thiết kế', 'Thiết kế', 22),
('design.bom', 'Quản lý BOM', 'Thiết kế', 23),

-- Báo giá (Quotation)
('quotation.view', 'Xem báo giá', 'Báo giá', 30),
('quotation.create', 'Tạo báo giá', 'Báo giá', 31),
('quotation.edit', 'Chỉnh sửa báo giá', 'Báo giá', 32),
('quotation.approve', 'Duyệt chốt báo giá', 'Báo giá', 33),
('quotation.export', 'Xuất Excel báo giá', 'Báo giá', 34),

-- Kho (Inventory)
('inventory.view', 'Xem kho hàng', 'Kho', 40),
('inventory.manage', 'Quản lý tồn kho', 'Kho', 41),
('inventory.import', 'Nhập kho', 'Kho', 42),
('inventory.export', 'Xuất kho', 'Kho', 43),
('inventory.request', 'Yêu cầu vật tư', 'Kho', 44),

-- Sản xuất (Production)
('production.view', 'Xem sản xuất', 'Sản xuất', 50),
('production.manage', 'Quản lý sản xuất', 'Sản xuất', 51),
('production.excel', 'Xem Excel theo dõi', 'Sản xuất', 52),

-- Lắp đặt (Installation)
('installation.view', 'Xem lắp đặt', 'Lắp đặt', 60),
('installation.manage', 'Quản lý lắp đặt', 'Lắp đặt', 61),
('installation.handover', 'Bàn giao công trình', 'Lắp đặt', 62),

-- Tài chính (Finance)
('finance.view', 'Xem tài chính', 'Tài chính', 70),
('finance.dashboard', 'Dashboard tài chính', 'Tài chính', 71),
('finance.receipts', 'Quản lý phiếu thu', 'Tài chính', 72),
('finance.payments', 'Quản lý phiếu chi', 'Tài chính', 73),
('finance.debt', 'Quản lý công nợ', 'Tài chính', 74),
('finance.hr', 'Quản lý nhân sự', 'Tài chính', 75),
('finance.reports', 'Báo cáo tài chính', 'Tài chính', 76),

-- Khách hàng (Customers)
('customers.view', 'Xem khách hàng', 'Khách hàng', 80),
('customers.manage', 'Quản lý khách hàng', 'Khách hàng', 81),

-- Báo cáo (Reports)
('reports.view', 'Xem báo cáo', 'Báo cáo', 90),
('reports.export', 'Xuất báo cáo', 'Báo cáo', 91),

-- Quản trị hệ thống (Admin)
('admin.users', 'Quản lý người dùng', 'Quản trị', 100),
('admin.roles', 'Quản lý chức vụ', 'Quản trị', 101),
('admin.settings', 'Cài đặt hệ thống', 'Quản trị', 102),
('admin.agencies', 'Quản lý chi nhánh', 'Quản trị', 103);

-- =====================================================
-- GÁN QUYỀN CHO CÁC CHỨC VỤ MẶC ĐỊNH
-- =====================================================

-- Super Admin - Full quyền (tất cả permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Quản lý - Gần như full quyền (trừ quản trị roles)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE code NOT IN ('admin.roles');

-- Kế toán - Quyền tài chính và xem dự án
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions 
WHERE module IN ('Dashboard', 'Tài chính', 'Báo cáo') 
   OR code IN ('projects.view', 'quotation.view', 'customers.view');

-- Thiết kế - Quyền thiết kế và xem dự án
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions 
WHERE module IN ('Dashboard', 'Thiết kế') 
   OR code IN ('projects.view', 'quotation.view', 'inventory.view');

-- Sản xuất - Quyền sản xuất và kho
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions 
WHERE module IN ('Dashboard', 'Sản xuất') 
   OR code IN ('projects.view', 'inventory.view', 'inventory.request');

-- Kho - Quyền kho đầy đủ
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions 
WHERE module IN ('Dashboard', 'Kho') 
   OR code IN ('projects.view', 'production.view');

-- Lắp đặt - Quyền lắp đặt
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions 
WHERE module IN ('Dashboard', 'Lắp đặt') 
   OR code IN ('projects.view', 'inventory.view');

-- Kinh doanh - Quyền báo giá và khách hàng
INSERT INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions 
WHERE module IN ('Dashboard', 'Báo giá', 'Khách hàng') 
   OR code IN ('projects.view', 'projects.create', 'reports.view');

-- =====================================================
-- CẬP NHẬT USER HIỆN TẠI THÀNH SUPER ADMIN
-- =====================================================
UPDATE users SET role_id = 1 WHERE user_type = 'admin';
