-- =====================================================
-- CẬP NHẬT TÊN QUYỀN THEO MENU SIDEBAR
-- ViralWindow RBAC System - Updated 2026-02-09
-- =====================================================

-- Đổi tên module để khớp với menu
UPDATE permissions SET module = 'Tổng quan' WHERE module = 'Dashboard';
UPDATE permissions SET module = 'Kinh doanh' WHERE module IN ('Dự án', 'Báo giá', 'Khách hàng', 'Sản phẩm');
UPDATE permissions SET module = 'Kỹ thuật' WHERE module = 'Thiết kế';
UPDATE permissions SET module = 'Kho & Vật tư' WHERE module = 'Kho';
UPDATE permissions SET module = 'Thi công & Nghiệm thu' WHERE module IN ('Sản xuất', 'Lắp đặt');

-- =====================================================
-- CẬP NHẬT TÊN QUYỀN CHI TIẾT
-- =====================================================

-- === TỔNG QUAN ===
UPDATE permissions SET name = 'Xem Tổng quan' WHERE code = 'dashboard.view';

-- === KINH DOANH - Khách hàng ===
UPDATE permissions SET name = 'Xem Khách hàng' WHERE code = 'customers.view';
UPDATE permissions SET name = 'Quản lý Khách hàng' WHERE code = 'customers.manage';

-- === KINH DOANH - Dự án ===
UPDATE permissions SET name = 'Xem Dự án' WHERE code = 'projects.view';
UPDATE permissions SET name = 'Tạo Dự án mới' WHERE code = 'projects.create';
UPDATE permissions SET name = 'Chỉnh sửa Dự án' WHERE code = 'projects.edit';
UPDATE permissions SET name = 'Xóa Dự án' WHERE code = 'projects.delete';
UPDATE permissions SET name = 'Hủy Dự án' WHERE code = 'projects.cancel';
UPDATE permissions SET name = 'Khôi phục Dự án' WHERE code = 'projects.restore';

-- === KINH DOANH - Báo giá ===
UPDATE permissions SET name = 'Xem Báo giá' WHERE code = 'quotation.view';
UPDATE permissions SET name = 'Tạo Báo giá' WHERE code = 'quotation.create';
UPDATE permissions SET name = 'Chỉnh sửa Báo giá' WHERE code = 'quotation.edit';
UPDATE permissions SET name = 'Duyệt chốt Báo giá' WHERE code = 'quotation.approve';
UPDATE permissions SET name = 'Xuất Excel Báo giá' WHERE code = 'quotation.export';

-- === KỸ THUẬT - Thiết kế & Bóc tách ===
UPDATE permissions SET name = 'Xem Thiết kế & Bóc tách' WHERE code = 'design.view';
UPDATE permissions SET name = 'Chỉnh sửa Thiết kế' WHERE code = 'design.edit';
UPDATE permissions SET name = 'Duyệt Thiết kế' WHERE code = 'design.approve';
UPDATE permissions SET name = 'Quản lý BOM' WHERE code = 'design.bom';

-- === KHO & VẬT TƯ ===
UPDATE permissions SET name = 'Xem Kho vật tư' WHERE code = 'inventory.view';
UPDATE permissions SET name = 'Quản lý Tồn kho' WHERE code = 'inventory.manage';
UPDATE permissions SET name = 'Nhập kho' WHERE code = 'inventory.import';
UPDATE permissions SET name = 'Xuất vật tư' WHERE code = 'inventory.export';
UPDATE permissions SET name = 'Yêu cầu vật tư' WHERE code = 'inventory.request';

-- === THI CÔNG & NGHIỆM THU - Sản xuất ===
UPDATE permissions SET name = 'Xem Sản xuất sản phẩm' WHERE code = 'production.view';
UPDATE permissions SET name = 'Quản lý Sản xuất' WHERE code = 'production.manage';
UPDATE permissions SET name = 'Theo dõi Dự án (Excel)' WHERE code = 'production.excel';

-- === THI CÔNG & NGHIỆM THU - Lắp đặt ===
UPDATE permissions SET name = 'Xem Lắp đặt' WHERE code = 'installation.view';
UPDATE permissions SET name = 'Quản lý Lắp đặt' WHERE code = 'installation.manage';
UPDATE permissions SET name = 'Bàn giao công trình' WHERE code = 'installation.handover';

-- === TÀI CHÍNH ===
UPDATE permissions SET name = 'Xem Tổng quan Tài chính' WHERE code = 'finance.view';
UPDATE permissions SET name = 'Dashboard Tài chính' WHERE code = 'finance.dashboard';
UPDATE permissions SET name = 'Quản lý Phiếu thu' WHERE code = 'finance.receipts';
UPDATE permissions SET name = 'Quản lý Phiếu chi' WHERE code = 'finance.payments';
UPDATE permissions SET name = 'Quản lý Công nợ' WHERE code = 'finance.debt';
UPDATE permissions SET name = 'Quản lý Nhân sự' WHERE code = 'finance.hr';
UPDATE permissions SET name = 'Báo cáo Tài chính' WHERE code = 'finance.reports';

-- === BÁO CÁO ===
UPDATE permissions SET name = 'Xem Báo cáo' WHERE code = 'reports.view';
UPDATE permissions SET name = 'Xuất Báo cáo' WHERE code = 'reports.export';

-- === QUẢN TRỊ ===
UPDATE permissions SET name = 'Quản lý Người dùng' WHERE code = 'admin.users';
UPDATE permissions SET name = 'Quản lý Chức vụ' WHERE code = 'admin.roles';
UPDATE permissions SET name = 'Cài đặt Hệ thống' WHERE code = 'admin.settings';
UPDATE permissions SET name = 'Quản lý Chi nhánh' WHERE code = 'admin.agencies';

-- =====================================================
-- THÊM QUYỀN MỚI CHO CÁC MỤC MENU CÒN THIẾU
-- =====================================================

INSERT IGNORE INTO permissions (code, name, module, sort_order) VALUES
-- Theo dõi dự án
('tracking.view', 'Xem Theo dõi Dự án', 'Theo dõi Dự án', 5),

-- Kinh doanh - Sản phẩm
('products.view', 'Xem Sản phẩm', 'Kinh doanh', 45),
('products.manage', 'Quản lý Sản phẩm', 'Kinh doanh', 46),

-- Kinh doanh - Quy trình dự án
('workflow.view', 'Xem Quy trình Dự án', 'Kinh doanh', 47),

-- Kỹ thuật - Tạo phiếu yêu cầu VT
('purchase.create', 'Tạo phiếu Yêu cầu VT', 'Kỹ thuật', 55);

-- =====================================================
-- SẮP XẾP LẠI THỨ TỰ HIỂN THỊ
-- =====================================================

UPDATE permissions SET sort_order = 1 WHERE module = 'Tổng quan';
UPDATE permissions SET sort_order = 5 WHERE module = 'Theo dõi Dự án';
UPDATE permissions SET sort_order = 10 WHERE module = 'Kinh doanh';
UPDATE permissions SET sort_order = 30 WHERE module = 'Kỹ thuật';
UPDATE permissions SET sort_order = 50 WHERE module = 'Kho & Vật tư';
UPDATE permissions SET sort_order = 70 WHERE module = 'Thi công & Nghiệm thu';
UPDATE permissions SET sort_order = 90 WHERE module = 'Tài chính';
UPDATE permissions SET sort_order = 100 WHERE module = 'Báo cáo';
UPDATE permissions SET sort_order = 110 WHERE module = 'Quản trị';

-- =====================================================
-- XONG! Refresh trang admin-management.html để thấy thay đổi
-- =====================================================
