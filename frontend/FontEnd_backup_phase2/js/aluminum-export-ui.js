/**
 * Aluminum Export UI Enhancement
 * Phase 4: Adds meter-based input for aluminum exports with calculation preview
 */

(function () {
    'use strict';

    const STANDARD_LENGTH_M = 6; // Default 6m per bar

    // =====================================================
    // Aluminum Export Helper Functions
    // =====================================================

    /**
     * Calculate bars needed and leftover
     * @param {number} metersNeeded - Meters of aluminum needed
     * @param {number} standardLengthM - Standard bar length in meters (default 6)
     */
    function calculateBarsAndScrap(metersNeeded, standardLengthM = STANDARD_LENGTH_M) {
        const needCm = Math.round(metersNeeded * 100);
        const standardCm = Math.round(standardLengthM * 100);

        const barsNeeded = Math.ceil(needCm / standardCm);
        const totalCmFromBars = barsNeeded * standardCm;
        const leftoverCm = totalCmFromBars - needCm;

        return {
            metersNeeded,
            needCm,
            barsNeeded,
            leftoverCm,
            leftoverM: leftoverCm / 100
        };
    }

    /**
     * Render calculation preview panel
     */
    function renderCalculationPanel(calc) {
        if (!calc || calc.metersNeeded <= 0) {
            return '<div class="text-gray-400 text-sm italic">Nhập số mét để xem tính toán</div>';
        }

        return `
            <div class="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg p-4 border border-blue-200">
                <h5 class="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <span>📊</span> Tính toán xuất nhôm
                </h5>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p class="text-gray-600">Mét cần dùng:</p>
                        <p class="font-bold text-lg text-blue-700">${calc.metersNeeded}m</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Cây trừ kho:</p>
                        <p class="font-bold text-lg text-teal-700">${calc.barsNeeded} cây</p>
                        <p class="text-xs text-gray-500">(${calc.barsNeeded} × ${STANDARD_LENGTH_M}m = ${calc.barsNeeded * STANDARD_LENGTH_M}m)</p>
                    </div>
                </div>
                ${calc.leftoverCm > 0 ? `
                    <div class="mt-3 pt-3 border-t border-blue-200">
                        <div class="flex items-center gap-2 text-green-700">
                            <span class="text-lg">✂️</span>
                            <div>
                                <p class="font-semibold">Nhôm thừa sinh ra: ${calc.leftoverCm}cm (${calc.leftoverM}m)</p>
                                <p class="text-xs text-gray-500">Sẽ tự động lưu vào tab "Nhôm thừa"</p>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="mt-3 pt-3 border-t border-blue-200">
                        <p class="text-gray-500 text-sm">✓ Vừa đủ, không sinh nhôm thừa</p>
                    </div>
                `}
            </div>
        `;
    }

    // =====================================================
    // Export Modal Enhancement
    // =====================================================
    window.AluminumExportUI = {
        currentSystemId: null,
        currentStandardLength: STANDARD_LENGTH_M,

        init: function () {
            console.log('AluminumExportUI initializing...');
            this.setupObserver();
            console.log('AluminumExportUI ready');
        },

        // Watch for export modal opening
        setupObserver: function () {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            this.tryEnhanceExportModal(node);
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Also try on existing modals
            setTimeout(() => this.tryEnhanceExportModal(document.body), 500);
        },

        tryEnhanceExportModal: function (container) {
            // Look for export modal with aluminum type selection
            const selects = container.querySelectorAll ? container.querySelectorAll('select') : [];

            for (const select of selects) {
                const options = Array.from(select.options || []).map(o => o.value?.toLowerCase() || '');

                // If this is an item type selector that includes aluminum
                if (options.includes('aluminum') || options.includes('nhom')) {
                    // ✅ Chỉ attach vào select bên trong Export modal, KHÔNG phải Stocktake/Kiểm kho
                    const parentModal = select.closest('#exportModal, [id*="export"], [id*="Export"]');
                    if (!parentModal) continue;  // Skip nếu không nằm trong Export modal
                    
                    this.attachToTypeSelector(select);
                }
            }
        },

        attachToTypeSelector: function (select) {
            if (select.dataset.aluminumEnhanced) return;
            select.dataset.aluminumEnhanced = 'true';

            select.addEventListener('change', (e) => {
                const value = e.target.value?.toLowerCase();
                this.toggleMeterInput(value === 'aluminum' || value === 'nhom', select);
            });
        },

        toggleMeterInput: function (show, triggerSelect) {
            const existingPanel = document.getElementById('aluminumExportPanel');

            if (!show) {
                if (existingPanel) existingPanel.style.display = 'none';
                return;
            }

            // If panel exists, show it
            if (existingPanel) {
                existingPanel.style.display = 'block';
                return;
            }

            // Create and inject panel — only inside the export modal
            this.injectMeterInputPanel(triggerSelect);
        },

        injectMeterInputPanel: function (triggerSelect) {
            // Tìm modal container chứa select đã trigger
            const modal = triggerSelect 
                ? triggerSelect.closest('#exportModal, [id*="export"], [id*="Export"]')
                : null;
            const searchContainer = modal || document;

            // Find the quantity input row in the modal
            const qtyInputs = searchContainer.querySelectorAll('input[type="number"]');
            let targetRow = null;

            for (const input of qtyInputs) {
                const label = input.closest('div')?.querySelector('label');
                if (label && (label.textContent.includes('SL') || label.textContent.includes('Số lượng'))) {
                    targetRow = input.closest('.flex') || input.parentElement;
                    break;
                }
            }

            if (!targetRow) {
                return;
            }

            const panel = document.createElement('div');
            panel.id = 'aluminumExportPanel';
            panel.className = 'mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200';
            panel.innerHTML = `
                <div class="mb-3">
                    <label class="block text-sm font-medium text-blue-800 mb-2">
                        📏 Mét nhôm cần dùng
                    </label>
                    <input type="number" id="aluminumMeterInput" step="0.01" min="0.01"
                        class="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="VD: 5.5 (mét)" 
                        oninput="AluminumExportUI.updateCalculation()" />
                </div>
                <div class="mb-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="useScrapCheckbox" checked
                            class="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                        <span class="text-sm text-gray-700">Ưu tiên dùng nhôm thừa (nếu có)</span>
                    </label>
                </div>
                <div id="aluminumCalcPreview">
                    ${renderCalculationPanel(null)}
                </div>
            `;

            targetRow.parentElement.insertBefore(panel, targetRow.nextSibling);
        },

        updateCalculation: function () {
            const input = document.getElementById('aluminumMeterInput');
            const preview = document.getElementById('aluminumCalcPreview');

            if (!input || !preview) return;

            const meters = parseFloat(input.value) || 0;

            if (meters > 0) {
                const calc = calculateBarsAndScrap(meters, this.currentStandardLength);
                preview.innerHTML = renderCalculationPanel(calc);

                // Also update the qty input with bars_needed
                const qtyInput = document.querySelector('input[name="qty"], input[id*="qty"]');
                if (qtyInput) {
                    qtyInput.value = calc.barsNeeded;
                }
            } else {
                preview.innerHTML = renderCalculationPanel(null);
            }
        },

        // Get current values for form submission
        getCurrentValues: function () {
            const meterInput = document.getElementById('aluminumMeterInput');
            const useScrap = document.getElementById('useScrapCheckbox');

            if (!meterInput) return null;

            const meters = parseFloat(meterInput.value) || 0;
            const calc = calculateBarsAndScrap(meters, this.currentStandardLength);

            return {
                need_cm: calc.needCm,
                meters_needed: meters,
                bars_needed: calc.barsNeeded,
                use_scrap: useScrap?.checked || false
            };
        }
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AluminumExportUI.init());
    } else {
        AluminumExportUI.init();
    }

})();
