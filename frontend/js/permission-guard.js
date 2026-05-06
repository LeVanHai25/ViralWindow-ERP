/**
 * Permission Guard - Kiểm tra quyền truy cập Frontend
 * ViralWindow RBAC System
 * 
 * Sử dụng: Thêm <script src="js/permission-guard.js"></script> vào trang
 */

(function () {
    'use strict';

    // Lazy getter - must be called at runtime, not at load time
    // because config.js may not have loaded yet when this IIFE runs
    function getApiBase() {
        return window.API_BASE || '/api';
    }

    // Mapping giữa page và permissions cần thiết
    // LƯU Ý: Permission codes phải KHỚP CHÍNH XÁC với database (bảng permissions)
    const PAGE_PERMISSIONS = {
        // === PUBLIC PAGES - Không cần quyền đặc biệt ===
        'index.html': [],               // Dashboard - ai cũng xem được
        'profile.html': [],             // Hồ sơ cá nhân
        'notifications.html': [],       // Thông báo cá nhân
        'login.html': [],               // Đăng nhập
        'forgot-password.html': [],     // Quên mật khẩu
        'register.html': [],            // Đăng ký

        // === DASHBOARD ===
        'dashboard-v2.html': ['dashboard.view'],

        // === DỰ ÁN (Projects) ===
        'projects-new.html': ['projects.view'],
        'projects.html': ['projects.view'],
        'project-detail.html': ['projects.view'],
        'project-logs.html': ['projects.view'],
        'project-doors.html': ['projects.view'],
        'cancelled-projects.html': ['projects.view'],
        'completed-projects.html': ['projects.view'],

        // === THEO DÕI DỰ ÁN ===
        'production-excel-view.html': ['projects.view', 'production.view'],
        'order-tracking.html': ['projects.view'],

        // === KHÁCH HÀNG ===
        'sales.html': ['customers.view'],

        // === SẢN PHẨM ===
        'product-catalog.html': ['projects.view'],
        'product-catalog-v2.html': ['projects.view'],

        // === BÁO GIÁ (Quotation - không có 's') ===
        'quotation-new.html': ['quotation.view', 'quotation.create'],
        'pending-quotations.html': ['quotation.approve'],

        // === THIẾT KẾ (Design) ===
        'design-new.html': ['design.view'],
        'design-new-v2.html': ['design.view'],
        'design_new.html': ['design.view'],
        'design_old.html': ['design.view'],
        'design-workflow.html': ['design.view'],
        'design-modals.html': ['design.view'],
        'door-catalog.html': ['design.view'],
        'door-editor.html': ['design.view', 'design.edit'],
        'door-editor-new.html': ['design.view', 'design.edit'],
        'door-editor-old.html': ['design.view', 'design.edit'],

        // === YÊU CẦU VẬT TƯ (sử dụng inventory.request từ DB) ===
        'material-requests.html': ['inventory.request'],
        'material-requests-clean.html': ['inventory.request'],
        'purchase-request.html': ['inventory.request'],

        // === KHO & VẬT TƯ (Inventory) ===
        'inventory.html': ['inventory.view'],
        'inventory-warnings.html': ['inventory.view'],
        'exported-materials.html': ['inventory.export'],
        'warehouse-export.html': ['inventory.export'],
        'warehouse-export-form.html': ['inventory.export'],
        'label-printer.html': ['inventory.view'],

        // === SẢN XUẤT (Production) ===
        'production.html': ['production.view'],
        'product-manufacturing.html': ['production.manage'],
        'workflow.html': ['production.view'],

        // === LẮP ĐẶT & BÀN GIAO (Installation) ===
        'installation.html': ['installation.view', 'installation.manage'],
        'handover.html': ['installation.handover'],

        // === TÀI CHÍNH (Finance) ===
        'finance-dashboard.html': ['finance.view'],
        'finance-receipts.html': ['finance.receipts'],
        'finance-payments.html': ['finance.payments'],
        'finance-debt.html': ['finance.debt'],
        'finance-hr.html': ['finance.hr'],
        'finance-reports.html': ['finance.reports'],
        'finance-cashflow.html': ['finance.view'],
        'finance-cost-profit.html': ['finance.view'],

        // === BÁO CÁO (Reports) ===
        'reports.html': ['reports.view'],

        // === QUẢN TRỊ (Admin) ===
        'admin-management.html': ['admin.users', 'admin.roles'],
        'user-management.html': ['admin.users'],
        'role-management.html': ['admin.roles'],
        'settings.html': ['admin.settings'],
        'agencies.html': ['admin.agencies'],
        'company.html': ['admin.settings']
    };


    // Cache permissions
    let userPermissions = null;
    let userInfo = null;
    let isAdmin = false;

    /**
     * Get token from sessionStorage or localStorage (for Remember Me)
     */
    function getToken() {
        return sessionStorage.getItem('token') || localStorage.getItem('token');
    }

    /**
     * Get user from sessionStorage or localStorage
     */
    function getUser() {
        const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Lấy permissions của user hiện tại
     */
    async function loadMyPermissions() {
        try {
            const token = getToken();
            if (!token) {
                redirectToLogin();
                return [];
            }

            const response = await fetch(`${getApiBase()}/permissions/my`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    redirectToLogin();
                }
                return [];
            }

            const result = await response.json();
            if (result.success) {
                userPermissions = result.data || [];
                isAdmin = result.isAdmin || false;

                // Cache vào sessionStorage
                sessionStorage.setItem('userPermissions', JSON.stringify(userPermissions));
                sessionStorage.setItem('isAdmin', isAdmin.toString());

                return userPermissions;
            }
            return [];
        } catch (error) {
            console.error('Error loading permissions:', error);
            // Fallback to cached permissions
            const cached = sessionStorage.getItem('userPermissions');
            return cached ? JSON.parse(cached) : [];
        }
    }

    /**
     * Kiểm tra user có permission không
     */
    function hasPermission(permissionCode) {
        if (isAdmin) return true;
        if (!userPermissions) return false;
        // userPermissions là array of objects: [{code, name, module}, ...]
        // Backward compatible: cũng hỗ trợ array of strings từ cache cũ
        return userPermissions.some(p =>
            typeof p === 'string' ? p === permissionCode : p.code === permissionCode
        );
    }

    /**
     * Kiểm tra user có ít nhất 1 trong các permissions không
     */
    function hasAnyPermission(permissionCodes) {
        if (isAdmin) return true;
        if (!userPermissions || !permissionCodes || permissionCodes.length === 0) return true;
        // userPermissions là array of objects: [{code, name, module}, ...]
        // Backward compatible: cũng hỗ trợ array of strings từ cache cũ
        return permissionCodes.some(code =>
            userPermissions.some(p =>
                typeof p === 'string' ? p === code : p.code === code
            )
        );
    }

    function redirectToLogin() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('userPermissions');
        sessionStorage.removeItem('isAdmin');
        window.location.href = 'login.html';
    }

    /**
     * Hiển thị modal không có quyền
     */
    function showAccessDeniedModal() {
        // Tạo overlay
        const overlay = document.createElement('div');
        overlay.id = 'accessDeniedOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Tạo modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;

        const user = getUser() || {};
        const roleName = user.role_name || 'Chưa phân quyền';

        modal.innerHTML = `
            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: #FEE2E2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg style="width: 40px; height: 40px; color: #EF4444" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
            </div>
            <h2 style="color: #1F2937; font-size: 24px; font-weight: 700; margin-bottom: 12px;">Không có quyền truy cập</h2>
            <p style="color: #6B7280; font-size: 15px; margin-bottom: 8px;">Bạn đang đăng nhập với chức vụ:</p>
            <p style="color: #3B82F6; font-size: 18px; font-weight: 600; margin-bottom: 20px;">${roleName}</p>
            <p style="color: #6B7280; font-size: 14px; margin-bottom: 24px;">Chức năng này không nằm trong quyền hạn của bạn. Vui lòng liên hệ quản trị viên nếu cần được cấp quyền.</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="window.history.back()" style="padding: 12px 24px; border: 1px solid #E5E7EB; background: white; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    ← Quay lại
                </button>
                <button onclick="window.location.href='index.html'" style="padding: 12px 24px; background: #3B82F6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    Về trang chủ
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Kiểm tra quyền truy cập trang hiện tại
     */
    async function checkPageAccess() {
        // Lấy tên file hiện tại
        const path = window.location.pathname;
        const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

        // Các trang không cần kiểm tra
        const publicPages = ['login.html', 'forgot-password.html', 'register.html'];
        if (publicPages.includes(currentPage)) {
            return;
        }

        // Kiểm tra đã đăng nhập chưa
        const token = getToken();
        if (!token) {
            redirectToLogin();
            return;
        }

        // Load permissions
        await loadMyPermissions();

        // Lấy permissions cần thiết cho trang này
        const requiredPermissions = PAGE_PERMISSIONS[currentPage];

        // Nếu trang không được định nghĩa, mặc định cho phép (hoặc có thể block)
        if (!requiredPermissions) {
            console.log(`[PermissionGuard] Page ${currentPage} not defined, allowing access`);
            return;
        }

        // Nếu không yêu cầu permission nào (mảng rỗng), cho phép
        if (requiredPermissions.length === 0) {
            return;
        }

        // Kiểm tra có ít nhất 1 permission không
        if (!hasAnyPermission(requiredPermissions)) {
            console.log(`[PermissionGuard] Access denied for ${currentPage}. Required: ${requiredPermissions.join(', ')}`);
            showAccessDeniedModal();
        }
    }

    /**
     * Ẩn các menu không có quyền trong sidebar
     */
    function filterSidebarMenus() {
        // Đợi sidebar load xong
        setTimeout(() => {
            const menuItems = document.querySelectorAll('.sidebar-nav a.nav-item, .sidebar-nav a.submenu-item');

            menuItems.forEach(item => {
                const href = item.getAttribute('href');
                if (!href) return;

                const page = href.split('/').pop();
                const requiredPerms = PAGE_PERMISSIONS[page];

                if (requiredPerms && requiredPerms.length > 0 && !hasAnyPermission(requiredPerms)) {
                    // Ẩn hoặc disable menu item
                    item.style.opacity = '0.5';
                    item.style.pointerEvents = 'none';
                    item.title = 'Bạn không có quyền truy cập';
                }
            });
        }, 500);
    }

    /**
     * Cập nhật hiển thị chức vụ trong sidebar
     */
    function updateRoleDisplay() {
        try {
            const user = getUser() || {};
            const roleName = user.role_name || 'Chưa phân quyền';

            // Tìm và cập nhật element hiển thị role
            const roleDisplays = document.querySelectorAll('.text-xs.text-blue-200, .sidebar-role-text');
            roleDisplays.forEach(el => {
                if (el.textContent === 'Quản lý' || el.textContent === 'Quản trị viên') {
                    el.textContent = roleName;
                }
            });
        } catch (e) {
            console.error('Error updating role display:', e);
        }
    }

    // Expose functions cho global access
    window.PermissionGuard = {
        hasPermission,
        hasAnyPermission,
        loadMyPermissions,
        checkPageAccess,
        filterSidebarMenus,
        updateRoleDisplay,
        showAccessDeniedModal,
        getToken,
        getUser
    };

    // Auto-run khi page load
    document.addEventListener('DOMContentLoaded', async () => {
        await checkPageAccess();
        updateRoleDisplay();
        // filterSidebarMenus(); // Uncomment nếu muốn ẩn menu không có quyền
    });

})();
