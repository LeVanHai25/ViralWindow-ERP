/**
 * ViralWindow Premium SVG Icons Library
 * Professional 3D gradient icons for enterprise UI
 * Version: 1.0.0
 * 
 * Usage: 
 * 1. Include this file: <script src="js/icons-library.js"></script>
 * 2. Use icons: VWIcons.people(), VWIcons.building(), etc.
 * 3. Or replace emojis: VWIcons.replaceEmojis()
 */

const VWIcons = {
    // ============================================
    // CORE ICON GENERATOR
    // ============================================

    /**
     * Generate SVG wrapper with consistent styling
     */
    _wrap: function (content, viewBox = "0 0 48 48", className = "") {
        return `<svg viewBox="${viewBox}" class="vw-icon ${className}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
    },

    // ============================================
    // PEOPLE & USER ICONS
    // ============================================

    /** 👥 People/Customers - Blue gradient group */
    people: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="peopleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6"/>
                    <stop offset="100%" style="stop-color:#1d4ed8"/>
                </linearGradient>
            </defs>
            <circle cx="24" cy="14" r="8" fill="url(#peopleGrad)"/>
            <path d="M12 40c0-8 5-12 12-12s12 4 12 12" fill="url(#peopleGrad)" opacity="0.9"/>
            <circle cx="38" cy="16" r="5" fill="#60a5fa"/>
            <path d="M32 38c0-5 3-8 6-8s4 2 6 6" fill="#60a5fa" opacity="0.8"/>
            <circle cx="10" cy="16" r="5" fill="#60a5fa"/>
            <path d="M4 38c2-4 4-6 6-6s6 3 6 8" fill="#60a5fa" opacity="0.8"/>
        `, "0 0 48 48", size);
    },

    /** 👤 Single User - Blue */
    user: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="userGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6"/>
                    <stop offset="100%" style="stop-color:#1d4ed8"/>
                </linearGradient>
            </defs>
            <circle cx="24" cy="16" r="10" fill="url(#userGrad)"/>
            <path d="M8 44c0-10 7-16 16-16s16 6 16 16" fill="url(#userGrad)" opacity="0.9"/>
        `, "0 0 48 48", size);
    },

    // ============================================
    // BUILDING & PROJECT ICONS
    // ============================================

    /** 🏢 Building/Project - Green gradient */
    building: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="buildGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#22c55e"/>
                    <stop offset="100%" style="stop-color:#15803d"/>
                </linearGradient>
            </defs>
            <rect x="8" y="16" width="18" height="28" rx="2" fill="url(#buildGrad)"/>
            <rect x="22" y="8" width="18" height="36" rx="2" fill="#16a34a"/>
            <rect x="12" y="20" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="18" y="20" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="12" y="26" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="18" y="26" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="12" y="32" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="18" y="32" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="26" y="12" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="32" y="12" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="26" y="18" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="32" y="18" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="26" y="24" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="32" y="24" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="26" y="30" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="32" y="30" width="4" height="4" rx="0.5" fill="#bbf7d0"/>
            <rect x="28" y="36" width="6" height="8" rx="1" fill="#4ade80"/>
        `, "0 0 48 48", size);
    },

    /** 🏗️ Construction - Orange/Brown */
    construction: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="craneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#f97316"/>
                    <stop offset="100%" style="stop-color:#c2410c"/>
                </linearGradient>
            </defs>
            <rect x="20" y="8" width="8" height="36" fill="url(#craneGrad)"/>
            <rect x="8" y="8" width="32" height="4" fill="#ea580c"/>
            <rect x="6" y="6" width="4" height="8" fill="#fdba74"/>
            <rect x="38" y="6" width="4" height="8" fill="#fdba74"/>
            <line x1="24" y1="12" x2="40" y2="20" stroke="#fed7aa" stroke-width="2"/>
            <rect x="36" y="18" width="6" height="10" fill="#fb923c"/>
            <rect x="16" y="40" width="16" height="4" fill="#9a3412"/>
        `, "0 0 48 48", size);
    },

    // ============================================
    // DOCUMENT ICONS
    // ============================================

    /** 📋 Clipboard/List - Teal */
    clipboard: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="clipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#14b8a6"/>
                    <stop offset="100%" style="stop-color:#0f766e"/>
                </linearGradient>
            </defs>
            <rect x="8" y="10" width="32" height="34" rx="3" fill="url(#clipGrad)"/>
            <rect x="16" y="4" width="16" height="8" rx="2" fill="#2dd4bf"/>
            <circle cx="24" cy="8" r="2" fill="#0d9488"/>
            <rect x="14" y="18" width="20" height="3" rx="1" fill="#ccfbf1"/>
            <rect x="14" y="24" width="16" height="3" rx="1" fill="#ccfbf1"/>
            <rect x="14" y="30" width="18" height="3" rx="1" fill="#ccfbf1"/>
            <rect x="14" y="36" width="12" height="3" rx="1" fill="#ccfbf1"/>
        `, "0 0 48 48", size);
    },

    /** 📄 Document - Gray/Blue */
    document: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="docGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#f1f5f9"/>
                    <stop offset="100%" style="stop-color:#cbd5e1"/>
                </linearGradient>
            </defs>
            <path d="M10 6h20l10 10v28a2 2 0 01-2 2H10a2 2 0 01-2-2V8a2 2 0 012-2z" fill="url(#docGrad)"/>
            <path d="M30 6v10h10" fill="#94a3b8"/>
            <rect x="14" y="22" width="20" height="2" rx="1" fill="#64748b"/>
            <rect x="14" y="28" width="16" height="2" rx="1" fill="#64748b"/>
            <rect x="14" y="34" width="18" height="2" rx="1" fill="#64748b"/>
        `, "0 0 48 48", size);
    },

    /** 📝 Edit/Note - Blue */
    edit: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="editGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6"/>
                    <stop offset="100%" style="stop-color:#1d4ed8"/>
                </linearGradient>
            </defs>
            <path d="M8 40l4-16L36 8l8 8-24 24-16 4 4-4z" fill="url(#editGrad)"/>
            <path d="M32 12l8 8" stroke="#93c5fd" stroke-width="2"/>
            <path d="M12 36l-4 4" stroke="#1e40af" stroke-width="2"/>
        `, "0 0 48 48", size);
    },

    // ============================================
    // INVENTORY & PACKAGE ICONS
    // ============================================

    /** 📦 Box/Package - Purple 3D */
    box: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#a855f7"/>
                    <stop offset="100%" style="stop-color:#7c3aed"/>
                </linearGradient>
            </defs>
            <path d="M24 4L6 14v20l18 10 18-10V14L24 4z" fill="url(#boxGrad)"/>
            <path d="M24 4L6 14l18 10 18-10L24 4z" fill="#c084fc"/>
            <path d="M24 24v20l18-10V14L24 24z" fill="#9333ea"/>
            <line x1="24" y1="24" x2="24" y2="44" stroke="#e9d5ff" stroke-width="1.5"/>
            <line x1="6" y1="14" x2="24" y2="24" stroke="#e9d5ff" stroke-width="1"/>
            <line x1="42" y1="14" x2="24" y2="24" stroke="#e9d5ff" stroke-width="1"/>
            <ellipse cx="24" cy="14" rx="6" ry="3" fill="#f3e8ff"/>
        `, "0 0 48 48", size);
    },

    /** Warehouse - Purple */
    warehouse: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="warehouseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#8b5cf6"/>
                    <stop offset="100%" style="stop-color:#6d28d9"/>
                </linearGradient>
            </defs>
            <path d="M4 20L24 8l20 12v24H4V20z" fill="url(#warehouseGrad)"/>
            <rect x="10" y="28" width="8" height="16" fill="#c4b5fd"/>
            <rect x="20" y="28" width="8" height="16" fill="#c4b5fd"/>
            <rect x="30" y="28" width="8" height="16" fill="#c4b5fd"/>
            <path d="M4 20L24 8l20 12" stroke="#ddd6fe" stroke-width="2" fill="none"/>
        `, "0 0 48 48", size);
    },

    // ============================================
    // MONEY & FINANCE ICONS
    // ============================================

    /** 💰 Money/Coins - Gold gradient stack */
    money: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="coinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#fbbf24"/>
                    <stop offset="100%" style="stop-color:#f59e0b"/>
                </linearGradient>
                <linearGradient id="coinSide" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#d97706"/>
                    <stop offset="100%" style="stop-color:#b45309"/>
                </linearGradient>
            </defs>
            <ellipse cx="24" cy="38" rx="16" ry="5" fill="url(#coinSide)"/>
            <ellipse cx="24" cy="36" rx="16" ry="5" fill="url(#coinGrad)"/>
            <ellipse cx="24" cy="30" rx="16" ry="5" fill="url(#coinSide)"/>
            <ellipse cx="24" cy="28" rx="16" ry="5" fill="url(#coinGrad)"/>
            <ellipse cx="24" cy="22" rx="16" ry="5" fill="url(#coinSide)"/>
            <ellipse cx="24" cy="20" rx="16" ry="5" fill="url(#coinGrad)"/>
            <ellipse cx="24" cy="14" rx="16" ry="5" fill="url(#coinSide)"/>
            <ellipse cx="24" cy="12" rx="16" ry="5" fill="url(#coinGrad)"/>
            <text x="24" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#92400e">₫</text>
        `, "0 0 48 48", size);
    },

    /** 💵 Cash/Bill - Green */
    cash: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="cashGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#22c55e"/>
                    <stop offset="100%" style="stop-color:#15803d"/>
                </linearGradient>
            </defs>
            <rect x="4" y="14" width="40" height="24" rx="3" fill="url(#cashGrad)"/>
            <circle cx="24" cy="26" r="8" fill="#bbf7d0" opacity="0.3"/>
            <circle cx="24" cy="26" r="6" fill="#4ade80"/>
            <text x="24" y="30" text-anchor="middle" font-size="10" font-weight="bold" fill="#166534">₫</text>
            <circle cx="10" cy="26" r="4" fill="#86efac" opacity="0.5"/>
            <circle cx="38" cy="26" r="4" fill="#86efac" opacity="0.5"/>
        `, "0 0 48 48", size);
    },

    // ============================================
    // STATUS ICONS
    // ============================================

    /** ✅ Success/Check - Green */
    success: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="successGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#22c55e"/>
                    <stop offset="100%" style="stop-color:#16a34a"/>
                </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#successGrad)"/>
            <path d="M14 24l6 6 14-14" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        `, "0 0 48 48", size);
    },

    /** ⚠️ Warning - Amber */
    warning: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="warnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#fbbf24"/>
                    <stop offset="100%" style="stop-color:#f59e0b"/>
                </linearGradient>
            </defs>
            <path d="M24 4L4 40h40L24 4z" fill="url(#warnGrad)"/>
            <rect x="22" y="16" width="4" height="14" rx="2" fill="#78350f"/>
            <circle cx="24" cy="34" r="2.5" fill="#78350f"/>
        `, "0 0 48 48", size);
    },

    /** 🚫 Error/Danger - Red */
    error: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="errorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#ef4444"/>
                    <stop offset="100%" style="stop-color:#dc2626"/>
                </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#errorGrad)"/>
            <path d="M16 16l16 16M32 16l-16 16" stroke="white" stroke-width="4" stroke-linecap="round"/>
        `, "0 0 48 48", size);
    },

    /** ℹ️ Info - Blue */
    info: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="infoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6"/>
                    <stop offset="100%" style="stop-color:#2563eb"/>
                </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#infoGrad)"/>
            <circle cx="24" cy="14" r="3" fill="white"/>
            <rect x="21" y="20" width="6" height="16" rx="2" fill="white"/>
        `, "0 0 48 48", size);
    },

    // ============================================
    // UI ICONS
    // ============================================

    /** 🔔 Notification Bell - Yellow */
    bell: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="bellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#fbbf24"/>
                    <stop offset="100%" style="stop-color:#f59e0b"/>
                </linearGradient>
            </defs>
            <path d="M24 4c-8 0-14 6-14 14v10l-4 4h36l-4-4V18c0-8-6-14-14-14z" fill="url(#bellGrad)"/>
            <circle cx="24" cy="40" r="4" fill="#d97706"/>
            <ellipse cx="24" cy="8" rx="2" ry="3" fill="#fcd34d"/>
        `, "0 0 48 48", size);
    },

    /** ⏰ Clock/Time - Blue */
    clock: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6"/>
                    <stop offset="100%" style="stop-color:#1d4ed8"/>
                </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#clockGrad)"/>
            <circle cx="24" cy="24" r="16" fill="white"/>
            <line x1="24" y1="24" x2="24" y2="14" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round"/>
            <line x1="24" y1="24" x2="32" y2="28" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
            <circle cx="24" cy="24" r="2" fill="#1e3a8a"/>
        `, "0 0 48 48", size);
    },

    /** 🔧 Settings/Tools - Gray */
    settings: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="settingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#64748b"/>
                    <stop offset="100%" style="stop-color:#475569"/>
                </linearGradient>
            </defs>
            <path d="M24 4l4 6 6-2 2 6 6 2-2 6 4 4-4 4 2 6-6 2-2 6-6-2-4 6-4-6-6 2-2-6-6-2 2-6-4-4 4-4-2-6 6-2 2-6 6 2z" fill="url(#settingsGrad)"/>
            <circle cx="24" cy="24" r="8" fill="#e2e8f0"/>
        `, "0 0 48 48", size);
    },

    /** 🔍 Search - Blue */
    search: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6"/>
                    <stop offset="100%" style="stop-color:#1d4ed8"/>
                </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="14" fill="none" stroke="url(#searchGrad)" stroke-width="4"/>
            <line x1="30" y1="30" x2="42" y2="42" stroke="url(#searchGrad)" stroke-width="4" stroke-linecap="round"/>
        `, "0 0 48 48", size);
    },

    /** 📊 Chart/Stats - Multi-color */
    chart: function (size = "w-6 h-6") {
        return this._wrap(`
            <rect x="6" y="28" width="8" height="16" rx="1" fill="#3b82f6"/>
            <rect x="16" y="20" width="8" height="24" rx="1" fill="#22c55e"/>
            <rect x="26" y="12" width="8" height="32" rx="1" fill="#f59e0b"/>
            <rect x="36" y="22" width="8" height="22" rx="1" fill="#8b5cf6"/>
        `, "0 0 48 48", size);
    },

    /** 📈 Trending Up - Green */
    trendUp: function (size = "w-6 h-6") {
        return this._wrap(`
            <defs>
                <linearGradient id="trendUpGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#22c55e"/>
                    <stop offset="100%" style="stop-color:#16a34a"/>
                </linearGradient>
            </defs>
            <path d="M4 36l12-12 8 8 20-20" stroke="url(#trendUpGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M32 12h12v12" stroke="url(#trendUpGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        `, "0 0 48 48", size);
    },

    // ============================================
    // EMOJI REPLACEMENT UTILITY
    // ============================================

    /**
     * Map of emojis to icon functions
     */
    emojiMap: {
        '👥': 'people',
        '👤': 'user',
        '🏢': 'building',
        '🏗️': 'construction',
        '📋': 'clipboard',
        '📄': 'document',
        '📝': 'edit',
        '📦': 'box',
        '💰': 'money',
        '💵': 'cash',
        '💲': 'money',
        '✅': 'success',
        '✓': 'success',
        '⚠️': 'warning',
        '🚫': 'error',
        '❌': 'error',
        '🔔': 'bell',
        '⏰': 'clock',
        '🔧': 'settings',
        '⚙️': 'settings',
        '🔍': 'search',
        '📊': 'chart',
        '📈': 'trendUp',
        'ℹ️': 'info',
        '🚨': 'warning',
        '📌': 'info'
    },

    /**
     * Replace emoji in text with SVG icon
     * @param {string} text - Text containing emoji
     * @param {string} size - Tailwind size class
     * @returns {string} - Text with emoji replaced by SVG
     */
    replaceEmoji: function (text, size = "w-5 h-5 inline-block align-middle") {
        let result = text;
        for (const [emoji, iconName] of Object.entries(this.emojiMap)) {
            if (result.includes(emoji) && typeof this[iconName] === 'function') {
                result = result.replace(new RegExp(emoji, 'g'), this[iconName](size));
            }
        }
        return result;
    },

    /**
     * Replace all emojis in the page
     * Call this on DOMContentLoaded
     */
    replaceAllEmojis: function () {
        const elements = document.querySelectorAll('.vw-auto-icon');
        elements.forEach(el => {
            el.innerHTML = this.replaceEmoji(el.innerHTML);
        });
    }
};

// Auto-initialize CSS
(function () {
    const style = document.createElement('style');
    style.textContent = `
        .vw-icon {
            display: inline-block;
            vertical-align: middle;
            flex-shrink: 0;
        }
        .vw-icon-sm { width: 1rem; height: 1rem; }
        .vw-icon-md { width: 1.5rem; height: 1.5rem; }
        .vw-icon-lg { width: 2rem; height: 2rem; }
        .vw-icon-xl { width: 3rem; height: 3rem; }
    `;
    document.head.appendChild(style);
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VWIcons;
}
