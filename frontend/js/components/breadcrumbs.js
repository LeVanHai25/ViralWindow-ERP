/**
 * ViralWindow Breadcrumbs Component
 * Auto-generates breadcrumb navigation based on current page
 * Requires: <div id="breadcrumb-container"></div> in page HTML
 */
(function () {
    'use strict';

    const NAV_MAP = {
        'index.html':                  { label: 'Tổng quan', parent: null },
        'production-excel-view.html':  { label: 'Theo dõi dự án', parent: 'index.html' },
        'work-plan.html':              { label: 'Kế hoạch công việc', parent: 'index.html' },

        // Kinh doanh
        'sales.html':                  { label: 'Khách hàng', parent: 'index.html', group: 'Kinh doanh' },
        'projects-new.html':           { label: 'Dự án', parent: 'index.html', group: 'Kinh doanh' },
        'project-detail.html':         { label: 'Chi tiết dự án', parent: 'projects-new.html' },
        'project-logs.html':           { label: 'Nhật ký dự án', parent: 'projects-new.html' },
        'production.html':             { label: 'Quy trình dự án', parent: 'index.html', group: 'Kinh doanh' },
        'product-catalog-v2.html':     { label: 'Sản phẩm', parent: 'index.html', group: 'Kinh doanh' },
        'product-catalog.html':        { label: 'Sản phẩm', parent: 'index.html', group: 'Kinh doanh' },
        'quotation-new.html':          { label: 'Báo giá', parent: 'index.html', group: 'Kinh doanh' },
        'pending-quotations.html':     { label: 'Báo giá chờ duyệt', parent: 'index.html', group: 'Kinh doanh' },
        'completed-projects.html':     { label: 'Dự án hoàn thành', parent: 'projects-new.html' },
        'cancelled-projects.html':     { label: 'Dự án đã hủy', parent: 'projects-new.html' },

        // Kỹ thuật
        'design-new.html':             { label: 'Thiết kế & Bóc tách', parent: 'index.html', group: 'Kỹ thuật' },
        'design-new-v2.html':          { label: 'Thiết kế V2', parent: 'index.html', group: 'Kỹ thuật' },
        'material-requests.html':      { label: 'Yêu cầu vật tư', parent: 'index.html', group: 'Kỹ thuật' },
        'purchase-request.html':       { label: 'Tạo phiếu yêu cầu VT', parent: 'index.html', group: 'Kỹ thuật' },

        // Kho
        'inventory.html':              { label: 'Kho vật tư', parent: 'index.html', group: 'Kho & Vật tư' },
        'exported-materials.html':     { label: 'Xuất vật tư', parent: 'index.html', group: 'Kho & Vật tư' },

        // Thi công
        'product-manufacturing.html':  { label: 'Sản xuất sản phẩm', parent: 'index.html', group: 'Thi công' },
        'installation.html':           { label: 'Lắp đặt', parent: 'index.html', group: 'Thi công' },
        'handover.html':               { label: 'Bàn giao', parent: 'index.html', group: 'Thi công' },

        // Tài chính
        'finance-dashboard.html':      { label: 'Tổng quan tài chính', parent: 'index.html', group: 'Tài chính' },
        'finance-receipts.html':       { label: 'Phiếu thu', parent: 'finance-dashboard.html', group: 'Tài chính' },
        'finance-payments.html':       { label: 'Phiếu chi', parent: 'finance-dashboard.html', group: 'Tài chính' },
        'finance-debt.html':           { label: 'Công nợ', parent: 'finance-dashboard.html', group: 'Tài chính' },

        // Quản trị
        'admin-management.html':       { label: 'Phân quyền', parent: 'index.html', group: 'Quản trị' },
        'settings.html':               { label: 'Cài đặt hệ thống', parent: 'index.html', group: 'Quản trị' },
        'agencies.html':               { label: 'Chi nhánh', parent: 'index.html', group: 'Quản trị' },
        'profile.html':                { label: 'Hồ sơ cá nhân', parent: 'index.html' },
        'activity-log.html':           { label: 'Nhật ký hoạt động', parent: 'index.html', group: 'Quản trị' },

        // AI & Messages
        'reports-ai.html':             { label: 'Báo cáo AI', parent: 'index.html', group: 'AI Assistant' },
        'messages.html':               { label: 'Tin nhắn', parent: 'index.html' },
        'attendance.html':             { label: 'Chấm công', parent: 'index.html' },
    };

    function getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    function buildCrumbs(page) {
        const chain = [];
        let current = page;
        let depth = 0;

        while (current && NAV_MAP[current] && depth < 5) {
            chain.unshift({ page: current, ...NAV_MAP[current] });
            current = NAV_MAP[current].parent;
            depth++;
        }

        // Always start with home if not already there
        if (chain.length === 0 || chain[0].page !== 'index.html') {
            chain.unshift({ page: 'index.html', label: 'Tổng quan', parent: null });
        }

        return chain;
    }

    function render() {
        const container = document.getElementById('breadcrumb-container');
        if (!container) return;

        const currentPage = getCurrentPage();

        // Don't show breadcrumbs on dashboard
        if (currentPage === 'index.html') {
            container.innerHTML = '';
            return;
        }

        const crumbs = buildCrumbs(currentPage);

        const html = crumbs.map((item, i) => {
            const isLast = i === crumbs.length - 1;
            const sep = !isLast ? '<span class="vw-bc-sep">›</span>' : '';

            if (isLast) {
                return `<span class="vw-bc-current">${item.label}</span>`;
            }
            return `<a href="${item.page}">${item.label}</a>${sep}`;
        }).join('');

        container.innerHTML = `<nav class="vw-breadcrumb">${html}</nav>`;
    }

    // Auto-render
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }

    // Expose for SPA navigation
    window.VWBreadcrumbs = { render, NAV_MAP };
})();
