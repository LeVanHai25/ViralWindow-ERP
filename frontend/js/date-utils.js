/**
 * Date Utilities - VirtalWindow
 * Global date formatting using user preferences from localStorage
 */

(function () {
    'use strict';

    /**
     * Get user settings from localStorage
     */
    function getUserSettings() {
        try {
            const settings = localStorage.getItem('userSettings');
            return settings ? JSON.parse(settings) : {
                language: 'vi',
                timezone: 'Asia/Ho_Chi_Minh',
                date_format: 'DD/MM/YYYY'
            };
        } catch (e) {
            return {
                language: 'vi',
                timezone: 'Asia/Ho_Chi_Minh',
                date_format: 'DD/MM/YYYY'
            };
        }
    }

    /**
     * Format a date according to user's preferred format
     * @param {Date|string|number} date - Date to format
     * @param {boolean} includeTime - Whether to include time
     * @returns {string} Formatted date string
     */
    function formatDate(date, includeTime = false) {
        if (!date) return '-';

        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';

        const settings = getUserSettings();
        const format = settings.date_format || 'DD/MM/YYYY';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        let dateStr = '';
        switch (format) {
            case 'DD/MM/YYYY':
                dateStr = `${day}/${month}/${year}`;
                break;
            case 'MM/DD/YYYY':
                dateStr = `${month}/${day}/${year}`;
                break;
            case 'YYYY-MM-DD':
                dateStr = `${year}-${month}-${day}`;
                break;
            default:
                dateStr = `${day}/${month}/${year}`;
        }

        if (includeTime) {
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            dateStr += ` ${hours}:${minutes}`;
        }

        return dateStr;
    }

    /**
     * Format a date with time
     * @param {Date|string|number} date - Date to format
     * @returns {string} Formatted date and time string
     */
    function formatDateTime(date) {
        return formatDate(date, true);
    }

    /**
     * Get timezone display name
     * @param {string} timezone - Timezone identifier
     * @returns {string} Display name
     */
    function getTimezoneDisplay(timezone) {
        const timezones = {
            'Asia/Ho_Chi_Minh': 'GMT+7 (Việt Nam)',
            'Asia/Bangkok': 'GMT+7 (Bangkok)',
            'Asia/Singapore': 'GMT+8 (Singapore)',
            'Asia/Tokyo': 'GMT+9 (Tokyo)',
            'UTC': 'GMT+0 (UTC)',
            'America/New_York': 'GMT-5 (New York)'
        };
        return timezones[timezone] || timezone;
    }

    /**
     * Format relative time (e.g., "2 giờ trước")
     * @param {Date|string|number} date - Date to format
     * @returns {string} Relative time string
     */
    function formatRelativeTime(date) {
        if (!date) return '-';

        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';

        const now = new Date();
        const diffMs = now - d;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        const settings = getUserSettings();
        const lang = settings.language || 'vi';

        if (lang === 'vi') {
            if (diffSeconds < 60) return 'Vừa xong';
            if (diffMinutes < 60) return `${diffMinutes} phút trước`;
            if (diffHours < 24) return `${diffHours} giờ trước`;
            if (diffDays < 7) return `${diffDays} ngày trước`;
            return formatDate(date);
        } else {
            if (diffSeconds < 60) return 'Just now';
            if (diffMinutes < 60) return `${diffMinutes} min ago`;
            if (diffHours < 24) return `${diffHours} hours ago`;
            if (diffDays < 7) return `${diffDays} days ago`;
            return formatDate(date);
        }
    }

    /**
     * Parse date string to Date object
     * @param {string} dateStr - Date string in various formats
     * @returns {Date|null} Parsed date or null
     */
    function parseDate(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    }

    // Expose globally
    window.DateUtils = {
        formatDate,
        formatDateTime,
        formatRelativeTime,
        parseDate,
        getUserSettings,
        getTimezoneDisplay
    };

})();
