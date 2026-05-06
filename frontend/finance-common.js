/**
 * FINANCE MODULE - COMMON UTILITIES
 * Shared functions for all finance pages
 */

// Sử dụng API_BASE từ config hoặc fallback
const API_BASE = window.API_BASE || '/api';

// Check authentication
function checkAuth() {
    const token = sessionStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Format currency
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Format datetime
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    if (typeof text !== 'string') text = String(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get status badge HTML
function getStatusBadge(status, type = 'default') {
    const badges = {
        'draft': '<span class="status-badge status-draft">Nháp</span>',
        'posted': '<span class="status-badge status-posted">Đã ghi sổ</span>',
        'cancelled': '<span class="status-badge status-cancelled">Đã hủy</span>',
        'pending': '<span class="status-badge status-pending">Chờ thanh toán</span>',
        'partial': '<span class="status-badge status-pending">Thanh toán một phần</span>',
        'paid': '<span class="status-badge status-paid">Đã thanh toán</span>',
        'overdue': '<span class="status-badge status-overdue">Quá hạn</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

// Show confirm modal
function showConfirmModal(message, onConfirm, onCancel) {
    if (confirm(message)) {
        if (onConfirm) onConfirm();
    } else {
        if (onCancel) onCancel();
    }
}

// Show alert
function showAlert(message, type = 'info') {
    // Simple alert for now, can be enhanced with toast notifications
    alert(message);
}

// Load customers for select
async function loadCustomers(selectElement, includeEmpty = true) {
    try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE}/customers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (includeEmpty) {
            selectElement.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
        } else {
            selectElement.innerHTML = '';
        }

        if (data.success && data.data) {
            data.data.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.full_name || customer.customer_code;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Load projects for select
async function loadProjects(selectElement, includeEmpty = true) {
    try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE}/projects`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (includeEmpty) {
            selectElement.innerHTML = '<option value="">-- Chọn dự án --</option>';
        } else {
            selectElement.innerHTML = '';
        }

        if (data.success && data.data) {
            data.data.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = `${project.project_code} - ${project.project_name}`;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Load suppliers for select (if available)
async function loadSuppliers(selectElement, includeEmpty = true) {
    try {
        // TODO: Implement supplier API endpoint
        // For now, use a text input or empty select
        if (includeEmpty) {
            selectElement.innerHTML = '<option value="">-- Chọn nhà cung cấp --</option>';
        } else {
            selectElement.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

// Format payment method
function formatPaymentMethod(method) {
    const methods = {
        'cash': 'Tiền mặt',
        'bank_transfer': 'Chuyển khoản',
        'check': 'Séc',
        'other': 'Khác'
    };
    return methods[method] || method;
}

// Format transaction type
function formatTransactionType(type) {
    return type === 'revenue' ? 'Thu' : 'Chi';
}

// Format expense type
function formatExpenseType(type) {
    const types = {
        'material': 'Vật tư',
        'labor': 'Nhân công',
        'other': 'Khác'
    };
    return types[type] || type;
}

// Format payment term
function formatPaymentTerm(term) {
    const terms = {
        'deposit': 'Đặt cọc',
        'installment_1': 'Đợt 1',
        'installment_2': 'Đợt 2',
        'final': 'Quyết toán'
    };
    return terms[term] || term;
}

// Calculate percentage change
function calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

// Validate form
function validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
        } else {
            field.classList.remove('border-red-500');
        }
    });

    return isValid;
}

// Reset form
function resetForm(formElement) {
    formElement.reset();
    formElement.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500');
    });
}

// Show loading state
function showLoading(element) {
    element.classList.add('loading');
    element.disabled = true;
}

// Hide loading state
function hideLoading(element) {
    element.classList.remove('loading');
    element.disabled = false;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export to Excel (placeholder)
function exportToExcel(data, filename) {
    // TODO: Implement Excel export using a library like SheetJS
    console.log('Export to Excel:', data, filename);
    alert('Chức năng xuất Excel đang được phát triển');
}

// Export to PDF (placeholder)
function exportToPDF(data, filename) {
    // TODO: Implement PDF export using a library like jsPDF
    console.log('Export to PDF:', data, filename);
    alert('Chức năng xuất PDF đang được phát triển');
}

// Get API headers
function getApiHeaders() {
    const token = sessionStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

// API request wrapper
async function apiRequest(url, options = {}) {
    try {
        const headers = getApiHeaders();
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Format number with thousand separator
function formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(num);
}

// Parse number from formatted string
function parseNumber(str) {
    return parseFloat(str.replace(/[^\d.-]/g, ''));
}

// Get date range for period
function getDateRange(period) {
    const today = new Date();
    const ranges = {
        'today': {
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate())
        },
        'week': {
            start: new Date(today.getTime() - 7 * 86400000),
            end: today
        },
        'month': {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: today
        },
        'quarter': {
            start: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
            end: today
        },
        'year': {
            start: new Date(today.getFullYear(), 0, 1),
            end: today
        }
    };

    const range = ranges[period] || ranges.month;
    return {
        start: range.start.toISOString().split('T')[0],
        end: range.end.toISOString().split('T')[0]
    };
}

