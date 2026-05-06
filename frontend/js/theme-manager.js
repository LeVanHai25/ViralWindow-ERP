/**
 * VIRALWINDOW THEME MANAGER v2.1
 * ===============================
 * Dark Mode is controlled exclusively from Settings > General > "Chế độ giao diện"
 * No floating button. Theme is applied globally via injected CSS overrides.
 *
 * localStorage keys:
 *   vw-theme: 'light' | 'dark' | 'auto'
 */

(function () {
    'use strict';

    const THEME_KEY = 'vw-theme';
    const DARK_STYLE_ID = 'vw-dark-theme-css';

    // ====================================================================
    // DARK MODE CSS — Comprehensive overrides for Tailwind + custom classes
    // ====================================================================
    const DARK_CSS = `
/* ===== VIRALWINDOW DARK MODE v2.1 ===== */

/* --- Base Elements --- */
[data-theme="dark"] body {
    background-color: #0F172A !important;
    color: #E2E8F0 !important;
}

[data-theme="dark"] .main-content {
    background: #0F172A !important;
}

/* --- Tailwind Background Overrides --- */
[data-theme="dark"] .bg-white,
[data-theme="dark"] .bg-gray-50,
[data-theme="dark"] .bg-gray-100,
[data-theme="dark"] .bg-white\\/95,
[data-theme="dark"] .bg-white\\/90 {
    background-color: #1E293B !important;
}

[data-theme="dark"] .bg-gray-200 {
    background-color: #334155 !important;
}

/* --- Tailwind Text Color Overrides --- */
[data-theme="dark"] .text-gray-900,
[data-theme="dark"] .text-gray-800 {
    color: #F1F5F9 !important;
}

[data-theme="dark"] .text-gray-700 {
    color: #E2E8F0 !important;
}

[data-theme="dark"] .text-gray-600 {
    color: #CBD5E1 !important;
}

[data-theme="dark"] .text-gray-500 {
    color: #94A3B8 !important;
}

/* --- Tailwind Border Overrides --- */
[data-theme="dark"] .border-gray-100,
[data-theme="dark"] .border-gray-200,
[data-theme="dark"] .border-gray-300 {
    border-color: #334155 !important;
}

/* --- Hero / Header Section --- */
[data-theme="dark"] .hero-section {
    background: #1E293B !important;
    border-bottom-color: #334155 !important;
}

/* --- Stat Cards --- */
[data-theme="dark"] .stat-card {
    background: #1E293B !important;
    border-color: #334155 !important;
}

[data-theme="dark"] .stat-card-blue {
    background: linear-gradient(135deg, rgba(52, 152, 219, 0.15) 0%, rgba(41, 128, 185, 0.08) 100%) !important;
}
[data-theme="dark"] .stat-card-pink {
    background: linear-gradient(135deg, rgba(231, 76, 60, 0.15) 0%, rgba(192, 57, 43, 0.08) 100%) !important;
}
[data-theme="dark"] .stat-card-cyan {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%) !important;
}
[data-theme="dark"] .stat-card-green {
    background: linear-gradient(135deg, rgba(39, 174, 96, 0.15) 0%, rgba(34, 153, 84, 0.08) 100%) !important;
}

[data-theme="dark"] .stat-value {
    color: #F1F5F9 !important;
}

/* --- Overview Stats --- */
[data-theme="dark"] .overview-stat {
    background: rgba(30, 41, 59, 0.8) !important;
    border-color: #334155 !important;
}

[data-theme="dark"] .overview-stat:hover {
    background: rgba(30, 41, 59, 0.95) !important;
}

/* --- Pipeline / Workflow --- */
[data-theme="dark"] .workflow-pipeline {
    background: rgba(30, 41, 59, 0.5) !important;
    border-color: #334155 !important;
}

[data-theme="dark"] .pipeline-step {
    background: #1E293B !important;
    border-color: #334155 !important;
}

[data-theme="dark"] .pipeline-step:hover {
    background: #334155 !important;
    border-color: #60A5FA !important;
}

[data-theme="dark"] .step-count {
    color: #F1F5F9 !important;
}

/* --- Quick Action Buttons --- */
[data-theme="dark"] .quick-btn {
    background: rgba(30, 41, 59, 0.6) !important;
}

/* --- Activity Items --- */
[data-theme="dark"] .activity-item {
    background: rgba(30, 41, 59, 0.5) !important;
    border-left-color: #334155 !important;
}

[data-theme="dark"] .activity-item:hover {
    background: rgba(30, 41, 59, 0.9) !important;
    border-left-color: #60A5FA !important;
}

[data-theme="dark"] .activity-title {
    color: #E2E8F0 !important;
}

/* --- Alert Items --- */
[data-theme="dark"] .alert-warning {
    background: rgba(243, 156, 18, 0.15) !important;
    color: #FBBF24 !important;
}

[data-theme="dark"] .alert-danger {
    background: rgba(192, 57, 43, 0.15) !important;
    color: #F87171 !important;
}

[data-theme="dark"] .alert-info {
    background: rgba(52, 152, 219, 0.15) !important;
    color: #60A5FA !important;
}

/* --- KPI Cards (Finance pages) --- */
[data-theme="dark"] .kpi-card-modern {
    background: #1E293B !important;
    border-color: #334155 !important;
}

/* --- Chart / Alert Cards (Finance) --- */
[data-theme="dark"] .chart-card-modern,
[data-theme="dark"] .alert-card-modern {
    background: #1E293B !important;
}

/* --- Settings Card --- */
[data-theme="dark"] .settings-card {
    background: #1E293B !important;
    border-color: #334155 !important;
}

/* --- Tables --- */
[data-theme="dark"] table thead th {
    background-color: #1E293B !important;
    color: #CBD5E1 !important;
    border-color: #334155 !important;
}

[data-theme="dark"] table tbody td {
    border-color: #334155 !important;
    color: #E2E8F0 !important;
}

[data-theme="dark"] table tbody tr:hover {
    background-color: #1E293B !important;
}

[data-theme="dark"] table tbody tr:nth-child(even) {
    background-color: rgba(30, 41, 59, 0.3) !important;
}

/* --- Forms / Inputs --- */
[data-theme="dark"] input,
[data-theme="dark"] select,
[data-theme="dark"] textarea {
    background-color: #1E293B !important;
    color: #E2E8F0 !important;
    border-color: #475569 !important;
}

[data-theme="dark"] input::placeholder,
[data-theme="dark"] textarea::placeholder {
    color: #64748B !important;
}

/* --- Modals --- */
[data-theme="dark"] .modal-content,
[data-theme="dark"] .vw-modal-content {
    background-color: #1E293B !important;
    color: #E2E8F0 !important;
}

/* --- Dropdowns --- */
[data-theme="dark"] .dropdown-menu,
[data-theme="dark"] [class*="dropdown"] {
    background-color: #1E293B !important;
    border-color: #334155 !important;
}

/* --- Notifications Header --- */
[data-theme="dark"] .header-notifications-dropdown {
    background-color: #1E293B !important;
    border-color: #334155 !important;
}

[data-theme="dark"] .header-notification-button {
    color: #CBD5E1 !important;
}

/* --- Clock Widget --- */
[data-theme="dark"] .live-clock-widget {
    background: rgba(30, 41, 59, 0.95) !important;
    border-color: #334155 !important;
}

/* --- Sidebar User Dropdown --- */
[data-theme="dark"] #sidebarUserMenuDropdown {
    background: #1E293B !important;
    border-color: #334155 !important;
}

[data-theme="dark"] #sidebarUserMenuDropdown a {
    color: #E2E8F0 !important;
}

[data-theme="dark"] #sidebarUserMenuDropdown a:hover {
    background: #334155 !important;
}

/* --- Cards with shadow --- */
[data-theme="dark"] .shadow-sm,
[data-theme="dark"] .shadow-md,
[data-theme="dark"] .shadow-lg,
[data-theme="dark"] .shadow-xl {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4) !important;
}

/* --- Hover states --- */
[data-theme="dark"] .hover\\:bg-gray-50:hover,
[data-theme="dark"] .hover\\:bg-gray-100:hover {
    background-color: #334155 !important;
}

/* --- Badge/Pill overrides --- */
[data-theme="dark"] .bg-blue-50 { background-color: rgba(59, 130, 246, 0.15) !important; }
[data-theme="dark"] .bg-green-50 { background-color: rgba(34, 197, 94, 0.15) !important; }
[data-theme="dark"] .bg-red-50 { background-color: rgba(239, 68, 68, 0.15) !important; }
[data-theme="dark"] .bg-yellow-50 { background-color: rgba(245, 158, 11, 0.15) !important; }
[data-theme="dark"] .bg-orange-50 { background-color: rgba(249, 115, 22, 0.15) !important; }
[data-theme="dark"] .bg-purple-50 { background-color: rgba(168, 85, 247, 0.15) !important; }

/* --- Scrollbar --- */
[data-theme="dark"] ::-webkit-scrollbar-track { background: #1E293B !important; }
[data-theme="dark"] ::-webkit-scrollbar-thumb { background: #475569 !important; }
[data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background: #64748B !important; }

/* --- Smooth transition for theme switching --- */
body, .main-content, .hero-section, .stat-card, .overview-stat,
.workflow-pipeline, .pipeline-step, .quick-btn, .activity-item,
table, input, select, textarea, .kpi-card-modern, .chart-card-modern,
.alert-card-modern, .live-clock-widget, .settings-card {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
}

/* --- Theme selector active state in Settings --- */
[data-theme="dark"] .theme-option {
    border-color: #475569 !important;
}
[data-theme="dark"] .theme-option:hover {
    border-color: #60A5FA !important;
    background: rgba(30, 41, 59, 0.5) !important;
}
.theme-option.active {
    border-color: #3B82F6 !important;
    background: rgba(59, 130, 246, 0.08) !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
}
`;

    // ====================================================================
    // CORE: Resolve what the effective theme should be
    // ====================================================================
    function resolveEffectiveTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark') return 'dark';
        if (saved === 'light') return 'light';
        // 'auto' or no preference => follow OS
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    function applyTheme(effectiveTheme) {
        document.documentElement.setAttribute('data-theme', effectiveTheme);

        let styleEl = document.getElementById(DARK_STYLE_ID);
        if (effectiveTheme === 'dark') {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = DARK_STYLE_ID;
                styleEl.textContent = DARK_CSS;
                document.head.appendChild(styleEl);
            }
        } else {
            if (styleEl) styleEl.remove();
        }

        // Update settings page selector if present
        highlightActiveThemeOption();
    }

    function highlightActiveThemeOption() {
        const selector = document.getElementById('themeSelector');
        if (!selector) return;

        const saved = localStorage.getItem(THEME_KEY) || 'auto';
        const buttons = selector.querySelectorAll('.theme-option');
        buttons.forEach(function (btn) {
            if (btn.getAttribute('data-theme-value') === saved) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // ====================================================================
    // PUBLIC API: Called from settings.html onclick
    // ====================================================================
    window.setThemeFromSettings = function (mode) {
        // mode: 'light' | 'dark' | 'auto'
        if (mode === 'auto') {
            localStorage.setItem(THEME_KEY, 'auto');
        } else {
            localStorage.setItem(THEME_KEY, mode);
        }
        applyTheme(resolveEffectiveTheme());
    };

    // ====================================================================
    // INIT: Apply theme immediately (before DOM paint to avoid FOUC)
    // ====================================================================
    applyTheme(resolveEffectiveTheme());

    // ====================================================================
    // DOM READY: Highlight active option on settings page
    // ====================================================================
    document.addEventListener('DOMContentLoaded', function () {
        highlightActiveThemeOption();
    });

    // ====================================================================
    // OS THEME CHANGE LISTENER (real-time sync when mode is 'auto')
    // ====================================================================
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
            var saved = localStorage.getItem(THEME_KEY);
            if (!saved || saved === 'auto') {
                applyTheme(resolveEffectiveTheme());
            }
        });
    }

    // Expose for external use
    window.vwThemeManager = {
        set: function (mode) { window.setThemeFromSettings(mode); },
        get: function () { return localStorage.getItem(THEME_KEY) || 'auto'; },
        getEffective: function () { return document.documentElement.getAttribute('data-theme') || 'light'; },
        reset: function () { localStorage.removeItem(THEME_KEY); applyTheme(resolveEffectiveTheme()); }
    };

})();
