/**
 * ViralWindow — Global Responsive Mobile JS
 * 
 * Responsibilities:
 *  1. Inject <link> for responsive-mobile.css into every page
 *  2. Inject hamburger button and sidebar overlay into DOM
 *  3. Handle sidebar open/close/swipe gestures
 *  4. Wrap all tables in overflow-x:auto containers
 *  5. Fix iOS input zoom
 *
 * Load order: this file should be added to modal-system.js preamble
 * OR included as a script tag right after modal-system.js
 */

(function VWResponsive() {
    'use strict';

    // ── 1. Inject responsive CSS (idempotent) ──────────────────────────
    function injectCSS() {
        if (document.getElementById('vw-responsive-css')) return;
        const link = document.createElement('link');
        link.id   = 'vw-responsive-css';
        link.rel  = 'stylesheet';
        // Resolve path relative to current page location
        const depth = (window.location.pathname.match(/\//g) || []).length - 1;
        const prefix = depth > 1 ? '../'.repeat(depth - 1) : '';
        link.href = prefix + 'css/responsive-mobile.css';
        document.head.appendChild(link);
    }

    // ── 2. Inject hamburger button ─────────────────────────────────────
    function injectHamburger() {
        if (document.getElementById('vw-hamburger')) return;
        if (!document.querySelector('.sidebar')) return; // only pages with sidebar

        const btn = document.createElement('button');
        btn.id = 'vw-hamburger';
        btn.className = 'vw-hamburger';
        btn.setAttribute('aria-label', 'Mở menu');
        btn.setAttribute('title', 'Mở menu điều hướng');
        btn.innerHTML = `
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>`;
        btn.addEventListener('click', toggleSidebar);
        document.body.appendChild(btn);
    }

    // ── 3. Inject sidebar overlay ──────────────────────────────────────
    function injectOverlay() {
        if (document.getElementById('vw-sidebar-overlay')) return;
        if (!document.querySelector('.sidebar')) return;

        const overlay = document.createElement('div');
        overlay.id = 'vw-sidebar-overlay';
        overlay.className = 'vw-sidebar-overlay';
        overlay.addEventListener('click', closeSidebar);
        document.body.appendChild(overlay);
    }

    // ── 4. Sidebar toggle logic ────────────────────────────────────────
    function toggleSidebar() {
        const sidebar  = document.querySelector('.sidebar');
        const overlay  = document.getElementById('vw-sidebar-overlay');
        const hamburger = document.getElementById('vw-hamburger');
        if (!sidebar) return;

        const isOpen = sidebar.classList.contains('mobile-open');
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openSidebar() {
        const sidebar  = document.querySelector('.sidebar');
        const overlay  = document.getElementById('vw-sidebar-overlay');
        const hamburger = document.getElementById('vw-hamburger');
        if (!sidebar) return;

        sidebar.classList.add('mobile-open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // prevent background scroll

        // Change icon to X
        if (hamburger) {
            hamburger.innerHTML = `
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>`;
        }
    }

    function closeSidebar() {
        const sidebar   = document.querySelector('.sidebar');
        const overlay   = document.getElementById('vw-sidebar-overlay');
        const hamburger = document.getElementById('vw-hamburger');
        if (!sidebar) return;

        sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';

        // Restore hamburger icon
        if (hamburger) {
            hamburger.innerHTML = `
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>`;
        }
    }

    // ── 5. Expose globally for nav links (close on navigate on mobile) ─
    window.vwCloseSidebar = closeSidebar;

    // ── 6. Close sidebar when nav item is clicked on mobile ───────────
    function attachNavCloseHandlers() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        sidebar.querySelectorAll('a[href], .submenu-item').forEach(function(link) {
            link.addEventListener('click', function() {
                if (window.innerWidth < 1024) {
                    setTimeout(closeSidebar, 150);
                }
            });
        });
    }

    // ── 7. Touch/swipe gesture support ────────────────────────────────
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (!document.querySelector('.sidebar')) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);

        // Swipe right from left edge → open sidebar
        if (touchStartX < 30 && dx > 60 && dy < 80) {
            openSidebar();
        }
        // Swipe left → close sidebar
        if (dx < -60 && dy < 80) {
            closeSidebar();
        }
    }, { passive: true });

    // ── 8. Wrap tables for horizontal scroll ──────────────────────────
    function wrapTables() {
        document.querySelectorAll('table').forEach(function(table) {
            // Skip if already wrapped
            if (table.parentElement && table.parentElement.classList.contains('vw-table-wrap')) return;
            // Skip tables inside modal
            if (table.closest('.vw-modal-o')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'vw-table-wrap';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    // ── 9. Handle window resize ────────────────────────────────────────
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth >= 1024) {
                // Desktop: always close mobile sidebar, restore overflow
                closeSidebar();
            }
        }, 100);
    });

    // ── 10. ESC key closes sidebar ────────────────────────────────────
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeSidebar();
    });

    // ── INIT: Run on DOMContentLoaded ─────────────────────────────────
    function init() {
        injectCSS();
        injectHamburger();
        injectOverlay();
        wrapTables();
        attachNavCloseHandlers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-wrap tables after dynamic content loads (e.g. AJAX table renders)
    const _origInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
    // Use MutationObserver instead - less invasive
    const tableObserver = new MutationObserver(function(mutations) {
        let needsWrap = false;
        mutations.forEach(function(m) {
            if (m.addedNodes.length) needsWrap = true;
        });
        if (needsWrap) {
            clearTimeout(window.__vwTableWrapTimer);
            window.__vwTableWrapTimer = setTimeout(wrapTables, 300);
        }
    });

    if (document.body) {
        tableObserver.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            tableObserver.observe(document.body, { childList: true, subtree: true });
        });
    }

})();
