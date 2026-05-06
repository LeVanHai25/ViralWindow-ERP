/**
 * Stock Document Modal with Create Item Feature
 * Adds "Tạo vật tư mới" functionality to import document modal
 */

(function () {
    'use strict';

    // Sử dụng API_BASE từ config hoặc fallback
    const API_BASE = window.API_BASE || '/api';

    // Create Item Form HTML template
    function getCreateItemFormHTML() {
        return `
            <div id="createItemForm" class="hidden mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 class="font-semibold text-teal-700 mb-3 flex items-center gap-2">
                    <span>➕</span> Tạo vật tư mới
                </h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Mã vật tư *</label>
                        <div class="flex gap-2">
                            <input type="text" id="newItemCode" 
                                class="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                placeholder="Tự động sinh" />
                            <button type="button" onclick="StockDocModal.generateCode()"
                                class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                                🔄 Tự sinh
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Tên vật tư *</label>
                        <input type="text" id="newItemName" 
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            placeholder="Nhập tên vật tư" />
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Đơn vị *</label>
                        <select id="newItemUnit" 
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                            <option value="Chiếc">Chiếc</option>
                            <option value="Bộ">Bộ</option>
                            <option value="m">m</option>
                            <option value="m²">m²</option>
                            <option value="Thanh">Thanh</option>
                            <option value="Kg">Kg</option>
                            <option value="Hộp">Hộp</option>
                            <option value="Cuộn">Cuộn</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Giá nhập mặc định</label>
                        <input type="number" id="newItemCost" 
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            placeholder="0" min="0" />
                    </div>
                    <div id="newItemCategoryWrapper" class="hidden">
                        <label class="block text-sm text-gray-600 mb-1">Danh mục</label>
                        <select id="newItemCategory" 
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                            <option value="">-- Chọn danh mục --</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button type="button" onclick="StockDocModal.hideCreateItemForm()"
                        class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Hủy
                    </button>
                    <button type="button" onclick="StockDocModal.createItem()"
                        class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold">
                        ✓ Tạo vật tư
                    </button>
                </div>
            </div>
        `;
    }

    // Create Item Button HTML
    function getCreateItemButtonHTML() {
        return `
            <button type="button" id="btnShowCreateItem" onclick="StockDocModal.showCreateItemForm()"
                class="ml-2 px-3 py-2 text-teal-600 hover:bg-teal-50 rounded-lg text-sm font-medium flex items-center gap-1 border border-teal-300">
                <span>➕</span> Tạo mới
            </button>
        `;
    }

    // Stock Document Modal Manager
    window.StockDocModal = {
        currentItemType: 'accessory',
        observer: null,
        injected: false,

        // Initialize - set up MutationObserver to watch for modal opening
        init: function () {
            console.log('StockDocModal initializing...');

            // Wait for DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupObserver());
            } else {
                this.setupObserver();
            }
        },

        setupObserver: function () {
            console.log('StockDocModal setting up observer...');

            // Use MutationObserver to detect when modal is added to DOM
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if this is the stock document modal or contains it
                            this.tryInjectUI(node);
                        }
                    });
                });
            });

            // Start observing body for modal additions
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Also try to inject immediately in case modal is already open
            setTimeout(() => this.tryInjectUI(document.body), 500);

            console.log('StockDocModal UI ready - watching for modal');
        },

        tryInjectUI: function (container) {
            // Don't inject twice
            if (document.getElementById('btnShowCreateItem')) {
                return;
            }

            // Find the stock document modal - look for item type dropdown with specific options
            const selects = container.querySelectorAll ? container.querySelectorAll('select') : [];

            for (const select of selects) {
                // Ignore if not inside a modal (prevent injection on main page filters)
                if (!select.closest('[id*="Modal"]')) {
                    continue;
                }

                const options = Array.from(select.options || []).map(o => o.text?.toLowerCase() || '');
                const hasItemTypes = options.some(t =>
                    t.includes('phụ kiện') || t.includes('nhôm') || t.includes('kính') || t.includes('vật tư')
                );

                if (hasItemTypes) {
                    console.log('StockDocModal found item type dropdown, injecting button...');
                    this.injectButtonNextTo(select);
                    return;
                }
            }
        },

        injectButtonNextTo: function (select) {
            // Find the row container (flex parent)
            const row = select.closest('.flex') || select.closest('div.flex') || select.parentElement;

            if (!row) {
                console.log('StockDocModal: Could not find row container');
                return;
            }

            // Don't inject if already exists
            if (document.getElementById('btnShowCreateItem')) {
                return;
            }

            // CREATE THE BUTTON
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'btnShowCreateItem';
            btn.className = 'ml-2 px-3 py-2 text-teal-600 hover:bg-teal-50 rounded-lg text-sm font-medium flex items-center gap-1 border border-teal-300 whitespace-nowrap';
            btn.innerHTML = '<span>➕</span> Tạo mới';
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                StockDocModal.showCreateItemForm();
            };

            // Insert button - try to find the "+ Thêm" button and insert before it
            const addBtn = row.querySelector('button');
            if (addBtn && addBtn.textContent?.includes('Thêm')) {
                addBtn.parentElement.insertBefore(btn, addBtn);
            } else {
                // Insert at the beginning of the row
                row.insertBefore(btn, row.firstChild.nextSibling);
            }

            // CREATE THE FORM (hidden initially)
            const formWrapper = document.createElement('div');
            formWrapper.id = 'createItemFormWrapper';
            formWrapper.innerHTML = getCreateItemFormHTML();

            // Insert form after the row
            const parentContainer = row.parentElement;
            if (parentContainer) {
                parentContainer.insertBefore(formWrapper, row.nextSibling);
            }

            console.log('StockDocModal: Button and form injected successfully!');
        },

        // Show create item form
        showCreateItemForm: function () {
            const form = document.getElementById('createItemForm');
            if (form) {
                form.classList.remove('hidden');
                this.generateCode();
                this.loadCategories();
            } else {
                console.log('Create item form not found - injecting...');
                this.injectCreateItemForm();
            }
        },

        // Hide create item form
        hideCreateItemForm: function () {
            const form = document.getElementById('createItemForm');
            if (form) {
                form.classList.add('hidden');
                // Clear form
                document.getElementById('newItemCode').value = '';
                document.getElementById('newItemName').value = '';
                document.getElementById('newItemCost').value = '';
            }
        },

        // Inject create item form into modal
        injectCreateItemForm: function () {
            // Find the "Thêm vật tư" section - look for item type dropdown
            const itemTypeSelects = document.querySelectorAll('select');
            let targetContainer = null;

            itemTypeSelects.forEach(select => {
                const options = Array.from(select.options).map(o => o.text.toLowerCase());
                if (options.some(t => t.includes('phụ kiện') || t.includes('nhôm') || t.includes('kính'))) {
                    targetContainer = select.closest('.flex') || select.parentElement;
                }
            });

            if (targetContainer) {
                // Add "Tạo mới" button after the item type dropdown
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.id = 'btnShowCreateItem';
                btn.className = 'ml-2 px-3 py-2 text-teal-600 hover:bg-teal-50 rounded-lg text-sm font-medium flex items-center gap-1 border border-teal-300';
                btn.innerHTML = '<span>➕</span> Tạo mới';
                btn.onclick = () => this.showCreateItemForm();
                targetContainer.appendChild(btn);

                // Add form below
                const formContainer = document.createElement('div');
                formContainer.innerHTML = getCreateItemFormHTML();
                targetContainer.parentElement.insertBefore(formContainer.firstElementChild, targetContainer.nextSibling);
            }
        },

        // Generate item code
        generateCode: async function () {
            const itemType = this.getCurrentItemType();
            const token = localStorage.getItem('token');

            try {
                const response = await fetch(`${API_BASE}/items/next-code?item_type=${itemType}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('newItemCode').value = data.data.code;
                }
            } catch (error) {
                console.error('Error generating code:', error);
            }
        },

        // Get current item type from dropdown
        getCurrentItemType: function () {
            // Try to find the item type dropdown
            const selects = document.querySelectorAll('select');
            for (const select of selects) {
                const value = select.value?.toLowerCase();
                if (['aluminum', 'accessory', 'glass', 'other'].includes(value)) {
                    return value;
                }
                // Check selected text
                const text = select.options[select.selectedIndex]?.text?.toLowerCase() || '';
                if (text.includes('nhôm')) return 'aluminum';
                if (text.includes('phụ kiện')) return 'accessory';
                if (text.includes('kính')) return 'glass';
                if (text.includes('vật tư')) return 'other';
            }
            return 'accessory';
        },

        // Load categories for accessories
        loadCategories: async function () {
            const itemType = this.getCurrentItemType();
            const categoryWrapper = document.getElementById('newItemCategoryWrapper');
            const categorySelect = document.getElementById('newItemCategory');

            if (itemType === 'accessory' && categoryWrapper && categorySelect) {
                categoryWrapper.classList.remove('hidden');

                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_BASE}/items/categories?item_type=accessory`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
                        data.data.forEach(cat => {
                            categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
                        });
                    }
                } catch (error) {
                    console.error('Error loading categories:', error);
                }
            } else if (categoryWrapper) {
                categoryWrapper.classList.add('hidden');
            }
        },

        // Create new item
        createItem: async function () {
            const itemType = this.getCurrentItemType();
            const code = document.getElementById('newItemCode').value.trim();
            const name = document.getElementById('newItemName').value.trim();
            const unit = document.getElementById('newItemUnit').value;
            const cost = parseFloat(document.getElementById('newItemCost').value) || 0;
            const categoryId = document.getElementById('newItemCategory')?.value || null;

            // Validate
            if (!name) {
                alert('Vui lòng nhập tên vật tư');
                return;
            }

            const token = localStorage.getItem('token');

            try {
                const response = await fetch(`${API_BASE}/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        item_type: itemType,
                        code: code || undefined,
                        name: name,
                        unit: unit,
                        default_cost: cost,
                        category_id: categoryId || undefined
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Success!
                    this.showToast(`✅ Đã tạo vật tư: ${result.data.code} - ${result.data.name}`);

                    // Hide form
                    this.hideCreateItemForm();

                    // Auto-fill search with new item
                    this.autoSelectNewItem(result.data);
                } else {
                    alert('❌ Lỗi: ' + result.message);
                }
            } catch (error) {
                console.error('Error creating item:', error);
                alert('❌ Lỗi kết nối server');
            }
        },

        // Auto-select new item in search dropdown
        autoSelectNewItem: function (item) {
            // Find the search input and trigger selection
            const searchInputs = document.querySelectorAll('input[type="text"]');
            for (const input of searchInputs) {
                const placeholder = input.placeholder?.toLowerCase() || '';
                if (placeholder.includes('nhập mã') || placeholder.includes('tên vật tư') || placeholder.includes('search')) {
                    input.value = `${item.code} - ${item.name}`;
                    input.dataset.selectedId = item.id;
                    // Trigger input event to update any listeners
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        },

        // Show toast notification
        showToast: function (message) {
            // Use existing toast if available
            if (typeof showSuccessNotification === 'function') {
                showSuccessNotification(message);
                return;
            }

            // Fallback toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] animate-pulse';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    };

    // Auto-init
    StockDocModal.init();

})();
