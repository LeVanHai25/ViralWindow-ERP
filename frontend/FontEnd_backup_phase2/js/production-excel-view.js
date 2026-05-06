/**
 * Production Excel View - Standard Logic Implementation
 * Synced 100% with Kanban, proper enums and computed fields from backend
 */

// Sử dụng API_BASE từ config hoặc fallback
const API_BASE = window.API_BASE || '/api';

// ============================================
// LABEL MAPPINGS (from enums to display text)
// ============================================
const STAGE_LABEL = {
    quotation: "Báo giá",
    design: "Thiết kế",
    estimation: "Bóc tách",
    production: "Sản xuất",
    installation: "Lắp đặt",
    handover: "Bàn giao"
};

const STATUS_LABEL = {
    draft: "Nháp",
    in_progress: "Đang xử lý",
    on_hold: "Tạm dừng",
    completed: "Hoàn thành",
    cancelled: "Huỷ",
    // Trạng thái project
    new: "Mới",
    designing: "Đang thiết kế",
    quotation_pending: "Chờ báo giá",
    quotation_approved: "Đã duyệt báo giá",
    in_production: "Đang sản xuất",
    installation: "Đang lắp đặt",
    handover: "Đã bàn giao",
    paused: "Tạm dừng",
    bom: "Đang bóc tách"
};

const MATERIAL_LABEL = {
    NONE: "Chưa có",
    MISSING: "Thiếu",
    PARTIAL: "Thiếu một phần",
    ORDERED: "Đã đặt",
    READY: "Đã đủ",
    ARRIVED: "Đã nhận",
    ISSUED: "Đã xuất",
    DELIVERED: "Đã giao",
    CUSTOMER_PROVIDED: "Khách cấp"
};

const EXPORT_LABEL = {
    NONE: "Chưa xuất",
    PARTIAL: "Đang xuất",
    FULL: "Đã xuất đủ"
};

const MATERIAL_GROUPS = ["GLASS", "ALUMINUM", "HARDWARE", "ACCESSORY"];
const MATERIAL_GROUP_LABEL = {
    GLASS: "Kính",
    ALUMINUM: "Nhôm",
    HARDWARE: "Phụ kiện",
    ACCESSORY: "Vật tư phụ"
};

// ============================================
// STATE
// ============================================
let ordersData = [];
let expandedRows = new Set();
let selectedOrderId = null;
let companyName = 'Vinawindow';
let columnSettings = {
    orderCode: true,
    orderName: true,
    featuredProducts: true,
    customer: true,
    quantity: true,
    projectValue: true,
    advanceAmount: true,
    remaining: true,
    workforce: true,
    createdAt: true,
    deliveryDate: true,
    materialStatus: true,
    exportStatus: true,
    materialDate: true,
    fixCompatible: true,
    note: true
};
let isLoading = false;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadCompanyName();
    loadColumnSettingsFromStorage();
    loadOrders();
    setupSearchDebounce();
    setupFilterListeners();
});

// Load column settings from localStorage
function loadColumnSettingsFromStorage() {
    try {
        const saved = localStorage.getItem('productionExcelColumnSettings');
        if (saved) {
            columnSettings = { ...columnSettings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Could not load column settings:', e);
    }
    applyColumnVisibility();
}

// Save column settings to localStorage
function saveColumnSettingsToStorage() {
    try {
        localStorage.setItem('productionExcelColumnSettings', JSON.stringify(columnSettings));
    } catch (e) {
        console.warn('Could not save column settings:', e);
    }
}

// Load company name for Đơn vị SX column
async function loadCompanyName() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE}/company-settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                companyName = result.data.company_name || result.data.name || 'Vinawindow';
            }
        }
    } catch (error) { }
}

// ============================================
// LOAD ORDERS + KPI (from filtered API)
// ============================================
async function loadOrders() {
    // Prevent multiple simultaneous loads
    if (isLoading) {
        console.log('Load already in progress, skipping...');
        return;
    }

    isLoading = true;

    // Show loading state
    const refreshBtn = document.querySelector('button[onclick="loadOrders()"]');
    const tbody = document.getElementById('gridBody');

    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="animate-spin inline-block mr-1">↻</span> Đang tải...';
        refreshBtn.classList.add('opacity-75');
    }

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" class="text-center py-8">
                    <div class="flex items-center justify-center gap-3">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span class="text-gray-500">Đang tải dữ liệu...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    try {
        const qs = buildQueryFromUI();

        // Parallel fetch: list + KPI
        const [listRes, kpiRes] = await Promise.all([
            fetch(`${API_BASE}/production/excel/orders?${qs}`).then(r => r.json()),
            fetch(`${API_BASE}/production/excel/kpi?${qs}`).then(r => r.json())
        ]);

        // Render KPI
        if (kpiRes.success) {
            renderKpi(kpiRes.data);
        }

        // Render grid
        if (listRes.success) {
            ordersData = listRes.data || [];
            renderGrid(ordersData);
            console.log(`✅ Loaded ${ordersData.length} orders successfully`);
        } else {
            console.error('Error loading orders:', listRes.error);
            ordersData = [];
            renderGrid([]);
            showNotification('Lỗi khi tải dữ liệu: ' + (listRes.error || 'Không xác định'), 'error');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersData = [];
        renderGrid([]);
        showNotification('Lỗi kết nối server: ' + error.message, 'error');
    } finally {
        isLoading = false;

        // Reset refresh button
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '↻ Refresh';
            refreshBtn.classList.remove('opacity-75');
        }
    }
}

// Simple notification helper
function showNotification(message, type = 'info') {
    // Try using the notification system if available
    if (typeof showSuccessNotification === 'function' && type === 'success') {
        showSuccessNotification(message);
        return;
    }

    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-[9999] px-6 py-3 rounded-lg shadow-lg transition-all transform translate-x-full ${type === 'error' ? 'bg-red-500 text-white' :
        type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
        }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function buildQueryFromUI() {
    const params = new URLSearchParams();

    // Stage filter
    const stage = document.getElementById('stageFilter')?.value;
    if (stage) params.append('stage', stage);

    // Status filter
    const status = document.getElementById('statusFilter')?.value;
    if (status) params.append('status', status);

    // Overdue filter
    const overdue = document.getElementById('overdueFilter')?.value;
    if (overdue) params.append('overdue', overdue);

    // Date range
    const fromDate = document.getElementById('filterFrom')?.value;
    const toDate = document.getElementById('filterTo')?.value;
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);

    // Search
    const q = document.getElementById('searchInput')?.value?.trim();
    if (q) params.append('q', q);

    return params.toString();
}

// ============================================
// FILTER LISTENERS
// ============================================
function setupFilterListeners() {
    const filters = ['stageFilter', 'statusFilter', 'overdueFilter', 'filterFrom', 'filterTo'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => loadOrders());
        }
    });
}

function setupSearchDebounce() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadOrders(), 300);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            loadOrders();
        }
    });
}

// ============================================
// RENDER KPI (from backend computed)
// ============================================
function renderKpi(kpi) {
    const setTextIfExists = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    // Use correct HTML element IDs from production-excel-view.html
    setTextIfExists('kpiTotal', kpi.totalOrders || 0);
    setTextIfExists('kpiProduction', kpi.inProduction || 0);    // HTML: kpiProduction
    setTextIfExists('kpiComplete', kpi.completed || 0);          // HTML: kpiComplete
    setTextIfExists('kpiLate', kpi.overdue || 0);                // HTML: kpiLate
    setTextIfExists('kpiMaterial', kpi.missingMaterial || 0);    // HTML: kpiMaterial
}

// ============================================
// RENDER GRID
// ============================================
function renderGrid(orders) {
    const tbody = document.getElementById('gridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>';
        return;
    }

    orders.forEach(order => {
        const mainRow = createMainRow(order);
        tbody.appendChild(mainRow);

        // Render expanded material rows
        if (expandedRows.has(order.id)) {
            order.materials.forEach(mat => {
                const matRow = createMaterialRow(order.id, mat);
                tbody.appendChild(matRow);
            });
        }
    });

    // Apply column visibility after rendering
    applyColumnVisibility();
}

function createMainRow(order) {
    const tr = document.createElement('tr');
    tr.className = order.isOverdue ? 'row-late cursor-pointer' : 'cursor-pointer';
    if (order.materialOverallStatus === 'MISSING' || order.materialOverallStatus === 'PARTIAL') {
        tr.classList.add('row-missing-material');
    }
    tr.dataset.orderId = order.id;

    const isExpanded = expandedRows.has(order.id);
    const expandIcon = isExpanded ? '−' : '+';

    // CN-Khách hàng: combine branch and customer name
    const branchCustomer = order.branch?.name
        ? `${order.branch.name} - ${order.customer?.name || ''}`
        : (order.customer?.name || '');

    // Format dates
    // contractDate = ngày chốt HĐ (approved_at → quotation_date → start_date → created_at)
    const createdAt = formatDate(order.contractDate || order.createdAt);
    const deliveryPlanDate = formatDate(order.deliveryPlanDate);
    const materialPlanDate = formatDate(order.materialPlanDate);

    // Material status badges (multi-badge with tooltip)
    // Use new materialStatuses array if available, fallback to single badge
    const materialBadge = order.materialStatuses && order.materialStatuses.length > 0
        ? getMaterialBadges(order.materialStatuses, order.materialStatusDetails)
        : getMaterialBadge(order.materialOverallStatus);

    // Overdue badge
    const overdueBadge = order.isOverdue ? '<span class="status-badge status-late">Trễ hạn</span>' : '';

    // Format quantity (total aluminum weight in kg)
    const quantityDisplay = order.quantity
        ? (/[a-zA-Z]/.test(order.quantity) ? order.quantity : `${parseFloat(order.quantity).toFixed(2)} kg`)
        : '';

    // Finance columns
    const totalValue = parseFloat(order.totalValue) || 0;
    const advanceAmount = parseFloat(order.advanceAmount) || 0;
    const remaining = totalValue - advanceAmount;
    const remainingClass = remaining < 0 ? 'text-red-600' : (remaining === 0 && totalValue === 0 ? 'text-gray-400' : 'text-green-700');

    tr.innerHTML = `
        <td class="expand-cell"><button class="expand-btn">${expandIcon}</button></td>
        <td data-col="orderCode"><a href="#" onclick="event.stopPropagation(); openDetail(${order.id})" class="text-blue-600 font-semibold">${escapeHtml(order.orderCode)}</a></td>
        <td data-col="orderName">${escapeHtml(order.orderName)}</td>
        <td data-col="featuredProducts"></td>
        <td data-col="customer" class="customer-cell" onclick="event.stopPropagation(); openCustomerModal(${order.id})" title="${escapeHtml(branchCustomer)}">${escapeHtml(branchCustomer)}</td>
        <td data-col="quantity" data-value="${order.quantity || ''}" class="text-right font-medium text-blue-600 editable-cell" onclick="event.stopPropagation();" ondblclick="editCell(this, ${order.id}, 'quantity')">${quantityDisplay}</td>
        <td data-col="projectValue" data-raw="${totalValue}" class="text-right font-medium text-blue-700 editable-cell" onclick="event.stopPropagation();" ondblclick="editCurrencyCell(this, ${order.id}, 'totalValue')">${formatCurrency(totalValue)}</td>
        <td data-col="advanceAmount" data-raw="${advanceAmount}" class="text-right font-medium text-orange-600 editable-cell" onclick="event.stopPropagation();" ondblclick="editCurrencyCell(this, ${order.id}, 'advanceAmount')">${formatCurrency(advanceAmount)}</td>
        <td data-col="remaining" class="text-right font-bold ${remainingClass}">${formatCurrency(remaining)}</td>
        <td data-col="workforce" class="editable-cell" onclick="event.stopPropagation();" ondblclick="editCell(this, ${order.id}, 'workforce')" title="Double-click để nhập nhân lực">${escapeHtml(order.workforce || '')}</td>
        <td data-col="createdAt">${createdAt}</td>
        <td data-col="deliveryDate">${deliveryPlanDate} ${overdueBadge}</td>
        <td data-col="materialStatus" class="material-status-cell cursor-pointer hover:bg-blue-50" onclick="event.stopPropagation(); openMaterialSummaryModal(${order.id})">${materialBadge}</td>
        <td data-col="exportStatus" class="material-status-cell cursor-pointer hover:bg-blue-50" onclick="event.stopPropagation(); openMaterialSummaryModal(${order.id})">${getExportBadge(order.exportStatus)}</td>
        <td data-col="materialDate" class="material-date-cell cursor-pointer hover:bg-blue-50" onclick="event.stopPropagation(); openMaterialSummaryModal(${order.id})">${materialPlanDate}</td>
        <td data-col="fixCompatible" class="editable-cell" onclick="event.stopPropagation();" ondblclick="editCell(this, ${order.id}, 'fixCompatible')">${order.fixCompatible || ''}</td>
        <td data-col="note" class="editable-cell" onclick="event.stopPropagation();" ondblclick="editCell(this, ${order.id}, 'note')">${order.note || ''}</td>
    `;

    // Add click event to entire row for expand/collapse
    tr.addEventListener('click', (e) => {
        // Don't toggle if clicking on specific cells
        if (e.target.closest('.editable-cell') || e.target.closest('a') || e.target.closest('.material-status-cell') || e.target.closest('.material-date-cell') || e.target.closest('.customer-cell') || e.target.closest('.material-detail-cell')) {
            return;
        }
        toggleExpand(order.id);
    });

    // Apply column visibility after creating row
    applyColumnVisibilityToRow(tr);

    return tr;
}

function applyColumnVisibilityToRow(row) {
    const cells = row.querySelectorAll('td[data-col]');
    cells.forEach(td => {
        const colKey = td.dataset.col;
        if (colKey && columnSettings[colKey] === false) {
            td.style.display = 'none';
        } else {
            td.style.display = '';
        }
    });
}

/**
 * Get material date display with arrival/export context
 * Handles multiple export dates when materials were exported across different days
 */
function getMaterialDateDisplay(material) {
    const groupLabel = MATERIAL_GROUP_LABEL[material.group] || material.group;

    if (material.status === 'ISSUED' || material.status === 'ARRIVED' || material.status === 'DELIVERED') {
        let statusText = 'đã về';
        if (material.status === 'ISSUED') statusText = 'đã xuất';
        if (material.status === 'DELIVERED') statusText = 'đã giao';

        // Check if we have multiple export dates from backend
        if (material.exportDates && material.exportDates.length > 1) {
            const dateLines = material.exportDates.map(ed => {
                const d = formatDate(ed.date);
                return `<div class="leading-tight">${d} <span class="text-gray-400">(${ed.qty})</span></div>`;
            }).join('');
            return `<div class="text-emerald-600 text-xs font-medium">
                <div class="mb-0.5">${groupLabel} - ${statusText}:</div>
                ${dateLines}
            </div>`;
        }

        // Single date
        const dateStr = material.exportDates && material.exportDates.length === 1
            ? formatDate(material.exportDates[0].date)
            : formatDate(material.actualDate || material.planDate);

        if (dateStr) {
            return `<span class="text-emerald-600 text-xs font-medium">${groupLabel} - ${statusText} ngày ${dateStr}</span>`;
        }
        return `<span class="text-emerald-600 text-xs font-medium">${groupLabel} - ${statusText}</span>`;
    }

    // Default: show plan date only
    return formatDate(material.planDate);
}

function createMaterialRow(orderId, material) {
    const tr = document.createElement('tr');
    tr.className = 'material-row';

    const groupLabel = MATERIAL_GROUP_LABEL[material.group] || material.group;

    // Use multi-badge if itemStatuses available, fallback to single badge
    const statusBadge = material.itemStatuses && material.itemStatuses.length > 0
        ? getMaterialBadgesSimple(material.itemStatuses)
        : getMaterialBadge(material.status);

    const planDateDisplay = getMaterialDateDisplay(material);

    // Sản phẩm đặc chưng cho loại vật tư này
    const featuredProducts = material.featuredProducts || '';
    // Khối lượng của vật tư
    const quantity = material.quantity || '';

    tr.innerHTML = `
        <td></td>
        <td data-col="orderCode" colspan="2" class="pl-8">↳ ${groupLabel}</td>
        <td data-col="featuredProducts" class="editable-cell text-xs text-gray-600 cursor-pointer hover:bg-blue-50" ondblclick="editMaterialField(${orderId}, '${material.group}', 'featuredProducts', this)">${escapeHtml(featuredProducts)}</td>
        <td data-col="customer"></td>
        <td data-col="quantity" class="editable-cell text-xs text-gray-600 cursor-pointer hover:bg-blue-50" ondblclick="editMaterialField(${orderId}, '${material.group}', 'quantity', this)">${escapeHtml(quantity)}</td>
        <td data-col="projectValue"></td>
        <td data-col="advanceAmount"></td>
        <td data-col="remaining"></td>
        <td data-col="workforce" colspan="3"></td>
        <td data-col="materialStatus" class="material-detail-cell cursor-pointer hover:bg-blue-50" onclick="event.stopPropagation(); openMaterialDetailModal(${orderId}, '${material.group}')">${statusBadge}</td>
        <td data-col="exportStatus" class="material-status-cell cursor-pointer hover:bg-blue-50" onclick="event.stopPropagation(); openMaterialDetailModal(${orderId}, '${material.group}')">
            <div class="flex flex-col items-center">
                ${getExportBadge(material.exportStatus)}
                <span class="text-[10px] text-gray-500 mt-0.5">${material.exportRatio || '--'}</span>
            </div>
        </td>
        <td data-col="materialDate">${planDateDisplay}</td>
        <td data-col="fixCompatible"></td>
        <td data-col="note" class="editable-cell" ondblclick="editMaterialNote(${orderId}, '${material.group}')">${material.note || ''}</td>
    `;

    // Apply column visibility to material row
    applyColumnVisibilityToRow(tr);

    return tr;
}

/**
 * Simplified multi-badge for material rows (no details tooltip needed)
 * @param {string[]} statuses - Array of unique statuses
 * @returns {string} HTML for badges
 */
function getMaterialBadgesSimple(statuses) {
    if (!statuses || statuses.length === 0) {
        return getMaterialBadge('NONE');
    }

    // If only 1 status, return single badge
    if (statuses.length === 1) {
        return getMaterialBadge(statuses[0]);
    }

    // Max 2 badges, show +N for rest
    const MAX_BADGES = 2;
    const visibleStatuses = statuses.slice(0, MAX_BADGES);
    const remainingCount = statuses.length - MAX_BADGES;

    let html = '<div class="material-badges-container">';

    // Render visible badges
    visibleStatuses.forEach(status => {
        const label = MATERIAL_LABEL[status] || status || 'Chưa có';
        const badgeClass = getMaterialBadgeClass(status);
        html += `<span class="status-badge ${badgeClass} status-badge-compact">${label}</span>`;
    });

    // Show +N badge if there are more
    if (remainingCount > 0) {
        html += `<span class="status-badge status-more">+${remainingCount}</span>`;
    }

    html += '</div>';
    return html;
}

// ============================================
// MATERIAL STATUS BADGES
// ============================================

// Single badge (legacy, used for material rows)
function getMaterialBadge(status) {
    const label = MATERIAL_LABEL[status] || status || 'Chưa có';
    const badgeClass = getMaterialBadgeClass(status);
    return `<span class="status-badge ${badgeClass}">${label}</span>`;
}

/**
 * Multi-badge display with max 2 badges + tooltip
 * @param {string[]} statuses - Array of unique statuses (sorted by priority from backend)
 * @param {Object[]} details - Array of {group, groupLabel, status} for tooltip
 * @returns {string} HTML for badges
 */
function getMaterialBadges(statuses, details) {
    if (!statuses || statuses.length === 0) {
        return getMaterialBadge('NONE');
    }

    // If only 1 status, return single badge
    if (statuses.length === 1) {
        const tooltipContent = buildTooltipContent(details);
        return `<div class="material-badges-container" title="${tooltipContent}">
            ${getMaterialBadge(statuses[0])}
        </div>`;
    }

    // Build tooltip content from details
    const tooltipContent = buildTooltipContent(details);

    // Max 2 badges, show +N for rest
    const MAX_BADGES = 2;
    const visibleStatuses = statuses.slice(0, MAX_BADGES);
    const remainingCount = statuses.length - MAX_BADGES;

    let html = `<div class="material-badges-container" title="${tooltipContent}">`;

    // Render visible badges
    visibleStatuses.forEach(status => {
        const label = MATERIAL_LABEL[status] || status || 'Chưa có';
        const badgeClass = getMaterialBadgeClass(status);
        html += `<span class="status-badge ${badgeClass} status-badge-compact">${label}</span>`;
    });

    // Show +N badge if there are more
    if (remainingCount > 0) {
        html += `<span class="status-badge status-more">+${remainingCount}</span>`;
    }

    html += '</div>';
    return html;
}

/**
 * Build tooltip content from details array
 * @param {Object[]} details - Array of {group, groupLabel, status}
 * @returns {string} Tooltip text
 */
function buildTooltipContent(details) {
    if (!details || details.length === 0) return '';

    return details.map(d => {
        const statusLabel = MATERIAL_LABEL[d.status] || d.status || 'Chưa có';
        return `${d.groupLabel}: ${statusLabel}`;
    }).join('\n');
}

function getMaterialBadgeClass(status) {
    switch (status) {
        case 'NONE': return 'status-pending';
        case 'MISSING': return 'status-missing';
        case 'PARTIAL': return 'status-missing';
        case 'ORDERED': return 'status-ordered';
        case 'READY': return 'status-ok';
        case 'ARRIVED': return 'status-arrived';
        case 'ISSUED': return 'status-issued';
        case 'DELIVERED': return 'status-ok';
        case 'CUSTOMER_PROVIDED': return 'status-customer';
        default: return 'status-pending';
    }
}

function getExportBadge(status) {
    const label = EXPORT_LABEL[status] || status || 'Chưa xuất';
    let badgeClass = 'status-pending';
    if (status === 'PARTIAL') badgeClass = 'status-ordered';
    if (status === 'FULL') badgeClass = 'status-ok';
    return `<span class="status-badge ${badgeClass}">${label}</span>`;
}

// ============================================
// EXPAND/COLLAPSE
// ============================================
function toggleExpand(orderId) {
    if (expandedRows.has(orderId)) {
        expandedRows.delete(orderId);
    } else {
        expandedRows.add(orderId);
    }
    renderGrid(ordersData);
}

// ============================================
// DETAIL PANEL
// ============================================
function openDetail(orderId) {
    selectedOrderId = orderId;
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    const panel = document.getElementById('detailPanel');
    if (!panel) return;

    // Show panel
    panel.classList.remove('hidden');

    // Fill detail info
    const detailTitle = document.getElementById('detailTitle');
    const detailContent = document.getElementById('detailContent');

    if (detailTitle) {
        detailTitle.textContent = `${order.orderCode} - ${order.orderName}`;
    }

    if (detailContent) {
        // Status info
        const statusLabel = STATUS_LABEL[order.status] || order.status;
        const overdueBadge = order.isOverdue ? '<span class="status-badge status-late ml-2">Trễ hạn</span>' : '';

        detailContent.innerHTML = `
            <div class="mb-4">
                <p class="text-sm text-gray-500">Trạng thái</p>
                <p class="font-semibold">${statusLabel} ${overdueBadge}</p>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Khách hàng</p>
                <p>${order.branch?.name || ''} - ${order.customer?.name || ''}</p>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Kế hoạch giao</p>
                <p>${formatDate(order.deliveryPlanDate)}</p>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Khối lượng nhôm</p>
                <p class="text-lg font-bold text-blue-600">${order.quantity ? (/[a-zA-Z]/.test(order.quantity) ? order.quantity : `${parseFloat(order.quantity).toFixed(2)} kg`) : 0}</p>
            </div>
            <hr class="my-4"/>
            <div class="mb-4">
                <p class="text-sm text-gray-500 font-semibold mb-2">Vật tư</p>
                ${order.materials.map(m => `
                    <div class="flex justify-between items-center py-1">
                        <span>${MATERIAL_GROUP_LABEL[m.group] || m.group}</span>
                        ${getMaterialBadge(m.status)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Load history
    loadOrderHistory(orderId);
}

function closeDetail() {
    const panel = document.getElementById('detailPanel');
    if (panel) panel.classList.add('hidden');
    selectedOrderId = null;
}

async function loadOrderHistory(orderId) {
    try {
        const response = await fetch(`${API_BASE}/production/excel/orders/${orderId}/history`);
        const result = await response.json();

        const historyContainer = document.getElementById('detailHistory');
        if (!historyContainer || !result.success) return;

        const events = result.data || [];
        if (events.length === 0) {
            historyContainer.innerHTML = '<p class="text-gray-400 text-sm">Chưa có lịch sử</p>';
            return;
        }

        historyContainer.innerHTML = events.map(e => `
            <div class="timeline-item">
                <div>
                    <p class="font-medium">${e.title}</p>
                    <p class="text-xs text-gray-500">${formatDateTime(e.at)}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// ============================================
// FORMAT CURRENCY
// ============================================
function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    if (num === 0) return '—';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(num);
}

// ============================================
// INLINE EDITING (Currency fields)
// ============================================
function editCurrencyCell(td, orderId, field) {
    // Get raw numeric value from data-raw attribute
    const currentRaw = parseFloat(td.dataset.raw) || 0;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentRaw > 0 ? currentRaw : '';
    input.className = 'w-full border rounded px-2 py-1 text-right';
    input.placeholder = 'Nhập số tiền...';
    input.min = '0';
    input.step = '1000';

    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();

    const saveEdit = async () => {
        const newValue = parseFloat(input.value) || 0;
        // Update display
        td.dataset.raw = newValue;
        td.textContent = formatCurrency(newValue);

        // Recalculate remaining column in the same row
        const row = td.closest('tr');
        if (row) {
            const pvCell = row.querySelector('[data-col="projectValue"]');
            const aaCell = row.querySelector('[data-col="advanceAmount"]');
            const rmCell = row.querySelector('[data-col="remaining"]');
            if (pvCell && aaCell && rmCell) {
                const tv = parseFloat(pvCell.dataset.raw) || 0;
                const aa = parseFloat(aaCell.dataset.raw) || 0;
                const remaining = tv - aa;
                rmCell.textContent = formatCurrency(remaining);
                rmCell.className = rmCell.className.replace(/text-(red|green|gray)-\d+/g, '');
                rmCell.classList.add(remaining < 0 ? 'text-red-600' : (remaining === 0 && tv === 0 ? 'text-gray-400' : 'text-green-700'));
            }
        }

        if (newValue !== currentRaw) {
            try {
                const response = await fetch(`${API_BASE}/production/excel/orders/${orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [field]: newValue })
                });
                const result = await response.json();
                if (!result.success) {
                    console.error('Save failed:', result.error);
                    td.dataset.raw = currentRaw;
                    td.textContent = formatCurrency(currentRaw);
                } else {
                    // Update in-memory data
                    const order = ordersData.find(o => o.id === orderId);
                    if (order) {
                        if (field === 'totalValue') order.totalValue = newValue;
                        if (field === 'advanceAmount') order.advanceAmount = newValue;
                    }
                }
            } catch (error) {
                console.error('Error saving:', error);
                td.dataset.raw = currentRaw;
                td.textContent = formatCurrency(currentRaw);
            }
        }
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        }
        if (e.key === 'Escape') {
            td.dataset.raw = currentRaw;
            td.textContent = formatCurrency(currentRaw);
        }
    });
}

// ============================================
// INLINE EDITING
// ============================================
function editCell(td, orderId, field) {
    const currentValue = td.dataset.value !== undefined ? td.dataset.value : td.textContent.trim();

    // Use textarea for multiline support
    const textarea = document.createElement('textarea');
    textarea.value = currentValue;
    textarea.className = 'w-full border rounded px-2 py-1 min-h-[60px] resize-y';
    textarea.rows = 3;

    td.innerHTML = '';
    td.appendChild(textarea);
    textarea.focus();

    const saveEdit = async () => {
        const newValue = textarea.value.trim();
        td.innerHTML = `<div class="whitespace-pre-wrap">${escapeHtml(newValue)}</div>`;

        if (newValue !== currentValue) {
            try {
                const response = await fetch(`${API_BASE}/production/excel/orders/${orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [field]: newValue })
                });
                const result = await response.json();
                if (!result.success) {
                    console.error('Save failed:', result.error);
                    td.innerHTML = `<div class="whitespace-pre-wrap">${escapeHtml(currentValue)}</div>`;
                }
            } catch (error) {
                console.error('Error saving:', error);
                td.innerHTML = `<div class="whitespace-pre-wrap">${escapeHtml(currentValue)}</div>`;
            }
        }
    };

    textarea.addEventListener('blur', saveEdit);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            td.innerHTML = `<div class="whitespace-pre-wrap">${escapeHtml(currentValue)}</div>`;
        }
        // Allow Shift+Enter for newlines, Enter alone saves
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEdit();
        }
    });
}

async function editMaterialNote(orderId, group) {
    const newNote = prompt('Ghi chú vật tư:');
    if (newNote === null) return;

    try {
        await fetch(`${API_BASE}/production/excel/orders/${orderId}/materials/${group}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: newNote })
        });
        loadOrders();
    } catch (error) {
        console.error('Error updating material note:', error);
    }
}

/**
 * Inline edit material field (featuredProducts, quantity, etc.)
 * Tương tự như editCell nhưng cho material rows
 */
function editMaterialField(orderId, group, fieldName, td) {
    const currentValue = td.textContent.trim();

    // Tạo input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.className = 'w-full border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

    // Placeholder theo field
    const placeholders = {
        featuredProducts: 'Sản phẩm đặc chưng...',
        quantity: 'Khối lượng...'
    };
    input.placeholder = placeholders[fieldName] || '';

    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();

    const saveEdit = async () => {
        const newValue = input.value.trim();
        td.innerHTML = escapeHtml(newValue);

        if (newValue !== currentValue) {
            try {
                const response = await fetch(`${API_BASE}/production/excel/orders/${orderId}/materials/${group}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [fieldName]: newValue })
                });
                const result = await response.json();
                if (result.success) {
                    showNotification('Đã lưu thành công', 'success');
                } else {
                    console.error('Save failed:', result.error);
                    td.innerHTML = escapeHtml(currentValue);
                    showNotification('Lỗi khi lưu: ' + (result.error || 'Không xác định'), 'error');
                }
            } catch (error) {
                console.error('Error saving:', error);
                td.innerHTML = escapeHtml(currentValue);
                showNotification('Lỗi kết nối server', 'error');
            }
        }
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            td.innerHTML = escapeHtml(currentValue);
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur(); // Trigger blur to save
        }
    });
}

// ============================================
// EXPORT EXCEL
// ============================================
async function exportExcel() {
    try {
        const qs = buildQueryFromUI();
        const token = localStorage.getItem('token');

        // Show loading notification
        showNotification('Đang chuẩn bị file Excel chuyên nghiệp...', 'info');

        const response = await fetch(`${API_BASE}/production/excel/export?${qs}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Lỗi xuất Excel');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `theo_doi_du_an_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showNotification('Xuất Excel thành công', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Lỗi khi xuất Excel: ' + error.message, 'error');
    }
}

// ============================================
// COLUMN SETTINGS MODAL
// ============================================
function openColumnSettings() {
    const modal = document.getElementById('columnSettingsModal');
    if (!modal) {
        console.error('Column settings modal not found');
        return;
    }

    // Sync checkboxes with current settings
    const columnKeys = ['orderCode', 'orderName', 'featuredProducts', 'customer', 'quantity',
        'projectValue', 'advanceAmount', 'remaining',
        'workforce', 'createdAt', 'deliveryDate', 'materialStatus', 'exportStatus', 'materialDate',
        'fixCompatible', 'note'];

    columnKeys.forEach(key => {
        const checkbox = document.getElementById(`col_${key}`);
        if (checkbox) {
            checkbox.checked = columnSettings[key] !== false;
        }
    });

    modal.classList.remove('hidden');
}

function closeColumnSettings() {
    const modal = document.getElementById('columnSettingsModal');
    if (modal) modal.classList.add('hidden');
}

function applyColumnSettings() {
    // Read checkbox values
    const columnKeys = ['orderCode', 'orderName', 'featuredProducts', 'customer', 'quantity',
        'projectValue', 'advanceAmount', 'remaining',
        'workforce', 'createdAt', 'deliveryDate', 'materialStatus', 'exportStatus', 'materialDate',
        'fixCompatible', 'note'];

    columnKeys.forEach(key => {
        const checkbox = document.getElementById(`col_${key}`);
        if (checkbox) {
            columnSettings[key] = checkbox.checked;
        }
    });

    // Apply visibility to table
    applyColumnVisibility();

    // Save to localStorage
    saveColumnSettingsToStorage();

    // Close modal
    closeColumnSettings();

    // Show feedback
    showNotification('Đã áp dụng cài đặt cột', 'success');
}

function resetColumnSettings() {
    // Reset all to true
    const columnKeys = ['orderCode', 'orderName', 'featuredProducts', 'customer', 'quantity',
        'projectValue', 'advanceAmount', 'remaining',
        'workforce', 'createdAt', 'deliveryDate', 'materialStatus', 'exportStatus', 'materialDate',
        'fixCompatible', 'note'];

    columnKeys.forEach(key => {
        columnSettings[key] = true;
        const checkbox = document.getElementById(`col_${key}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

function applyColumnVisibility() {
    const table = document.getElementById('excelGrid');
    if (!table) return;

    const columnKeys = ['orderCode', 'orderName', 'featuredProducts', 'customer', 'quantity', 'workshop',
        'createdAt', 'deliveryDate', 'materialStatus', 'materialDate',
        'fixCompatible', 'note'];

    // Get header row
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    // Map column index to key (skip first column which is expand button)
    const headers = headerRow.querySelectorAll('th[data-col]');
    headers.forEach(th => {
        const colKey = th.dataset.col;
        if (colKey && columnSettings[colKey] === false) {
            th.style.display = 'none';
        } else {
            th.style.display = '';
        }
    });

    // Apply to all body rows
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
        const cells = row.querySelectorAll('td[data-col]');
        cells.forEach(td => {
            const colKey = td.dataset.col;
            if (colKey && columnSettings[colKey] === false) {
                td.style.display = 'none';
            } else {
                td.style.display = '';
            }
        });
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// MATERIAL STATUS MODAL
// ============================================
let currentMaterialOrderId = null;

function openMaterialModal(orderId) {
    currentMaterialOrderId = orderId;
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    // Create modal if not exists
    let modal = document.getElementById('materialModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'materialModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        document.body.appendChild(modal);
    }

    // Build material form HTML
    const materialsHtml = order.materials.map(m => {
        const groupLabel = MATERIAL_GROUP_LABEL[m.group] || m.group;
        const statusBadge = getMaterialBadge(m.status);
        const planDateValue = m.planDate ? new Date(m.planDate).toISOString().slice(0, 10) : '';

        return `
            <div class="border rounded-lg p-4 mb-4 bg-gray-50">
                <div class="flex justify-between items-center mb-3">
                    <span class="font-semibold text-lg">${groupLabel}</span>
                    ${statusBadge}
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Tình trạng</label>
                        <select id="mat_status_${m.group}" class="w-full border rounded px-3 py-2">
                            <option value="NONE" ${m.status === 'NONE' ? 'selected' : ''}>Chưa có</option>
                            <option value="MISSING" ${m.status === 'MISSING' ? 'selected' : ''}>Thiếu</option>
                            <option value="PARTIAL" ${m.status === 'PARTIAL' ? 'selected' : ''}>Thiếu một phần</option>
                            <option value="ORDERED" ${m.status === 'ORDERED' ? 'selected' : ''}>Đã đặt</option>
                            <option value="READY" ${m.status === 'READY' ? 'selected' : ''}>Đã đủ</option>
                            <option value="DELIVERED" ${m.status === 'DELIVERED' ? 'selected' : ''}>Đã giao</option>
                            <option value="CUSTOMER_PROVIDED" ${m.status === 'CUSTOMER_PROVIDED' ? 'selected' : ''}>Khách cấp</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Lịch giao VT</label>
                        <input type="date" id="mat_date_${m.group}" value="${planDateValue}" class="w-full border rounded px-3 py-2">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm text-gray-600 mb-1">Lưu ý</label>
                    <textarea id="mat_note_${m.group}" rows="2" class="w-full border rounded px-3 py-2 resize-none" placeholder="Ghi chú về vật tư...">${m.note || ''}</textarea>
                </div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div class="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
                <h3 class="text-lg font-bold">${order.orderCode} - Quản lý Vật tư</h3>
                <button onclick="closeMaterialModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
            </div>
            
            <div class="p-6 overflow-y-auto max-h-[70vh]">
                <div class="mb-4 text-gray-600">
                    <span class="font-medium">${order.orderName}</span> | 
                    <span>${order.branch?.name || ''} - ${order.customer?.name || ''}</span>
                </div>
                
                ${materialsHtml}
            </div>
            
            <div class="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50">
                <button onclick="closeMaterialModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-100">Huỷ</button>
                <button onclick="saveMaterialStatus()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu thay đổi</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeMaterialModal() {
    const modal = document.getElementById('materialModal');
    if (modal) modal.classList.add('hidden');
    currentMaterialOrderId = null;
}

async function saveMaterialStatus() {
    if (!currentMaterialOrderId) return;

    const order = ordersData.find(o => o.id === currentMaterialOrderId);
    if (!order) return;

    try {
        // Save each material group
        for (const mat of order.materials) {
            const statusEl = document.getElementById(`mat_status_${mat.group}`);
            const dateEl = document.getElementById(`mat_date_${mat.group}`);
            const noteEl = document.getElementById(`mat_note_${mat.group}`);

            if (!statusEl) continue;

            const newStatus = statusEl.value;
            const newDate = dateEl?.value || null;
            const newNote = noteEl?.value || '';

            // Only update if changed
            if (newStatus !== mat.status || newDate !== mat.planDate || newNote !== mat.note) {
                await fetch(`${API_BASE}/production/excel/orders/${currentMaterialOrderId}/materials/${mat.group}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: newStatus,
                        planDate: newDate,
                        note: newNote
                    })
                });
            }
        }

        closeMaterialModal();
        loadOrders(); // Refresh data
    } catch (error) {
        console.error('Error saving material status:', error);
        alert('Lỗi khi lưu trạng thái vật tư');
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('materialModal');
    if (modal && e.target === modal) {
        closeMaterialModal();
    }
    const custModal = document.getElementById('customerModal');
    if (custModal && e.target === custModal) {
        closeCustomerModal();
    }
    const detailModal = document.getElementById('materialDetailModal');
    if (detailModal && e.target === detailModal) {
        closeMaterialDetailModal();
    }
    const colModal = document.getElementById('columnSettingsModal');
    if (colModal && e.target === colModal) {
        closeColumnSettings();
    }
});

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeColumnSettings();
        closeMaterialModal();
        closeCustomerModal();
        closeMaterialDetailModal();
        closeMaterialSummaryModal();
        closeCustomerDetailModal();
    }
});

// ============================================
// MATERIAL DETAIL MODAL - Shows detailed items with stock info
// ============================================
async function openMaterialDetailModal(orderId, group) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    const groupLabel = MATERIAL_GROUP_LABEL[group] || group;

    // Create modal if not exists
    let modal = document.getElementById('materialDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'materialDetailModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        document.body.appendChild(modal);
    }

    // Show loading state
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
                <h3 class="text-lg font-bold">Chi tiết ${groupLabel} - ${order.orderCode}</h3>
                <button onclick="closeMaterialDetailModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
            </div>
            <div class="p-6 flex items-center justify-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span class="ml-3 text-gray-600">Đang tải dữ liệu...</span>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');

    try {
        // Fetch detailed material data from API
        const response = await fetch(`${API_BASE}/production/excel/orders/${orderId}/materials/${group}/details`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Không thể tải dữ liệu');
        }

        const data = result.data;
        const items = data.items || [];

        // Build table rows
        let tableRows = '';
        if (items.length === 0) {
            tableRows = `
                <tr>
                    <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                        Chưa có dữ liệu vật tư cho nhóm này
                    </td>
                </tr>
            `;
        } else {
            tableRows = items.map((item, idx) => {
                const statusClass = getStockStatusClass(item.status);
                const statusLabel = getStockStatusLabel(item.status);
                const exportedQty = item.exportedQty || 0;
                return `
                    <tr class="hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                        <td class="px-3 py-3 text-sm font-mono text-blue-600">${escapeHtml(item.code)}</td>
                        <td class="px-3 py-3 text-sm">${escapeHtml(item.name)}</td>
                        <td class="px-3 py-3 text-sm text-center">${escapeHtml(item.unit)}</td>
                        <td class="px-3 py-3 text-sm text-center font-medium">${item.required || 0}</td>
                        <td class="px-3 py-3 text-sm text-center">${item.stock || 0}</td>
                        <td class="px-3 py-3 text-sm text-center font-medium ${item.shortage > 0 ? 'text-red-600' : ''}">${item.shortage || 0}</td>
                        <td class="px-3 py-3 text-sm text-center font-medium text-emerald-600">${exportedQty}</td>
                        <td class="px-3 py-3 text-sm text-center">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                                ${statusLabel}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Summary badges
        const summary = data.summary || { total: 0, sufficient: 0, partial: 0, shortage: 0 };

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-bold">Chi tiết ${data.groupLabel || groupLabel}</h3>
                        <p class="text-sm text-blue-100">${order.orderCode} - ${order.orderName}</p>
                    </div>
                    <button onclick="closeMaterialDetailModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
                </div>
                
                <!-- Summary -->
                <div class="px-6 py-4 bg-gray-50 border-b flex items-center gap-4 flex-wrap">
                    ${summary.issued > 0 ? `
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span class="text-sm">Đã xuất: <strong class="text-emerald-600">${summary.issued}</strong></span>
                    </div>` : ''}
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-green-500"></span>
                        <span class="text-sm">Đủ hàng: <strong class="text-green-600">${summary.sufficient}</strong></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                        <span class="text-sm">Thiếu một phần: <strong class="text-yellow-600">${summary.partial}</strong></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-red-500"></span>
                        <span class="text-sm">Hết hàng: <strong class="text-red-600">${summary.shortage}</strong></span>
                    </div>
                    <div class="ml-auto text-sm text-gray-600">
                        Tổng loại: <strong>${summary.total}</strong>
                    </div>
                </div>
                
                <!-- Table -->
                <div class="overflow-x-auto max-h-[55vh]">
                    <table class="w-full">
                        <thead class="bg-blue-600 text-white sticky top-0">
                            <tr>
                                <th class="px-3 py-3 text-left text-xs font-medium uppercase">Mã VT</th>
                                <th class="px-3 py-3 text-left text-xs font-medium uppercase">Tên vật tư</th>
                                <th class="px-3 py-3 text-center text-xs font-medium uppercase">ĐVT</th>
                                <th class="px-3 py-3 text-center text-xs font-medium uppercase">Cần</th>
                                <th class="px-3 py-3 text-center text-xs font-medium uppercase">Kho</th>
                                <th class="px-3 py-3 text-center text-xs font-medium uppercase">Thiếu</th>
                                <th class="px-3 py-3 text-center text-xs font-medium uppercase bg-emerald-700">Đã xuất</th>
                                <th class="px-3 py-3 text-center text-xs font-medium uppercase">Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                
                <!-- Footer -->
                <div class="border-t px-6 py-4 flex justify-between items-center bg-gray-50">
                    <div class="text-sm text-gray-600">
                        Trạng thái tổng: ${getMaterialBadge(data.overallStatus)}
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeMaterialDetailModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-100">Đóng</button>
                        <button onclick="openMaterialModal(${orderId})" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Cập nhật trạng thái
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading material details:', error);
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <div class="bg-red-600 text-white px-6 py-4 flex justify-between items-center">
                    <h3 class="text-lg font-bold">Lỗi</h3>
                    <button onclick="closeMaterialDetailModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div class="p-6 text-center">
                    <p class="text-red-600 mb-4">${error.message || 'Không thể tải dữ liệu chi tiết vật tư'}</p>
                    <button onclick="closeMaterialDetailModal()" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Đóng</button>
                </div>
            </div>
        `;
    }
}

function closeMaterialDetailModal() {
    const modal = document.getElementById('materialDetailModal');
    if (modal) modal.classList.add('hidden');
}

// Helper functions for stock status
function getStockStatusClass(status) {
    switch (status) {
        case 'sufficient': return 'bg-green-100 text-green-800';
        case 'partial': return 'bg-yellow-100 text-yellow-800';
        case 'shortage': return 'bg-red-100 text-red-800';
        case 'issued': return 'bg-emerald-100 text-emerald-800';
        case 'partial_issued': return 'bg-teal-100 text-teal-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStockStatusLabel(status) {
    switch (status) {
        case 'sufficient': return '✓ Đủ';
        case 'partial': return '⚠ Thiếu';
        case 'shortage': return '✗ Hết';
        case 'issued': return '✓ Đã xuất';
        case 'partial_issued': return '⚠ Xuất 1 phần';
        default: return 'N/A';
    }
}

// ============================================
// MATERIAL SUMMARY MODAL - Shows all 4 material groups overview
// ============================================
function openMaterialSummaryModal(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    // Create modal if not exists
    let modal = document.getElementById('materialSummaryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'materialSummaryModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        document.body.appendChild(modal);
    }

    // Build material cards - order: Nhôm, Kính, Vật tư Phụ, Phụ kiện
    const groupOrder = ['ALUMINUM', 'GLASS', 'ACCESSORY', 'HARDWARE'];
    const materialsHtml = groupOrder.map(group => {
        const mat = order.materials.find(m => m.group === group) || { group, status: 'NONE', planDate: null };
        const groupLabel = MATERIAL_GROUP_LABEL[group] || group;
        const statusBadge = getMaterialBadge(mat.status);
        const planDate = mat.planDate ? formatDate(mat.planDate) : '--';
        const statusColor = getStatusColorClass(mat.status);

        return `
            <div class="border rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all ${statusColor.border}" 
                 onclick="openMaterialDetailModal(${orderId}, '${group}'); closeMaterialSummaryModal();">
                <div class="p-4 ${statusColor.bg}">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-lg ${statusColor.text}">${groupLabel}</span>
                        ${statusBadge}
                    </div>
                    <div class="flex items-center justify-between text-sm mb-2">
                        <span class="text-gray-500">Tình trạng XK:</span>
                        <div class="flex items-center gap-2">
                            ${getExportBadge(mat.exportStatus)}
                            <span class="text-xs font-medium text-gray-600">${mat.exportRatio || '--'}</span>
                        </div>
                    </div>
                    <div class="text-sm text-gray-600">
                        <span>Lịch giao: </span>
                        <span class="font-medium">${planDate}</span>
                    </div>
                </div>
                <div class="px-4 py-2 bg-gray-50 text-sm text-blue-600 flex items-center justify-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    Xem chi tiết
                </div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-bold">Kiểm tra Kho - ${order.orderCode}</h3>
                    <p class="text-sm text-blue-100">${order.orderName}</p>
                </div>
                <button onclick="closeMaterialSummaryModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
            </div>
            
            <div class="p-6">
                <div class="grid grid-cols-2 gap-4 mb-6">
                    ${materialsHtml}
                </div>
                
                <div class="text-center text-sm text-gray-500 mb-4">
                    Click vào từng loại vật tư để xem chi tiết
                </div>
            </div>
            
            <div class="border-t px-6 py-4 flex justify-between items-center bg-gray-50">
                <button onclick="openMaterialModal(${orderId}); closeMaterialSummaryModal();" 
                        class="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Chỉnh sửa trạng thái
                </button>
                <button onclick="closeMaterialSummaryModal()" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Đóng</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    // Close when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) closeMaterialSummaryModal();
    };
}

function closeMaterialSummaryModal() {
    const modal = document.getElementById('materialSummaryModal');
    if (modal) modal.classList.add('hidden');
}

// Helper to get status color classes
function getStatusColorClass(status) {
    switch (status) {
        case 'READY':
        case 'DELIVERED':
            return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
        case 'ORDERED':
            return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
        case 'PARTIAL':
            return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
        case 'MISSING':
            return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
        default:
            return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    }
}

// ============================================
// CUSTOMER DETAIL MODAL
// ============================================
async function openCustomerModal(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    const customer = order.customer || {};
    const branch = order.branch || {};
    const initial = (customer.name || 'K').charAt(0).toUpperCase();

    // Create modal if not exists
    let modal = document.getElementById('customerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customerModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        document.body.appendChild(modal);
    }

    // Count projects for this customer from ordersData
    const customerProjects = ordersData.filter(o => o.customer?.id === customer.id);
    const inProgressCount = customerProjects.filter(p =>
        p.status === 'in_progress' || p.status === 'in_production' ||
        p.status === 'designing' || p.status === 'design' ||
        p.status === 'bom' || p.status === 'estimation' ||
        p.status === 'quotation_pending' || p.status === 'quotation_approved' ||
        p.status === 'new' || p.status === 'installation'
    ).length;
    const completedCount = customerProjects.filter(p =>
        p.status === 'completed' || p.status === 'handover'
    ).length;

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-5 flex justify-between items-start">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">${initial}</div>
                    <div>
                        <h3 class="text-xl font-bold">${escapeHtml(customer.name || 'Khách hàng')}</h3>
                        <span class="bg-orange-400 text-white text-xs px-2 py-0.5 rounded-full">Khách hàng</span>
                    </div>
                </div>
                <button onclick="closeCustomerModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
            </div>
            
            <div class="p-6">
                <div class="space-y-3 mb-6">
                    <div class="flex items-center gap-3">
                        <span class="text-gray-400">📞</span>
                        <span>${escapeHtml(customer.phone || 'Chưa có số điện thoại')}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-gray-400">📧</span>
                        <span>${escapeHtml(customer.email || 'Chưa có email')}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-gray-400">📍</span>
                        <span>${escapeHtml(customer.address || 'Chưa có địa chỉ')}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-gray-400">🏢</span>
                        <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-sm">${escapeHtml(branch.name || 'Chưa có chi nhánh')}</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-orange-50 rounded-xl p-4 text-center">
                        <p class="text-gray-500 text-sm">Đang làm</p>
                        <p class="text-2xl font-bold text-orange-500">${inProgressCount}</p>
                    </div>
                    <div class="bg-green-50 rounded-xl p-4 text-center">
                        <p class="text-gray-500 text-sm">Hoàn thành</p>
                        <p class="text-2xl font-bold text-green-500">${completedCount}</p>
                    </div>
                </div>
                
                <div class="mb-4">
                    <p class="text-sm font-semibold text-gray-500 mb-2">Dự án hiện tại</p>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${customerProjects.slice(0, 5).map(p => `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                <span class="font-medium text-blue-600">${escapeHtml(p.orderCode)}</span>
                                <span class="text-xs ${p.status === 'completed' ? 'text-green-500' : 'text-orange-500'}">${STATUS_LABEL[p.status] || p.status}</span>
                            </div>
                        `).join('')}
                        ${customerProjects.length === 0 ? '<p class="text-gray-400 text-sm">Không có dự án</p>' : ''}
                    </div>
                </div>
                
                <div class="flex justify-center gap-3">
                    <button onclick="closeCustomerModal(); openCustomerDetailModal(${customer.id})" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Chi tiết
                    </button>
                    <button onclick="closeCustomerModal()" class="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Đóng</button>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeCustomerModal() {
    const modal = document.getElementById('customerModal');
    if (modal) modal.classList.add('hidden');
}

// ============================================
// CUSTOMER DETAIL MODAL (inline, full-featured)
// ============================================
let customerDetailData = null;
let customerDetailTab = 'projects';

async function openCustomerDetailModal(customerId) {
    // Create modal
    let modal = document.getElementById('customerDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customerDetailModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeCustomerDetailModal(); });
    }

    // Loading state
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex justify-between items-center">
                <h3 class="text-lg font-bold text-white">Chi tiết Khách hàng</h3>
                <button onclick="closeCustomerDetailModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
            </div>
            <div class="flex-1 flex items-center justify-center py-16">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <span class="ml-3 text-gray-500">Đang tải...</span>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');

    try {
        // Fetch full customer data
        const custResp = await fetch(`${API_BASE}/customers/${customerId}`);
        const custResult = await custResp.json();
        if (!custResult.success) throw new Error(custResult.message || 'Không tìm thấy');
        customerDetailData = custResult.data;

        // Fetch projects
        let projects = [];
        try {
            const projResp = await fetch(`${API_BASE}/projects?customer_id=${customerId}`);
            const projResult = await projResp.json();
            if (projResult.success) projects = projResult.data || [];
        } catch (e) { }

        // Fetch CRM
        let crmData = { interactions: [], appointments: [] };
        try {
            const crmResp = await fetch(`${API_BASE}/customers/${customerId}/crm`);
            const crmResult = await crmResp.json();
            if (crmResult.success) crmData = crmResult.data || crmData;
        } catch (e) { }

        renderCustomerDetailModal(modal, customerDetailData, projects, crmData);
    } catch (error) {
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div class="bg-red-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
                    <h3 class="font-bold">Lỗi</h3>
                    <button onclick="closeCustomerDetailModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div class="p-6 text-center">
                    <p class="text-red-500 mb-4">${error.message}</p>
                    <button onclick="closeCustomerDetailModal()" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Đóng</button>
                </div>
            </div>
        `;
    }
}

function renderCustomerDetailModal(modal, c, projects, crmData) {
    const initial = (c.name || 'K').charAt(0).toUpperCase();
    const inProgress = projects.filter(p => !['completed', 'cancelled', 'handover'].includes(p.status)).length;
    const completed = projects.filter(p => ['completed', 'handover'].includes(p.status)).length;
    const totalValue = projects.reduce((sum, p) => sum + (parseFloat(p.total_value) || 0), 0);

    // Merge CRM timeline
    const interactions = crmData.interactions || [];
    const appointments = crmData.appointments || [];
    const timeline = [
        ...interactions.map(i => ({ ...i, _type: 'interaction', _date: i.interaction_date || i.created_at })),
        ...appointments.map(a => ({ ...a, _type: 'appointment', _date: a.appointment_date || a.created_at }))
    ].sort((a, b) => new Date(b._date) - new Date(a._date));

    // Format helpers
    const fmtDate = (d) => { if (!d) return '--'; const dt = new Date(d); return isNaN(dt) ? '--' : dt.toLocaleDateString('vi-VN'); };
    const fmtCurrency = (v) => { if (!v) return '0đ'; return new Intl.NumberFormat('vi-VN').format(v) + 'đ'; };

    const statusLabel = {
        'new': 'Mới', 'designing': 'Thiết kế', 'design': 'Thiết kế', 'bom': 'Bóc tách', 'estimation': 'Dự toán',
        'quotation_pending': 'Chờ BG', 'quotation_approved': 'Đã duyệt', 'in_production': 'Đang SX',
        'in_progress': 'Đang làm', 'installation': 'Lắp đặt', 'handover': 'Bàn giao', 'completed': 'Hoàn thành',
        'cancelled': 'Hủy', 'paused': 'Tạm dừng'
    };
    const statusColor = {
        'new': 'bg-gray-100 text-gray-700', 'designing': 'bg-blue-100 text-blue-700', 'design': 'bg-blue-100 text-blue-700',
        'bom': 'bg-indigo-100 text-indigo-700', 'estimation': 'bg-indigo-100 text-indigo-700',
        'quotation_pending': 'bg-yellow-100 text-yellow-700', 'quotation_approved': 'bg-emerald-100 text-emerald-700',
        'in_production': 'bg-orange-100 text-orange-700', 'in_progress': 'bg-orange-100 text-orange-700',
        'installation': 'bg-teal-100 text-teal-700', 'handover': 'bg-cyan-100 text-cyan-700',
        'completed': 'bg-green-100 text-green-700', 'cancelled': 'bg-red-100 text-red-700', 'paused': 'bg-gray-100 text-gray-600'
    };

    // Projects tab HTML
    const projectsHtml = projects.length === 0
        ? '<p class="text-gray-400 text-center py-6">Chưa có dự án nào</p>'
        : projects.map(p => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800 text-sm">${escapeHtml(p.project_code || '')} - ${escapeHtml(p.project_name || '')}</p>
                        <p class="text-xs text-gray-400">${fmtDate(p.created_at)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-gray-600">${fmtCurrency(p.total_value)}</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[p.status] || 'bg-gray-100 text-gray-600'}">${statusLabel[p.status] || p.status || '--'}</span>
                </div>
            </div>
        `).join('');

    // CRM timeline HTML
    const crmHtml = timeline.length === 0
        ? '<p class="text-gray-400 text-center py-6">Chưa có lịch sử tương tác</p>'
        : timeline.slice(0, 15).map(item => {
            const isInt = item._type === 'interaction';
            const icon = isInt ? '💬' : '📅';
            const bg = isInt ? 'bg-blue-100' : 'bg-green-100';
            const typeLabel = isInt
                ? (item.type === 'call' ? 'Gọi điện' : item.type === 'email' ? 'Email' : item.type === 'visit' ? 'Gặp mặt' : item.type || 'Tương tác')
                : 'Cuộc hẹn';
            return `
                <div class="flex gap-3 pb-3">
                    <div class="w-8 h-8 ${bg} rounded-full flex items-center justify-center flex-shrink-0">${icon}</div>
                    <div class="flex-1 bg-gray-50 rounded-lg p-3">
                        <div class="flex justify-between items-start mb-1">
                            <span class="font-medium text-sm text-gray-800">${escapeHtml(typeLabel)}</span>
                            <span class="text-xs text-gray-400">${fmtDate(item._date)}</span>
                        </div>
                        <p class="text-xs text-gray-600">${escapeHtml(item.content || item.notes || item.description || '--')}</p>
                    </div>
                </div>
            `;
        }).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex-shrink-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">${initial}</div>
                        <div>
                            <h3 class="text-xl font-bold text-white">${escapeHtml(c.name || 'Khách hàng')}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">${escapeHtml(c.customer_code || '#' + c.id)}</span>
                                <span class="bg-green-400/30 text-white text-xs px-2 py-0.5 rounded-full">${c.status === 'potential' ? 'Tiềm năng' : 'Đang hoạt động'}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="closeCustomerDetailModal()" class="text-white hover:text-gray-200 text-2xl leading-none">&times;</button>
                </div>
            </div>

            <!-- Info Cards -->
            <div class="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b flex-shrink-0">
                <div class="bg-gray-50 rounded-xl p-3">
                    <p class="text-xs text-gray-400 mb-1">📞 Điện thoại</p>
                    <p class="text-sm font-medium text-gray-800">${escapeHtml(c.phone || 'Chưa có')}</p>
                </div>
                <div class="bg-gray-50 rounded-xl p-3">
                    <p class="text-xs text-gray-400 mb-1">📧 Email</p>
                    <p class="text-sm font-medium text-gray-800 break-all">${escapeHtml(c.email || 'Chưa có')}</p>
                </div>
                <div class="bg-gray-50 rounded-xl p-3">
                    <p class="text-xs text-gray-400 mb-1">📍 Địa chỉ</p>
                    <p class="text-sm font-medium text-gray-800">${escapeHtml(c.address || 'Chưa có')}</p>
                </div>
                <div class="bg-gray-50 rounded-xl p-3">
                    <p class="text-xs text-gray-400 mb-1">🏢 Chi nhánh</p>
                    <p class="text-sm font-medium text-gray-800">${escapeHtml(c.agency_name || 'Chưa có')}</p>
                </div>
            </div>

            <!-- Stats -->
            <div class="px-6 py-3 grid grid-cols-4 gap-3 border-b flex-shrink-0">
                <div class="text-center">
                    <p class="text-2xl font-bold text-blue-600">${projects.length}</p>
                    <p class="text-xs text-gray-500">Tổng dự án</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-orange-500">${inProgress}</p>
                    <p class="text-xs text-gray-500">Đang làm</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-green-500">${completed}</p>
                    <p class="text-xs text-gray-500">Hoàn thành</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-purple-600">${fmtCurrency(totalValue)}</p>
                    <p class="text-xs text-gray-500">Tổng giá trị</p>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex border-b flex-shrink-0">
                <button class="cdm-tab-btn cdm-tab-active px-5 py-2.5 text-sm font-medium text-gray-600" onclick="switchCDMTab(this, 'cdm-projects')">📋 Dự án</button>
                <button class="cdm-tab-btn px-5 py-2.5 text-sm font-medium text-gray-600" onclick="switchCDMTab(this, 'cdm-crm')">💬 CRM</button>
                <button class="cdm-tab-btn px-5 py-2.5 text-sm font-medium text-gray-600" onclick="switchCDMTab(this, 'cdm-notes')">📝 Ghi chú</button>
            </div>

            <!-- Tab Content (scrollable) -->
            <div class="flex-1 overflow-y-auto">
                <div id="cdm-projects" class="cdm-tab-content p-5 space-y-2">${projectsHtml}</div>
                <div id="cdm-crm" class="cdm-tab-content hidden p-5">${crmHtml}</div>
                <div id="cdm-notes" class="cdm-tab-content hidden p-5">
                    <p class="text-gray-600 whitespace-pre-wrap">${escapeHtml(c.notes || 'Chưa có ghi chú')}</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="border-t px-6 py-3 flex justify-end bg-gray-50 flex-shrink-0">
                <button onclick="closeCustomerDetailModal()" class="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm font-medium">Đóng</button>
            </div>
        </div>

        <style>
            .cdm-tab-btn { border-bottom: 3px solid transparent; transition: all .15s; }
            .cdm-tab-btn:hover { color: #2563eb; }
            .cdm-tab-active { border-bottom-color: #3b82f6 !important; color: #2563eb !important; font-weight: 600 !important; }
        </style>
    `;
}

function switchCDMTab(btn, tabId) {
    document.querySelectorAll('.cdm-tab-btn').forEach(b => b.classList.remove('cdm-tab-active'));
    document.querySelectorAll('.cdm-tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('cdm-tab-active');
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.remove('hidden');
}

function closeCustomerDetailModal() {
    const modal = document.getElementById('customerDetailModal');
    if (modal) modal.classList.add('hidden');
}

