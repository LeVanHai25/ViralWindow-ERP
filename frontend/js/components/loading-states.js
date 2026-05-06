/**
 * ViralWindow Loading States Component
 * Provides skeleton loaders, spinners, and empty states
 */
(function () {
    'use strict';

    window.VWLoading = {

        /**
         * Show skeleton loading in a container
         * @param {string|Element} target - CSS selector or DOM element
         * @param {string} type - 'table' | 'cards' | 'list' | 'detail'
         * @param {number} rows - Number of skeleton rows
         */
        show(target, type = 'table', rows = 5) {
            const el = typeof target === 'string' ? document.querySelector(target) : target;
            if (!el) return;

            el.dataset.vwPreviousContent = el.innerHTML;
            el.innerHTML = this.getSkeleton(type, rows);
        },

        /**
         * Restore original content
         */
        hide(target) {
            const el = typeof target === 'string' ? document.querySelector(target) : target;
            if (!el) return;

            if (el.dataset.vwPreviousContent) {
                el.innerHTML = el.dataset.vwPreviousContent;
                delete el.dataset.vwPreviousContent;
            }
        },

        /**
         * Replace content with new HTML and remove skeleton
         */
        replace(target, html) {
            const el = typeof target === 'string' ? document.querySelector(target) : target;
            if (!el) return;
            delete el.dataset.vwPreviousContent;
            el.innerHTML = html;
        },

        /**
         * Show empty state
         */
        showEmpty(target, message = 'Chưa có dữ liệu', icon = null) {
            const el = typeof target === 'string' ? document.querySelector(target) : target;
            if (!el) return;

            const svgIcon = icon || `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>`;

            el.innerHTML = `
                <div class="vw-empty-state">
                    ${svgIcon}
                    <div class="vw-empty-state-title">${message}</div>
                    <div class="vw-empty-state-text">Dữ liệu sẽ xuất hiện ở đây khi có nội dung mới</div>
                </div>
            `;
        },

        /**
         * Show inline spinner
         */
        spinner(size = 20) {
            return `<span class="vw-spinner" style="width:${size}px;height:${size}px;"></span>`;
        },

        /**
         * Get skeleton HTML by type
         */
        getSkeleton(type, rows) {
            switch (type) {
                case 'table':
                    return this._skeletonTable(rows);
                case 'cards':
                    return this._skeletonCards(rows);
                case 'list':
                    return this._skeletonList(rows);
                case 'detail':
                    return this._skeletonDetail();
                case 'kpi':
                    return this._skeletonKPI();
                default:
                    return this._skeletonList(rows);
            }
        },

        _skeletonTable(rows) {
            let rowsHtml = '';
            for (let i = 0; i < rows; i++) {
                const w1 = 40 + Math.random() * 40;
                const w2 = 30 + Math.random() * 50;
                const w3 = 20 + Math.random() * 30;
                rowsHtml += `
                    <tr>
                        <td style="padding:12px 16px"><div class="vw-skeleton vw-skeleton-text" style="width:${w1}%"></div></td>
                        <td style="padding:12px 16px"><div class="vw-skeleton vw-skeleton-text" style="width:${w2}%"></div></td>
                        <td style="padding:12px 16px"><div class="vw-skeleton vw-skeleton-text" style="width:${w3}%"></div></td>
                        <td style="padding:12px 16px"><div class="vw-skeleton vw-skeleton-text" style="width:60px"></div></td>
                    </tr>`;
            }
            return `
                <table style="width:100%">
                    <thead><tr>
                        <th style="padding:12px 16px"><div class="vw-skeleton" style="height:12px;width:80px"></div></th>
                        <th style="padding:12px 16px"><div class="vw-skeleton" style="height:12px;width:100px"></div></th>
                        <th style="padding:12px 16px"><div class="vw-skeleton" style="height:12px;width:60px"></div></th>
                        <th style="padding:12px 16px"><div class="vw-skeleton" style="height:12px;width:70px"></div></th>
                    </tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>`;
        },

        _skeletonCards(count) {
            let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">';
            for (let i = 0; i < count; i++) {
                html += `
                    <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid var(--color-neutral-200)">
                        <div class="vw-skeleton vw-skeleton-title"></div>
                        <div class="vw-skeleton vw-skeleton-text" style="width:90%"></div>
                        <div class="vw-skeleton vw-skeleton-text" style="width:70%"></div>
                        <div style="display:flex;gap:8px;margin-top:16px">
                            <div class="vw-skeleton" style="height:28px;width:80px;border-radius:14px"></div>
                            <div class="vw-skeleton" style="height:28px;width:60px;border-radius:14px"></div>
                        </div>
                    </div>`;
            }
            html += '</div>';
            return html;
        },

        _skeletonList(rows) {
            let html = '';
            for (let i = 0; i < rows; i++) {
                html += `
                    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--color-neutral-100)">
                        <div class="vw-skeleton vw-skeleton-avatar"></div>
                        <div style="flex:1">
                            <div class="vw-skeleton vw-skeleton-text" style="width:${50 + Math.random() * 30}%"></div>
                            <div class="vw-skeleton vw-skeleton-text" style="width:${30 + Math.random() * 20}%;height:10px"></div>
                        </div>
                    </div>`;
            }
            return html;
        },

        _skeletonDetail() {
            return `
                <div style="max-width:700px">
                    <div class="vw-skeleton" style="height:32px;width:40%;margin-bottom:24px"></div>
                    <div class="vw-skeleton vw-skeleton-text" style="width:100%"></div>
                    <div class="vw-skeleton vw-skeleton-text" style="width:95%"></div>
                    <div class="vw-skeleton vw-skeleton-text" style="width:80%"></div>
                    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
                        <div class="vw-skeleton" style="height:80px"></div>
                        <div class="vw-skeleton" style="height:80px"></div>
                    </div>
                    <div class="vw-skeleton vw-skeleton-text" style="width:100%;margin-top:24px"></div>
                    <div class="vw-skeleton vw-skeleton-text" style="width:60%"></div>
                </div>`;
        },

        _skeletonKPI() {
            return `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
                    ${[1,2,3,4].map(() => `
                        <div style="background:#fff;border-radius:16px;padding:24px;border:1px solid var(--color-neutral-200)">
                            <div class="vw-skeleton" style="height:14px;width:60%;margin-bottom:12px"></div>
                            <div class="vw-skeleton" style="height:32px;width:40%;margin-bottom:8px"></div>
                            <div class="vw-skeleton" style="height:10px;width:80%"></div>
                        </div>
                    `).join('')}
                </div>`;
        }
    };
})();
