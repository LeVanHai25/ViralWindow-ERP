/**
 * User Settings Helper
 * Applies language, timezone, and date format settings across the application
 */
(function () {
    'use strict';

    // Default settings
    const DEFAULT_SETTINGS = {
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        date_format: 'DD/MM/YYYY'
    };

    // Date format mapping
    const DATE_FORMATS = {
        'DD/MM/YYYY': { day: '2-digit', month: '2-digit', year: 'numeric' },
        'MM/DD/YYYY': { month: '2-digit', day: '2-digit', year: 'numeric' },
        'YYYY-MM-DD': { year: 'numeric', month: '2-digit', day: '2-digit' }
    };

    // Language mapping
    const LANGUAGE_LOCALE = {
        'vi': 'vi-VN',
        'en': 'en-US'
    };

    window.UserSettings = {
        /**
         * Get current user settings
         */
        getSettings: function () {
            try {
                const stored = localStorage.getItem('userSettings');
                if (stored) {
                    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
                }
            } catch (e) {
                console.error('Error reading user settings:', e);
            }
            return DEFAULT_SETTINGS;
        },

        /**
         * Get current locale based on language setting
         */
        getLocale: function () {
            const settings = this.getSettings();
            return LANGUAGE_LOCALE[settings.language] || 'vi-VN';
        },

        /**
         * Get current timezone
         */
        getTimezone: function () {
            const settings = this.getSettings();
            return settings.timezone || 'Asia/Ho_Chi_Minh';
        },

        /**
         * Format date according to user settings
         * @param {string|Date} dateInput - Date to format
         * @param {boolean} includeTime - Include time in output
         * @returns {string} - Formatted date string
         */
        formatDate: function (dateInput, includeTime = false) {
            if (!dateInput) return 'N/A';

            const settings = this.getSettings();
            const locale = LANGUAGE_LOCALE[settings.language] || 'vi-VN';
            const timezone = settings.timezone || 'Asia/Ho_Chi_Minh';
            const dateFormatKey = settings.date_format || 'DD/MM/YYYY';

            try {
                const date = new Date(dateInput);
                if (isNaN(date.getTime())) return 'N/A';

                const options = {
                    timeZone: timezone,
                    ...DATE_FORMATS[dateFormatKey]
                };

                if (includeTime) {
                    options.hour = '2-digit';
                    options.minute = '2-digit';
                }

                return date.toLocaleString(locale, options);
            } catch (e) {
                console.error('Error formatting date:', e);
                return dateInput.toString();
            }
        },

        /**
         * Format date with time
         * @param {string|Date} dateInput - Date to format
         * @returns {string} - Formatted datetime string
         */
        formatDateTime: function (dateInput) {
            return this.formatDate(dateInput, true);
        },

        /**
         * Format relative time (e.g., "2 hours ago")
         * @param {string|Date} dateInput - Date to format
         * @returns {string} - Relative time string
         */
        formatRelative: function (dateInput) {
            if (!dateInput) return 'N/A';

            const settings = this.getSettings();
            const locale = LANGUAGE_LOCALE[settings.language] || 'vi-VN';

            try {
                const date = new Date(dateInput);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                if (settings.language === 'en') {
                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                } else {
                    if (diffMins < 1) return 'Vừa xong';
                    if (diffMins < 60) return `${diffMins} phút trước`;
                    if (diffHours < 24) return `${diffHours} giờ trước`;
                    if (diffDays < 7) return `${diffDays} ngày trước`;
                }

                return this.formatDate(dateInput);
            } catch (e) {
                return this.formatDate(dateInput);
            }
        },

        /**
         * Translate text based on language setting
         * Only supports basic translations for common UI elements
         * @param {string} key - Translation key
         * @param {object} replacements - Key-value pairs for replacements
         * @returns {string} - Translated text
         */
        translate: function (key, replacements = {}) {
            const settings = this.getSettings();
            const translations = TRANSLATIONS[settings.language] || TRANSLATIONS['vi'];
            let text = translations[key] || key;

            // Apply replacements
            Object.keys(replacements).forEach(k => {
                text = text.replace(`{${k}}`, replacements[k]);
            });

            return text;
        },

        /**
         * Apply settings on page load
         * Updates document language and any dynamic content
         */
        apply: function () {
            const settings = this.getSettings();

            // Set document language
            document.documentElement.lang = settings.language;

            // Dispatch event for other scripts to react
            window.dispatchEvent(new CustomEvent('userSettingsChanged', { detail: settings }));

            console.log('✅ User settings applied:', settings);
        }
    };

    // Basic translations
    const TRANSLATIONS = {
        'vi': {
            'save': 'Lưu',
            'cancel': 'Hủy',
            'delete': 'Xóa',
            'edit': 'Sửa',
            'add': 'Thêm',
            'search': 'Tìm kiếm',
            'loading': 'Đang tải...',
            'success': 'Thành công',
            'error': 'Lỗi',
            'confirm': 'Xác nhận',
            'yes': 'Có',
            'no': 'Không',
            'logout': 'Đăng xuất',
            'login': 'Đăng nhập',
            'settings': 'Cài đặt'
        },
        'en': {
            'save': 'Save',
            'cancel': 'Cancel',
            'delete': 'Delete',
            'edit': 'Edit',
            'add': 'Add',
            'search': 'Search',
            'loading': 'Loading...',
            'success': 'Success',
            'error': 'Error',
            'confirm': 'Confirm',
            'yes': 'Yes',
            'no': 'No',
            'logout': 'Logout',
            'login': 'Login',
            'settings': 'Settings'
        }
    };

    // Auto-apply settings on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.UserSettings.apply());
    } else {
        window.UserSettings.apply();
    }

    // Expose formatDate globally for backward compatibility
    window.formatDateWithSettings = function (dateInput, includeTime) {
        return window.UserSettings.formatDate(dateInput, includeTime);
    };

})();
