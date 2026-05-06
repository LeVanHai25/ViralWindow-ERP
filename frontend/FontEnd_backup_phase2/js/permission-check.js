/**
 * Permission Check System - Kiểm tra quyền trên Frontend
 * ViralWindow RBAC System
 * 
 * Sử dụng:
 * 1. Load file này ở đầu trang: <script src="js/permission-check.js"></script>
 * 2. Gọi await PermissionCheck.init() trong DOMContentLoaded
 * 3. Kiểm tra quyền: PermissionCheck.has('projects.create')
 * 4. Kiểm tra và redirect: PermissionCheck.requireAll(['projects.view'])
 */

const PermissionCheck = {
    permissions: [],
    isAdmin: false,
    loaded: false,

    /**
     * Khởi tạo - load permissions của user hiện tại
     * @returns {Promise<boolean>} true nếu load thành công
     */
    async init() {
        if (this.loaded) return true;

        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('PermissionCheck: No token found');
            return false;
        }

        try {
            const API_BASE = window.API_BASE || '/api';
            const response = await fetch(`${API_BASE}/permissions/my`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401 || response.status === 403) {
                console.warn('PermissionCheck: Unauthorized');
                return false;
            }

            const result = await response.json();
            if (result.success) {
                this.permissions = result.data || [];
                this.isAdmin = result.isAdmin || false;
                this.loaded = true;
                console.log('PermissionCheck: Loaded', this.permissions.length, 'permissions');
                return true;
            }
        } catch (error) {
            console.error('PermissionCheck: Error loading permissions', error);
        }

        return false;
    },

    /**
     * Kiểm tra có quyền không
     * @param {string} permissionCode - Mã quyền (vd: 'projects.view')
     * @returns {boolean}
     */
    has(permissionCode) {
        if (this.isAdmin) return true;
        // permissions là array of objects: [{code, name, module}, ...]
        return this.permissions.some(p =>
            typeof p === 'string' ? p === permissionCode : p.code === permissionCode
        );
    },

    /**
     * Kiểm tra có ÍT NHẤT MỘT trong các quyền
     * @param {string[]} permissionCodes - Danh sách mã quyền
     * @returns {boolean}
     */
    hasAny(permissionCodes) {
        if (this.isAdmin) return true;
        return permissionCodes.some(code =>
            this.permissions.some(p =>
                typeof p === 'string' ? p === code : p.code === code
            )
        );
    },

    /**
     * Kiểm tra có TẤT CẢ các quyền
     * @param {string[]} permissionCodes - Danh sách mã quyền
     * @returns {boolean}
     */
    hasAll(permissionCodes) {
        if (this.isAdmin) return true;
        return permissionCodes.every(code =>
            this.permissions.some(p =>
                typeof p === 'string' ? p === code : p.code === code
            )
        );
    },

    /**
     * Yêu cầu quyền - redirect nếu không có
     * @param {string} permissionCode - Mã quyền
     * @param {string} redirectUrl - URL redirect (mặc định: dashboard)
     * @returns {boolean} true nếu có quyền
     */
    require(permissionCode, redirectUrl = 'dashboard-v2.html') {
        if (!this.has(permissionCode)) {
            alert('Bạn không có quyền truy cập trang này');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    },

    /**
     * Yêu cầu tất cả quyền - redirect nếu thiếu
     * @param {string[]} permissionCodes - Danh sách mã quyền
     * @param {string} redirectUrl - URL redirect
     * @returns {boolean}
     */
    requireAll(permissionCodes, redirectUrl = 'dashboard-v2.html') {
        if (!this.hasAll(permissionCodes)) {
            alert('Bạn không có quyền truy cập trang này');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    },

    /**
     * Ẩn các element không có quyền
     * Sử dụng attribute: data-permission="projects.create"
     */
    applyToDOM() {
        document.querySelectorAll('[data-permission]').forEach(el => {
            const requiredPermission = el.getAttribute('data-permission');
            if (!this.has(requiredPermission)) {
                el.style.display = 'none';
            }
        });

        document.querySelectorAll('[data-permission-any]').forEach(el => {
            const permissions = el.getAttribute('data-permission-any').split(',');
            if (!this.hasAny(permissions)) {
                el.style.display = 'none';
            }
        });
    },

    /**
     * Filter menu items theo quyền
     * @param {Array} menuItems - Mảng menu items có thuộc tính 'permission'
     * @returns {Array} Menu items có quyền
     */
    filterMenu(menuItems) {
        return menuItems.filter(item => {
            if (!item.permission) return true;
            return this.has(item.permission);
        });
    }
};

/**
 * Mapping quyền cho các trang
 * Sử dụng trong mỗi trang để kiểm tra quyền truy cập
 */
const PagePermissions = {
    // Dashboard
    'dashboard-v2.html': 'dashboard.view',

    // Dự án
    'projects-new.html': 'projects.view',
    'project-detail.html': 'projects.view',
    'cancelled-projects.html': 'projects.view',
    'completed-projects.html': 'projects.view',

    // Thiết kế
    'design-new.html': 'design.view',
    'design-workflow.html': 'design.view',

    // Báo giá
    'quotation-new.html': 'quotation.view',
    'pending-quotations.html': 'quotation.view',

    // Kho
    'inventory.html': 'inventory.view',
    'warehouse-export.html': 'inventory.export',
    'material-requests.html': 'inventory.request',

    // Sản xuất
    'production.html': 'production.view',
    'production-excel-view.html': 'production.excel',
    'product-manufacturing.html': 'production.manage',

    // Lắp đặt
    'installation.html': 'installation.view',
    'handover.html': 'installation.handover',

    // Tài chính
    'finance-dashboard.html': 'finance.dashboard',
    'finance-receipts.html': 'finance.receipts',
    'finance-payments.html': 'finance.payments',
    'finance-debt.html': 'finance.debt',
    'finance-hr.html': 'finance.hr',
    'finance-reports.html': 'finance.reports',

    // Khách hàng
    'sales.html': 'customers.view',

    // Báo cáo
    'reports.html': 'reports.view',

    // Quản trị
    'role-management.html': 'admin.roles',
    'user-management.html': 'admin.users',
    'settings.html': 'admin.settings',
    'agencies.html': 'admin.agencies'
};

/**
 * Auto-check quyền khi trang load
 * Thêm vào đầu mỗi trang:
 * <script>
 *   document.addEventListener('DOMContentLoaded', async () => {
 *     await PermissionCheck.init();
 *     PermissionCheck.checkPageAccess();
 *   });
 * </script>
 */
PermissionCheck.checkPageAccess = function () {
    const currentPage = window.location.pathname.split('/').pop();
    const requiredPermission = PagePermissions[currentPage];

    if (requiredPermission && !this.has(requiredPermission)) {
        alert('Bạn không có quyền truy cập trang này');
        window.location.href = 'dashboard-v2.html';
        return false;
    }

    // Áp dụng ẩn/hiện elements theo quyền
    this.applyToDOM();

    // Filter sidebar menu
    this.filterSidebarMenu();

    return true;
};

/**
 * Filter sidebar menu items theo quyền
 * Thêm attribute data-permission vào menu items trong sidebar
 * Ví dụ: <a href="finance-dashboard.html" data-permission="finance.view">Tài chính</a>
 */
PermissionCheck.filterSidebarMenu = function () {
    // Ẩn menu items có data-permission mà user không có quyền
    document.querySelectorAll('.sidebar-nav [data-permission]').forEach(el => {
        const requiredPermission = el.getAttribute('data-permission');
        if (!this.has(requiredPermission)) {
            el.style.display = 'none';
            // Ẩn cả parent li nếu có
            const parentLi = el.closest('li');
            if (parentLi) parentLi.style.display = 'none';
        }
    });

    // Ẩn submenu groups nếu tất cả items bên trong đều bị ẩn
    document.querySelectorAll('.sidebar-nav .submenu, .sidebar-nav [class*="submenu"]').forEach(submenu => {
        const visibleItems = submenu.querySelectorAll('a:not([style*="display: none"])');
        if (visibleItems.length === 0) {
            const parentGroup = submenu.closest('.menu-group, .nav-group');
            if (parentGroup) parentGroup.style.display = 'none';
        }
    });

    // Ẩn các menu group headers nếu không có items
    document.querySelectorAll('.sidebar-nav .menu-group, .sidebar-nav .nav-group').forEach(group => {
        const visibleLinks = group.querySelectorAll('a:not([style*="display: none"])');
        if (visibleLinks.length === 0) {
            group.style.display = 'none';
        }
    });

    console.log('PermissionCheck: Sidebar menu filtered');
};

/**
 * Mapping permission cho sidebar menu items
 * Sử dụng để auto-thêm data-permission vào menu items dựa trên href
 */
const SidebarPermissionMap = {
    // Dashboard
    'dashboard-v2.html': 'dashboard.view',

    // Dự án
    'projects-new.html': 'projects.view',
    'project-detail.html': 'projects.view',
    'cancelled-projects.html': 'projects.view',
    'completed-projects.html': 'projects.view',

    // Thiết kế
    'design-new.html': 'design.view',
    'design-workflow.html': 'design.view',

    // Báo giá
    'quotation-new.html': 'quotation.view',
    'pending-quotations.html': 'quotation.view',

    // Kho
    'inventory.html': 'inventory.view',
    'warehouse-export.html': 'inventory.export',
    'warehouse-export-form.html': 'inventory.export',
    'material-requests.html': 'inventory.request',
    'exported-materials.html': 'inventory.view',

    // Sản xuất
    'production.html': 'production.view',
    'production-excel-view.html': 'production.excel',
    'product-manufacturing.html': 'production.manage',

    // Lắp đặt
    'installation.html': 'installation.view',
    'handover.html': 'installation.handover',

    // Tài chính
    'finance-dashboard.html': 'finance.view',
    'finance-receipts.html': 'finance.receipts',
    'finance-payments.html': 'finance.payments',
    'finance-debt.html': 'finance.debt',
    'finance-hr.html': 'finance.hr',
    'finance-reports.html': 'finance.reports',

    // Khách hàng
    'sales.html': 'customers.view',

    // Báo cáo
    'reports.html': 'reports.view',

    // Quản trị
    'role-management.html': 'admin.roles',
    'user-management.html': 'admin.users',
    'settings.html': 'admin.settings',
    'agencies.html': 'admin.agencies'
};

/**
 * Auto-thêm data-permission vào sidebar menu items dựa trên href
 * Gọi hàm này sau khi sidebar đã được render
 */
PermissionCheck.autoTagSidebarItems = function () {
    document.querySelectorAll('.sidebar-nav a[href]').forEach(link => {
        const href = link.getAttribute('href');
        const page = href.split('/').pop().split('?')[0];

        if (SidebarPermissionMap[page] && !link.hasAttribute('data-permission')) {
            link.setAttribute('data-permission', SidebarPermissionMap[page]);
        }
    });

    console.log('PermissionCheck: Auto-tagged sidebar items');
};

/**
 * Full initialization cho sidebar với permission filtering
 * Sử dụng: await PermissionCheck.initWithSidebar()
 */
PermissionCheck.initWithSidebar = async function () {
    const success = await this.init();
    if (success) {
        this.autoTagSidebarItems();
        this.filterSidebarMenu();
        this.applyToDOM();
    }
    return success;
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PermissionCheck, PagePermissions, SidebarPermissionMap };
}

