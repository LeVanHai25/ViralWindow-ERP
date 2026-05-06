/**
 * Nhôm Đề C UI (Aluminum Scrap / Offcut)
 * Business logic: Offcut from existing aluminum in Kho nhôm
 * - User MUST select source aluminum from Kho nhôm
 * - Auto-fill info from selected source
 * - User only inputs: code, length_cm, optional note
 */

(function () {
    'use strict';

    // Sử dụng API_BASE từ config hoặc fallback
    const API_BASE = window.API_BASE || '/api';
    let scrapsData = [];
    let aluminumSystemsCache = []; // Cache for dropdown

    // =====================================================
    // Table Row Rendering
    // =====================================================
    function renderScrapRow(scrap, index) {
        const statusColors = {
            'available': 'bg-green-100 text-green-800',
            'reserved': 'bg-yellow-100 text-yellow-800',
            'used': 'bg-gray-100 text-gray-600',
            'scrapped': 'bg-red-100 text-red-800'
        };

        const statusLabels = {
            'available': 'Sẵn có',
            'reserved': 'Đang giữ',
            'used': 'Đã dùng',
            'scrapped': 'Hủy'
        };

        const status = scrap.status || (scrap.is_used ? 'used' : 'available');
        const statusClass = statusColors[status] || statusColors['available'];
        const statusLabel = statusLabels[status] || status;

        // Display source slip and project (dùng tên thực tế từ JOIN)
        const sourceDoc = scrap.source_doc_no || (scrap.source_doc_id ? `#${scrap.source_doc_id}` : '-');
        const sourceProject = scrap.source_project_name 
            ? `${scrap.source_project_code || ''} - ${scrap.source_project_name}` 
            : (scrap.source_project_id ? `DA-${scrap.source_project_id}` : '-');

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    ${scrap.scrap_code || `DC-${String(scrap.id).padStart(4, '0')}`}
                </td>
                <td class="px-4 py-3 text-sm">
                    <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        ${scrap.system_name || scrap.brand || '-'}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    ${scrap.profile_name || '-'}
                </td>
                <td class="px-4 py-3 text-sm">
                    <span class="font-bold text-teal-600">${scrap.length_cm}</span>
                    <span class="text-gray-400 text-xs ml-1">cm</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">
                    ${sourceDoc}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">
                    ${sourceProject}
                </td>
                <td class="px-4 py-3 text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${statusLabel}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">
                    ${scrap.created_at ? new Date(scrap.created_at).toLocaleDateString('vi-VN') : '-'}
                </td>
                <td class="px-4 py-3 text-sm">
                    <div class="flex gap-1">
                        ${status === 'available' ? `
                            <button onclick="openIssueScrapModal(${scrap.id}, '${(scrap.profile_name || '').replace(/'/g, "\\'")}', ${scrap.length_cm})"
                                class="bg-teal-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-teal-600">
                                Xuất
                            </button>
                        ` : ''}
                        <button onclick="editScrap(${scrap.id})"
                            class="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-600">
                            Sửa
                        </button>
                        <button onclick="deleteScrap(${scrap.id})"
                            class="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-600">
                            Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // =====================================================
    // Load and Render Scraps Table
    // =====================================================
    window.loadScraps = async function () {
        const table = document.getElementById('scrapsTable');
        if (!table) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/inventory/scraps`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Lỗi kết nối');
            }

            const result = await response.json();
            scrapsData = result.data || [];

            if (scrapsData.length === 0) {
                table.innerHTML = `
                    <tr>
                        <td colspan="9" class="px-4 py-12 text-center text-gray-500">
                            <div class="text-4xl mb-4">✂️</div>
                            <p>Chưa có Nhôm Đề C nào</p>
                            <p class="text-sm mt-2">Nhôm Đề C là đoạn còn lại từ thanh nhôm trong Kho nhôm</p>
                        </td>
                    </tr>
                `;
                return;
            }

            table.innerHTML = scrapsData.map((s, i) => renderScrapRow(s, i)).join('');

        } catch (error) {
            console.error('Error loading scraps:', error);
            table.innerHTML = `
                <tr>
                    <td colspan="9" class="px-4 py-8 text-center text-red-500">
                        Lỗi tải dữ liệu: ${error.message}
                    </td>
                </tr>
            `;
        }
    };

    // =====================================================
    // Filter Scraps
    // =====================================================
    window.filterScraps = function () {
        const searchText = document.getElementById('searchScraps')?.value?.toLowerCase() || '';
        const table = document.getElementById('scrapsTable');
        if (!table) return;

        const filtered = scrapsData.filter(s => {
            const code = (s.scrap_code || `DC-${String(s.id).padStart(4, '0')}`).toLowerCase();
            const name = (s.profile_name || '').toLowerCase();
            const brand = (s.brand || s.system_name || '').toLowerCase();
            return code.includes(searchText) || name.includes(searchText) || brand.includes(searchText);
        });

        table.innerHTML = filtered.length > 0
            ? filtered.map((s, i) => renderScrapRow(s, i)).join('')
            : `<tr><td colspan="9" class="px-4 py-8 text-center text-gray-500">Không tìm thấy kết quả</td></tr>`;
    };

    // =====================================================
    // NEW MODAL: Select source aluminum + auto-fill
    // =====================================================
    function getScrapModalHTML() {
        return `
            <div id="scrapModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center">
                <div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold" id="scrapModalTitle">Thêm Nhôm Đề C</h2>
                        <button onclick="closeScrapModal()" class="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form id="scrapForm" onsubmit="saveScrap(event)">
                        <input type="hidden" id="scrapId" />
                        
                        <!-- SECTION 1: Select source aluminum (REQUIRED) -->
                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <span class="text-red-500">*</span> Chọn thanh nhôm nguồn (từ Kho nhôm)
                            </label>
                            <select id="scrapSourceAluminum" required onchange="onSelectSourceAluminum()"
                                class="w-full px-4 py-3 border-2 border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50">
                                <option value="">-- Chọn thanh nhôm trong Kho nhôm --</option>
                            </select>
                            <p class="text-xs text-gray-500 mt-1">Nhôm Đề C là đoạn còn lại từ thanh nhôm này</p>
                        </div>

                        <!-- SECTION 2: Auto-filled info (readonly) -->
                        <div id="scrapSourceInfo" class="hidden mb-6 bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Thông tin từ Kho nhôm
                            </h4>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-500">Hệ / Brand:</span>
                                    <span id="scrapInfoBrand" class="font-medium ml-2">-</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Tên thanh:</span>
                                    <span id="scrapInfoName" class="font-medium ml-2">-</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Màu:</span>
                                    <span id="scrapInfoColor" class="font-medium ml-2">-</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Dài chuẩn:</span>
                                    <span id="scrapInfoLength" class="font-medium ml-2 text-teal-600">-</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Giá/thanh:</span>
                                    <span id="scrapInfoPrice" class="font-medium ml-2">-</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Tồn kho:</span>
                                    <span id="scrapInfoStock" class="font-medium ml-2">-</span>
                                </div>
                            </div>
                        </div>

                        <!-- SECTION 3: User inputs -->
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Mã Nhôm Đề C
                                </label>
                                <input type="text" id="scrapCode" placeholder="Tự động tạo nếu bỏ trống"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <span class="text-red-500">*</span> Chiều dài còn lại (cm)
                                </label>
                                <input type="number" id="scrapLengthCm" required step="1" min="1" placeholder="VD: 150"
                                    class="w-full px-4 py-2 border-2 border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50">
                                <p class="text-xs text-gray-500 mt-1">Tối đa: <span id="scrapMaxLength" class="font-bold text-teal-600">-</span> cm</p>
                            </div>
                        </div>

                        <!-- SECTION 4: Source tracking (Nguồn phiếu & Dự án) -->
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Nguồn phiếu (tùy chọn)
                                </label>
                                <select id="scrapSourceDocId" onchange="onSelectSourceSlip()"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                                    <option value="">-- Chọn phiếu xuất --</option>
                                </select>
                                <p class="text-xs text-gray-500 mt-1" id="scrapSourceDocHint">Chọn nhôm nguồn để xem phiếu liên quan</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Dự án nguồn (tùy chọn)
                                </label>
                                <select id="scrapSourceProjectId"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                                    <option value="">-- Chọn dự án --</option>
                                </select>
                                <p class="text-xs text-gray-500 mt-1">Dự án sinh ra nhôm thừa này</p>
                            </div>
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Ghi chú (tùy chọn)</label>
                            <textarea id="scrapNote" rows="2" placeholder="VD: Còn từ phiếu xuất XK-001, dự án ABC..."
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"></textarea>
                        </div>

                        <div class="flex justify-end gap-4">
                            <button type="button" onclick="closeScrapModal()"
                                class="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                                Hủy
                            </button>
                            <button type="submit" id="scrapSubmitBtn"
                                class="bg-teal-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-teal-600">
                                Thêm Nhôm Đề C
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    function getIssueModalHTML() {
        return `
            <div id="issueScrapModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-teal-500 to-blue-500 px-6 py-4">
                        <h3 class="text-xl font-bold text-white">📤 Xuất Nhôm Đề C cho dự án</h3>
                    </div>
                    <div class="p-6">
                        <input type="hidden" id="issueScrapId" />
                        
                        <div class="bg-teal-50 rounded-lg p-4 mb-4">
                            <p class="text-sm text-gray-600">Đoạn nhôm:</p>
                            <p class="font-bold text-lg text-teal-700" id="issueScrapName">-</p>
                            <p class="text-sm text-gray-500">Còn: <span id="issueScrapLength" class="font-bold">0</span> cm</p>
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Chọn dự án *</label>
                            <select id="issueProjectSelect" 
                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none">
                                <option value="">-- Chọn dự án --</option>
                            </select>
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Số cm sử dụng *</label>
                            <input type="number" id="issueUseCm" min="1"
                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                placeholder="Nhập số cm cần dùng" />
                        </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
                        <button onclick="closeIssueModal()"
                            class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Hủy</button>
                        <button onclick="confirmIssueScrap()"
                            class="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-semibold">Xác nhận</button>
                    </div>
                </div>
            </div>
        `;
    }

    // =====================================================
    // Selected source aluminum state
    // =====================================================
    let selectedSourceAluminum = null;
    let exportSlipsCache = []; // Cache for export slips

    window.onSelectSourceAluminum = async function () {
        const select = document.getElementById('scrapSourceAluminum');
        const infoPanel = document.getElementById('scrapSourceInfo');
        const selectedId = parseInt(select.value, 10);

        if (!selectedId || isNaN(selectedId)) {
            selectedSourceAluminum = null;
            infoPanel?.classList.add('hidden');
            document.getElementById('scrapMaxLength').textContent = '-';
            // Reset export slips dropdown
            resetExportSlipsDropdown();
            return;
        }

        // Find selected aluminum from cache
        const system = aluminumSystemsCache.find(s => s.id === selectedId);
        if (!system) {
            selectedSourceAluminum = null;
            infoPanel?.classList.add('hidden');
            resetExportSlipsDropdown();
            return;
        }

        selectedSourceAluminum = system;
        infoPanel?.classList.remove('hidden');

        // Auto-fill info
        document.getElementById('scrapInfoBrand').textContent = system.brand || system.aluminum_system || '-';
        document.getElementById('scrapInfoName').textContent = system.name || system.profile_name || '-';
        document.getElementById('scrapInfoColor').textContent = system.color || '-';

        // Length in cm (DB may store as meters)
        const lengthCm = system.length_m ? Math.round(system.length_m * 100) : (system.length_cm || 600);
        document.getElementById('scrapInfoLength').textContent = `${lengthCm} cm`;
        document.getElementById('scrapMaxLength').textContent = lengthCm;

        // Set max for input
        const lengthInput = document.getElementById('scrapLengthCm');
        if (lengthInput) lengthInput.max = lengthCm;

        // Price & stock
        const price = system.unit_price || 0;
        document.getElementById('scrapInfoPrice').textContent = price > 0 ? `${price.toLocaleString('vi-VN')}đ` : '-';

        const stock = system.quantity || system.quantity_m || 0;
        document.getElementById('scrapInfoStock').textContent = `${stock} thanh`;

        // Load related export slips for smart selection
        await loadExportSlipsForAluminum(selectedId);
    };

    // =====================================================
    // Load Export Slips for selected aluminum
    // =====================================================
    async function loadExportSlipsForAluminum(aluminumSystemId) {
        const select = document.getElementById('scrapSourceDocId');
        const hint = document.getElementById('scrapSourceDocHint');

        if (!select) return;

        select.innerHTML = '<option value="">Đang tải...</option>';
        if (hint) hint.textContent = 'Đang tải danh sách phiếu xuất...';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/inventory/scraps/export-slips/${aluminumSystemId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const result = await response.json();
                exportSlipsCache = result.data || [];

                select.innerHTML = '<option value="">-- Chọn phiếu xuất --</option>';

                if (exportSlipsCache.length === 0) {
                    select.innerHTML += '<option value="" disabled>Không có phiếu xuất nào</option>';
                    if (hint) hint.textContent = 'Không tìm thấy phiếu xuất nhôm này';
                } else {
                    exportSlipsCache.forEach(slip => {
                        const date = slip.posted_at ? new Date(slip.posted_at).toLocaleDateString('vi-VN') : '';
                        select.innerHTML += `<option value="${slip.id}" data-project-id="${slip.project_id || ''}">${slip.doc_code}${date ? ' - ' + date : ''}${slip.project_code ? ' (' + slip.project_code + ')' : ''}</option>`;
                    });
                    if (hint) hint.textContent = `Tìm thấy ${exportSlipsCache.length} phiếu xuất`;
                }
            } else {
                select.innerHTML = '<option value="">-- Không thể tải --</option>';
                if (hint) hint.textContent = 'Lỗi tải danh sách phiếu';
            }
        } catch (error) {
            console.error('Error loading export slips:', error);
            select.innerHTML = '<option value="">-- Lỗi --</option>';
            if (hint) hint.textContent = 'Lỗi kết nối server';
        }
    }

    function resetExportSlipsDropdown() {
        const select = document.getElementById('scrapSourceDocId');
        const hint = document.getElementById('scrapSourceDocHint');
        if (select) {
            select.innerHTML = '<option value="">-- Chọn phiếu xuất --</option>';
        }
        if (hint) {
            hint.textContent = 'Chọn nhôm nguồn để xem phiếu liên quan';
        }
        exportSlipsCache = [];
    }

    // =====================================================
    // On Select Source Slip - Auto-select project
    // =====================================================
    window.onSelectSourceSlip = function () {
        const slipSelect = document.getElementById('scrapSourceDocId');
        const projectSelect = document.getElementById('scrapSourceProjectId');

        if (!slipSelect || !projectSelect) return;

        const selectedOption = slipSelect.options[slipSelect.selectedIndex];
        if (selectedOption) {
            const projectId = selectedOption.getAttribute('data-project-id');
            if (projectId) {
                projectSelect.value = projectId;
            }
        }
    };

    // =====================================================
    // Modal Functions
    // =====================================================
    window.openScrapModal = async function (id = null) {
        // Inject modal if not exists
        if (!document.getElementById('scrapModal')) {
            const div = document.createElement('div');
            div.innerHTML = getScrapModalHTML();
            document.body.appendChild(div.firstElementChild);
        }

        // Load aluminum systems for dropdown
        await loadAluminumSystemsForScrap();

        // Load projects for dropdown
        await loadProjectsForScrapModal();

        // Reset form
        selectedSourceAluminum = null;
        document.getElementById('scrapId').value = '';
        document.getElementById('scrapSourceAluminum').value = '';
        document.getElementById('scrapCode').value = '';
        document.getElementById('scrapLengthCm').value = '';
        document.getElementById('scrapNote').value = '';
        document.getElementById('scrapSourceDocId').value = '';
        document.getElementById('scrapSourceProjectId').value = '';
        document.getElementById('scrapSourceInfo')?.classList.add('hidden');
        document.getElementById('scrapMaxLength').textContent = '-';
        document.getElementById('scrapModalTitle').textContent = 'Thêm Nhôm Đề C';
        document.getElementById('scrapSubmitBtn').textContent = 'Thêm Nhôm Đề C';

        // If editing, load data
        if (id) {
            const scrap = scrapsData.find(s => s.id === id);
            if (scrap) {
                document.getElementById('scrapId').value = scrap.id;
                document.getElementById('scrapCode').value = scrap.scrap_code || '';
                document.getElementById('scrapLengthCm').value = scrap.length_cm || '';
                document.getElementById('scrapNote').value = scrap.note || '';
                document.getElementById('scrapSourceDocId').value = scrap.source_doc_id || '';
                document.getElementById('scrapSourceProjectId').value = scrap.source_project_id || '';

                // Set source aluminum
                const sysId = scrap.aluminum_system_id || scrap.system_id;
                if (sysId) {
                    document.getElementById('scrapSourceAluminum').value = sysId;
                    onSelectSourceAluminum();
                }

                document.getElementById('scrapModalTitle').textContent = 'Chỉnh sửa Nhôm Đề C';
                document.getElementById('scrapSubmitBtn').textContent = 'Cập nhật';
            }
        }

        document.getElementById('scrapModal').classList.remove('hidden');
    };

    window.closeScrapModal = function () {
        document.getElementById('scrapModal')?.classList.add('hidden');
    };

    window.editScrap = function (id) {
        openScrapModal(id);
    };

    // =====================================================
    // Save Scrap - Send aluminum_system_id + length_cm
    // =====================================================
    window.saveScrap = async function (event) {
        if (event) event.preventDefault();

        const id = document.getElementById('scrapId').value;
        const sourceSelect = document.getElementById('scrapSourceAluminum');
        const aluminum_system_id = parseInt(sourceSelect.value, 10);

        // Validate source aluminum is selected
        if (!aluminum_system_id || isNaN(aluminum_system_id)) {
            alert('❌ Vui lòng chọn thanh nhôm nguồn từ Kho nhôm');
            sourceSelect.focus();
            return;
        }

        const length_cm = parseInt(document.getElementById('scrapLengthCm').value, 10);

        // Validate length
        if (!length_cm || length_cm <= 0) {
            alert('❌ Vui lòng nhập chiều dài còn lại (cm)');
            document.getElementById('scrapLengthCm').focus();
            return;
        }

        // Validate length <= source length
        if (selectedSourceAluminum) {
            const maxLength = selectedSourceAluminum.length_m
                ? Math.round(selectedSourceAluminum.length_m * 100)
                : (selectedSourceAluminum.length_cm || 600);
            if (length_cm > maxLength) {
                alert(`❌ Chiều dài không được vượt quá ${maxLength}cm (độ dài thanh nguồn)`);
                return;
            }
        }

        // Get source tracking fields
        const sourceDocIdValue = document.getElementById('scrapSourceDocId')?.value?.trim() || null;
        const sourceProjectIdValue = document.getElementById('scrapSourceProjectId')?.value || null;

        const data = {
            aluminum_system_id: aluminum_system_id,
            scrap_code: document.getElementById('scrapCode').value.trim() || null,
            length_cm: length_cm,
            note: document.getElementById('scrapNote').value.trim() || null,
            source_doc_id: sourceDocIdValue,
            source_project_id: sourceProjectIdValue ? parseInt(sourceProjectIdValue, 10) : null,
            status: 'available'
        };

        try {
            const token = localStorage.getItem('token');
            const url = id
                ? `${API_BASE}/inventory/scraps/${id}`
                : `${API_BASE}/inventory/scraps`;

            const response = await fetch(url, {
                method: id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                closeScrapModal();
                loadScraps();
                alert('✅ ' + (id ? 'Cập nhật' : 'Thêm Nhôm Đề C') + ' thành công!');
            } else {
                alert('❌ ' + result.message);
            }
        } catch (error) {
            console.error('Error saving scrap:', error);
            alert('❌ Lỗi kết nối server');
        }
    };

    window.deleteScrap = async function (id) {
        const confirmed = await VWModal.confirm('Xóa Nhôm Đề C', 'Bạn có chắc muốn xóa Nhôm Đề C này?');
        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/inventory/scraps/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                loadScraps();
                alert('✅ Xóa thành công!');
            } else {
                alert('❌ ' + result.message);
            }
        } catch (error) {
            console.error('Error deleting scrap:', error);
            alert('❌ Lỗi kết nối server');
        }
    };

    // =====================================================
    // Issue Scrap Functions
    // =====================================================
    let currentIssueMaxCm = 0;

    window.openIssueScrapModal = async function (id, name, lengthCm) {
        if (!document.getElementById('issueScrapModal')) {
            const div = document.createElement('div');
            div.innerHTML = getIssueModalHTML();
            document.body.appendChild(div.firstElementChild);
        }

        currentIssueMaxCm = lengthCm;
        document.getElementById('issueScrapId').value = id;
        document.getElementById('issueScrapName').textContent = name || 'N/A';
        document.getElementById('issueScrapLength').textContent = lengthCm;
        document.getElementById('issueUseCm').value = '';
        document.getElementById('issueUseCm').max = lengthCm;

        await loadProjects();
        document.getElementById('issueScrapModal').classList.remove('hidden');
    };

    window.closeIssueModal = function () {
        document.getElementById('issueScrapModal')?.classList.add('hidden');
    };

    window.confirmIssueScrap = async function () {
        const id = document.getElementById('issueScrapId').value;
        const projectId = document.getElementById('issueProjectSelect').value;
        const useCm = parseInt(document.getElementById('issueUseCm').value) || 0;

        if (!projectId) { alert('Vui lòng chọn dự án'); return; }
        if (!useCm || useCm <= 0) { alert('Vui lòng nhập số cm sử dụng'); return; }
        if (useCm > currentIssueMaxCm) { alert(`Số cm không được vượt quá ${currentIssueMaxCm}cm`); return; }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/inventory/scraps/${id}/issue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ project_id: projectId, use_cm: useCm })
            });

            const result = await response.json();

            if (result.success) {
                closeIssueModal();
                loadScraps();
                alert('✅ ' + result.message);
            } else {
                alert('❌ ' + result.message);
            }
        } catch (error) {
            console.error('Error issuing scrap:', error);
            alert('❌ Lỗi kết nối server');
        }
    };

    // =====================================================
    // Helper: Load Aluminum Systems for Scrap dropdown
    // =====================================================
    async function loadAluminumSystemsForScrap() {
        const select = document.getElementById('scrapSourceAluminum');
        if (!select) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/aluminum-systems`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const result = await response.json();
                aluminumSystemsCache = result.data || [];

                select.innerHTML = '<option value="">-- Chọn thanh nhôm trong Kho nhôm --</option>';

                if (aluminumSystemsCache.length === 0) {
                    select.innerHTML = '<option value="">⚠️ Chưa có nhôm trong Kho. Vui lòng thêm trước!</option>';
                    return;
                }

                aluminumSystemsCache.forEach(s => {
                    const brand = s.brand || s.aluminum_system || '';
                    const name = s.name || s.profile_name || '';
                    const color = s.color || '';
                    const lengthM = s.length_m || 6;
                    const stock = s.quantity || 0;

                    // Format: "Brand – Hệ – Tên – Màu – Dài – Tồn"
                    const label = `${brand} – ${name}${color ? ' – ' + color : ''} – ${lengthM}m – tồn ${stock}`;
                    select.innerHTML += `<option value="${s.id}">${label}</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading aluminum systems:', error);
            select.innerHTML = '<option value="">❌ Lỗi tải danh sách Kho nhôm</option>';
        }
    }

    // =====================================================
    // Helper: Load Projects for Scrap Modal
    // =====================================================
    async function loadProjectsForScrapModal() {
        const select = document.getElementById('scrapSourceProjectId');
        if (!select) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/projects?exclude_inactive=true`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const result = await response.json();
                const projects = result.data || [];
                select.innerHTML = '<option value="">-- Chọn dự án --</option>';
                projects.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.project_code} - ${p.project_name}</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading projects for scrap modal:', error);
        }
    }

    // =====================================================
    // Helper: Load Projects
    // =====================================================
    async function loadProjects() {
        const select = document.getElementById('issueProjectSelect');
        if (!select) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/projects?exclude_inactive=true`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const result = await response.json();
                const projects = result.data || [];
                select.innerHTML = '<option value="">-- Chọn dự án --</option>';
                projects.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.project_code} - ${p.project_name}</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    // =====================================================
    // Init: Hook into tab switch
    // =====================================================
    const originalSwitch = window.switchStockSubTab;
    window.switchStockSubTab = function (tab, btn) {
        if (originalSwitch) originalSwitch(tab, btn);

        if (tab === 'scraps') {
            setTimeout(loadScraps, 100);
        }
    };

    console.log('Nhôm Đề C UI (Offcut from Kho nhôm) ready');

})();
