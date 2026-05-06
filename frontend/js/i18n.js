/**
 * i18n - Internationalization System for ViralWindow
 * Simple translation system using user preferences
 */

(function () {
    'use strict';

    // Translation dictionaries
    const translations = {
        vi: {
            // Common
            'common.save': 'Lưu',
            'common.cancel': 'Hủy',
            'common.delete': 'Xóa',
            'common.edit': 'Sửa',
            'common.add': 'Thêm',
            'common.search': 'Tìm kiếm',
            'common.loading': 'Đang tải...',
            'common.error': 'Lỗi',
            'common.success': 'Thành công',
            'common.confirm': 'Xác nhận',
            'common.back': 'Quay lại',
            'common.next': 'Tiếp theo',
            'common.previous': 'Trước đó',
            'common.close': 'Đóng',
            'common.actions': 'Thao tác',
            'common.status': 'Trạng thái',
            'common.date': 'Ngày',
            'common.time': 'Giờ',
            'common.name': 'Tên',
            'common.description': 'Mô tả',
            'common.total': 'Tổng',
            'common.quantity': 'Số lượng',
            'common.price': 'Giá',
            'common.note': 'Ghi chú',
            'common.all': 'Tất cả',
            'common.none': 'Không có',
            'common.yes': 'Có',
            'common.no': 'Không',

            // Auth
            'auth.login': 'Đăng nhập',
            'auth.logout': 'Đăng xuất',
            'auth.register': 'Đăng ký',
            'auth.email': 'Email',
            'auth.password': 'Mật khẩu',
            'auth.forgot_password': 'Quên mật khẩu?',
            'auth.remember_me': 'Ghi nhớ đăng nhập',
            'auth.login_success': 'Đăng nhập thành công!',
            'auth.logout_confirm': 'Bạn có chắc muốn đăng xuất?',

            // Settings
            'settings.title': 'Cài đặt',
            'settings.general': 'Cài đặt chung',
            'settings.language': 'Ngôn ngữ',
            'settings.timezone': 'Múi giờ',
            'settings.date_format': 'Định dạng ngày tháng',
            'settings.remember_login': 'Ghi nhớ đăng nhập',
            'settings.remember_login_desc': 'Tự động đăng nhập khi quay lại',
            'settings.save_success': 'Đã lưu cài đặt thành công!',
            'settings.save_error': 'Không thể lưu cài đặt',

            // Navigation
            'nav.dashboard': 'Tổng quan',
            'nav.projects': 'Dự án',
            'nav.sales': 'Kinh doanh',
            'nav.design': 'Thiết kế',
            'nav.inventory': 'Kho vật tư',
            'nav.production': 'Sản xuất',
            'nav.finance': 'Tài chính',
            'nav.admin': 'Quản trị',

            // Project statuses
            'status.new': 'Mới',
            'status.processing': 'Đang xử lý',
            'status.completed': 'Hoàn thành',
            'status.cancelled': 'Đã hủy',
            'status.pending': 'Chờ xử lý',

            // Messages
            'msg.confirm_delete': 'Bạn có chắc chắn muốn xóa?',
            'msg.no_data': 'Không có dữ liệu',
            'msg.server_error': 'Lỗi kết nối server',
            'msg.required_field': 'Vui lòng điền đầy đủ thông tin bắt buộc'
        },

        en: {
            // Common
            'common.save': 'Save',
            'common.cancel': 'Cancel',
            'common.delete': 'Delete',
            'common.edit': 'Edit',
            'common.add': 'Add',
            'common.search': 'Search',
            'common.loading': 'Loading...',
            'common.error': 'Error',
            'common.success': 'Success',
            'common.confirm': 'Confirm',
            'common.back': 'Back',
            'common.next': 'Next',
            'common.previous': 'Previous',
            'common.close': 'Close',
            'common.actions': 'Actions',
            'common.status': 'Status',
            'common.date': 'Date',
            'common.time': 'Time',
            'common.name': 'Name',
            'common.description': 'Description',
            'common.total': 'Total',
            'common.quantity': 'Quantity',
            'common.price': 'Price',
            'common.note': 'Note',
            'common.all': 'All',
            'common.none': 'None',
            'common.yes': 'Yes',
            'common.no': 'No',

            // Auth
            'auth.login': 'Login',
            'auth.logout': 'Logout',
            'auth.register': 'Register',
            'auth.email': 'Email',
            'auth.password': 'Password',
            'auth.forgot_password': 'Forgot password?',
            'auth.remember_me': 'Remember me',
            'auth.login_success': 'Login successful!',
            'auth.logout_confirm': 'Are you sure you want to logout?',

            // Settings
            'settings.title': 'Settings',
            'settings.general': 'General Settings',
            'settings.language': 'Language',
            'settings.timezone': 'Timezone',
            'settings.date_format': 'Date Format',
            'settings.remember_login': 'Remember Login',
            'settings.remember_login_desc': 'Automatically login when returning',
            'settings.save_success': 'Settings saved successfully!',
            'settings.save_error': 'Failed to save settings',

            // Navigation
            'nav.dashboard': 'Dashboard',
            'nav.projects': 'Projects',
            'nav.sales': 'Sales',
            'nav.design': 'Design',
            'nav.inventory': 'Inventory',
            'nav.production': 'Production',
            'nav.finance': 'Finance',
            'nav.admin': 'Administration',

            // Project statuses
            'status.new': 'New',
            'status.processing': 'Processing',
            'status.completed': 'Completed',
            'status.cancelled': 'Cancelled',
            'status.pending': 'Pending',

            // Messages
            'msg.confirm_delete': 'Are you sure you want to delete?',
            'msg.no_data': 'No data available',
            'msg.server_error': 'Server connection error',
            'msg.required_field': 'Please fill in all required fields'
        }
    };

    /**
     * Get current language from localStorage
     */
    function getCurrentLanguage() {
        try {
            const settings = localStorage.getItem('userSettings');
            if (settings) {
                return JSON.parse(settings).language || 'vi';
            }
        } catch (e) { }
        return 'vi';
    }

    /**
     * Translate a key to current language
     * @param {string} key - Translation key (e.g., 'common.save')
     * @param {object} params - Optional parameters for interpolation
     * @returns {string} Translated string
     */
    function t(key, params = {}) {
        const lang = getCurrentLanguage();
        const dict = translations[lang] || translations['vi'];
        let text = dict[key] || key;

        // Simple parameter interpolation: {{name}} -> value
        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
        });

        return text;
    }

    /**
     * Set language preference
     * @param {string} lang - Language code ('vi' or 'en')
     */
    function setLanguage(lang) {
        try {
            const settings = localStorage.getItem('userSettings');
            const parsed = settings ? JSON.parse(settings) : {};
            parsed.language = lang;
            localStorage.setItem('userSettings', JSON.stringify(parsed));
        } catch (e) {
            console.error('Error setting language:', e);
        }
    }

    /**
     * Get all available languages
     */
    function getAvailableLanguages() {
        return [
            { code: 'vi', name: 'Tiếng Việt' },
            { code: 'en', name: 'English' }
        ];
    }

    /**
     * Check if a translation exists
     */
    function hasTranslation(key) {
        const lang = getCurrentLanguage();
        const dict = translations[lang] || translations['vi'];
        return !!dict[key];
    }

    // Expose globally
    window.i18n = {
        t,
        setLanguage,
        getCurrentLanguage,
        getAvailableLanguages,
        hasTranslation,
        translations
    };

    // Also expose t() directly for convenience
    window.t = t;

})();
