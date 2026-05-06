/**
 * ViralWindow Sidebar Loader
 * Fetches shared sidebar.html and injects into #sidebar-container
 * Works with sidebar-enterprise.js for active states, accordions, etc.
 */
(function () {
    'use strict';

    const SIDEBAR_URL = 'components/sidebar.html';

    /**
     * Global functions needed by sidebar HTML onclick handlers
     */
    window.toggleSidebarUserMenu = function () {
        const dropdown = document.getElementById('sidebarUserMenuDropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
    };

    window.handleLogout = async function () {
        const confirmed = window.VWModal
            ? await VWModal.confirm('Đăng xuất', 'Bạn có chắc muốn đăng xuất?')
            : confirm('Bạn có chắc muốn đăng xuất?');

        if (confirmed) {
            if (window.AuthHelper) {
                window.AuthHelper.clearAuth();
            } else {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('rememberMe');
            }
            window.location.href = 'login.html';
        }
    };

    /**
     * Load sidebar HTML into #sidebar-container
     */
    async function loadSidebar() {
        const container = document.getElementById('sidebar-container');
        if (!container) return;

        // Show skeleton while loading
        container.innerHTML = `
            <div class="sidebar text-white" style="padding-top: 24px;">
                <div style="padding: 0 24px;">
                    <div class="vw-skeleton" style="height:48px;width:100%;margin-bottom:16px;background:rgba(255,255,255,0.1);"></div>
                    <div class="vw-skeleton" style="height:40px;width:100%;margin-bottom:24px;background:rgba(255,255,255,0.1);"></div>
                    <div class="vw-skeleton" style="height:32px;width:80%;margin-bottom:8px;background:rgba(255,255,255,0.08);"></div>
                    <div class="vw-skeleton" style="height:32px;width:70%;margin-bottom:8px;background:rgba(255,255,255,0.08);"></div>
                    <div class="vw-skeleton" style="height:32px;width:90%;margin-bottom:8px;background:rgba(255,255,255,0.08);"></div>
                    <div class="vw-skeleton" style="height:32px;width:60%;margin-bottom:8px;background:rgba(255,255,255,0.08);"></div>
                </div>
            </div>
        `;

        try {
            const response = await fetch(SIDEBAR_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();
            container.innerHTML = html;

            // Initialize EnterpriseSidebar after DOM is ready
            initAfterLoad();

        } catch (error) {
            console.error('[SidebarLoader] Failed to load sidebar:', error);
            // Fallback: sidebar stays as skeleton or leave container empty
            container.innerHTML = `
                <div class="sidebar text-white" style="padding:24px;text-align:center;">
                    <p style="opacity:0.5;font-size:12px;">Menu không tải được</p>
                    <button onclick="location.reload()" style="margin-top:8px;padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:none;color:white;cursor:pointer;font-size:12px;">Tải lại</button>
                </div>
            `;
        }
    }

    /**
     * Re-initialize sidebar systems after dynamic load
     */
    function initAfterLoad() {
        // Let EnterpriseSidebar handle everything if it exists
        if (typeof EnterpriseSidebar === 'function') {
            // Small delay to ensure DOM is settled
            setTimeout(() => {
                try {
                    new EnterpriseSidebar();
                } catch (e) {
                    console.warn('[SidebarLoader] EnterpriseSidebar init error:', e);
                }
            }, 50);
        }

        // Close user menu on outside click
        document.addEventListener('click', function (e) {
            const dropdown = document.getElementById('sidebarUserMenuDropdown');
            if (dropdown && !dropdown.classList.contains('hidden')) {
                const userSection = dropdown.closest('.relative');
                if (userSection && !userSection.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            }
        });
    }

    // Load on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSidebar);
    } else {
        loadSidebar();
    }
})();
