/**
 * icon-system.js
 * Centralized Icon Mapping and Utilities for ViralWindow
 */

const ICON_MAP = {
    greeting: "sparkles",
    inventory: "package",
    analytics: "bar-chart-3",
    progress: "trending-up",
    finance: "wallet",
    search: "search",
    chat: "message-circle",
    help: "help-circle",
    success: "check-circle",
    error: "x-circle",
    warning: "alert-triangle",
    info: "info",
    user: "user",
    group: "users"
};

const ICON_COLORS = {
    success: 'green',
    error: 'red',
    warning: 'orange',
    info: 'blue',
    communication: 'purple',
    system: 'blue'
};

/**
 * Creates an IconBox HTML string
 * @param {string} type - Key from ICON_MAP
 * @param {string} semanticColor - A key from ICON_COLORS or direct color (blue, green, red, orange, purple)
 * @returns {string} HTML string
 */
function createIconBox(type, semanticColor = 'blue') {
    const iconName = ICON_MAP[type] || type;
    const colorClass = ICON_COLORS[semanticColor] || semanticColor;
    return `<div class="icon-box ${colorClass}">
  <i data-lucide="${iconName}"></i>
</div>`;
}

/**
 * Creates an inline Icon HTML string
 * @param {string} type - Key from ICON_MAP
 * @returns {string} HTML string
 */
function createIcon(type) {
    const iconName = ICON_MAP[type] || type;
    return `<i data-lucide="${iconName}"></i>`;
}

// Auto-initialize lucide on DOMContentLoaded if available
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }
});
