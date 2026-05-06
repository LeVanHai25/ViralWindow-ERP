/**
 * Session Manager - Quản lý phiên đăng nhập
 * ViralWindow Multi-Session Support
 * 
 * Sử dụng sessionStorage để mỗi tab có session riêng biệt
 * Cho phép nhiều người dùng đăng nhập cùng lúc trên các tab khác nhau
 */

const SessionManager = {
    // Storage key names
    KEYS: {
        TOKEN: 'token',
        USER: 'user',
        PERMISSIONS: 'userPermissions',
        IS_ADMIN: 'isAdmin'
    },

    /**
     * Lấy token từ sessionStorage
     * @returns {string|null}
     */
    getToken() {
        return sessionStorage.getItem(this.KEYS.TOKEN);
    },

    /**
     * Lấy thông tin user
     * @returns {object|null}
     */
    getUser() {
        try {
            const userStr = sessionStorage.getItem(this.KEYS.USER);
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    },

    /**
     * Lấy permissions của user
     * @returns {string[]}
     */
    getPermissions() {
        try {
            const permsStr = sessionStorage.getItem(this.KEYS.PERMISSIONS);
            return permsStr ? JSON.parse(permsStr) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Kiểm tra có phải admin không
     * @returns {boolean}
     */
    isAdmin() {
        return sessionStorage.getItem(this.KEYS.IS_ADMIN) === 'true';
    },

    /**
     * Lưu session khi đăng nhập
     * @param {string} token 
     * @param {object} user 
     */
    setSession(token, user) {
        sessionStorage.setItem(this.KEYS.TOKEN, token);
        sessionStorage.setItem(this.KEYS.USER, JSON.stringify(user));
    },

    /**
     * Lưu permissions
     * @param {string[]} permissions 
     * @param {boolean} isAdmin 
     */
    setPermissions(permissions, isAdmin = false) {
        sessionStorage.setItem(this.KEYS.PERMISSIONS, JSON.stringify(permissions));
        sessionStorage.setItem(this.KEYS.IS_ADMIN, isAdmin.toString());
    },

    /**
     * Xóa session khi đăng xuất
     */
    clearSession() {
        sessionStorage.removeItem(this.KEYS.TOKEN);
        sessionStorage.removeItem(this.KEYS.USER);
        sessionStorage.removeItem(this.KEYS.PERMISSIONS);
        sessionStorage.removeItem(this.KEYS.IS_ADMIN);
    },

    /**
     * Kiểm tra đã đăng nhập chưa
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.getToken();
    },

    /**
     * Lấy tên hiển thị của user
     * @returns {string}
     */
    getDisplayName() {
        const user = this.getUser();
        return user?.full_name || user?.email || 'Người dùng';
    },

    /**
     * Lấy tên chức vụ
     * @returns {string}
     */
    getRoleName() {
        const user = this.getUser();
        return user?.role_name || 'Chưa phân quyền';
    },

    /**
     * Lấy role ID
     * @returns {number|null}
     */
    getRoleId() {
        const user = this.getUser();
        return user?.role_id || null;
    },

    /**
     * Migration: Copy từ localStorage sang sessionStorage nếu cần
     * Hữu ích khi chuyển đổi từ hệ thống cũ
     */
    migrateFromLocalStorage() {
        // Chỉ migrate nếu sessionStorage rỗng và localStorage có data
        if (!this.getToken() && localStorage.getItem(this.KEYS.TOKEN)) {
            const token = localStorage.getItem(this.KEYS.TOKEN);
            const user = localStorage.getItem(this.KEYS.USER);
            const perms = localStorage.getItem(this.KEYS.PERMISSIONS);
            const isAdmin = localStorage.getItem(this.KEYS.IS_ADMIN);

            if (token) sessionStorage.setItem(this.KEYS.TOKEN, token);
            if (user) sessionStorage.setItem(this.KEYS.USER, user);
            if (perms) sessionStorage.setItem(this.KEYS.PERMISSIONS, perms);
            if (isAdmin) sessionStorage.setItem(this.KEYS.IS_ADMIN, isAdmin);

            console.log('[SessionManager] Migrated session from localStorage to sessionStorage');
        }
    }
};

// Auto-migrate khi load
SessionManager.migrateFromLocalStorage();

// Export cho global access
window.SessionManager = SessionManager;
