/**
 * MODERN DATE RANGE PICKER COMPONENT
 * Component chọn khoảng thời gian hiện đại và tiện ích
 */

class DateRangePicker {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            onRangeChange: options.onRangeChange || null,
            defaultRange: options.defaultRange || 'month', // today, week, month, quarter, year, custom
            ...options
        };
        this.startDate = null;
        this.endDate = null;
        this.isOpen = false;

        this.init();
    }

    init() {
        this.render();
        this.setDefaultRange();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="relative" style="z-index: 9999; position: relative;">
                <button type="button" id="${this.container.id}_trigger" 
                        class="w-full px-4 py-2.5 text-left border border-gray-300 rounded-lg bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span id="${this.container.id}_display" class="text-sm text-gray-700">Chọn khoảng thời gian</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                <div id="${this.container.id}_dropdown" 
                     class="hidden absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                     style="z-index: 99999; position: absolute;">
                    <div class="p-4 border-b border-gray-200">
                        <div class="grid grid-cols-2 gap-2 mb-3">
                            <button type="button" class="preset-btn px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" data-range="today">
                                Hôm nay
                            </button>
                            <button type="button" class="preset-btn px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" data-range="yesterday">
                                Hôm qua
                            </button>
                            <button type="button" class="preset-btn px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" data-range="week">
                                7 ngày qua
                            </button>
                            <button type="button" class="preset-btn px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" data-range="month">
                                Tháng này
                            </button>
                            <button type="button" class="preset-btn px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" data-range="lastMonth">
                                Tháng trước
                            </button>
                            <button type="button" class="preset-btn px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" data-range="quarter">
                                Quý này
                            </button>
                            <button type="button" class="preset-btn px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" data-range="year">
                                Năm này
                            </button>
                            <button type="button" class="preset-btn px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" data-range="custom">
                                Tùy chọn
                            </button>
                        </div>
                        
                        <div id="${this.container.id}_custom" class="hidden">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Từ ngày</label>
                                    <input type="date" id="${this.container.id}_start" 
                                           class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Đến ngày</label>
                                    <input type="date" id="${this.container.id}_end" 
                                           class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div class="text-xs text-gray-600">
                            <span id="${this.container.id}_rangeText"></span>
                        </div>
                        <div class="flex gap-2">
                            <button type="button" class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" id="${this.container.id}_customToggle">
                                Tùy chọn
                            </button>
                            <button type="button" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors" id="${this.container.id}_apply">
                                Áp dụng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setDefaultRange() {
        const preset = this.options.defaultRange;
        if (preset && preset !== 'custom') {
            this.setRange(preset);
        }
    }

    setRange(range) {
        const today = new Date();
        let start, end;

        switch (range) {
            case 'today':
                start = new Date(today);
                end = new Date(today);
                break;
            case 'yesterday':
                start = new Date(today);
                start.setDate(start.getDate() - 1);
                end = new Date(start);
                break;
            case 'week':
                end = new Date(today);
                start = new Date(today);
                start.setDate(start.getDate() - 6);
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                start = new Date(today.getFullYear(), quarter * 3, 1);
                end = new Date(today);
                break;
            case 'year':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today);
                break;
            default:
                return;
        }

        this.startDate = start;
        this.endDate = end;
        this.updateDisplay();
        this.updatePresetButtons(range);
    }

    updateDisplay() {
        const display = document.getElementById(`${this.container.id}_display`);
        if (!display) return;

        if (this.startDate && this.endDate) {
            const startStr = this.formatDate(this.startDate);
            const endStr = this.formatDate(this.endDate);

            if (this.startDate.getTime() === this.endDate.getTime()) {
                display.textContent = startStr;
            } else {
                display.textContent = `${startStr} - ${endStr}`;
            }

            // Update range text
            const rangeText = document.getElementById(`${this.container.id}_rangeText`);
            if (rangeText) {
                const days = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
                rangeText.textContent = `${days} ngày`;
            }
        } else {
            display.textContent = 'Chọn khoảng thời gian';
        }
    }

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    updatePresetButtons(activeRange) {
        const buttons = this.container.querySelectorAll('.preset-btn');
        buttons.forEach(btn => {
            if (btn.dataset.range === activeRange) {
                btn.classList.add('bg-blue-50', 'text-blue-600', 'border-blue-200');
                btn.classList.remove('bg-gray-50', 'text-gray-700');
            } else {
                btn.classList.remove('bg-blue-50', 'text-blue-600', 'border-blue-200');
                btn.classList.add('bg-gray-50', 'text-gray-700');
            }
        });
    }

    attachEvents() {
        const trigger = document.getElementById(`${this.container.id}_trigger`);
        const dropdown = document.getElementById(`${this.container.id}_dropdown`);
        const applyBtn = document.getElementById(`${this.container.id}_apply`);
        const customStart = document.getElementById(`${this.container.id}_start`);
        const customEnd = document.getElementById(`${this.container.id}_end`);

        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Preset buttons
        this.container.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const range = btn.dataset.range;

                if (range === 'custom') {
                    const customDiv = document.getElementById(`${this.container.id}_custom`);
                    customDiv.classList.toggle('hidden');

                    if (!customDiv.classList.contains('hidden')) {
                        if (this.startDate) customStart.value = this.formatDateForInput(this.startDate);
                        if (this.endDate) customEnd.value = this.formatDateForInput(this.endDate);
                    }
                } else {
                    document.getElementById(`${this.container.id}_custom`).classList.add('hidden');
                    this.setRange(range);
                }
            });
        });

        // Apply button
        applyBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            const customDiv = document.getElementById(`${this.container.id}_custom`);
            if (!customDiv.classList.contains('hidden')) {
                // Custom range
                const startVal = customStart.value;
                const endVal = customEnd.value;

                if (startVal && endVal) {
                    this.startDate = new Date(startVal);
                    this.endDate = new Date(endVal);
                    this.updateDisplay();
                    this.updatePresetButtons('custom');
                }
            }

            this.applyRange();
            this.toggleDropdown();
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Custom date inputs
        if (customStart && customEnd) {
            customStart.addEventListener('change', () => {
                if (customStart.value && customEnd.value) {
                    this.startDate = new Date(customStart.value);
                    this.endDate = new Date(customEnd.value);
                    this.updateDisplay();
                }
            });

            customEnd.addEventListener('change', () => {
                if (customStart.value && customEnd.value) {
                    this.startDate = new Date(customStart.value);
                    this.endDate = new Date(customEnd.value);
                    this.updateDisplay();
                }
            });
        }
    }

    formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    toggleDropdown() {
        const dropdown = document.getElementById(`${this.container.id}_dropdown`);
        if (dropdown) {
            if (dropdown.classList.contains('hidden')) {
                dropdown.classList.remove('hidden');
                dropdown.style.display = 'block';
                this.isOpen = true;
            } else {
                dropdown.classList.add('hidden');
                dropdown.style.display = 'none';
                this.isOpen = false;
            }
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById(`${this.container.id}_dropdown`);
        if (dropdown) {
            dropdown.classList.add('hidden');
            dropdown.style.display = 'none';
            this.isOpen = false;
        }
    }

    applyRange() {
        if (this.options.onRangeChange && this.startDate && this.endDate) {
            this.options.onRangeChange({
                startDate: this.formatDateForInput(this.startDate),
                endDate: this.formatDateForInput(this.endDate),
                start: this.startDate,
                end: this.endDate
            });
        }
    }

    getRange() {
        return {
            startDate: this.startDate ? this.formatDateForInput(this.startDate) : null,
            endDate: this.endDate ? this.formatDateForInput(this.endDate) : null,
            start: this.startDate,
            end: this.endDate
        };
    }

    setRangeValues(startDate, endDate) {
        if (startDate) this.startDate = new Date(startDate);
        if (endDate) this.endDate = new Date(endDate);
        this.updateDisplay();
    }
}

