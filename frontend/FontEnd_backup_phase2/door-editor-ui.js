// ============================================
// DOOR EDITOR UI - Glue tất cả lại
// Tích hợp đầy đủ với hệ thống backend
// ============================================

class DoorEditorUI {
    constructor() {
        // API Configuration
        this.API_BASE = window.API_BASE || '/api';
        
        // Canvas setup - use drawingCanvas as primary
        this.canvas = document.getElementById("drawingCanvas") || document.getElementById("doorCanvas");
        if (!this.canvas) {
            console.error("Canvas element not found!");
            return;
        }

        // Try to use existing canvasEngine if available, otherwise create new one
        if (window.canvasEngine && window.canvasEngine.canvas === this.canvas) {
            this.canvasEngine = window.canvasEngine;
        } else {
            // Try DoorCanvasEngineV2 first (if available), fallback to DoorCanvasEngine
            if (typeof DoorCanvasEngineV2 !== 'undefined') {
                this.canvasEngine = new DoorCanvasEngineV2('drawingCanvas', {
                    width: 2000,
                    height: 1500
                });
                window.canvasEngine = this.canvasEngine;
            } else if (typeof DoorCanvasEngine !== 'undefined') {
        this.canvasEngine = new DoorCanvasEngine(this.canvas);
            } else {
                console.warn("No canvas engine found, some features may not work");
            }
        }
        
        this.sysConfigs = {
            "XINGFA_55": SYSTEM_XINGFA_55,
            "PMI": SYSTEM_PMI
        };

        // Current state
        this.currentDoor = null;
        this.currentDoorModel = null; // DoorModel instance
        this.currentSystem = "XINGFA_55";
        this.currentProjectId = null;
        this.currentDoorId = null;
        this.currentDoorDrawingId = null; // For BOM access
        this.currentDoorData = null;
        this.projectDoors = []; // Items List
        this.templates = [];
        this.aluminumSystems = [];
        this.selectedPanel = null; // Currently selected panel for applying window/door types
        this.selectedPanelPath = null; // Path to selected panel [0,1,2,...]
        
        this.initElements();
        this.initEvents();
        this.initToolbarEvents();
        this.initCanvasClick();
        this.loadProjectFromURL();
    }

    // Initialize toolbar button events
    initToolbarEvents() {
        // New item buttons
        document.getElementById('btnNewRec')?.addEventListener('click', () => {
            this.openNewDoorModal('rectangle');
        });
        document.getElementById('btnNewNonRec')?.addEventListener('click', () => {
            this.openNewDoorModal('non-rectangle');
        });
        document.getElementById('btnImportDoor')?.addEventListener('click', () => {
            this.openNewDoorModal('import');
        });

        // Mullion buttons
        document.getElementById('btnSplitVertical')?.addEventListener('click', () => {
            this.openSplitModal('vertical');
        });
        document.getElementById('btnSplitHorizontal')?.addEventListener('click', () => {
            this.openSplitModal('horizontal');
        });

        // Panel Coupling buttons
        document.getElementById('btnCoupleVertical')?.addEventListener('click', () => {
            this.couplePanels('vertical');
        });
        document.getElementById('btnCoupleHorizontal')?.addEventListener('click', () => {
            this.couplePanels('horizontal');
        });

        // Tilt & Slide button
        document.getElementById('btnTypeTiltSlide')?.addEventListener('click', () => {
            this.applyPanelType('tilt-slide');
        });

        // Window/Door type buttons
        document.getElementById('btnTypeFixed')?.addEventListener('click', () => {
            this.applyPanelType('fixed');
        });
        document.getElementById('btnTypeTurnLeft')?.addEventListener('click', () => {
            this.applyPanelType('turn-left');
        });
        document.getElementById('btnTypeTurnRight')?.addEventListener('click', () => {
            this.applyPanelType('turn-right');
        });
        document.getElementById('btnTypeTilt')?.addEventListener('click', () => {
            this.applyPanelType('tilt');
        });
        document.getElementById('btnTypeTiltTurn')?.addEventListener('click', () => {
            this.applyPanelType('tilt-turn');
        });
        document.getElementById('btnTypeSlide2')?.addEventListener('click', () => {
            this.applyPanelType('sliding-2');
        });
        document.getElementById('btnTypeSlide3')?.addEventListener('click', () => {
            this.applyPanelType('sliding-3');
        });
        document.getElementById('btnTypeSlide4')?.addEventListener('click', () => {
            this.applyPanelType('sliding-4');
        });
        document.getElementById('btnTypeFrench')?.addEventListener('click', () => {
            this.applyPanelType('french-master');
        });
        document.getElementById('btnTypeSingleSide')?.addEventListener('click', () => {
            this.applyPanelType('turn-left'); // Default single side door
        });
    }

    // Initialize canvas click handler
    initCanvasClick() {
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
            this.canvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));
            this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
            this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
            this.canvas.addEventListener('contextmenu', (e) => this.onCanvasContextMenu(e));
            this.canvas.addEventListener('dragover', (e) => this.onCanvasDragOver(e));
            this.canvas.addEventListener('drop', (e) => this.onCanvasDrop(e));
            this.canvas.style.cursor = 'pointer';
        }
    }
    
    // Drag state for resizing panels
    dragState = {
        isDragging: false,
        dragType: null, // 'resize-vertical' | 'resize-horizontal' | null
        startX: 0,
        startY: 0,
        startPath: null,
        startRatio: null
    };

    // Handle canvas click
    onCanvasClick(event) {
        // Ensure DoorModel exists
        if (!this.currentDoorModel) {
            this.ensureDoorModel();
        }
        
        if (!this.canvasEngine || !this.currentDoorModel) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const hit = this.canvasEngine.hitTest(x, y);
        if (hit && hit.type === 'panel') {
            this.selectedPanelPath = hit.path;
            this.selectedPanel = this.getSelectedPanel();
            console.log('Panel selected:', this.selectedPanel, 'Path:', this.selectedPanelPath);
            this.redraw();
            
            // Update panel info in sidebar (optional)
            this.updatePanelInfo();
        } else {
            // Click outside - deselect
            this.selectedPanelPath = null;
            this.selectedPanel = null;
            this.redraw();
        }
    }
    
    // Handle canvas double click - open panel type selector
    onCanvasDoubleClick(event) {
        if (!this.currentDoorModel) {
            this.ensureDoorModel();
        }
        
        if (!this.canvasEngine || !this.currentDoorModel) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const hit = this.canvasEngine.hitTest(x, y);
        if (hit && hit.type === 'panel') {
            this.selectedPanelPath = hit.path;
            this.selectedPanel = this.getSelectedPanel();
            this.openPanelTypeSelector();
        }
    }
    
    // Open panel type selector popup
    openPanelTypeSelector() {
        const modal = document.getElementById('panelTypeSelectorModal');
        if (!modal) {
            this.createPanelTypeSelectorModal();
        }
        document.getElementById('panelTypeSelectorModal').classList.remove('hidden');
    }
    
    // Create panel type selector modal
    createPanelTypeSelectorModal() {
        const modalHTML = `
            <div id="panelTypeSelectorModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl p-6 w-full max-w-lg">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold">Chọn loại cửa/panel</h2>
                        <button onclick="doorEditorUI.closePanelTypeSelector()" class="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="doorEditorUI.selectPanelType('fixed')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Fixed</div>
                            <div class="text-xs text-gray-500">Cố định</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('turn-left')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Turn Left</div>
                            <div class="text-xs text-gray-500">Quay trái</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('turn-right')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Turn Right</div>
                            <div class="text-xs text-gray-500">Quay phải</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('tilt')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Tilt</div>
                            <div class="text-xs text-gray-500">Hất</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('tilt-turn')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Tilt & Turn</div>
                            <div class="text-xs text-gray-500">Hất và quay</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('tilt-slide')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Tilt & Slide</div>
                            <div class="text-xs text-gray-500">Hất và trượt</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('sliding-2')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Sliding 2</div>
                            <div class="text-xs text-gray-500">Trượt 2 cánh</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('sliding-3')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Sliding 3</div>
                            <div class="text-xs text-gray-500">Trượt 3 cánh</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('sliding-4')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Sliding 4</div>
                            <div class="text-xs text-gray-500">Trượt 4 cánh</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('single-left')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Door Single Left</div>
                            <div class="text-xs text-gray-500">Cửa đi 1 cánh trái</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('single-right')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">Door Single Right</div>
                            <div class="text-xs text-gray-500">Cửa đi 1 cánh phải</div>
                        </button>
                        <button onclick="doorEditorUI.selectPanelType('french')" class="px-4 py-3 border rounded hover:bg-blue-50 text-left">
                            <div class="font-semibold">French Door</div>
                            <div class="text-xs text-gray-500">Cửa Pháp 2 cánh</div>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Close panel type selector
    closePanelTypeSelector() {
        const modal = document.getElementById('panelTypeSelectorModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // Select panel type from modal
    selectPanelType(type) {
        this.applyPanelType(type);
        this.closePanelTypeSelector();
    }
    
    // Handle canvas mouse down - start drag
    onCanvasMouseDown(event) {
        if (!this.currentDoorModel || !this.canvasEngine) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if clicking on a divider (mullion)
        const divider = this.canvasEngine.hitTestDivider(x, y);
        if (divider) {
            this.dragState.isDragging = true;
            this.dragState.dragType = divider.direction; // 'vertical' or 'horizontal'
            this.dragState.startX = x;
            this.dragState.startY = y;
            this.dragState.startPath = divider.parentPath;
            this.canvas.style.cursor = divider.direction === 'vertical' ? 'ew-resize' : 'ns-resize';
            event.preventDefault();
        }
    }
    
    // Handle canvas mouse move - drag divider
    onCanvasMouseMove(event) {
        if (!this.currentDoorModel || !this.canvasEngine) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.dragState.isDragging) {
            // Resize panel by dragging divider
            const deltaX = (x - this.dragState.startX) / this.canvasEngine.scale;
            const deltaY = (y - this.dragState.startY) / this.canvasEngine.scale;
            
            if (this.currentDoorModel instanceof DoorModelTree) {
                const parentPanel = this.currentDoorModel.findPanelByPath(this.dragState.startPath);
                if (parentPanel && parentPanel.isSplitPanel()) {
                    // Adjust ratios based on drag
                    if (this.dragState.dragType === 'vertical') {
                        const totalWidth = parentPanel.width;
                        const ratioDelta = deltaX / totalWidth;
                        
                        // Adjust first child ratio
                        if (parentPanel.children[0] && parentPanel.children[1]) {
                            let newRatio0 = Math.max(0.1, Math.min(0.9, parentPanel.children[0].widthRatio + ratioDelta));
                            // Snap to grid (10mm increments)
                            const snappedWidth0 = this.snapToGrid(newRatio0 * totalWidth);
                            newRatio0 = snappedWidth0 / totalWidth;
                            const newRatio1 = 1.0 - newRatio0;
                            parentPanel.children[0].widthRatio = newRatio0;
                            parentPanel.children[1].widthRatio = newRatio1;
                            
                            // Recalculate dimensions
                            parentPanel.calculateDimensions(parentPanel.width, parentPanel.height, parentPanel.x, parentPanel.y);
                            this.redraw();
                        }
                    } else if (this.dragState.dragType === 'horizontal') {
                        const totalHeight = parentPanel.height;
                        const ratioDelta = deltaY / totalHeight;
                        
                        if (parentPanel.children[0] && parentPanel.children[1]) {
                            let newRatio0 = Math.max(0.1, Math.min(0.9, parentPanel.children[0].heightRatio + ratioDelta));
                            // Snap to grid (10mm increments)
                            const snappedHeight0 = this.snapToGrid(newRatio0 * totalHeight);
                            newRatio0 = snappedHeight0 / totalHeight;
                            const newRatio1 = 1.0 - newRatio0;
                            parentPanel.children[0].heightRatio = newRatio0;
                            parentPanel.children[1].heightRatio = newRatio1;
                            
                            parentPanel.calculateDimensions(parentPanel.width, parentPanel.height, parentPanel.x, parentPanel.y);
                            this.redraw();
                        }
                    }
                    
                    this.dragState.startX = x;
                    this.dragState.startY = y;
                }
            }
        } else {
            // Check if hovering over divider
            const divider = this.canvasEngine.hitTestDivider(x, y);
            if (divider) {
                this.canvas.style.cursor = divider.direction === 'vertical' ? 'ew-resize' : 'ns-resize';
            } else {
                this.canvas.style.cursor = 'pointer';
            }
        }
    }
    
    // Handle canvas mouse up - end drag
    onCanvasMouseUp(event) {
        if (this.dragState.isDragging) {
            this.dragState.isDragging = false;
            this.dragState.dragType = null;
            this.canvas.style.cursor = 'pointer';
        }
    }
    
    // ========== DRAG & DROP FROM SIDEBAR ==========
    
    // Drag start from Items List
    onItemDragStart(event, doorId) {
        const door = this.projectDoors.find(d => d.id === doorId);
        if (!door) return;
        
        // Store door data in drag data
        event.dataTransfer.setData('application/json', JSON.stringify({
            type: 'door-item',
            doorId: doorId,
            width: door.width_mm || 1800,
            height: door.height_mm || 2200,
            code: door.code || 'D1'
        }));
        event.dataTransfer.effectAllowed = 'copy';
        
        // Create ghost image
        const dragImage = event.target.cloneNode(true);
        dragImage.style.opacity = '0.5';
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        event.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => document.body.removeChild(dragImage), 0);
    }
    
    // Drag end from Items List
    onItemDragEnd(event) {
        // Cleanup if needed
    }
    
    // Drag over canvas
    onCanvasDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        
        // Show drop indicator
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Visual feedback (optional: draw drop indicator)
        this.canvas.style.cursor = 'copy';
    }
    
    // Drop on canvas - create new door from template
    async onCanvasDrop(event) {
        event.preventDefault();
        this.canvas.style.cursor = 'pointer';
        
        try {
            const data = JSON.parse(event.dataTransfer.getData('application/json'));
            
            if (data.type === 'door-item') {
                // Load door from project
                await this.loadDoorById(data.doorId);
                
                // Get drop position (optional: position new door at drop location)
                const rect = this.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                // For now, just load the door
                // In future, could create a new door instance at drop position
                this.redraw();
            }
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    }
    
    // ========== CONTEXT MENU ==========
    
    // Handle canvas context menu (right click)
    onCanvasContextMenu(event) {
        event.preventDefault();
        
        if (!this.currentDoorModel || !this.canvasEngine) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const hit = this.canvasEngine.hitTest(x, y);
        if (hit && hit.type === 'panel') {
            this.selectedPanelPath = hit.path;
            this.selectedPanel = this.getSelectedPanel();
            this.showContextMenu(event.clientX, event.clientY);
        } else {
            this.hideContextMenu();
        }
    }
    
    // Show context menu
    showContextMenu(x, y) {
        let menu = document.getElementById('panelContextMenu');
        if (!menu) {
            this.createContextMenu();
            menu = document.getElementById('panelContextMenu');
        }
        
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.remove('hidden');
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
        }, 0);
    }
    
    // Hide context menu
    hideContextMenu() {
        const menu = document.getElementById('panelContextMenu');
        if (menu) {
            menu.classList.add('hidden');
        }
    }
    
    // Create context menu HTML
    createContextMenu() {
        const menuHTML = `
            <div id="panelContextMenu" class="hidden fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[180px]">
                <button onclick="doorEditorUI.contextMenuAction('split-vertical')" class="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m0 0l-4-4m4 4l4-4M4 12h16" />
                    </svg>
                    Chia dọc
                </button>
                <button onclick="doorEditorUI.contextMenuAction('split-horizontal')" class="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-8-8v16m0 0l-4-4m4 4l4-4" />
                    </svg>
                    Chia ngang
                </button>
                <button onclick="doorEditorUI.contextMenuAction('merge')" class="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Gộp panel
                </button>
                <div class="border-t my-1"></div>
                <button onclick="doorEditorUI.contextMenuAction('change-type')" class="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Đổi loại panel
                </button>
                <button onclick="doorEditorUI.contextMenuAction('flip-direction')" class="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Xoay hướng mở
                </button>
                <div class="border-t my-1"></div>
                <button onclick="doorEditorUI.contextMenuAction('set-door')" class="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Set làm cửa đi
                </button>
                <button onclick="doorEditorUI.contextMenuAction('set-window')" class="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    Set làm cửa sổ
                </button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', menuHTML);
    }
    
    // Handle context menu action
    contextMenuAction(action) {
        this.hideContextMenu();
        
        if (!this.selectedPanelPath) return;
        
        switch (action) {
            case 'split-vertical':
                this.splitPanelVertical(null, 2, true);
                break;
            case 'split-horizontal':
                this.splitPanelHorizontal(null, 2, true);
                break;
            case 'merge':
                if (this.currentDoorModel instanceof DoorModelTree) {
                    try {
                        this.currentDoorModel.mergePanels(this.selectedPanelPath);
                        this.redraw();
                    } catch (error) {
                        alert('Không thể gộp panel: ' + error.message);
                    }
                }
                break;
            case 'change-type':
                this.openPanelTypeSelector();
                break;
            case 'flip-direction':
                this.flipPanelDirection();
                break;
            case 'set-door':
                this.applyPanelType('single-left');
                break;
            case 'set-window':
                this.applyPanelType('turn-left');
                break;
        }
    }
    
    // Flip panel opening direction
    flipPanelDirection() {
        const panel = this.getSelectedPanel();
        if (!panel) return;
        
        const currentType = panel.openType || panel.type || 'fixed';
        let newType = currentType;
        
        if (currentType === 'turn-left') newType = 'turn-right';
        else if (currentType === 'turn-right') newType = 'turn-left';
        else if (currentType === 'single-left') newType = 'single-right';
        else if (currentType === 'single-right') newType = 'single-left';
        
        if (newType !== currentType) {
            this.applyPanelType(newType);
        }
    }
    
    // ========== SNAP GRID ==========
    
    // Snap value to grid
    snapToGrid(value, gridSize = 10) {
        return Math.round(value / gridSize) * gridSize;
    }
    
    // Snap panel dimensions to grid
    snapPanelToGrid(panel) {
        if (panel.width) panel.width = this.snapToGrid(panel.width);
        if (panel.height) panel.height = this.snapToGrid(panel.height);
        if (panel.x) panel.x = this.snapToGrid(panel.x);
        if (panel.y) panel.y = this.snapToGrid(panel.y);
    }

    // Get selected panel from path
    getSelectedPanel() {
        if (!this.currentDoorModel || !this.selectedPanelPath) return null;
        
        // Use DoorModelTree if available
        if (this.currentDoorModel instanceof DoorModelTree) {
            return this.currentDoorModel.findPanelByPath(this.selectedPanelPath);
        }
        
        // If panels is flat array
        if (this.currentDoorModel.panels && Array.isArray(this.currentDoorModel.panels)) {
            const index = this.selectedPanelPath[0];
            return this.currentDoorModel.panels[index] || null;
        }
        
        // If panels is tree structure (old format)
        if (this.currentDoorModel.rootPanel) {
            let panel = this.currentDoorModel.rootPanel;
            for (const idx of this.selectedPanelPath) {
                if (!panel.children || !panel.children[idx]) return null;
                panel = panel.children[idx];
            }
            return panel;
        }
        
        return null;
    }

    // Update panel info in Properties Panel (right sidebar)
    updatePanelInfo() {
        const panelProps = document.getElementById('panelProperties');
        const doorProps = document.getElementById('doorProperties');
        
        if (!this.selectedPanel) {
            if (panelProps) panelProps.classList.add('hidden');
            if (doorProps) doorProps.classList.remove('hidden');
            return;
        }
        
        // Show panel properties, hide door properties
        if (panelProps) panelProps.classList.remove('hidden');
        if (doorProps) doorProps.classList.add('hidden');
        
        const panel = this.selectedPanel;
        
        // Update panel ID
        const propPanelId = document.getElementById('propPanelId');
        if (propPanelId) propPanelId.textContent = panel.id || 'N/A';
        
        // Update panel type
        const propPanelType = document.getElementById('propPanelType');
        if (propPanelType) {
            let typeText = panel.type || panel.openType || 'fixed';
            if (typeText.includes('window-')) typeText = typeText.replace('window-', '');
            if (typeText.includes('door-')) typeText = typeText.replace('door-', '');
            propPanelType.textContent = typeText;
        }
        
        // Update dimensions
        const propWidth = document.getElementById('propWidth');
        const propHeight = document.getElementById('propHeight');
        if (propWidth) propWidth.value = Math.round(panel.width || 0);
        if (propHeight) propHeight.value = Math.round(panel.height || 0);
        
        // Update opening type
        const propOpeningType = document.getElementById('propOpeningType');
        if (propOpeningType) {
            let openType = panel.openType || panel.type || 'fixed';
            if (openType.includes('window-')) openType = openType.replace('window-', '');
            if (openType.includes('door-')) {
                const doorType = openType.replace('door-', '');
                if (doorType === 'single-left') openType = 'single-left';
                else if (doorType === 'single-right') openType = 'single-right';
                else if (doorType === 'french') openType = 'french';
            }
            propOpeningType.value = openType;
        }
        
        // Update glass color
        const propGlassColor = document.getElementById('propGlassColor');
        if (propGlassColor) propGlassColor.value = panel.glassColor || '#87CEEB';
        
        // Update glass type
        const propGlassType = document.getElementById('propGlassType');
        if (propGlassType) propGlassType.value = panel.glassType || '8ly';
        
        // Update hardware
        const propHinges = document.getElementById('propHinges');
        const propHandle = document.getElementById('propHandle');
        const propLock = document.getElementById('propLock');
        if (propHinges) propHinges.value = (panel.hardware && panel.hardware.hinges) || 0;
        if (propHandle) propHandle.checked = (panel.hardware && panel.hardware.handle) || false;
        if (propLock) propLock.checked = (panel.hardware && panel.hardware.lock) || false;
    }
    
    // Update panel property from Properties Panel
    updatePanelProperty(property, value) {
        if (!this.selectedPanel) return;
        
        const panel = this.selectedPanel;
        
        switch (property) {
            case 'width':
                panel.width = parseFloat(value);
                if (this.currentDoorModel && this.currentDoorModel instanceof DoorModelTree) {
                    this.currentDoorModel.updateDimensions(this.currentDoorModel.width, this.currentDoorModel.height);
                }
                break;
            case 'height':
                panel.height = parseFloat(value);
                if (this.currentDoorModel && this.currentDoorModel instanceof DoorModelTree) {
                    this.currentDoorModel.updateDimensions(this.currentDoorModel.width, this.currentDoorModel.height);
                }
                break;
            case 'type':
                this.applyPanelType(value);
                return; // applyPanelType will redraw
            case 'aluminumSystem':
                if (this.canvasEngine && this.canvasEngine.setAluminumSystem) {
                    this.canvasEngine.setAluminumSystem(value);
                }
                break;
            case 'glassColor':
                panel.glassColor = value;
                break;
            case 'glassType':
                panel.glassType = value;
                break;
            case 'hinges':
                if (!panel.hardware) panel.hardware = {};
                panel.hardware.hinges = parseInt(value);
                break;
            case 'handle':
                if (!panel.hardware) panel.hardware = {};
                panel.hardware.handle = value;
                break;
            case 'lock':
                if (!panel.hardware) panel.hardware = {};
                panel.hardware.lock = value;
                break;
            case 'openingAngle':
                panel.openingAngle = parseFloat(value);
                const angleValue = document.getElementById('propOpeningAngleValue');
                if (angleValue) angleValue.textContent = value + '°';
                break;
        }
        
        this.redraw();
    }

    initElements() {
        // Template selector
        this.selTemplate = document.getElementById("selTemplate");
        this.inputWidth = document.getElementById("inputWidth");
        this.inputHeight = document.getElementById("inputHeight");
        this.inputZoom = document.getElementById("inputZoom");
        this.selSystem = document.getElementById("selSystem") || document.getElementById("selectAluminumSystem");
        
        // Buttons
        this.btnNewDoor = document.getElementById("btnNewDoor");
        this.btnSplitVert = document.getElementById("btnSplitVert");
        this.btnSplitHorz = document.getElementById("btnSplitHorz");
        this.btnFlipH = document.getElementById("btnFlipH");
        this.btnFlipV = document.getElementById("btnFlipV");
        this.btnColor = document.getElementById("btnColor");
        this.btnBom = document.getElementById("btnBom");
        this.btnCenter = document.getElementById("btnCenter");
        this.btnExportImg = document.getElementById("btnExportImg");
        this.btnSave = document.getElementById("btnSave");
        
        // Items List sidebar
        this.itemsListContainer = document.getElementById("itemsListContainer");
    }

    initEvents() {
        // Template change
        if (this.selTemplate) {
            this.selTemplate.addEventListener("change", () => {
                const templateId = this.selTemplate.value;
                if (TEMPLATES[templateId]) {
                    this.currentDoor = TEMPLATES[templateId];
                    this.redraw();
                }
            });
        }

        // Size change
        [this.inputWidth, this.inputHeight, this.inputZoom].forEach(el => {
            if (el) {
                el.addEventListener("input", () => this.redraw());
            }
        });

        // System change
        if (this.selSystem) {
            this.selSystem.addEventListener("change", () => {
                this.currentSystem = this.selSystem.value;
                this.redraw(); // Redraw with new system
            });
        }

        // Buttons
        if (this.btnBom) {
            this.btnBom.addEventListener("click", () => this.calculateBOM());
        }
        if (this.btnCenter) {
            this.btnCenter.addEventListener("click", () => this.redraw());
        }
        if (this.btnExportImg) {
            this.btnExportImg.addEventListener("click", () => this.exportImage());
        }
        if (this.btnSave) {
            this.btnSave.addEventListener("click", () => this.saveDrawing());
        }
        if (this.btnFlipH) {
            this.btnFlipH.addEventListener("click", () => this.flipHorizontal());
        }
        if (this.btnFlipV) {
            this.btnFlipV.addEventListener("click", () => this.flipVertical());
        }
    }

    // Load project ID from URL parameters
    loadProjectFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');
        const doorId = urlParams.get('doorId');
        
        if (projectId) {
            this.currentProjectId = parseInt(projectId);
            this.loadProjectDoors().then(() => {
                if (doorId) {
                    this.loadDoorById(parseInt(doorId));
                } else if (this.projectDoors.length > 0) {
                    // Load first door if no specific door ID
                    this.loadDoorById(this.projectDoors[0].id);
                } else {
                    this.loadDefaultTemplate();
                }
            });
        } else {
            this.loadDefaultTemplate();
        }
        
        // Load templates and aluminum systems
        this.loadTemplates();
        this.loadAluminumSystems();
    }

    // Load all doors from current project (for Items List)
    async loadProjectDoors() {
        if (!this.currentProjectId) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const result = await response.json();
            
            if (result.success) {
                this.projectDoors = result.data || [];
                this.renderItemsList();
            }
        } catch (error) {
            console.error('Error loading project doors:', error);
        }
    }

    // Render Items List sidebar với preview
    renderItemsList() {
        if (!this.itemsListContainer) {
            // Try to find or create items list container
            let container = document.getElementById("itemsList");
            if (!container) {
                // Create items list if it doesn't exist
                const sidebar = document.querySelector('.w-64.bg-gray-100') || 
                               document.querySelector('.w-40.bg-gray-100') ||
                               document.querySelector('[class*="sidebar"]');
                if (sidebar) {
                    container = document.createElement('div');
                    container.id = 'itemsList';
                    container.className = 'mb-4';
                    sidebar.insertBefore(container, sidebar.firstChild);
                } else {
                    return; // No sidebar found
                }
            }
            this.itemsListContainer = container;
        }

        let html = `
            <h2 class="font-bold text-gray-900 mb-2 text-xs border-b pb-2">Items List</h2>
            <div class="space-y-2 max-h-[60vh] overflow-y-auto">
        `;

        if (this.projectDoors.length === 0) {
            html += `
                <div class="text-xs text-gray-500 text-center py-4">
                    Chưa có cửa nào<br/>
                    <button onclick="doorEditorUI.openNewDoorModal('rectangle')" 
                            class="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                        + Tạo mới
                    </button>
                </div>
            `;
        } else {
            // Render door items (preview images will load separately)
            this.projectDoors.forEach((door, index) => {
                const isSelected = this.currentDoorId === door.id;
                const width = door.width_mm || 0;
                const height = door.height_mm || 0;
                const code = door.design_code || door.template_code || `D${index + 1}`;
                const qty = door.qty || 1;
                const previewId = `preview-${door.id}`;
                
                html += `
                    <div class="border rounded-lg p-2 cursor-pointer transition-all ${
                        isSelected ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }" 
                    onclick="doorEditorUI.selectDoor(${door.id})"
                    draggable="true"
                    ondragstart="doorEditorUI.onItemDragStart(event, ${door.id})"
                    ondragend="doorEditorUI.onItemDragEnd(event)">
                        <div class="flex items-start gap-2">
                            <!-- Number Badge -->
                            <div class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                                ${index + 1}
                            </div>
                            
                            <!-- Preview Image -->
                            <div class="flex-shrink-0 w-20 h-20 bg-gray-50 border border-gray-200 rounded overflow-hidden flex items-center justify-center">
                                <img id="${previewId}" 
                                     src="" 
                                     alt="Preview" 
                                     class="w-full h-full object-contain hidden" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                <div class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            
                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between mb-1">
                                    <input type="text" 
                                           value="${code}" 
                                           class="text-xs font-semibold text-gray-800 bg-transparent border-none p-0 flex-1 focus:bg-white focus:border focus:px-1 focus:rounded"
                                           onclick="event.stopPropagation()"
                                           onblur="doorEditorUI.updateDoorCode(${door.id}, this.value)"
                                           onkeypress="if(event.key==='Enter') this.blur()" />
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4 text-gray-400 flex-shrink-0">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <div class="text-xs text-gray-600 mb-0.5">
                                    <input type="number" 
                                           value="${width}" 
                                           class="w-14 text-xs bg-transparent border-none p-0 inline text-right"
                                           onclick="event.stopPropagation()"
                                           onblur="doorEditorUI.updateDoorSize(${door.id}, 'width', this.value)"
                                           onkeypress="if(event.key==='Enter') this.blur()" /> × 
                                    <input type="number" 
                                           value="${height}" 
                                           class="w-14 text-xs bg-transparent border-none p-0 inline"
                                           onclick="event.stopPropagation()"
                                           onblur="doorEditorUI.updateDoorSize(${door.id}, 'height', this.value)"
                                           onkeypress="if(event.key==='Enter') this.blur()" />
                                </div>
                                <div class="text-xs text-gray-500 mb-1">
                                    <input type="number" 
                                           value="${qty}" 
                                           min="1"
                                           class="w-8 text-xs bg-transparent border-none p-0 inline text-right"
                                           onclick="event.stopPropagation()"
                                           onblur="doorEditorUI.updateDoorQty(${door.id}, this.value)"
                                           onkeypress="if(event.key==='Enter') this.blur()" /> pcs
                                </div>
                                <div class="mt-1 flex gap-1">
                                    <button onclick="event.stopPropagation(); doorEditorUI.editDoor(${door.id})" 
                                            class="flex-1 px-1.5 py-0.5 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600">
                                        Sửa
                                    </button>
                                    <button onclick="event.stopPropagation(); doorEditorUI.deleteDoor(${door.id})" 
                                            class="flex-1 px-1.5 py-0.5 bg-red-500 text-white rounded text-[10px] hover:bg-red-600">
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Load preview images after rendering
            this.loadPreviewImages();
            
            html += `
                <button onclick="doorEditorUI.openNewDoorModal('rectangle')" 
                        class="w-full mt-2 px-2 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600 flex items-center justify-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm cửa mới
                </button>
            `;
        }

        html += `</div>`;
        this.itemsListContainer.innerHTML = html;
    }

    // Update door code (inline edit)
    async updateDoorCode(doorId, newCode) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors/${doorId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ design_code: newCode })
            });
            const result = await response.json();
            if (result.success) {
                await this.loadProjectDoors();
            }
        } catch (error) {
            console.error('Error updating door code:', error);
        }
    }

    // Update door size (inline edit)
    async updateDoorSize(doorId, dimension, value) {
        const updateData = {};
        updateData[dimension === 'width' ? 'width_mm' : 'height_mm'] = parseInt(value);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors/${doorId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(updateData)
            });
            const result = await response.json();
            if (result.success) {
                await this.loadProjectDoors();
                // If this is current door, update canvas
                if (this.currentDoorId === doorId) {
                    if (this.inputWidth && dimension === 'width') this.inputWidth.value = value;
                    if (this.inputHeight && dimension === 'height') this.inputHeight.value = value;
                    this.redraw();
                }
            }
        } catch (error) {
            console.error('Error updating door size:', error);
        }
    }

    // Update door quantity (inline edit)
    async updateDoorQty(doorId, qty) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors/${doorId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ qty: parseInt(qty) })
            });
            const result = await response.json();
            if (result.success) {
                await this.loadProjectDoors();
            }
        } catch (error) {
            console.error('Error updating door qty:', error);
        }
    }

    // Load preview images for all doors
    async loadPreviewImages() {
        for (const door of this.projectDoors) {
            if (door.door_drawing_id) {
                try {
                    const drawResponse = await fetch(`${this.API_BASE}/door-drawings/${door.door_drawing_id}`);
                    const drawResult = await drawResponse.json();
                    if (drawResult.success && drawResult.data?.image_data) {
                        const img = document.getElementById(`preview-${door.id}`);
                        if (img) {
                            img.src = drawResult.data.image_data;
                            img.classList.remove('hidden');
                            img.nextElementSibling.style.display = 'none';
                        }
                    }
                } catch (e) {
                    // Preview not available, keep default
                }
            }
        }
    }

    // Open modal to create new door (Rec/Non-Rec/Import)
    openNewDoorModal(type = 'rectangle') {
        // type: 'rectangle', 'non-rectangle', 'import'
        this.newDoorType = type;
        let modal = document.getElementById('newDoorModal');
        if (!modal) {
            // Create modal if doesn't exist
            this.createNewDoorModal();
            modal = document.getElementById('newDoorModal');
        }
        if (modal) {
            modal.classList.remove('hidden');
            this.initNewDoorModal(type);
        }
    }

    // Create new door modal
    createNewDoorModal() {
        const modalHTML = `
            <div id="newDoorModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl p-6 w-full max-w-md">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold" id="newDoorModalTitle">Tạo cửa mới</h2>
                        <button onclick="doorEditorUI.closeNewDoorModal()" class="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div id="newDoorModalContent">
                        <!-- Content will be filled by initNewDoorModal -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Initialize new door modal content
    initNewDoorModal(type) {
        const content = document.getElementById('newDoorModalContent');
        const title = document.getElementById('newDoorModalTitle');
        
        if (type === 'rectangle' || type === 'non-rectangle') {
            title.textContent = type === 'rectangle' ? 'Tạo cửa hình chữ nhật' : 'Tạo cửa dạng đặc biệt';
            
            const shapeOptions = type === 'non-rectangle' ? `
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Hình dạng</label>
                    <select id="newDoorShape" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="arch">Vòm (Arch)</option>
                        <option value="triangle">Tam giác</option>
                        <option value="trapezoid">Hình thang</option>
                    </select>
                </div>
            ` : '';
            
            content.innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Rộng (B) mm</label>
                        <input type="number" id="newDoorWidth" value="1800" min="300" max="5000" step="10"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Cao (H) mm</label>
                        <input type="number" id="newDoorHeight" value="2200" min="300" max="5000" step="10"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Số lượng</label>
                        <input type="number" id="newDoorQty" value="1" min="1" step="1"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Loại</label>
                        <select id="newDoorType" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="door_out">Cửa đi mở quay ngoài</option>
                            <option value="door_in">Cửa đi mở quay trong</option>
                            <option value="window_swing">Cửa sổ mở quay</option>
                            <option value="window_sliding">Cửa sổ mở trượt</option>
                            <option value="door_sliding">Cửa đi mở trượt</option>
                        </select>
                    </div>
                    ${shapeOptions}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Mã cửa</label>
                        <input type="text" id="newDoorCode" placeholder="D1, D2, ..."
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button onclick="doorEditorUI.closeNewDoorModal()" 
                            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Hủy
                    </button>
                    <button onclick="doorEditorUI.createNewDoorFromModal()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Tạo
                    </button>
                </div>
            `;
        } else if (type === 'import') {
            title.textContent = 'Import cửa';
            content.innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nguồn</label>
                        <select id="importSource" class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                onchange="doorEditorUI.onImportSourceChange(this.value)">
                            <option value="template">Từ template hệ thống</option>
                            <option value="project">Từ cửa trong dự án</option>
                        </select>
                    </div>
                    <div id="importTemplateSection">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Chọn template</label>
                        <select id="importTemplateId" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">-- Đang tải --</option>
                        </select>
                    </div>
                    <div id="importProjectSection" class="hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Chọn cửa</label>
                        <select id="importDoorId" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">-- Đang tải --</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Kích thước mới (tùy chọn)</label>
                        <div class="flex gap-2">
                            <input type="number" id="importWidth" placeholder="Rộng" min="300" max="5000"
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-lg">
                            <input type="number" id="importHeight" placeholder="Cao" min="300" max="5000"
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Để trống để giữ nguyên kích thước gốc</p>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button onclick="doorEditorUI.closeNewDoorModal()" 
                            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Hủy
                    </button>
                    <button onclick="doorEditorUI.importDoorFromModal()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Import
                    </button>
                </div>
            `;
            this.loadImportOptions();
        }
    }

    // Close new door modal
    closeNewDoorModal() {
        const modal = document.getElementById('newDoorModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Handle import source change
    onImportSourceChange(source) {
        const templateSection = document.getElementById('importTemplateSection');
        const projectSection = document.getElementById('importProjectSection');
        
        if (source === 'template') {
            templateSection.classList.remove('hidden');
            projectSection.classList.add('hidden');
        } else {
            templateSection.classList.add('hidden');
            projectSection.classList.remove('hidden');
        }
    }

    // Load import options (templates and project doors)
    async loadImportOptions() {
        // Load templates
        try {
            const response = await fetch(`${this.API_BASE}/door-templates`);
            const result = await response.json();
            if (result.success) {
                const select = document.getElementById('importTemplateId');
                select.innerHTML = '<option value="">-- Chọn template --</option>';
                result.data.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.id;
                    option.textContent = `${template.code} - ${template.name}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }

        // Load project doors
        try {
            const select = document.getElementById('importDoorId');
            select.innerHTML = '<option value="">-- Chọn cửa --</option>';
            this.projectDoors.forEach(door => {
                const option = document.createElement('option');
                option.value = door.id;
                const code = door.design_code || door.template_code || `D${door.id}`;
                option.textContent = `${code} - ${door.width_mm}×${door.height_mm}mm`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading project doors:', error);
        }
    }

    // Import door from modal
    async importDoorFromModal() {
        if (!this.currentProjectId) {
            alert('Vui lòng chọn dự án trước!');
            return;
        }

        const source = document.getElementById('importSource').value;
        const newWidth = document.getElementById('importWidth').value;
        const newHeight = document.getElementById('importHeight').value;
        const code = `D${this.projectDoors.length + 1}`;

        try {
            let doorModel = null;
            let width = null;
            let height = null;

            if (source === 'template') {
                const templateId = document.getElementById('importTemplateId').value;
                if (!templateId) {
                    alert('Vui lòng chọn template!');
                    return;
                }

                // Load template
                const response = await fetch(`${this.API_BASE}/door-templates/${templateId}`);
                const result = await response.json();
                if (result.success) {
                    const template = result.data;
                    width = newWidth ? parseInt(newWidth) : (template.default_width || 1800);
                    height = newHeight ? parseInt(newHeight) : (template.default_height || 2200);
                    
                    // Build door model from template
                    if (template.param_schema) {
                        const schema = typeof template.param_schema === 'string' 
                            ? JSON.parse(template.param_schema) 
                            : template.param_schema;
                        doorModel = this.buildDoorModelFromTemplate(template, width, height);
                    }
                }
            } else {
                // Import from project door
                const doorId = document.getElementById('importDoorId').value;
                if (!doorId) {
                    alert('Vui lòng chọn cửa!');
                    return;
                }

                // Load door
                const response = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors/${doorId}`);
                const result = await response.json();
                if (result.success) {
                    const door = result.data;
                    width = newWidth ? parseInt(newWidth) : door.width_mm;
                    height = newHeight ? parseInt(newHeight) : door.height_mm;
                    
                    // Get params_json
                    if (door.params_json) {
                        doorModel = typeof door.params_json === 'string' 
                            ? JSON.parse(door.params_json) 
                            : door.params_json;
                        
                        // Scale if dimensions changed
                        if (newWidth || newHeight) {
                            const widthRatio = width / door.width_mm;
                            const heightRatio = height / door.height_mm;
                            doorModel = this.scaleDoorModel(doorModel, widthRatio, heightRatio);
                        }
                    }
                }
            }

            if (!doorModel) {
                alert('Không thể load dữ liệu cửa!');
                return;
            }

            // Create new door
            const token = localStorage.getItem('token');
            const createResponse = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    design_code: code,
                    template_code: source === 'template' ? document.getElementById('importTemplateId').selectedOptions[0].text.split(' - ')[0] : code,
                    door_type: doorModel.type === 'door_out' || doorModel.type === 'door_in' ? 'swing' : 'swing',
                    width_mm: width,
                    height_mm: height,
                    qty: 1,
                    params_json: doorModel
                })
            });

            const createResult = await createResponse.json();
            if (createResult.success) {
                this.closeNewDoorModal();
                await this.loadProjectDoors();
                await this.loadDoorById(createResult.data.id);
                alert('Import cửa thành công!');
            } else {
                alert('Lỗi: ' + (createResult.message || 'Không thể import cửa'));
            }
        } catch (error) {
            console.error('Error importing door:', error);
            alert('Lỗi khi import cửa: ' + error.message);
        }
    }

    // Build door model from template
    buildDoorModelFromTemplate(template, width, height) {
        // This is a simplified version - you may need to adjust based on your template structure
        const model = {
            width: width,
            height: height,
            type: template.family || 'door_open',
            templateId: template.id,
            panels: [],
            bars: [],
            frame: { vertical: 2, horizontal: 2 }
        };

        // If template has panels structure, parse it
        // This depends on your template format
        if (template.param_schema && typeof template.param_schema === 'object') {
            // Parse template structure
            // You may need to adjust this based on actual template format
        } else {
            // Default: single panel
            model.panels = [{
                id: 'K1',
                type: 'leaf',
                width: width,
                height: height,
                x: 0,
                y: 0,
                openType: 'fixed',
                glass: '8ly'
            }];
        }

        return model;
    }

    // Scale door model
    scaleDoorModel(model, widthRatio, heightRatio) {
        const scaled = JSON.parse(JSON.stringify(model)); // Deep clone
        scaled.width = Math.round(model.width * widthRatio);
        scaled.height = Math.round(model.height * heightRatio);
        
        if (scaled.panels) {
            scaled.panels.forEach(panel => {
                panel.width = Math.round(panel.width * widthRatio);
                panel.height = Math.round(panel.height * heightRatio);
                panel.x = Math.round(panel.x * widthRatio);
                panel.y = Math.round(panel.y * heightRatio);
            });
        }
        
        if (scaled.bars) {
            scaled.bars.forEach(bar => {
                if (bar.type === 'vertical') {
                    bar.x = Math.round(bar.x * widthRatio);
                    bar.length = Math.round(bar.length * heightRatio);
                } else {
                    bar.y = Math.round(bar.y * heightRatio);
                    bar.length = Math.round(bar.length * widthRatio);
                }
            });
        }
        
        return scaled;
    }

    // Create new door from modal
    async createNewDoorFromModal() {
        if (!this.currentProjectId) {
            alert('Vui lòng chọn dự án trước!');
            return;
        }

        const width = parseInt(document.getElementById('newDoorWidth').value);
        const height = parseInt(document.getElementById('newDoorHeight').value);
        const qty = parseInt(document.getElementById('newDoorQty').value);
        const doorType = document.getElementById('newDoorType').value;
        const code = document.getElementById('newDoorCode').value || `D${this.projectDoors.length + 1}`;
        const shape = this.newDoorType === 'non-rectangle' ? document.getElementById('newDoorShape').value : null;

        // Validate
        if (width < 300 || width > 5000 || height < 300 || height > 5000) {
            alert('Kích thước phải từ 300 đến 5000mm!');
            return;
        }

        try {
            // Create door model
            const doorModel = {
                width: width,
                height: height,
                type: doorType,
                shape: shape,
                panels: [{
                    id: 'K1',
                    type: 'leaf',
                    width: width,
                    height: height,
                    x: 0,
                    y: 0,
                    openType: 'fixed', // Default, user can change later
                    glass: '8ly'
                }],
                bars: [],
                frame: { vertical: 2, horizontal: 2 }
            };

            // Create door in backend
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    design_code: code,
                    template_code: code,
                    door_type: doorType === 'door_out' || doorType === 'door_in' ? 'swing' : 
                              doorType === 'window_sliding' || doorType === 'door_sliding' ? 'sliding' : 'swing',
                    width_mm: width,
                    height_mm: height,
                    qty: qty,
                    params_json: doorModel
                })
            });

            const result = await response.json();
            if (result.success) {
                this.closeNewDoorModal();
                await this.loadProjectDoors();
                // Load the new door
                await this.loadDoorById(result.data.id);
                // Ensure model is ready
                this.ensureDoorModel();
                this.redraw();
                alert('Tạo cửa thành công!');
            } else {
                alert('Lỗi: ' + (result.message || 'Không thể tạo cửa'));
            }
        } catch (error) {
            console.error('Error creating door:', error);
            alert('Lỗi khi tạo cửa: ' + error.message);
        }
    }

    // Select a door from Items List
    async selectDoor(doorId) {
        await this.loadDoorById(doorId);
        this.renderItemsList(); // Refresh to show selected state
    }

    // Load door by ID from backend
    async loadDoorById(doorId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors/${doorId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const result = await response.json();
            
            if (result.success && result.data) {
                this.currentDoorId = doorId;
                this.currentDoorData = result.data;
                this.currentDoorDrawingId = result.data.door_drawing_id || null; // Store for BOM access
                
                // Load drawing if exists
                if (result.data.door_drawing_id) {
                    await this.loadDrawing(result.data.door_drawing_id);
                } else {
                    // Load from template
                    await this.loadDoorFromTemplate(result.data);
                }
                
                // Ensure DoorModel exists
                this.ensureDoorModel();
                
                // Update UI
                if (this.inputWidth) this.inputWidth.value = result.data.width_mm || 1800;
                if (this.inputHeight) this.inputHeight.value = result.data.height_mm || 2200;
                if (this.selSystem) this.selSystem.value = result.data.aluminum_system_id || '';
                
                // Reset selection
                this.selectedPanelPath = null;
                this.selectedPanel = null;
                
                this.redraw();
            }
        } catch (error) {
            console.error('Error loading door:', error);
            alert('Không thể tải cửa: ' + error.message);
        }
    }

    // Load drawing data
    async loadDrawing(drawingId) {
        try {
            const response = await fetch(`${this.API_BASE}/door-drawings/${drawingId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const drawing = result.data;
                
                // Load params_json as DoorModel
                if (drawing.params_json) {
                    const params = typeof drawing.params_json === 'string' 
                        ? JSON.parse(drawing.params_json) 
                        : drawing.params_json;
                    
                    // If params has panels array, use as DoorModel
                    if (params.panels && Array.isArray(params.panels)) {
                        this.currentDoorModel = params;
                    } else if (params.template) {
                        this.currentDoor = params.template;
                    }
                }
                
                // Also load drawing_data for template
                if (drawing.drawing_data) {
                    const data = typeof drawing.drawing_data === 'string' 
                        ? JSON.parse(drawing.drawing_data) 
                        : drawing.drawing_data;
                    
                    if (data.template) {
                        this.currentDoor = data.template;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading drawing:', error);
        }
    }

    // Load door from template
    async loadDoorFromTemplate(doorData) {
        if (!doorData.template_id && !doorData.template_code) {
            // Use default template
            this.loadDefaultTemplate();
            return;
        }
        
        // Try to find template in loaded templates
        let template = this.templates.find(t => 
            t.id === doorData.template_id || t.code === doorData.template_code
        );
        
        if (!template && TEMPLATES) {
            // Try local templates
            const templateCode = doorData.template_code || doorData.design_code;
            if (TEMPLATES[templateCode]) {
                this.currentDoor = TEMPLATES[templateCode];
                return;
            }
        }
        
        // Load default if not found
        this.loadDefaultTemplate();
    }

    // Load templates from backend
    async loadTemplates() {
        try {
            const response = await fetch(`${this.API_BASE}/door-templates`);
            const result = await response.json();
            
            if (result.success) {
                this.templates = result.data || [];
                this.renderTemplateLibrary();
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    // Load aluminum systems from backend
    async loadAluminumSystems() {
        try {
            const response = await fetch(`${this.API_BASE}/aluminum-systems`);
            const result = await response.json();
            
            if (result.success) {
                this.aluminumSystems = result.data || [];
                
                // Populate select dropdown
                if (this.selSystem) {
                    this.selSystem.innerHTML = '<option value="">-- Chọn hệ nhôm --</option>';
                    this.aluminumSystems.forEach(system => {
                        const option = document.createElement('option');
                        option.value = system.id;
                        option.textContent = `${system.name} (${system.brand})`;
                        this.selSystem.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading aluminum systems:', error);
        }
    }

    // Create new door
    async createNewDoor() {
        if (!this.currentProjectId) {
            alert('Vui lòng chọn dự án trước!');
            return;
        }
        
        // Open template selection modal or use default
        const defaultTemplate = TEMPLATES && TEMPLATES["D2_OS"] ? TEMPLATES["D2_OS"] : null;
        if (defaultTemplate) {
            this.currentDoor = defaultTemplate;
            this.currentDoorId = null;
            this.currentDoorData = null;
            
            // Reset dimensions
            if (this.inputWidth) this.inputWidth.value = 1800;
            if (this.inputHeight) this.inputHeight.value = 2200;
            
            this.redraw();
        } else {
            alert('Vui lòng chọn template từ danh sách!');
        }
    }

    // Edit door (same as select)
    async editDoor(doorId) {
        await this.selectDoor(doorId);
    }

    // Delete door
    async deleteDoor(doorId) {
        if (!confirm('Bạn có chắc muốn xóa cửa này?')) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors/${doorId}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const result = await response.json();
            
            if (result.success) {
                // Reload items list
                await this.loadProjectDoors();
                
                // Clear current door if deleted
                if (this.currentDoorId === doorId) {
                    this.currentDoor = null;
                    this.currentDoorId = null;
                    this.currentDoorData = null;
                    this.redraw();
                }
            } else {
                alert('Lỗi: ' + (result.message || 'Không thể xóa cửa'));
            }
        } catch (error) {
            console.error('Error deleting door:', error);
            alert('Lỗi khi xóa cửa: ' + error.message);
        }
    }

    loadDefaultTemplate() {
        if (this.selTemplate && this.selTemplate.value) {
            const templateId = this.selTemplate.value;
            if (TEMPLATES && TEMPLATES[templateId]) {
                this.currentDoor = TEMPLATES[templateId];
                this.redraw();
            }
        } else if (TEMPLATES && TEMPLATES["D2_OS"]) {
            // Default to 2-panel door
            this.currentDoor = TEMPLATES["D2_OS"];
            this.redraw();
        }
    }

    getSize() {
        return {
            w: parseInt(this.inputWidth?.value || "1800", 10),
            h: parseInt(this.inputHeight?.value || "2200", 10),
            zoom: parseFloat(this.inputZoom?.value || "1")
        };
    }

    redraw() {
        if (!this.canvasEngine) return;
        
        // Ensure DoorModel exists before rendering
        if (!this.currentDoorModel && this.currentDoor) {
            this.ensureDoorModel();
        }
        
        // Set aluminum system for canvas engine
        if (this.canvasEngine.setAluminumSystem) {
            if (this.selSystem && this.selSystem.value) {
                const systemName = this.selSystem.options[this.selSystem.selectedIndex]?.text || this.selSystem.value;
                this.canvasEngine.setAluminumSystem(systemName);
            } else if (this.currentSystem) {
                this.canvasEngine.setAluminumSystem(this.currentSystem);
            }
        }
        
        const { w, h, zoom } = this.getSize();
        
        // Update door model dimensions if changed
        if (this.currentDoorModel && this.currentDoorModel.updateDimensions) {
            this.currentDoorModel.updateDimensions(w, h);
        }
        
        // Check which canvas engine is being used
        if (this.canvasEngine.render) {
            // DoorCanvasEngine - support both old and new format
            const doorToRender = this.currentDoorModel || this.currentDoor;
            if (doorToRender) {
                this.canvasEngine.render(doorToRender, w, h, zoom, this.selectedPanelPath);
            }
        } else if (this.canvasEngine.updateDimensions) {
            // DoorCanvasEngineV2 - update dimensions and redraw
            this.canvasEngine.updateDimensions(w, h);
            if (this.canvasEngine.renderDoor && this.currentDoor) {
                this.canvasEngine.renderDoor(this.currentDoor);
            }
        } else if (window.updateDrawing && typeof window.updateDrawing === 'function') {
            // Use global updateDrawing function if available
            window.updateDrawing();
        }
    }

    calculateBOM() {
        if (!this.currentDoor) {
            alert("Chưa có thiết kế cửa!");
            return;
        }

        const { w, h } = this.getSize();
        const sys = this.sysConfigs[this.currentSystem] || SYSTEM_XINGFA_55;
        const bomEngine = new DoorBomEngine(sys);
        const bom = bomEngine.computeBom(this.currentDoor, w, h);

        this.renderBomTable(bom);

        // Tính tối ưu cắt cho thanh nhôm
        const profileParts = bom
            .filter(it => it.type === "profile" && it.length)
            .map(it => ({ code: it.code, length: it.length, qty: it.qty }));

        if (profileParts.length > 0) {
            const optimizer = new CutOptimizer(6000);
            const bars = optimizer.optimize(profileParts);
            const efficiency = optimizer.calculateEfficiency(bars);
            
            console.log("CUT PLAN", bars);
            console.log("Efficiency:", efficiency.toFixed(2) + "%");
            
            this.renderCutPlan(bars, efficiency);
        }

        // Show modal
        const bomModal = document.getElementById("bomModal");
        if (bomModal) {
            bomModal.style.display = "block";
        }
    }

    renderBomTable(bom) {
        const bomTable = document.getElementById("bomTable");
        if (!bomTable) return;

        let html = `
            <thead>
                <tr>
                    <th>Mã</th>
                    <th>Tên vật tư</th>
                    <th>Kích thước</th>
                    <th>Số lượng</th>
                    <th>Loại</th>
                </tr>
            </thead>
            <tbody>
        `;

        bom.forEach(item => {
            let size = "";
            if (item.length) {
                size = `${item.length}mm`;
            } else if (item.width && item.height) {
                size = `${item.width} × ${item.height}mm`;
            }

            html += `
                <tr>
                    <td>${item.code}</td>
                    <td>${item.name}</td>
                    <td>${size}</td>
                    <td>${item.qty}</td>
                    <td>${item.type}</td>
                </tr>
            `;
        });

        html += "</tbody>";
        bomTable.innerHTML = html;
    }

    renderCutPlan(bars, efficiency) {
        const cutPlanDiv = document.getElementById("cutPlan");
        if (!cutPlanDiv) return;

        let html = `
            <h3>Kế hoạch cắt (Hiệu suất: ${efficiency.toFixed(2)}%)</h3>
            <div class="cut-bars">
        `;

        bars.forEach(bar => {
            html += `
                <div class="cut-bar">
                    <strong>Cây nhôm #${bar.index}</strong> (Sử dụng: ${bar.used}mm, Dư: ${bar.waste}mm)
                    <ul>
            `;
            bar.parts.forEach(part => {
                html += `<li>${part.code}: ${part.length}mm</li>`;
            });
            html += `
                    </ul>
                </div>
            `;
        });

        html += "</div>";
        cutPlanDiv.innerHTML = html;
    }

    exportImage() {
        if (!this.canvas) return;
        
        const dataURL = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `cua-thiet-ke-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    }

    // ============================================
    // PANEL SELECTION & MULLION TOOLS
    // ============================================

    // Select panel by ID (legacy method, use path-based selection instead)
    selectPanel(panelId) {
        if (!this.currentDoorModel || !this.currentDoorModel.panels) return;
        
        const index = this.currentDoorModel.panels.findIndex(p => p.id === panelId);
        if (index >= 0) {
            this.selectedPanelPath = [index];
            this.selectedPanel = this.currentDoorModel.panels[index];
            this.redraw();
            console.log('Selected panel:', this.selectedPanel);
        }
    }

    // Split panel vertically (Mullion - chia dọc)
    splitPanelVertical(panelId = null, count = 2, evenly = true, ratios = null) {
        if (!this.currentDoorModel) {
            this.ensureDoorModel();
        }
        
        if (!this.selectedPanelPath || this.selectedPanelPath.length === 0) {
            alert('Vui lòng chọn panel để chia!');
            return;
        }

        // Use DoorModelTree if available
        if (this.currentDoorModel instanceof DoorModelTree) {
            try {
                this.currentDoorModel.splitPanel(this.selectedPanelPath, 'vertical', count, ratios);
                this.redraw();
                return;
            } catch (error) {
                alert('Lỗi khi chia panel: ' + error.message);
                return;
            }
        }
        
        // Fallback to old method
        let panel = null;
        if (panelId) {
            panel = this.currentDoorModel.panels?.find(p => p.id === panelId);
        } else if (this.selectedPanelPath) {
            panel = this.getSelectedPanel();
        }
        
        if (!panel) {
            alert('Vui lòng chọn panel để chia!');
            return;
        }

        if (evenly) {
            // Chia đều
            const splitWidth = panel.width / count;
            const newPanels = [];
            
            for (let i = 0; i < count; i++) {
                newPanels.push({
                    ...panel,
                    id: panel.id + `_${i + 1}`,
                    x: panel.x + (splitWidth * i),
                    width: splitWidth
                });
            }
            
            // Replace panel with new panels
            const index = this.currentDoorModel.panels.indexOf(panel);
            this.currentDoorModel.panels.splice(index, 1, ...newPanels);
            
            // Add vertical bars (mullions)
            if (!this.currentDoorModel.bars) {
                this.currentDoorModel.bars = [];
            }
            for (let i = 1; i < count; i++) {
                const barX = panel.x + (splitWidth * i);
                this.currentDoorModel.bars.push({
                    type: 'vertical',
                    x: barX,
                    y: panel.y,
                    length: panel.height
                });
            }
        } else if (ratios) {
            // Chia theo tỉ lệ
            const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
            let currentX = panel.x;
            const newPanels = [];
            
            ratios.forEach((ratio, i) => {
                const splitWidth = (panel.width * ratio) / totalRatio;
                newPanels.push({
                    ...panel,
                    id: panel.id + `_${i + 1}`,
                    x: currentX,
                    width: splitWidth
                });
                currentX += splitWidth;
                
                if (i < ratios.length - 1) {
                    if (!this.currentDoorModel.bars) {
                        this.currentDoorModel.bars = [];
                    }
                    this.currentDoorModel.bars.push({
                        type: 'vertical',
                        x: currentX,
                        y: panel.y,
                        length: panel.height
                    });
                }
            });
            
            const index = this.currentDoorModel.panels.indexOf(panel);
            this.currentDoorModel.panels.splice(index, 1, ...newPanels);
        }
        
        this.redraw();
    }

    // Split panel horizontally (Mullion - chia ngang)
    splitPanelHorizontal(panelId = null, count = 2, evenly = true, ratios = null) {
        if (!this.currentDoorModel) {
            this.ensureDoorModel();
        }
        
        if (!this.selectedPanelPath || this.selectedPanelPath.length === 0) {
            alert('Vui lòng chọn panel để chia!');
            return;
        }
        
        // Use DoorModelTree if available
        if (this.currentDoorModel instanceof DoorModelTree) {
            try {
                this.currentDoorModel.splitPanel(this.selectedPanelPath, 'horizontal', count, ratios);
                this.redraw();
                return;
            } catch (error) {
                alert('Lỗi khi chia panel: ' + error.message);
                return;
            }
        }
        
        // Fallback to old method
        let panel = null;
        if (panelId) {
            panel = this.currentDoorModel.panels?.find(p => p.id === panelId);
        } else if (this.selectedPanelPath) {
            panel = this.getSelectedPanel();
        }
        
        if (!panel) {
            alert('Vui lòng chọn panel để chia!');
            return;
        }

        if (evenly) {
            const splitHeight = panel.height / count;
            const newPanels = [];
            
            for (let i = 0; i < count; i++) {
                newPanels.push({
                    ...panel,
                    id: panel.id + `_${i + 1}`,
                    y: panel.y + (splitHeight * i),
                    height: splitHeight
                });
            }
            
            const index = this.currentDoorModel.panels.indexOf(panel);
            this.currentDoorModel.panels.splice(index, 1, ...newPanels);
            
            // Add horizontal bars (mullions)
            if (!this.currentDoorModel.bars) {
                this.currentDoorModel.bars = [];
            }
            for (let i = 1; i < count; i++) {
                const barY = panel.y + (splitHeight * i);
                this.currentDoorModel.bars.push({
                    type: 'horizontal',
                    x: panel.x,
                    y: barY,
                    length: panel.width
                });
            }
        } else if (ratios) {
            const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
            let currentY = panel.y;
            const newPanels = [];
            
            ratios.forEach((ratio, i) => {
                const splitHeight = (panel.height * ratio) / totalRatio;
                newPanels.push({
                    ...panel,
                    id: panel.id + `_${i + 1}`,
                    y: currentY,
                    height: splitHeight
                });
                currentY += splitHeight;
                
                if (i < ratios.length - 1) {
                    if (!this.currentDoorModel.bars) {
                        this.currentDoorModel.bars = [];
                    }
                    this.currentDoorModel.bars.push({
                        type: 'horizontal',
                        x: panel.x,
                        y: currentY,
                        length: panel.width
                    });
                }
            });
            
            const index = this.currentDoorModel.panels.indexOf(panel);
            this.currentDoorModel.panels.splice(index, 1, ...newPanels);
        }
        
        this.redraw();
    }

    // Open split modal
    openSplitModal(direction) {
        // direction: 'vertical' or 'horizontal'
        if (!this.selectedPanelPath || !this.getSelectedPanel()) {
            alert('Vui lòng chọn panel để chia!');
            return;
        }

        const modal = document.getElementById('splitModal');
        if (!modal) {
            this.createSplitModal();
        }

        document.getElementById('splitDirection').value = direction;
        document.getElementById('splitCount').value = 2;
        document.getElementById('splitEvenly').checked = true;
        modal.classList.remove('hidden');
    }

    // Create split modal
    createSplitModal() {
        const modalHTML = `
            <div id="splitModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl p-6 w-full max-w-md">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold">Chia panel</h2>
                        <button onclick="doorEditorUI.closeSplitModal()" class="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <input type="hidden" id="splitDirection" value="vertical">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Số lượng chia</label>
                            <input type="number" id="splitCount" min="2" max="10" value="2" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <div>
                            <label class="flex items-center">
                                <input type="checkbox" id="splitEvenly" checked 
                                       class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                       onchange="doorEditorUI.toggleSplitRatios()">
                                <span class="ml-2 text-sm text-gray-700">Chia đều</span>
                            </label>
                        </div>
                        <div id="splitRatiosSection" class="hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tỉ lệ (ví dụ: 1:1:2)</label>
                            <input type="text" id="splitRatios" placeholder="1,1,2" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <p class="text-xs text-gray-500 mt-1">Nhập các tỉ lệ cách nhau bởi dấu phẩy</p>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="doorEditorUI.closeSplitModal()" 
                                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Hủy
                        </button>
                        <button onclick="doorEditorUI.applySplit()" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Áp dụng
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Toggle split ratios input
    toggleSplitRatios() {
        const evenly = document.getElementById('splitEvenly').checked;
        const ratiosSection = document.getElementById('splitRatiosSection');
        if (evenly) {
            ratiosSection.classList.add('hidden');
        } else {
            ratiosSection.classList.remove('hidden');
        }
    }

    // Apply split
    applySplit() {
        const direction = document.getElementById('splitDirection').value;
        const count = parseInt(document.getElementById('splitCount').value);
        const evenly = document.getElementById('splitEvenly').checked;
        let ratios = null;

        if (!evenly) {
            const ratiosStr = document.getElementById('splitRatios').value;
            ratios = ratiosStr.split(',').map(r => parseFloat(r.trim())).filter(r => !isNaN(r));
            if (ratios.length !== count) {
                alert(`Số lượng tỉ lệ phải bằng ${count}!`);
                return;
            }
        }

        if (direction === 'vertical') {
            this.splitPanelVertical(null, count, evenly, ratios);
        } else {
            this.splitPanelHorizontal(null, count, evenly, ratios);
        }

        this.closeSplitModal();
    }

    // Close split modal
    closeSplitModal() {
        const modal = document.getElementById('splitModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // ============================================
    // WINDOW/DOOR TYPE SELECTION
    // ============================================

    // Apply window/door type to selected panel
    applyPanelType(openType) {
        // openType: 'turn-left', 'turn-right', 'tilt', 'tilt-turn', 'tilt-slide', 
        //           'sliding-2', 'sliding-3', 'sliding-4', 'french', 'single-left', 'single-right', 'fixed'
        
        if (!this.selectedPanelPath || this.selectedPanelPath.length === 0) {
            alert('Vui lòng chọn panel để áp dụng loại cửa!');
            return;
        }

        if (!this.currentDoorModel) {
            this.ensureDoorModel();
        }

        // Use DoorModelTree if available
        if (this.currentDoorModel instanceof DoorModelTree) {
            try {
                // Handle sliding doors
                if (openType.startsWith('sliding-')) {
                    const count = parseInt(openType.split('-')[1]);
                    this.currentDoorModel.applySliding(this.selectedPanelPath, count);
                }
                // Handle door types
                else if (openType === 'french') {
                    this.currentDoorModel.applyDoorType(this.selectedPanelPath, 'french');
                }
                else if (openType === 'single-left') {
                    this.currentDoorModel.applyDoorType(this.selectedPanelPath, 'single-left');
                }
                else if (openType === 'single-right') {
                    this.currentDoorModel.applyDoorType(this.selectedPanelPath, 'single-right');
                }
                // Handle window types
                else if (openType === 'fixed') {
                    this.currentDoorModel.applyWindowType(this.selectedPanelPath, 'fixed');
                }
                else if (['turn-left', 'turn-right', 'tilt', 'tilt-turn', 'tilt-slide'].includes(openType)) {
                    this.currentDoorModel.applyWindowType(this.selectedPanelPath, openType);
                }
                
                this.redraw();
                return;
            } catch (error) {
                alert('Lỗi khi áp dụng loại cửa: ' + error.message);
                return;
            }
        }
        
        // Fallback to old method
        const panel = this.getSelectedPanel();
        if (!panel) {
            alert('Không tìm thấy panel được chọn!');
            return;
        }

        // Update panel openType
        panel.openType = openType;
        
        // If sliding, update other panels in same frame
        if (openType === 'sliding-active' && this.currentDoorModel.panels) {
            // Find other panels in same horizontal row
            const sameRowPanels = this.currentDoorModel.panels.filter(p => 
                p !== panel && 
                Math.abs(p.y - panel.y) < 10
            );
            sameRowPanels.forEach(p => {
                if (p.openType !== 'sliding-active') {
                    p.openType = 'sliding-fixed';
                }
            });
        }
        
        // If french door, find adjacent panel
        if (openType === 'french-master' && this.currentDoorModel.panels) {
            const adjacentPanel = this.currentDoorModel.panels.find(p => 
                p !== panel &&
                Math.abs(p.y - panel.y) < 10 &&
                (Math.abs(p.x - (panel.x + panel.width)) < 10 ||
                 Math.abs((p.x + p.width) - panel.x) < 10)
            );
            if (adjacentPanel) {
                adjacentPanel.openType = 'french-slave';
            }
        }

        this.redraw();
    }

    // Quick split vertical (Ctrl+Click shortcut)
    quickSplitVertical() {
        if (this.selectedPanelPath) {
            this.splitPanelVertical(null, 2, true);
        }
    }

    // Quick split horizontal (Ctrl+Click shortcut)
    quickSplitHorizontal() {
        if (this.selectedPanelPath) {
            this.splitPanelHorizontal(null, 2, true);
        }
    }

    // Ensure DoorModel exists (using Panel Tree)
    ensureDoorModel() {
        if (!this.currentDoorModel) {
        const { w, h } = this.getSize();
            
            // Use DoorModelTree if available, otherwise fallback to old format
            if (typeof DoorModelTree !== 'undefined') {
                this.currentDoorModel = new DoorModelTree(w, h);
                
                // If we have existing door data, try to load it
                if (this.currentDoor && this.currentDoor.params_json) {
                    try {
                        const params = typeof this.currentDoor.params_json === 'string' 
                            ? JSON.parse(this.currentDoor.params_json) 
                            : this.currentDoor.params_json;
                        
                        if (params.rootPanel) {
                            // Load from Panel Tree format
                            this.currentDoorModel.fromJSON(params);
                        }
                    } catch (e) {
                        console.warn('Could not load from params_json, using default:', e);
                    }
                }
            } else {
                // Fallback to old format
                if (this.currentDoor && this.currentDoor.panels) {
                    // Convert template panels to DoorModel format
                    this.currentDoorModel = {
            width: w,
            height: h,
                        type: this.currentDoor.type || 'door_open',
                        panels: this.currentDoor.panels.map((panel, index) => {
                            const widthRatio = panel.width_ratio || panel.widthRatio || 1;
                            const heightRatio = panel.height_ratio || panel.heightRatio || 1;
                            return {
                                id: panel.id || `K${index + 1}`,
                                type: panel.type || 'leaf',
                                width: w * widthRatio,
                                height: h * heightRatio,
                                x: 0, // Will be calculated based on position
                                y: 0,
                                openType: panel.open || panel.openType || panel.openDirection || 'fixed',
                                glass: '8ly',
                                glassColor: panel.glassColor || '#87CEEB'
                            };
                        }),
                    bars: [],
                    frame: { vertical: 2, horizontal: 2 }
                };
                
                // Calculate panel positions
                this.calculatePanelPositions();
            } else if (typeof DoorModel !== 'undefined') {
                this.currentDoorModel = new DoorModel(this.currentDoor, w, h);
            } else {
                // Fallback: create simple model structure with single panel
                this.currentDoorModel = {
                    width: w,
                    height: h,
                    type: 'door_open',
                    panels: [{
                        id: 'K1',
                        type: 'leaf',
                        width: w,
                        height: h,
                        x: 0,
                        y: 0,
                        openType: 'fixed',
                        glass: '8ly',
                        glassColor: '#87CEEB'
                    }],
                    bars: [],
                    frame: { vertical: 2, horizontal: 2 }
                };
            }
            }
        } else {
            // Update dimensions if model exists
            const { w, h } = this.getSize();
            if (this.currentDoorModel.width !== w || this.currentDoorModel.height !== h) {
                const widthRatio = w / this.currentDoorModel.width;
                const heightRatio = h / this.currentDoorModel.height;
                
                this.currentDoorModel.width = w;
                this.currentDoorModel.height = h;
                
                // Scale panels
                if (this.currentDoorModel.panels) {
                    this.currentDoorModel.panels.forEach(panel => {
                        panel.width *= widthRatio;
                        panel.height *= heightRatio;
                        panel.x *= widthRatio;
                        panel.y *= heightRatio;
                    });
                }
            }
        }
    }

    // Calculate panel positions from ratios
    calculatePanelPositions() {
        if (!this.currentDoorModel || !this.currentDoorModel.panels) return;
        
        let currentX = 0;
        let currentY = 0;
        let maxHeightInRow = 0;
        
        this.currentDoorModel.panels.forEach(panel => {
            panel.x = currentX;
            panel.y = currentY;
            
            // Check if this is a new row (if y position would change)
            // For now, assume horizontal layout
            currentX += panel.width;
            maxHeightInRow = Math.max(maxHeightInRow, panel.height);
            
            // Simple: if exceeds width, wrap to next row
            if (currentX >= this.currentDoorModel.width) {
                currentY += maxHeightInRow;
                currentX = 0;
                maxHeightInRow = panel.height;
                panel.x = 0;
                panel.y = currentY;
            }
        });
    }

    // Parse layout to panels (helper)
    parseLayoutToPanels(layout, width, height) {
        // This is a simplified parser - you may need to adjust based on your layout structure
        const panels = [];
        // Implementation depends on your layout structure
        return panels;
    }

    async saveDrawing() {
        if (!this.currentDoor) {
            alert("Chưa có thiết kế cửa để lưu!");
            return;
        }

        if (!this.currentProjectId) {
            alert("Vui lòng chọn dự án trước!");
            return;
        }

        const { w, h } = this.getSize();
        const token = localStorage.getItem('token');
        
        try {
            // Prepare drawing data
            const drawingData = {
                project_id: this.currentProjectId,
                template_id: this.currentDoorData?.template_id || null,
                template_code: this.currentDoorData?.template_code || null,
                width_mm: w,
                height_mm: h,
                drawing_data: {
                    template: this.currentDoor,
                    dimensions: { width: w, height: h },
                    glass_color: this.canvasEngine?.glassColor || '#87CEEB'
                },
                svg_data: this.canvasEngine?.toSVG ? this.canvasEngine.toSVG() : null,
                image_data: this.canvas ? this.canvas.toDataURL('image/png') : null,
                params_json: this.currentDoorModel ? 
                    (typeof this.currentDoorModel.toJSON === 'function' 
                        ? this.currentDoorModel.toJSON() 
                        : this.currentDoorModel) 
                    : (this.currentDoorData?.params_json || {})
            };

            // Save or update door design first
            let doorId = this.currentDoorId;
            if (!doorId) {
                // Create new door
                const doorResponse = await fetch(`${this.API_BASE}/projects/${this.currentProjectId}/doors`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        template_id: this.currentDoorData?.template_id || null,
                        template_code: this.currentDoorData?.template_code || 'CUSTOM',
                        aluminum_system_id: this.selSystem?.value || null,
                        door_type: 'swing',
                        width_mm: w,
                        height_mm: h,
                        params_json: {}
                    })
                });
                
                const doorResult = await doorResponse.json();
                if (doorResult.success) {
                    doorId = doorResult.data.id;
                    this.currentDoorId = doorId;
                } else {
                    throw new Error(doorResult.message || 'Không thể tạo cửa');
                }
            }

            // Save drawing
            drawingData.door_design_id = doorId;
            
            // Check if drawing exists
            const checkResponse = await fetch(`${this.API_BASE}/door-drawings?door_design_id=${doorId}`);
            const checkResult = await checkResponse.json();
            
            let drawingId = null;
            if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
                drawingId = checkResult.data[0].id;
            }

            const url = drawingId 
                ? `${this.API_BASE}/door-drawings/${drawingId}`
                : `${this.API_BASE}/door-drawings`;
            const method = drawingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(drawingData)
            });

            const result = await response.json();
            if (result.success) {
                // Auto-generate BOM after saving
                // Get drawing ID - either from existing or newly created
                const savedDrawingId = drawingId || (result.data?.id || result.data?.drawing_id);
                this.currentDoorDrawingId = savedDrawingId; // Store for BOM access
                
                if (savedDrawingId) {
                    try {
                        await fetch(`${this.API_BASE}/door-drawings/${savedDrawingId}/generate-bom`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                            },
                            body: JSON.stringify({ recalcCutting: true })
                        });
                        console.log('BOM generated automatically');
                    } catch (bomError) {
                        console.warn('Could not auto-generate BOM:', bomError);
                    }
                }
                
                alert('Lưu thành công!');
                // Reload items list
                await this.loadProjectDoors();
            } else {
                alert('Lỗi: ' + (result.message || 'Không thể lưu'));
            }
        } catch (error) {
            console.error('Error saving drawing:', error);
            alert('Lỗi khi lưu: ' + error.message);
        }
    }

    flipHorizontal() {
        if (!this.currentDoor) return;
        this._flipLayoutNode(this.currentDoor.layout, "horizontal");
        this.redraw();
    }

    flipVertical() {
        if (!this.currentDoor) return;
        this._flipLayoutNode(this.currentDoor.layout, "vertical");
        this.redraw();
    }

    _flipLayoutNode(node, direction) {
        if (node.kind === "panel") {
            // Đảo hướng mở
            if (node.open === "left") {
                node.open = "right";
            } else if (node.open === "right") {
                node.open = "left";
            } else if (node.open === "slide_left") {
                node.open = "slide_right";
            } else if (node.open === "slide_right") {
                node.open = "slide_left";
            }
        } else if (node.kind === "group" && node.children) {
            // Đảo thứ tự children
            if (direction === "horizontal" && node.split === "vertical") {
                node.children.reverse();
            } else if (direction === "vertical" && node.split === "horizontal") {
                node.children.reverse();
            }
            
            // Đệ quy
            node.children.forEach(child => {
                this._flipLayoutNode(child, direction);
            });
        }
    }

    // Couple panels (ghép khung)
    couplePanels(direction) {
        if (!this.currentDoorModel) {
            this.ensureDoorModel();
        }
        
        if (!this.selectedPanelPath || this.selectedPanelPath.length === 0) {
            alert('Vui lòng chọn panel để ghép khung!');
            return;
        }
        
        // Use DoorModelTree if available
        if (this.currentDoorModel instanceof DoorModelTree) {
            const panel = this.currentDoorModel.findPanelByPath(this.selectedPanelPath);
            if (panel) {
                panel.coupled = true;
                panel.couplingType = direction;
                this.redraw();
                return;
            }
        }
        
        // Fallback
        alert(`Chức năng ghép khung ${direction === 'vertical' ? 'dọc' : 'ngang'} đang được phát triển.`);
    }
    
    // Merge panels (gộp panel con)
    mergePanels() {
        if (!this.currentDoorModel) {
            this.ensureDoorModel();
        }
        
        if (!this.selectedPanelPath || this.selectedPanelPath.length === 0) {
            alert('Vui lòng chọn panel để gộp!');
            return;
        }
        
        // Use DoorModelTree if available
        if (this.currentDoorModel instanceof DoorModelTree) {
            try {
                this.currentDoorModel.mergePanels(this.selectedPanelPath);
                this.redraw();
                return;
            } catch (error) {
                alert('Lỗi khi gộp panel: ' + error.message);
                return;
            }
        }
        
        alert('Chức năng gộp panel chỉ hỗ trợ với Panel Tree structure.');
    }
}

// Zoom functions (global for bottom bar buttons)
let currentZoom = 1.0;

function zoomIn() {
    currentZoom = Math.min(currentZoom * 1.2, 5.0);
    updateZoom();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom / 1.2, 0.1);
    updateZoom();
}

function fitToScreen() {
    if (window.doorEditorUI && window.doorEditorUI.canvasEngine) {
        currentZoom = 1.0;
        updateZoom();
        window.doorEditorUI.redraw();
    }
}

function updateZoom() {
    if (window.doorEditorUI && window.doorEditorUI.canvasEngine) {
        const zoomElement = document.getElementById('zoomLevel');
        if (zoomElement) {
            zoomElement.textContent = currentZoom.toFixed(1);
        }
        window.doorEditorUI.redraw();
    }
}

// Update cursor position on canvas
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('drawingCanvas');
        if (canvas) {
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = Math.round(e.clientX - rect.left);
                const y = Math.round(e.clientY - rect.top);
                const posElement = document.getElementById('cursorPosition');
                if (posElement) {
                    posElement.textContent = `${x}, ${y}`;
                }
            });
        }
    });
}

// Auto initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.doorEditorUI = new DoorEditorUI();
    });
} else {
    window.doorEditorUI = new DoorEditorUI();
}


