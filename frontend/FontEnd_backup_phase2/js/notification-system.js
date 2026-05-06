/**
 * Notification System - Frontend Component
 * Hệ thống thông báo chung cho tất cả các trang
 * 
 * Sử dụng:
 * 1. Thêm <div id="notificationSystem"></div> vào header/sidebar
 * 2. Gọi loadNotifications() khi trang load
 * 3. Tự động polling mỗi 15 giây để cập nhật
 */

(function () {
    'use strict';

    const API_BASE = window.API_BASE || '/api';
    let pollingInterval = null;
    let isDropdownOpen = false;

    /**
     * Load unread count và hiển thị badge
     */
    async function loadUnreadCount() {
        try {
            const token = (window.AuthHelper && window.AuthHelper.getToken()) || sessionStorage.getItem('token') || localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${API_BASE}/notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return;

            const result = await response.json();
            if (result.success) {
                const count = result.data.count || 0;
                updateNotificationBadge(count);
            }
        } catch (error) {
            // Silent fail - không log để tránh spam console
        }
    }

    /**
     * Update notification badge
     */
    function updateNotificationBadge(count) {
        // Tìm tất cả các badge elements
        const badges = document.querySelectorAll('#notificationBadge, [id*="notificationBadge"], .notification-badge');

        badges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
                badge.style.display = 'flex';
            } else {
                badge.classList.add('hidden');
                badge.style.display = 'none';
            }
        });
    }

    /**
     * Load danh sách thông báo
     */
    async function loadNotifications(limit = 10) {
        try {
            const token = (window.AuthHelper && window.AuthHelper.getToken()) || sessionStorage.getItem('token') || localStorage.getItem('token');
            if (!token) return [];

            const response = await fetch(`${API_BASE}/notifications?limit=${limit}&only_unread=0`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return [];

            const result = await response.json();
            if (result.success) {
                return result.data || [];
            }
            return [];
        } catch (error) {
            console.error('Error loading notifications:', error);
            return [];
        }
    }

    /**
     * Render notification dropdown
     */
    async function renderNotificationDropdown() {
        const dropdown = document.getElementById('notificationsDropdown');
        const list = document.getElementById('notificationsList');

        if (!dropdown && !list) return;

        const container = list || dropdown.querySelector('#notificationsList') || dropdown;

        // Show loading
        if (container) {
            container.innerHTML = '<div class="p-4 text-center text-gray-500">Đang tải...</div>';
        }

        const notifications = await loadNotifications(20);

        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-12 h-12 mx-auto mb-3 text-gray-400">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p class="text-sm">Không có thông báo nào</p>
                </div>
            `;
            return;
        }

        let html = '';
        notifications.forEach(notif => {
            const levelClass = {
                'info': 'bg-blue-50 border-blue-200',
                'important': 'bg-yellow-50 border-yellow-200',
                'urgent': 'bg-red-50 border-red-200'
            }[notif.level] || 'bg-gray-50 border-gray-200';

            const levelIcon = {
                'info': 'ℹ️',
                'important': '⚠️',
                'urgent': '🚨'
            }[notif.level] || '📢';

            const isRead = notif.is_read ? 'opacity-60' : 'font-bold';
            const readClass = notif.is_read ? '' : 'bg-blue-100';

            const timeAgo = getTimeAgo(notif.created_at);
            const link = notif.data_json ? JSON.parse(notif.data_json).link : null;

            html += `
                <div class="notification-item p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${readClass} ${isRead}" 
                     onclick="handleNotificationClick(${notif.id}, '${link || ''}')">
                    <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 text-xl">${levelIcon}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2">
                                <p class="text-sm font-medium text-gray-900 ${!notif.is_read ? 'font-bold' : ''}">${escapeHtml(notif.title)}</p>
                                ${!notif.is_read ? '<span class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"></span>' : ''}
                            </div>
                            <p class="text-xs text-gray-600 mt-1 line-clamp-2">${escapeHtml(notif.message)}</p>
                            <p class="text-xs text-gray-400 mt-1">${timeAgo}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="p-2 border-t border-gray-200 bg-gray-50">
                <div class="flex justify-between items-center gap-2">
                    <button onclick="markAllNotificationsRead()" class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">
                        Đánh dấu tất cả đã đọc
                    </button>
                    <a href="notifications.html" class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">
                        Xem tất cả →
                    </a>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Handle notification click
     */
    window.handleNotificationClick = async function (notificationId, link) {
        try {
            const token = (window.AuthHelper && window.AuthHelper.getToken()) || sessionStorage.getItem('token') || localStorage.getItem('token');
            if (!token) return;

            // Mark as read
            await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Reload notifications and count
            await loadUnreadCount();
            if (isDropdownOpen) {
                await renderNotificationDropdown();
            }

            // Navigate to link if provided
            if (link) {
                window.location.href = link;
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    /**
     * Mark all notifications as read
     */
    window.markAllNotificationsRead = async function () {
        try {
            const token = (window.AuthHelper && window.AuthHelper.getToken()) || sessionStorage.getItem('token') || localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${API_BASE}/notifications/read-all`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                await loadUnreadCount();
                await renderNotificationDropdown();
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    /**
     * Toggle notification dropdown
     */
    window.toggleNotifications = function () {
        const dropdown = document.getElementById('notificationsDropdown');
        if (!dropdown) return;

        isDropdownOpen = !dropdown.classList.contains('hidden');

        if (isDropdownOpen) {
            dropdown.classList.add('hidden');
            isDropdownOpen = false;
        } else {
            dropdown.classList.remove('hidden');
            isDropdownOpen = true;
            renderNotificationDropdown();
        }
    };

    /**
     * Helper: Get time ago
     */
    function getTimeAgo(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    }

    /**
     * Helper: Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Start polling
     */
    function startPolling() {
        // Load immediately
        loadUnreadCount();

        // Poll every 15 seconds
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        pollingInterval = setInterval(() => {
            loadUnreadCount();
            // Reload dropdown if open
            if (isDropdownOpen) {
                renderNotificationDropdown();
            }
        }, 15000);
    }

    /**
     * Stop polling
     */
    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    /**
     * Initialize notification system
     */
    window.initNotificationSystem = function () {
        // Check if user is logged in
        const token = (window.AuthHelper && window.AuthHelper.getToken()) || sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
            return;
        }

        // Start polling
        startPolling();

        // Close dropdown when clicking outside
        document.addEventListener('click', function (event) {
            const dropdown = document.getElementById('notificationsDropdown');
            const button = event.target.closest('[onclick*="toggleNotifications"], #notificationButton');

            if (dropdown && !dropdown.contains(event.target) && !button) {
                dropdown.classList.add('hidden');
                isDropdownOpen = false;
            }
        });
    };

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initNotificationSystem);
    } else {
        window.initNotificationSystem();
    }

    // Export for manual initialization
    window.NotificationSystem = {
        loadUnreadCount,
        loadNotifications,
        renderNotificationDropdown,
        startPolling,
        stopPolling
    };

})();

