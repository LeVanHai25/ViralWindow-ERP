/**
 * Premium SVG Icons Library
 * Professional gradient icons with 3D effects
 * Usage: PremiumIcons.iconName
 */

const PremiumIcons = {
    /**
     * Package/Box Icon - Rose-Pink Gradient
     * For: Tổng loại phụ kiện, Tổng loại vật tư
     */
    package: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <defs>
                <linearGradient id="grad-package" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f43f5e;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow-package">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10m-8-10v10l8 4" 
                  stroke="url(#grad-package)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                  filter="url(#shadow-package)"/>
            <path d="M12 2L4 6l8 4 8-4-8-4z" fill="url(#grad-package)" opacity="0.2"/>
        </svg>
    `,

    /**
     * Counter/Numbers Icon - Purple-Pink Gradient
     * For: Tổng số lượng
     */
    counter: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <defs>
                <linearGradient id="grad-counter" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow-counter">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
            <rect x="3" y="4" width="18" height="16" rx="2" 
                  stroke="url(#grad-counter)" stroke-width="2" fill="none" filter="url(#shadow-counter)"/>
            <line x1="3" y1="9" x2="21" y2="9" stroke="url(#grad-counter)" stroke-width="2"/>
            <line x1="3" y1="14" x2="21" y2="14" stroke="url(#grad-counter)" stroke-width="2"/>
            <circle cx="7" cy="6.5" r="0.5" fill="url(#grad-counter)"/>
            <circle cx="7" cy="11.5" r="0.5" fill="url(#grad-counter)"/>
            <circle cx="7" cy="16.5" r="0.5" fill="url(#grad-counter)"/>
        </svg>
    `,

    /**
     * Angle/Corner Icon - Orange-Amber Gradient
     * For: Ke góc
     */
    angle: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <defs>
                <linearGradient id="grad-angle" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f97316;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow-angle">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
            <path d="M20 20H4V4" stroke="url(#grad-angle)" stroke-width="3" stroke-linecap="round" 
                  stroke-linejoin="round" filter="url(#shadow-angle)"/>
            <path d="M4 4L4 20L20 20" stroke="url(#grad-angle)" stroke-width="1.5" opacity="0.3"/>
            <circle cx="4" cy="4" r="2" fill="url(#grad-angle)"/>
            <circle cx="4" cy="20" r="2" fill="url(#grad-angle)"/>
            <circle cx="20" cy="20" r="2" fill="url(#grad-angle)"/>
        </svg>
    `,

    /**
     * Gasket/Seal Icon - Green-Teal Gradient
     * For: Gioăng
     */
    gasket: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <defs>
                <linearGradient id="grad-gasket" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow-gasket">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
            <circle cx="12" cy="12" r="9" stroke="url(#grad-gasket)" stroke-width="2" fill="none" 
                    filter="url(#shadow-gasket)"/>
            <circle cx="12" cy="12" r="6" stroke="url(#grad-gasket)" stroke-width="2" fill="none"/>
            <path d="M3 12Q12 8 21 12" stroke="url(#grad-gasket)" stroke-width="1.5" opacity="0.5"/>
            <path d="M3 12Q12 16 21 12" stroke="url(#grad-gasket)" stroke-width="1.5" opacity="0.5"/>
        </svg>
    `,

    /**
     * Hardware Icon - Indigo-Blue Gradient
     * For: Bản lề & Khóa
     */
    hardware: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <defs>
                <linearGradient id="grad-hardware" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow-hardware">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
            <rect x="8" y="4" width="8" height="10" rx="1" stroke="url(#grad-hardware)" 
                  stroke-width="2" fill="none" filter="url(#shadow-hardware)"/>
            <circle cx="12" cy="17" r="2" stroke="url(#grad-hardware)" stroke-width="2" fill="none"/>
            <line x1="12" y1="14" x2="12" y2="15" stroke="url(#grad-hardware)" stroke-width="2"/>
            <circle cx="12" cy="9" r="1.5" fill="url(#grad-hardware)"/>
            <rect x="10" y="18" width="4" height="2" rx="0.5" fill="url(#grad-hardware)" opacity="0.6"/>
        </svg>
    `,

    /**
     * Handle/Misc Icon - Cyan-Blue Gradient  
     * For: Tay nắm/Khác (if needed)
     */
    handle: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <defs>
                <linearGradient id="grad-handle" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow-handle">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
            <circle cx="8" cy="12" r="3" stroke="url(#grad-handle)" stroke-width="2" 
                    fill="none" filter="url(#shadow-handle)"/>
            <circle cx="16" cy="12" r="3" stroke="url(#grad-handle)" stroke-width="2" fill="none"/>
            <line x1="11" y1="12" x2="13" y2="12" stroke="url(#grad-handle)" stroke-width="2"/>
            <path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" stroke="url(#grad-handle)" 
                  stroke-width="2" opacity="0.5"/>
        </svg>
    `
};

// Make globally available
if (typeof window !== 'undefined') {
    window.PremiumIcons = PremiumIcons;
}
