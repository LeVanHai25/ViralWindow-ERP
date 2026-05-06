/**
 * Customer Modal Component
 * Reusable modal component to display customer information
 * Usage: showCustomerModal(customerId, customerName)
 */

// API Base URL
const CUSTOMER_MODAL_API_BASE = window.API_BASE || '/api';

// Create modal HTML
function createCustomerModalHTML() {
    return `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" id="customerModalBackdrop"></div>
        <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-5">
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-bold flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Thông tin khách hàng
                    </h2>
                    <button type="button" id="customerModalCloseBtn" class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            
            <!-- Body -->
            <div class="p-5" id="customerModalContent">
                <div class="animate-pulse text-center py-10 text-gray-500">Đang tải...</div>
            </div>
        </div>
    `;
}

// Initialize modal
function initCustomerModal() {
    if (document.getElementById('customerModalContainer')) return;

    const modal = document.createElement('div');
    modal.id = 'customerModalContainer';
    modal.className = 'fixed inset-0 z-[9999] hidden';
    modal.innerHTML = createCustomerModalHTML();
    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('customerModalCloseBtn').addEventListener('click', closeCustomerInfoModal);
    document.getElementById('customerModalBackdrop').addEventListener('click', closeCustomerInfoModal);
}

// Close modal
function closeCustomerInfoModal() {
    const modal = document.getElementById('customerModalContainer');
    if (modal) modal.classList.add('hidden');
}

// Format currency
function formatCurrencyForModal(amount) {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Escape HTML
function escapeHtmlForModal(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Show customer modal
async function showCustomerModal(customerId, customerName) {
    initCustomerModal();

    const modal = document.getElementById('customerModalContainer');
    const content = document.getElementById('customerModalContent');

    modal.classList.remove('hidden');
    content.innerHTML = '<div class="animate-pulse text-center py-10 text-gray-500">Đang tải thông tin khách hàng...</div>';

    try {
        const token = localStorage.getItem('token');

        // Fetch customer details
        const customerRes = await fetch(`${CUSTOMER_MODAL_API_BASE}/customers/${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const customerData = await customerRes.json();
        const customer = customerData.data || customerData;

        // Fetch customer projects
        let projects = [];
        let completedProjects = [];
        let totalValue = 0;

        try {
            const projectsRes = await fetch(`${CUSTOMER_MODAL_API_BASE}/projects?customer_id=${customerId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const projectsData = await projectsRes.json();
            projects = projectsData.data || projectsData || [];
            completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'delivered');
            totalValue = projects.reduce((sum, p) => sum + (parseFloat(p.total_value) || 0), 0);
        } catch (e) {
            console.log('Could not load customer projects');
        }

        // Status map for Vietnamese
        const statusMapVN = {
            'new': 'Mới tạo',
            'quoting': 'Đang báo giá',
            'quote': 'Đang báo giá',
            'quotation_pending': 'Chờ duyệt BG',
            'quotation_approved': 'Đã duyệt BG',
            'contract': 'Chốt HĐ',
            'design': 'Thiết kế',
            'production': 'Sản xuất',
            'in_production': 'Đang SX',
            'installation': 'Lắp đặt',
            'delivered': 'Đã giao',
            'completed': 'Hoàn thành'
        };

        content.innerHTML = `
            <!-- Thông tin cơ bản -->
            <div class="grid grid-cols-2 gap-4 mb-5">
                <div>
                    <span class="text-xs text-gray-500 uppercase tracking-wide">Mã khách hàng:</span>
                    <div class="font-semibold text-blue-600">${escapeHtmlForModal(customer.customer_code || 'KH' + customerId)}</div>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase tracking-wide">Điện thoại:</span>
                    <div class="font-semibold text-gray-900 text-lg">${escapeHtmlForModal(customer.phone || '---')}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-5">
                <div>
                    <span class="text-xs text-gray-500 uppercase tracking-wide">Họ tên:</span>
                    <div class="font-semibold text-gray-900 text-lg">${escapeHtmlForModal(customer.full_name || customerName)}</div>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase tracking-wide">Chi nhánh:</span>
                    <div class="font-medium text-purple-600">${escapeHtmlForModal(customer.agency_name || '---')}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-5">
                <div>
                    <span class="text-xs text-gray-500 uppercase tracking-wide">Email:</span>
                    <div class="font-medium text-gray-700">${escapeHtmlForModal(customer.email || '---')}</div>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase tracking-wide">Địa chỉ:</span>
                    <div class="font-medium text-gray-700">${escapeHtmlForModal(customer.address || '---')}</div>
                </div>
            </div>
            
            <div class="mb-5">
                <span class="text-xs text-gray-500 uppercase tracking-wide">Ghi chú:</span>
                <div class="font-medium text-gray-700">${escapeHtmlForModal(customer.notes) || 'Không có ghi chú'}</div>
            </div>
            
            <!-- Thống kê -->
            <div class="grid grid-cols-3 gap-3 mb-5 pt-4 border-t">
                <div class="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                    <div class="text-2xl font-bold text-blue-600">${projects.length}</div>
                    <div class="text-xs text-blue-700">Tổng dự án</div>
                </div>
                <div class="bg-green-50 border border-green-200 p-3 rounded-xl text-center">
                    <div class="text-2xl font-bold text-green-600">${completedProjects.length}</div>
                    <div class="text-xs text-green-700">Hoàn thành</div>
                </div>
                <div class="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center overflow-hidden">
                    <div class="text-sm font-bold text-amber-600 truncate">${formatCurrencyForModal(totalValue)}</div>
                    <div class="text-xs text-amber-700">Tổng giá trị</div>
                </div>
            </div>
            
            <!-- Danh sách dự án -->
            ${projects.length > 0 ? `
            <div class="pt-4 border-t">
                <h3 class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Danh sách dự án
                </h3>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${projects.map(p => {
            const statusLabel = statusMapVN[p.status] || p.status || 'Đang xử lý';
            const isCompleted = p.status === 'completed' || p.status === 'delivered';
            return `
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer project-link-item" data-project-id="${p.id}">
                            <div>
                                <div class="font-medium text-gray-800 text-sm">${escapeHtmlForModal(p.project_name || '---')}</div>
                                <div class="text-xs text-gray-500">${escapeHtmlForModal(p.project_code || '---')}</div>
                            </div>
                            <div class="text-right">
                                <span class="px-2 py-0.5 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                                    ${statusLabel}
                                </span>
                                <div class="text-xs font-medium text-green-600 mt-1">${formatCurrencyForModal(p.total_value || 0)}</div>
                            </div>
                        </div>
                        `;
        }).join('')}
                </div>
            </div>
            ` : ''}
        `;

        // Add click listeners for project items
        document.querySelectorAll('.project-link-item').forEach(item => {
            item.addEventListener('click', function () {
                const projectId = this.getAttribute('data-project-id');
                closeCustomerInfoModal();
                // Navigate to project detail
                window.location.href = `project-detail.html?id=${projectId}`;
            });
        });

    } catch (error) {
        console.error('Error loading customer:', error);
        content.innerHTML = '<div class="text-center py-10 text-red-500">Lỗi khi tải thông tin khách hàng</div>';
    }
}

// Export functions for global use
window.showCustomerInfoModal = showCustomerInfoModal;
window.closeCustomerInfoModal = closeCustomerInfoModal;
// Keep backward compat for showCustomerModal
window.showCustomerModal = showCustomerModal;
