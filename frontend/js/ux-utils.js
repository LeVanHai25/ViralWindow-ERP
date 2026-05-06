/**
 * ViralWindow – UX Utilities v1.0
 * Sprint 1: Global quick wins
 * Include ONCE per page, near </body>
 */

;(function (VW) {
    'use strict';

    /* ============================================================
       HELPERS
    ============================================================ */

    /**
     * Parse a date string "DD/MM/YYYY" or ISO "YYYY-MM-DD" → Date obj
     * Returns null if invalid.
     */
    function parseDate(str) {
        if (!str) return null;
        str = String(str).trim();
        // ISO format
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            const d = new Date(str.slice(0, 10));
            return isNaN(d) ? null : d;
        }
        // Vietnamese "DD/MM/YYYY"
        const parts = str.split('/');
        if (parts.length === 3) {
            const d = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
            return isNaN(d) ? null : d;
        }
        return null;
    }

    function todayMidnight() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function daysDiff(a, b) {
        return Math.floor((b - a) / 86_400_000);
    }

    /* ============================================================
       1. AUTO LATE BADGES
       Scans elements with [data-deadline] attribute.
       If deadline < today AND status NOT in done list → inject badge.
    ============================================================ */
    const DONE_STATUSES = new Set([
        'done', 'completed', 'hoan-thanh', 'hoàn thành',
        'da-giao', 'đã giao', 'finished', 'closed'
    ]);

    function computeLateBadges() {
        const today = todayMidnight();

        document.querySelectorAll('[data-deadline]').forEach(function (el) {
            // Skip if already has badge
            if (el.querySelector('.vw-late-badge')) return;

            const deadline = parseDate(el.dataset.deadline);
            if (!deadline) return;

            const status = (el.dataset.status || '').toLowerCase().trim();
            if (DONE_STATUSES.has(status)) return;

            if (deadline < today) {
                const daysLate = daysDiff(deadline, today);

                const badge = document.createElement('span');
                badge.className = 'vw-late-badge';
                badge.setAttribute('title', 'Dự án đã quá hạn ' + daysLate + ' ngày');
                // Heroicon: exclamation-triangle (mini SVG inline)
                badge.innerHTML =
                    '<svg class="vw-late-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' +
                    '<path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>' +
                    '</svg>' +
                    'Trễ ' + daysLate + ' ngày';

                // Append inline after the element's text, or after the element
                el.appendChild(badge);

                // Also add warning class to the date text itself
                el.classList.add('vw-deadline-warn');
            } else {
                el.classList.add('vw-deadline-ok');
            }
        });
    }

    /* ============================================================
       2. CLICKABLE KPI CARDS → quick filter
       Cards need: data-kpi-filter="fieldName" data-kpi-value="value"
       Target filter input needs: data-filter-target="fieldName"
    ============================================================ */
    function initKPIFilter() {
        var activeFilter = null;

        document.querySelectorAll('[data-kpi-filter]').forEach(function (card) {
            card.classList.add('vw-kpi-clickable');

            // Set hover hint text
            if (!card.dataset.hint) {
                card.dataset.hint = 'Nhấn để lọc';
            }

            card.addEventListener('click', function () {
                var filterKey = card.dataset.kpiFilter;
                var filterVal = card.dataset.kpiValue || '';
                var isActive  = card.classList.contains('vw-kpi-active');

                // Clear all active states
                document.querySelectorAll('.vw-kpi-clickable').forEach(function (c) {
                    c.classList.remove('vw-kpi-active');
                });

                if (isActive) {
                    // Toggle off → reset filter
                    _applyFilter(filterKey, '');
                    activeFilter = null;
                    _removeActiveChip();
                } else {
                    card.classList.add('vw-kpi-active');
                    _applyFilter(filterKey, filterVal);
                    activeFilter = { key: filterKey, val: filterVal, label: card.dataset.kpiLabel || filterVal };
                    _showActiveChip(card, filterKey, filterVal);
                }
            });
        });

        function _applyFilter(key, val) {
            // Method 1: find <select data-filter-target="key">
            var sel = document.querySelector('select[data-filter-target="' + key + '"]');
            if (sel) {
                sel.value = val;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // Method 2: find <input data-filter-target="key">
            var inp = document.querySelector('input[data-filter-target="' + key + '"]');
            if (inp) {
                inp.value = val;
                inp.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Method 3: fire global event for custom handlers
            document.dispatchEvent(new CustomEvent('vw:kpi-filter', {
                detail: { key: key, value: val }
            }));
        }

        function _showActiveChip(card, key, val) {
            _removeActiveChip();
            var bar = document.querySelector('.vw-filter-sticky, .filter-bar-sticky, .vw-filter-bar');
            if (!bar) return;

            var label = card.querySelector('[class*="label"], [class*="title"], span:not(.vw-kpi-clickable)');
            var labelText = label ? label.textContent.trim() : val;

            var chip = document.createElement('div');
            chip.className = 'vw-filter-active-chip';
            chip.id = 'vw-active-filter-chip';
            chip.innerHTML =
                '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' +
                '<path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-4 2A1 1 0 016 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>' +
                '</svg>' +
                labelText +
                '<span class="chip-close" title="Xóa bộ lọc">' +
                '<svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>' +
                '</span>';

            chip.querySelector('.chip-close').addEventListener('click', function (e) {
                e.stopPropagation();
                document.querySelectorAll('.vw-kpi-clickable').forEach(function (c) {
                    c.classList.remove('vw-kpi-active');
                });
                _applyFilter(key, '');
                _removeActiveChip();
            });

            bar.prepend(chip);
        }

        function _removeActiveChip() {
            var existing = document.getElementById('vw-active-filter-chip');
            if (existing) existing.remove();
        }
    }

    /* ============================================================
       3. STICKY FILTER BAR – adds shadow class on scroll
    ============================================================ */
    function initStickyFilterShadow() {
        var bar = document.querySelector('.vw-filter-sticky');
        if (!bar) return;

        var scrollContainer = bar.closest('.main-content') || window;

        function onScroll() {
            var scrollY = scrollContainer === window
                ? window.scrollY
                : scrollContainer.scrollTop;
            bar.classList.toggle('is-scrolled', scrollY > 40);
        }

        scrollContainer.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ============================================================
       4. STEPPER – navigate form steps
       Usage: call VW.Stepper.init('#my-stepper')
    ============================================================ */
    VW.Stepper = {
        init: function (containerSelector) {
            var container = document.querySelector(containerSelector || '.vw-stepper');
            if (!container) return;

            var steps      = Array.from(container.querySelectorAll('.vw-stepper-step'));
            var connectors = Array.from(container.querySelectorAll('.vw-stepper-connector'));
            var sections   = [];

            steps.forEach(function (step, idx) {
                var targetId = step.dataset.target;
                if (targetId) {
                    sections.push(document.getElementById(targetId));
                }

                step.addEventListener('click', function () {
                    VW.Stepper.goTo(idx, steps, connectors, sections);
                });
            });

            // Expose global go-to
            container._stepperGoTo = function (idx) {
                VW.Stepper.goTo(idx, steps, connectors, sections);
            };

            // Activate step 0 initially
            VW.Stepper.goTo(0, steps, connectors, sections);
        },

        goTo: function (targetIdx, steps, connectors, sections) {
            steps.forEach(function (step, idx) {
                step.classList.remove('vw-step-active', 'vw-step-done');
                if (idx < targetIdx)  step.classList.add('vw-step-done');
                if (idx === targetIdx) step.classList.add('vw-step-active');
            });

            connectors.forEach(function (conn, idx) {
                conn.classList.toggle('vw-connector-done', idx < targetIdx);
            });

            if (sections.length) {
                sections.forEach(function (sec, idx) {
                    if (!sec) return;
                    sec.style.display = idx === targetIdx ? '' : 'none';
                });
            }

            // Fire event for page-level handlers
            document.dispatchEvent(new CustomEvent('vw:step-change', {
                detail: { step: targetIdx }
            }));
        }
    };

    /* ============================================================
       5. SIDEBAR NAV BADGES – update counts from API
    ============================================================ */
    async function updateSidebarBadges() {
        try {
            const res  = await fetch('/api/dashboard/summary-counts', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();

            _setBadge('vw-nav-badge-projects',    data.activeProjects   || 0);
            _setBadge('vw-nav-badge-quotations',  data.pendingQuotations || 0, 'vw-nav-badge-warn');
            _setBadge('vw-nav-badge-materials',   data.missingMaterials  || 0, 'vw-nav-badge-info');
            _setBadge('vw-nav-badge-messages',    data.unreadMessages    || 0);
        } catch (_) {
            // Silent fail – badges simply won't appear
        }
    }

    function _setBadge(id, count, extraClass) {
        var el = document.getElementById(id);
        if (!el) return;
        if (count > 0) {
            el.textContent  = count > 99 ? '99+' : count;
            el.style.display = '';
            if (extraClass) el.classList.add(extraClass);
            el.classList.add('vw-badge-update');
            setTimeout(function () { el.classList.remove('vw-badge-update'); }, 350);
        } else {
            el.style.display = 'none';
        }
    }

    /* ============================================================
       6. VIEW TOGGLE (Card / List)
       Usage: VW.ViewToggle.init('.vw-view-toggle', '#catalog-grid', 'vw-list-mode')
    ============================================================ */
    VW.ViewToggle = {
        init: function (toggleSel, targetSel, listClass) {
            var toggle = document.querySelector(toggleSel);
            var target = document.querySelector(targetSel);
            if (!toggle || !target) return;

            var STORAGE_KEY = 'vw-view-' + (targetSel.replace(/[^a-z0-9]/gi, '-'));
            var savedMode   = localStorage.getItem(STORAGE_KEY) || 'card';

            function applyMode(mode) {
                if (mode === 'list') {
                    target.classList.add(listClass);
                } else {
                    target.classList.remove(listClass);
                }
                toggle.querySelectorAll('.vw-view-btn').forEach(function (btn) {
                    btn.classList.toggle('vw-view-active', btn.dataset.view === mode);
                });
                localStorage.setItem(STORAGE_KEY, mode);
            }

            toggle.querySelectorAll('.vw-view-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    applyMode(btn.dataset.view || 'card');
                });
            });

            applyMode(savedMode);
        }
    };

    /* ============================================================
       7. COMPACT / EXPANDED PROJECT VIEW
    ============================================================ */
    VW.ProjectView = {
        init: function (containerSel, toggleBtnSel) {
            var container = document.querySelector(containerSel || '.vw-projects-container');
            if (!container) return;

            var STORAGE_KEY = 'vw-project-view-mode';
            var savedMode   = localStorage.getItem(STORAGE_KEY) || 'expanded';

            function applyMode(mode) {
                container.classList.toggle('vw-project-compact', mode === 'compact');
                if (toggleBtnSel) {
                    document.querySelectorAll(toggleBtnSel).forEach(function (btn) {
                        btn.classList.toggle('vw-view-active', btn.dataset.mode === mode);
                    });
                }
                localStorage.setItem(STORAGE_KEY, mode);
            }

            if (toggleBtnSel) {
                document.querySelectorAll(toggleBtnSel).forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        applyMode(btn.dataset.mode || 'expanded');
                    });
                });
            }

            applyMode(savedMode);
        }
    };

    /* ============================================================
       8. PAGE ENTRANCE ANIMATION
    ============================================================ */
    function initPageEntrance() {
        var main = document.querySelector('.main-content, #mainContent, main');
        if (main) main.classList.add('vw-page-enter');
    }

    /* ============================================================
       AUTO-INIT on DOMContentLoaded
    ============================================================ */
    document.addEventListener('DOMContentLoaded', function () {
        computeLateBadges();
        initKPIFilter();
        initStickyFilterShadow();
        initPageEntrance();

        // Sidebar badges – fetch after short delay to not block render
        setTimeout(updateSidebarBadges, 800);
    });

    /* ============================================================
       PUBLIC API
    ============================================================ */
    VW.computeLateBadges   = computeLateBadges;
    VW.updateSidebarBadges = updateSidebarBadges;
    VW.parseDate           = parseDate;

}(window.VW = window.VW || {}));
