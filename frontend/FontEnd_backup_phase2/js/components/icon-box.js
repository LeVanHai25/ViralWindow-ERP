/**
 * ViralWindow Unified Icon System (Web Component)
 * Usage: <vw-icon name="briefcase" variant="purple" size="md"></vw-icon>
 * 
 * Variants: teal, green, orange, red, blue, purple, slate, amber, rose, none
 * Sizes: sm (24px badge/14px icon), md (32px/18px), lg (40px/20px), none (bare icon)
 */

class IconBox extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ['name', 'variant', 'size', 'class', 'icon-size'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    // Dynamic loader to prevent having to modify 40+ HTML heads
    async loadLucide() {
        if (window.lucide) return window.lucide;
        if (window._lucideLoading) {
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    if (window.lucide) { clearInterval(interval); resolve(window.lucide); }
                }, 50);
            });
        }
        window._lucideLoading = true;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/lucide@latest';
            script.onload = () => { window._lucideLoading = false; resolve(window.lucide); };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async render() {
        const name = this.getAttribute('name') || 'circle';
        const variant = this.getAttribute('variant') || 'slate';
        const size = this.getAttribute('size') || 'md';
        const customClass = this.getAttribute('class') || '';

        // Dimensional Tokens
        let boxSizeClass = '';
        let iconSizePx = 18;
        let roundedClass = 'rounded-xl';

        if (size === 'none') {
            boxSizeClass = '';
            roundedClass = '';
            iconSizePx = parseInt(this.getAttribute('icon-size')) || 16;
        } else if (size === 'sm') {
            boxSizeClass = 'w-6 h-6 min-w-[24px]';
            iconSizePx = 14;
            roundedClass = 'rounded-lg';
        } else if (size === 'lg') {
            boxSizeClass = 'w-10 h-10 min-w-[40px]';
            iconSizePx = 20;
            roundedClass = 'rounded-xl';
        } else { 
            // md is standard sidebar size
            boxSizeClass = 'w-8 h-8 min-w-[32px]';
            iconSizePx = 18;
            roundedClass = 'rounded-xl';
        }

        // Semantic Color Tokens matching Work Plan page
        const colors = {
            teal: 'bg-teal-50 text-teal-600 border border-teal-100/50 shadow-sm',
            green: 'bg-green-50 text-green-600 border border-green-100/50 shadow-sm',
            orange: 'bg-orange-50 text-orange-600 border border-orange-100/50 shadow-sm',
            red: 'bg-red-50 text-red-600 border border-red-100/50 shadow-sm',
            blue: 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm',
            purple: 'bg-purple-50 text-purple-600 border border-purple-100/50 shadow-sm',
            slate: 'bg-slate-100 text-slate-500 border border-slate-200/50 shadow-sm',
            amber: 'bg-amber-50 text-amber-600 border border-amber-100/50 shadow-sm',
            rose: 'bg-rose-50 text-rose-600 border border-rose-100/50 shadow-sm',
            none: '' // Bare icon with inheriting text color
        };

        const themeClass = colors[variant] || colors.slate;
        
        // CSS aggregation
        const baseClasses = size === 'none' 
            ? `inline-flex items-center justify-center ${themeClass} ${customClass} transition-colors`
            : `inline-flex items-center justify-center ${boxSizeClass} ${roundedClass} ${themeClass} ${customClass} shrink-0 transition-colors`;

        // Render structure (the inneri element acts as a target for Lucide)
        this.innerHTML = `
            <div class="${baseClasses}">
                <i data-lucide="${name}" width="${iconSizePx}" height="${iconSizePx}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></i>
            </div>
        `;

        // Fire rendering SVG
        const lucide = await this.loadLucide();
        lucide.createIcons({
            nameAttr: 'data-lucide',
            root: this
        });
    }
}

// Register Component globally
if (!customElements.get('vw-icon')) {
    customElements.define('vw-icon', IconBox);
}
