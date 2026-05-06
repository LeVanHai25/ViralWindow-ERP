// ============================================
// DOOR CANVAS ENGINE V2 - Hệ thống Panel Management
// Mỗi panel là object riêng biệt, có thể drag, resize, đổi loại
// ============================================

class Panel {
    constructor(options = {}) {
        this.id = options.id || Date.now() + Math.random();
        this.type = options.type || 'swing'; // swing, sliding, fixed
        this.openDirection = options.openDirection || 'left'; // left, right, both
        this.hinge = options.hinge || 'left'; // left, right, top, bottom
        this.widthRatio = options.widthRatio || 1.0; // Tỷ lệ chiều rộng (0-1)
        this.heightRatio = options.heightRatio || 1.0; // Tỷ lệ chiều cao (0-1)
        this.x = options.x || 0; // Vị trí X (mm)
        this.y = options.y || 0; // Vị trí Y (mm)
        this.width = options.width || 0; // Chiều rộng (mm) - tính toán từ widthRatio
        this.height = options.height || 0; // Chiều cao (mm) - tính toán từ heightRatio
        this.glassColor = options.glassColor || '#87CEEB';
        this.glassOpacity = options.glassOpacity || 0.3;
        this.aluminumProfile = options.aluminumProfile || null;
        this.isSelected = false;
    }

    // Tính toán kích thước thực tế từ tỷ lệ
    calculateDimensions(totalWidth, totalHeight) {
        this.width = totalWidth * this.widthRatio;
        this.height = totalHeight * this.heightRatio;
    }

    // Kiểm tra điểm có nằm trong panel không
    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    // Lấy tọa độ góc của panel
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            right: this.x + this.width,
            bottom: this.y + this.height
        };
    }
}

class DoorCanvasEngineV2 {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.panels = []; // Mảng các panel
        this.mullions = []; // Mảng các đố (mullions)
        this.selectedPanel = null;
        this.isDragging = false;
        this.isResizing = false;
        this.isResizingFrame = false; // Resize toàn bộ khung cửa
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.resizeHandle = null;
        this.frameResizeHandle = null; // Handle để resize frame
        this.showFrameResizeHandles = true; // Hiển thị handles để resize frame
        
        // Kích thước cửa tổng
        this.doorWidth = options.doorWidth || 1800; // mm
        this.doorHeight = options.doorHeight || 2200; // mm
        
        // Zoom và Pan - Scale nhỏ hơn để cửa nhỏ hơn canvas
        this.scale = options.initialScale || 0.6; // Scale phù hợp để hiển thị đầy đủ thông số
        this.panX = 0;
        this.panY = 0;
        
        // Canvas size - Lấy kích thước thực tế của canvas
        this.canvasWidth = this.canvas.width || 2000;
        this.canvasHeight = this.canvas.height || 1500;
        
        // Update canvas size if needed
        if (this.canvas.width !== this.canvasWidth) {
            this.canvas.width = this.canvasWidth;
        }
        if (this.canvas.height !== this.canvasHeight) {
            this.canvas.height = this.canvasHeight;
        }
        
        // Frame properties
        this.frameWidth = 50; // mm - Độ dày khung
        this.frameDeduction = 50; // mm - Trừ khung (mặc định)
        this.sashDeduction = 30; // mm - Trừ cánh
        this.glassClearance = 5; // mm - Khoảng cách kính
        this.glassDeduction = 10; // mm - Trừ kính
        this.mullionWidth = 20; // mm - Độ dày đố
        this.showDimensions = true;
        
        // Default glass color (for compatibility)
        this.glassColor = options.glassColor || '#87CEEB';
        
        // Event listeners
        this.setupEventListeners();
        
        // Initial draw
        this.draw();
    }
    
    // Set glass color (for all panels or selected panel)
    setGlassColor(color, applyToAll = true) {
        this.glassColor = color; // Store default color
        
        if (applyToAll) {
            // Apply to all panels
            this.panels.forEach(panel => {
                panel.glassColor = color;
            });
        } else if (this.selectedPanel) {
            // Apply only to selected panel
            this.selectedPanel.glassColor = color;
        }
        
        this.draw();
    }
    
    // Set glass opacity
    setGlassOpacity(opacity, applyToAll = true) {
        if (applyToAll) {
            this.panels.forEach(panel => {
                panel.glassOpacity = opacity;
            });
        } else if (this.selectedPanel) {
            this.selectedPanel.glassOpacity = opacity;
        }
        
        this.draw();
    }

    setupEventListeners() {
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom(delta, e.offsetX, e.offsetY);
        });

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    // Zoom
    zoom(delta, centerX, centerY) {
        const oldScale = this.scale;
        this.scale = Math.max(0.1, Math.min(5.0, this.scale * delta));
        
        const scaleChange = this.scale / oldScale;
        this.panX = centerX - (centerX - this.panX) * scaleChange;
        this.panY = centerY - (centerY - this.panY) * scaleChange;
        
        this.draw();
    }

    // Convert mm to pixel
    mmToPixel(mm) {
        const scaleMM = this.getScaleMM();
        return mm * scaleMM;
    }

    // Get scale from mm to pixel
    getScaleMM() {
        const margin = 100; // Tăng margin để có không gian hiển thị thông số
        const availableW = (this.canvasWidth - margin * 2) / this.scale;
        const availableH = (this.canvasHeight - margin * 2) / this.scale;
        const scaleX = availableW / this.doorWidth;
        const scaleY = availableH / this.doorHeight;
        // Scale nhỏ hơn để cửa chiếm khoảng 30-35% canvas, có không gian cho thông số
        return Math.min(scaleX, scaleY) * this.scale * 0.3;
    }

    // Convert screen coordinates to mm
    screenToMM(x, y) {
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale; // Tăng margin để phù hợp với getScaleMM
        const doorX = (x - this.panX - margin) / scaleMM;
        const doorY = (y - this.panY - margin) / scaleMM;
        return { x: doorX, y: doorY };
    }

    // Handle mouse down
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const mm = this.screenToMM(x, y);

        // Check frame resize handle first (ưu tiên resize frame)
        const frameHandle = this.getFrameResizeHandleAt(x, y);
        if (frameHandle) {
            this.isResizingFrame = true;
            this.frameResizeHandle = frameHandle;
            this.dragStartX = x;
            this.dragStartY = y;
            this.selectedPanel = null; // Bỏ chọn panel khi resize frame
            this.draw();
            return;
        }

        // Check panel resize handle
        if (this.selectedPanel) {
            const handle = this.getResizeHandleAt(x, y);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.dragStartX = x;
                this.dragStartY = y;
                return;
            }
        }

        // Check if clicking on a panel
        const panel = this.getPanelAt(mm.x, mm.y);
        if (panel) {
            this.selectedPanel = panel;
            this.isDragging = true;
            this.dragStartX = x;
            this.dragStartY = y;
            this.draw();
            return;
        }

        // Deselect
        this.selectedPanel = null;
        this.draw();
    }

    // Handle mouse move
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isResizingFrame && this.frameResizeHandle) {
            this.handleFrameResize(x, y);
        } else if (this.isResizing && this.selectedPanel && this.resizeHandle) {
            this.handleResize(x, y);
        } else if (this.isDragging && this.selectedPanel) {
            this.handleDrag(x, y);
        } else {
            // Update cursor
            const frameHandle = this.getFrameResizeHandleAt(x, y);
            if (frameHandle) {
                // Set cursor based on handle position
                if (frameHandle.includes('se') || frameHandle.includes('nw')) {
                    this.canvas.style.cursor = 'nwse-resize';
                } else if (frameHandle.includes('sw') || frameHandle.includes('ne')) {
                    this.canvas.style.cursor = 'nesw-resize';
                } else if (frameHandle.includes('e') || frameHandle.includes('w')) {
                    this.canvas.style.cursor = 'ew-resize';
                } else if (frameHandle.includes('n') || frameHandle.includes('s')) {
                    this.canvas.style.cursor = 'ns-resize';
                }
            } else {
                const mm = this.screenToMM(x, y);
                const panel = this.getPanelAt(mm.x, mm.y);
                if (panel) {
                    this.canvas.style.cursor = 'move';
                } else if (this.selectedPanel && this.getResizeHandleAt(x, y)) {
                    this.canvas.style.cursor = 'nwse-resize';
                } else {
                    this.canvas.style.cursor = 'default';
                }
            }
        }
    }

    // Handle mouse up
    handleMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
        this.isResizingFrame = false;
        this.resizeHandle = null;
        this.frameResizeHandle = null;
        this.canvas.style.cursor = 'default';
        
        // Trigger dimension change callback
        if (this.onDimensionsChange) {
            this.onDimensionsChange(this.doorWidth, this.doorHeight);
        }
    }

    // Handle click
    handleClick(e) {
        if (this.isDragging || this.isResizing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const mm = this.screenToMM(x, y);
        
        const panel = this.getPanelAt(mm.x, mm.y);
        if (panel && panel === this.selectedPanel) {
            // Double click or trigger properties modal
            if (this.onPanelClick) {
                this.onPanelClick(panel);
            }
        }
    }

    // Get panel at position
    getPanelAt(x, y) {
        for (let i = this.panels.length - 1; i >= 0; i--) {
            if (this.panels[i].containsPoint(x, y)) {
                return this.panels[i];
            }
        }
        return null;
    }

    // Handle drag
    handleDrag(x, y) {
        if (!this.selectedPanel) return;
        
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        const scaleMM = this.getScaleMM();
        const dxMM = dx / scaleMM;
        const dyMM = dy / scaleMM;
        
        // Update panel position (constrain to door bounds)
        this.selectedPanel.x = Math.max(0, Math.min(this.doorWidth - this.selectedPanel.width, this.selectedPanel.x + dxMM));
        this.selectedPanel.y = Math.max(0, Math.min(this.doorHeight - this.selectedPanel.height, this.selectedPanel.y + dyMM));
        
        this.dragStartX = x;
        this.dragStartY = y;
        this.draw();
    }

        // Get frame resize handle at position
    getFrameResizeHandleAt(x, y) {
        if (!this.showFrameResizeHandles) return null;
        
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale;
        const doorX = this.panX + margin;
        const doorY = this.panY + margin;
        const doorW = this.doorWidth * scaleMM;
        const doorH = this.doorHeight * scaleMM;
        
        const handleSize = Math.max(10, 15 / this.scale);
        const handles = [
            { type: 'se', x: doorX + doorW, y: doorY + doorH }, // Southeast
            { type: 'sw', x: doorX, y: doorY + doorH }, // Southwest
            { type: 'ne', x: doorX + doorW, y: doorY }, // Northeast
            { type: 'nw', x: doorX, y: doorY }, // Northwest
            { type: 'e', x: doorX + doorW, y: doorY + doorH / 2 }, // East
            { type: 'w', x: doorX, y: doorY + doorH / 2 }, // West
            { type: 'n', x: doorX + doorW / 2, y: doorY }, // North
            { type: 's', x: doorX + doorW / 2, y: doorY + doorH } // South
        ];
        
        for (const handle of handles) {
            if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
                return handle.type;
            }
        }
        return null;
    }

    // Get resize handle at position
        getResizeHandleAt(x, y) {
        if (!this.selectedPanel) return null;
        
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale; // Tăng margin để phù hợp với getScaleMM
        const panelX = this.panX + margin + this.selectedPanel.x * scaleMM;
        const panelY = this.panY + margin + this.selectedPanel.y * scaleMM;
        const panelW = this.selectedPanel.width * scaleMM;
        const panelH = this.selectedPanel.height * scaleMM;
        
        const handleSize = Math.max(8, 12 / this.scale); // Tăng kích thước handle
        const handles = [
            { type: 'se', x: panelX + panelW, y: panelY + panelH },
            { type: 'sw', x: panelX, y: panelY + panelH },
            { type: 'ne', x: panelX + panelW, y: panelY },
            { type: 'nw', x: panelX, y: panelY }
        ];
        
        for (const handle of handles) {
            if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
                return handle;
            }
        }
        return null;
    }

    // Handle frame resize
    handleFrameResize(x, y) {
        if (!this.frameResizeHandle) return;
        
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale;
        const doorX = this.panX + margin;
        const doorY = this.panY + margin;
        
        const dx = (x - this.dragStartX) / scaleMM;
        const dy = (y - this.dragStartY) / scaleMM;
        
        let newWidth = this.doorWidth;
        let newHeight = this.doorHeight;
        const minSize = 300; // Kích thước tối thiểu
        const maxSize = 5000; // Kích thước tối đa
        
        const handle = this.frameResizeHandle;
        
        // Resize based on handle type
        if (handle.includes('e')) {
            // East side - resize width
            newWidth = Math.max(minSize, Math.min(maxSize, this.doorWidth + dx));
        }
        if (handle.includes('w')) {
            // West side - resize width and adjust position
            newWidth = Math.max(minSize, Math.min(maxSize, this.doorWidth - dx));
        }
        if (handle.includes('s')) {
            // South side - resize height
            newHeight = Math.max(minSize, Math.min(maxSize, this.doorHeight + dy));
        }
        if (handle.includes('n')) {
            // North side - resize height
            newHeight = Math.max(minSize, Math.min(maxSize, this.doorHeight - dy));
        }
        
        // Calculate scale factors
        const scaleX = newWidth / this.doorWidth;
        const scaleY = newHeight / this.doorHeight;
        
        // Update door dimensions
        this.doorWidth = newWidth;
        this.doorHeight = newHeight;
        
        // Scale all panels proportionally
        this.panels.forEach(panel => {
            // Scale position
            panel.x = panel.x * scaleX;
            panel.y = panel.y * scaleY;
            
            // Scale size
            panel.width = panel.width * scaleX;
            panel.height = panel.height * scaleY;
            
            // Update ratios
            panel.widthRatio = panel.width / this.doorWidth;
            panel.heightRatio = panel.height / this.doorHeight;
        });
        
        this.dragStartX = x;
        this.dragStartY = y;
        this.draw();
    }

    // Handle resize
    handleResize(x, y) {
        if (!this.selectedPanel || !this.resizeHandle) return;
        
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale; // Tăng margin để phù hợp với getScaleMM
        const panelX = this.panX + margin + this.selectedPanel.x * scaleMM;
        const panelY = this.panY + margin + this.selectedPanel.y * scaleMM;
        
        const dx = (x - this.dragStartX) / scaleMM;
        const dy = (y - this.dragStartY) / scaleMM;
        
        const handle = this.resizeHandle;
        let newWidth = this.selectedPanel.width;
        let newHeight = this.selectedPanel.height;
        let newX = this.selectedPanel.x;
        let newY = this.selectedPanel.y;
        
        if (handle.type.includes('e')) {
            newWidth = Math.max(100, Math.min(this.doorWidth - this.selectedPanel.x, this.selectedPanel.width + dx));
        }
        if (handle.type.includes('w')) {
            newWidth = Math.max(100, Math.min(this.selectedPanel.x + this.selectedPanel.width, this.selectedPanel.width - dx));
            newX = this.selectedPanel.x + dx;
        }
        if (handle.type.includes('s')) {
            newHeight = Math.max(100, Math.min(this.doorHeight - this.selectedPanel.y, this.selectedPanel.height + dy));
        }
        if (handle.type.includes('n')) {
            newHeight = Math.max(100, Math.min(this.selectedPanel.y + this.selectedPanel.height, this.selectedPanel.height - dy));
            newY = this.selectedPanel.y + dy;
        }
        
        // Update panel
        this.selectedPanel.width = newWidth;
        this.selectedPanel.height = newHeight;
        this.selectedPanel.x = Math.max(0, newX);
        this.selectedPanel.y = Math.max(0, newY);
        
        // Update ratios
        this.selectedPanel.widthRatio = newWidth / this.doorWidth;
        this.selectedPanel.heightRatio = newHeight / this.doorHeight;
        
        this.dragStartX = x;
        this.dragStartY = y;
        this.draw();
    }

    // Load template (JSON structure)
    loadTemplate(template) {
        this.panels = [];
        this.mullions = []; // Reset mullions khi load template mới
        
        if (!template || !template.panels) {
            // Default: single panel
            const panel = new Panel({
                type: 'swing',
                openDirection: 'left',
                widthRatio: 1.0,
                heightRatio: 1.0,
                x: 0,
                y: 0
            });
            panel.calculateDimensions(this.doorWidth, this.doorHeight);
            this.panels.push(panel);
            this.draw();
            return;
        }
        
        // Calculate panel positions
        let currentX = 0;
        let currentY = 0;
        let rowHeight = this.doorHeight;
        
        template.panels.forEach((panelData, index) => {
            // Nếu panel có x, y, width, height cụ thể, dùng luôn
            const hasExplicitPosition = panelData.x !== undefined && panelData.y !== undefined;
            const hasExplicitSize = panelData.width !== undefined && panelData.height !== undefined;
            
            const panel = new Panel({
                id: panelData.id || index + 1,
                type: panelData.type || 'swing',
                openDirection: panelData.openDirection || 'left',
                hinge: panelData.hinge || 'left',
                widthRatio: panelData.widthRatio || 1.0,
                heightRatio: panelData.heightRatio || 1.0,
                glassColor: panelData.glassColor || '#87CEEB',
                glassOpacity: panelData.glassOpacity || 0.3,
                x: hasExplicitPosition ? panelData.x : currentX,
                y: hasExplicitPosition ? panelData.y : currentY,
                width: hasExplicitSize ? panelData.width : 0,
                height: hasExplicitSize ? panelData.height : 0
            });
            
            // Tính toán kích thước
            if (hasExplicitSize) {
                panel.width = panelData.width;
                panel.height = panelData.height;
            } else {
                panel.calculateDimensions(this.doorWidth, this.doorHeight);
            }
            
            this.panels.push(panel);
            
            // Update position for next panel (chỉ khi không có vị trí cụ thể)
            if (!hasExplicitPosition) {
                currentX += panel.width;
                if (currentX >= this.doorWidth) {
                    currentX = 0;
                    currentY += rowHeight;
                    rowHeight = panel.height;
                }
            }
        });
        
        this.draw();
    }

    // Load template with specific positions (x, y, width, height)
    loadTemplateWithPositions(template) {
        this.panels = [];
        this.mullions = []; // Reset mullions khi load template mới
        
        if (!template || !template.panels) {
            return;
        }
        
        template.panels.forEach((panelData, index) => {
            const panel = new Panel({
                id: panelData.id || index + 1,
                type: panelData.type || 'swing',
                openDirection: panelData.openDirection || 'left',
                hinge: panelData.hinge || 'left',
                widthRatio: panelData.widthRatio || 1.0,
                heightRatio: panelData.heightRatio || 1.0,
                glassColor: panelData.glassColor || '#87CEEB',
                glassOpacity: panelData.glassOpacity || 0.3,
                x: panelData.x !== undefined ? panelData.x : 0,
                y: panelData.y !== undefined ? panelData.y : 0,
                width: panelData.width || 0,
                height: panelData.height || 0
            });
            
            // Nếu có width/height cụ thể, dùng luôn; nếu không thì tính từ ratio
            if (panelData.width && panelData.height) {
                panel.width = panelData.width;
                panel.height = panelData.height;
            } else {
                panel.calculateDimensions(this.doorWidth, this.doorHeight);
            }
            
            this.panels.push(panel);
        });
        
        this.draw();
    }

    // Set door dimensions
    setDimensions(width, height) {
        this.doorWidth = width;
        this.doorHeight = height;
        
        // Recalculate all panel dimensions
        this.panels.forEach(panel => {
            panel.calculateDimensions(this.doorWidth, this.doorHeight);
        });
        
        this.draw();
    }

    // Add horizontal mullion (chia ngang) - Chia đố
    addHorizontalMullion(y = null) {
        // If y is not provided, split selected panel in half, or split all panels at center
        if (y === null) {
            if (this.selectedPanel) {
                // Split selected panel in half
                y = this.selectedPanel.y + this.selectedPanel.height / 2;
            } else if (this.panels.length > 0) {
                // Split all panels at door center height
                y = this.doorHeight / 2;
            } else {
                return; // No panels to split
            }
        }
        
        // Split panels at y position
        const newPanels = [];
        
        this.panels.forEach(panel => {
            if (panel.y < y && panel.y + panel.height > y) {
                // Split this panel
                const topHeight = y - panel.y;
                const bottomHeight = panel.height - topHeight;
                
                // Only split if both parts are at least 100mm
                if (topHeight >= 100 && bottomHeight >= 100) {
                    const topPanel = new Panel({
                        id: panel.id + '_top',
                        type: panel.type,
                        openDirection: panel.openDirection,
                        hinge: panel.hinge,
                        widthRatio: panel.widthRatio,
                        heightRatio: topHeight / this.doorHeight,
                        x: panel.x,
                        y: panel.y,
                        width: panel.width,
                        height: topHeight,
                        glassColor: panel.glassColor,
                        glassOpacity: panel.glassOpacity,
                        aluminumProfile: panel.aluminumProfile
                    });
                    
                    const bottomPanel = new Panel({
                        id: panel.id + '_bottom',
                        type: panel.type,
                        openDirection: panel.openDirection,
                        hinge: panel.hinge,
                        widthRatio: panel.widthRatio,
                        heightRatio: bottomHeight / this.doorHeight,
                        x: panel.x,
                        y: y,
                        width: panel.width,
                        height: bottomHeight,
                        glassColor: panel.glassColor,
                        glassOpacity: panel.glassOpacity,
                        aluminumProfile: panel.aluminumProfile
                    });
                    
                    newPanels.push(topPanel, bottomPanel);
                } else {
                    newPanels.push(panel);
                }
            } else {
                newPanels.push(panel);
            }
        });
        
        this.panels = newPanels;
        
        // Lưu đố ngang vào mảng mullions
        if (y !== null) {
            this.mullions.push({
                direction: 'horizontal',
                position: y
            });
        }
        
        this.selectedPanel = null;
        this.draw();
    }

    // Add vertical mullion (chia dọc) - Tách khung / Ngang Đứng
    addVerticalMullion(x = null) {
        // If x is not provided, split selected panel in half, or split all panels at center
        if (x === null) {
            if (this.selectedPanel) {
                // Split selected panel in half
                x = this.selectedPanel.x + this.selectedPanel.width / 2;
            } else if (this.panels.length > 0) {
                // Split all panels at door center width
                x = this.doorWidth / 2;
            } else {
                return; // No panels to split
            }
        }
        
        // Split panels at x position
        const newPanels = [];
        
        this.panels.forEach(panel => {
            if (panel.x < x && panel.x + panel.width > x) {
                // Split this panel
                const leftWidth = x - panel.x;
                const rightWidth = panel.width - leftWidth;
                
                // Only split if both parts are at least 100mm
                if (leftWidth >= 100 && rightWidth >= 100) {
                    const leftPanel = new Panel({
                        id: panel.id + '_left',
                        type: panel.type,
                        openDirection: panel.openDirection,
                        hinge: panel.hinge,
                        widthRatio: leftWidth / this.doorWidth,
                        heightRatio: panel.heightRatio,
                        x: panel.x,
                        y: panel.y,
                        width: leftWidth,
                        height: panel.height,
                        glassColor: panel.glassColor,
                        glassOpacity: panel.glassOpacity,
                        aluminumProfile: panel.aluminumProfile
                    });
                    
                    const rightPanel = new Panel({
                        id: panel.id + '_right',
                        type: panel.type,
                        openDirection: panel.openDirection,
                        hinge: panel.hinge,
                        widthRatio: rightWidth / this.doorWidth,
                        heightRatio: panel.heightRatio,
                        x: x,
                        y: panel.y,
                        width: rightWidth,
                        height: panel.height,
                        glassColor: panel.glassColor,
                        glassOpacity: panel.glassOpacity,
                        aluminumProfile: panel.aluminumProfile
                    });
                    
                    newPanels.push(leftPanel, rightPanel);
                } else {
                    newPanels.push(panel);
                }
            } else {
                newPanels.push(panel);
            }
        });
        
        this.panels = newPanels;
        
        // Lưu đố dọc vào mảng mullions
        if (x !== null) {
            this.mullions.push({
                direction: 'vertical',
                position: x
            });
        }
        
        this.selectedPanel = null;
        this.draw();
    }

    // Draw panel - Vẽ cánh, kính, khung theo đúng quy tắc
    drawPanel(panel) {
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale;
        const panelX = this.panX + margin + panel.x * scaleMM;
        const panelY = this.panY + margin + panel.y * scaleMM;
        const panelW = panel.width * scaleMM;
        const panelH = panel.height * scaleMM;
        
        const ctx = this.ctx;
        
        // 1. Vẽ KHUNG (Frame) - 4 thanh: Left, Right, Top, Bottom
        this.drawPanelFrame(panelX, panelY, panelW, panelH, scaleMM);
        
        // 2. Tính kích thước CÁNH (Sash) - Trừ khung
        const sashX = panelX + (this.frameWidth * scaleMM);
        const sashY = panelY + (this.frameWidth * scaleMM);
        const sashW = panelW - (this.frameWidth * 2 * scaleMM);
        const sashH = panelH - (this.frameWidth * 2 * scaleMM);
        
        // 3. Vẽ CÁNH (Sash) - Trừ thêm nếu cần
        const sashDeductionMM = this.sashDeduction * scaleMM;
        const sashInnerX = sashX + sashDeductionMM / 2;
        const sashInnerY = sashY + sashDeductionMM / 2;
        const sashInnerW = sashW - sashDeductionMM;
        const sashInnerH = sashH - sashDeductionMM;
        
        // Vẽ viền cánh
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = Math.max(2, 3 / this.scale);
        ctx.strokeRect(sashInnerX, sashInnerY, sashInnerW, sashInnerH);
        
        // 4. Tính kích thước KÍNH (Glass) - Với clearance và trừ kích thước
        const glassClearanceMM = this.glassClearance * scaleMM;
        const glassDeductionMM = this.glassDeduction * scaleMM;
        const glassX = sashInnerX + glassClearanceMM;
        const glassY = sashInnerY + glassClearanceMM;
        const glassW = sashInnerW - (glassClearanceMM * 2) - glassDeductionMM;
        const glassH = sashInnerH - (glassClearanceMM * 2) - glassDeductionMM;
        
        // 5. Vẽ KÍNH (Glass)
        ctx.fillStyle = panel.glassColor || this.glassColor;
        ctx.globalAlpha = panel.glassOpacity || 0.4;
        ctx.fillRect(glassX, glassY, glassW, glassH);
        ctx.globalAlpha = 1.0;
        
        // Vẽ viền kính (glass bead)
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = Math.max(1, 1.5 / this.scale);
        ctx.strokeRect(glassX, glassY, glassW, glassH);
        
        // 6. Vẽ KÝ HIỆU MỞ (Opening Symbol)
        if (panel.type === 'swing') {
            // Mở quay: Đường chéo từ bản lề → phía mở
            this.drawSwingDirection(sashInnerX, sashInnerY, sashInnerW, sashInnerH, panel.openDirection, panel.hinge);
        } else if (panel.type === 'sliding') {
            // Mở trượt: Mũi tên cho hướng chuyển động
            this.drawSlidingDirection(sashInnerX, sashInnerY, sashInnerW, sashInnerH, panel.openDirection);
        }
        
        // 7. Draw selection highlight
        if (panel === this.selectedPanel) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3 / this.scale;
            ctx.setLineDash([5 / this.scale, 5 / this.scale]);
            ctx.strokeRect(panelX - 2 / this.scale, panelY - 2 / this.scale, panelW + 4 / this.scale, panelH + 4 / this.scale);
            ctx.setLineDash([]);
            
            // Draw resize handles
            this.drawResizeHandles(panelX, panelY, panelW, panelH);
        }
    }
    
    // Vẽ khung panel (4 thanh: Left, Right, Top, Bottom)
    drawPanelFrame(x, y, w, h, scaleMM) {
        const ctx = this.ctx;
        const frameWidthMM = this.frameWidth * scaleMM;
        
        ctx.fillStyle = '#e5e7eb'; // Màu xám nhạt cho khung
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = Math.max(2, 3 / this.scale);
        
        // Vẽ 4 thanh khung
        // Top (thanh trên)
        ctx.fillRect(x, y, w, frameWidthMM);
        ctx.strokeRect(x, y, w, frameWidthMM);
        
        // Bottom (thanh dưới)
        ctx.fillRect(x, y + h - frameWidthMM, w, frameWidthMM);
        ctx.strokeRect(x, y + h - frameWidthMM, w, frameWidthMM);
        
        // Left (thanh trái)
        ctx.fillRect(x, y, frameWidthMM, h);
        ctx.strokeRect(x, y, frameWidthMM, h);
        
        // Right (thanh phải)
        ctx.fillRect(x + w - frameWidthMM, y, frameWidthMM, h);
        ctx.strokeRect(x + w - frameWidthMM, y, frameWidthMM, h);
    }

    // Draw swing direction (đường chéo từ bản lề → phía mở)
    drawSwingDirection(x, y, w, h, openDirection, hinge) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#ff0000'; // Màu đỏ cho ký hiệu mở quay
        ctx.lineWidth = Math.max(2, 3 / this.scale);
        ctx.fillStyle = '#ff0000';
        
        // Vẽ đường chéo từ bản lề đến góc đối diện (phía mở)
        if (hinge === 'left') {
            // Bản lề trái, mở sang phải
            ctx.beginPath();
            ctx.moveTo(x, y); // Góc trên trái (bản lề)
            ctx.lineTo(x + w, y + h); // Góc dưới phải (phía mở)
            ctx.stroke();
            // Vẽ tam giác nhỏ ở góc mở
            this.drawOpeningTriangle(x + w, y + h, 'se');
        } else if (hinge === 'right') {
            // Bản lề phải, mở sang trái
            ctx.beginPath();
            ctx.moveTo(x + w, y); // Góc trên phải (bản lề)
            ctx.lineTo(x, y + h); // Góc dưới trái (phía mở)
            ctx.stroke();
            // Vẽ tam giác nhỏ ở góc mở
            this.drawOpeningTriangle(x, y + h, 'sw');
        } else if (hinge === 'top') {
            // Bản lề trên (awning/hopper)
            ctx.beginPath();
            ctx.moveTo(x, y); // Góc trên trái
            ctx.lineTo(x + w, y); // Góc trên phải
            ctx.stroke();
            // Vẽ mũi tên xuống
            const arrowSize = Math.min(w, h) * 0.15;
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x + w / 2, y + arrowSize);
            ctx.lineTo(x + w / 2 - arrowSize / 2, y + arrowSize * 0.7);
            ctx.moveTo(x + w / 2, y + arrowSize);
            ctx.lineTo(x + w / 2 + arrowSize / 2, y + arrowSize * 0.7);
            ctx.stroke();
        } else if (hinge === 'bottom') {
            // Bản lề dưới
            ctx.beginPath();
            ctx.moveTo(x, y + h); // Góc dưới trái
            ctx.lineTo(x + w, y + h); // Góc dưới phải
            ctx.stroke();
            // Vẽ mũi tên lên
            const arrowSize = Math.min(w, h) * 0.15;
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y + h);
            ctx.lineTo(x + w / 2, y + h - arrowSize);
            ctx.lineTo(x + w / 2 - arrowSize / 2, y + h - arrowSize * 0.7);
            ctx.moveTo(x + w / 2, y + h - arrowSize);
            ctx.lineTo(x + w / 2 + arrowSize / 2, y + h - arrowSize * 0.7);
            ctx.stroke();
        }
    }
    
    // Vẽ tam giác nhỏ ở góc mở
    drawOpeningTriangle(x, y, corner) {
        const ctx = this.ctx;
        const size = Math.max(8, 12 / this.scale);
        
        ctx.beginPath();
        if (corner === 'se') { // Southeast
            ctx.moveTo(x, y);
            ctx.lineTo(x - size, y);
            ctx.lineTo(x, y - size);
        } else if (corner === 'sw') { // Southwest
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y - size);
        } else if (corner === 'ne') { // Northeast
            ctx.moveTo(x, y);
            ctx.lineTo(x - size, y);
            ctx.lineTo(x, y + size);
        } else if (corner === 'nw') { // Northwest
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y + size);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Draw sliding direction (mũi tên cho hướng trượt)
    drawSlidingDirection(x, y, w, h, openDirection) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#0000ff'; // Màu xanh cho ký hiệu mở trượt
        ctx.fillStyle = '#0000ff';
        ctx.lineWidth = Math.max(2, 3 / this.scale);
        
        const centerY = y + h / 2;
        const centerX = x + w / 2;
        const arrowSize = Math.min(w, h) * 0.25;
        const arrowHeadSize = arrowSize * 0.4;
        
        if (openDirection === 'left' || openDirection === 'both') {
            // Mũi tên trượt sang trái
            const startX = x + w - arrowSize;
            const endX = x + arrowSize;
            
            ctx.beginPath();
            // Đường thẳng
            ctx.moveTo(startX, centerY);
            ctx.lineTo(endX, centerY);
            // Mũi tên (đầu mũi tên)
            ctx.moveTo(endX, centerY);
            ctx.lineTo(endX + arrowHeadSize, centerY - arrowHeadSize / 2);
            ctx.moveTo(endX, centerY);
            ctx.lineTo(endX + arrowHeadSize, centerY + arrowHeadSize / 2);
            ctx.stroke();
            
            // Vẽ đầu mũi tên (filled)
            ctx.beginPath();
            ctx.moveTo(endX, centerY);
            ctx.lineTo(endX + arrowHeadSize, centerY - arrowHeadSize / 2);
            ctx.lineTo(endX + arrowHeadSize, centerY + arrowHeadSize / 2);
            ctx.closePath();
            ctx.fill();
        }
        
        if (openDirection === 'right' || openDirection === 'both') {
            // Mũi tên trượt sang phải
            const startX = x + arrowSize;
            const endX = x + w - arrowSize;
            
            ctx.beginPath();
            // Đường thẳng
            ctx.moveTo(startX, centerY);
            ctx.lineTo(endX, centerY);
            // Mũi tên (đầu mũi tên)
            ctx.moveTo(endX, centerY);
            ctx.lineTo(endX - arrowHeadSize, centerY - arrowHeadSize / 2);
            ctx.moveTo(endX, centerY);
            ctx.lineTo(endX - arrowHeadSize, centerY + arrowHeadSize / 2);
            ctx.stroke();
            
            // Vẽ đầu mũi tên (filled)
            ctx.beginPath();
            ctx.moveTo(endX, centerY);
            ctx.lineTo(endX - arrowHeadSize, centerY - arrowHeadSize / 2);
            ctx.lineTo(endX - arrowHeadSize, centerY + arrowHeadSize / 2);
            ctx.closePath();
            ctx.fill();
        }
        
        // Nếu là trượt dọc (vertical sliding)
        if (openDirection === 'up' || openDirection === 'down') {
            const centerX = x + w / 2;
            const arrowSize = Math.min(w, h) * 0.25;
            const arrowHeadSize = arrowSize * 0.4;
            
            if (openDirection === 'up') {
                const startY = y + h - arrowSize;
                const endY = y + arrowSize;
                
                ctx.beginPath();
                ctx.moveTo(centerX, startY);
                ctx.lineTo(centerX, endY);
                ctx.moveTo(centerX, endY);
                ctx.lineTo(centerX - arrowHeadSize / 2, endY + arrowHeadSize);
                ctx.moveTo(centerX, endY);
                ctx.lineTo(centerX + arrowHeadSize / 2, endY + arrowHeadSize);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(centerX, endY);
                ctx.lineTo(centerX - arrowHeadSize / 2, endY + arrowHeadSize);
                ctx.lineTo(centerX + arrowHeadSize / 2, endY + arrowHeadSize);
                ctx.closePath();
                ctx.fill();
            } else if (openDirection === 'down') {
                const startY = y + arrowSize;
                const endY = y + h - arrowSize;
                
                ctx.beginPath();
                ctx.moveTo(centerX, startY);
                ctx.lineTo(centerX, endY);
                ctx.moveTo(centerX, endY);
                ctx.lineTo(centerX - arrowHeadSize / 2, endY - arrowHeadSize);
                ctx.moveTo(centerX, endY);
                ctx.lineTo(centerX + arrowHeadSize / 2, endY - arrowHeadSize);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(centerX, endY);
                ctx.lineTo(centerX - arrowHeadSize / 2, endY - arrowHeadSize);
                ctx.lineTo(centerX + arrowHeadSize / 2, endY - arrowHeadSize);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    // Draw frame resize handles
    drawFrameResizeHandles(x, y, w, h) {
        const ctx = this.ctx;
        const handleSize = Math.max(10, 15 / this.scale);
        
        ctx.fillStyle = '#10b981'; // Màu xanh lá để phân biệt với panel handles
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / this.scale;
        
        // Corner handles
        const cornerHandles = [
            { x: x, y: y }, // NW
            { x: x + w, y: y }, // NE
            { x: x, y: y + h }, // SW
            { x: x + w, y: y + h } // SE
        ];
        
        // Edge handles
        const edgeHandles = [
            { x: x + w / 2, y: y }, // N
            { x: x + w / 2, y: y + h }, // S
            { x: x, y: y + h / 2 }, // W
            { x: x + w, y: y + h / 2 } // E
        ];
        
        // Draw corner handles (larger)
        cornerHandles.forEach(handle => {
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, handleSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
        
        // Draw edge handles (smaller, rectangular)
        edgeHandles.forEach(handle => {
            const rectSize = handleSize * 0.7;
            ctx.fillRect(handle.x - rectSize / 2, handle.y - rectSize / 2, rectSize, rectSize);
            ctx.strokeRect(handle.x - rectSize / 2, handle.y - rectSize / 2, rectSize, rectSize);
        });
    }

    // Draw resize handles
    drawResizeHandles(x, y, w, h) {
        const ctx = this.ctx;
        const handleSize = Math.max(8, 12 / this.scale); // Tăng kích thước handle
        
        ctx.fillStyle = '#3b82f6';
        const handles = [
            { x: x, y: y }, // NW
            { x: x + w, y: y }, // NE
            { x: x, y: y + h }, // SW
            { x: x + w, y: y + h } // SE
        ];
        
        handles.forEach(handle => {
            ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
    }

    // Draw dimensions
    drawDimensions() {
        if (!this.showDimensions) return;
        
        const ctx = this.ctx;
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale; // Tăng margin để có không gian hiển thị
        const doorX = this.panX + margin;
        const doorY = this.panY + margin;
        const doorW = this.doorWidth * scaleMM;
        const doorH = this.doorHeight * scaleMM;
        
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = Math.max(1, 2 / this.scale);
        ctx.font = `${Math.max(10, 14 / this.scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const dimOffset = 50 / this.scale; // Khoảng cách dimension
        
        // Width dimension (B) - bottom
        const dimY = doorY + doorH + dimOffset;
        ctx.beginPath();
        ctx.moveTo(doorX, dimY);
        ctx.lineTo(doorX + doorW, dimY);
        // Extension lines
        ctx.moveTo(doorX, doorY + doorH);
        ctx.lineTo(doorX, dimY);
        ctx.moveTo(doorX + doorW, doorY + doorH);
        ctx.lineTo(doorX + doorW, dimY);
        // Arrows
        const arrowSize = 6 / this.scale;
        ctx.moveTo(doorX + arrowSize, dimY - arrowSize);
        ctx.lineTo(doorX, dimY);
        ctx.lineTo(doorX + arrowSize, dimY + arrowSize);
        ctx.moveTo(doorX + doorW - arrowSize, dimY - arrowSize);
        ctx.lineTo(doorX + doorW, dimY);
        ctx.lineTo(doorX + doorW - arrowSize, dimY + arrowSize);
        ctx.stroke();
        ctx.fillText(`B = ${this.doorWidth}mm`, doorX + doorW / 2, dimY + 15 / this.scale);
        
        // Height dimension (H) - right
        const dimX = doorX + doorW + dimOffset;
        ctx.beginPath();
        ctx.moveTo(dimX, doorY);
        ctx.lineTo(dimX, doorY + doorH);
        // Extension lines
        ctx.moveTo(doorX, doorY);
        ctx.lineTo(dimX, doorY);
        ctx.moveTo(doorX, doorY + doorH);
        ctx.lineTo(dimX, doorY + doorH);
        // Arrows
        ctx.moveTo(dimX - arrowSize, doorY + arrowSize);
        ctx.lineTo(dimX, doorY);
        ctx.lineTo(dimX + arrowSize, doorY + arrowSize);
        ctx.moveTo(dimX - arrowSize, doorY + doorH - arrowSize);
        ctx.lineTo(dimX, doorY + doorH);
        ctx.lineTo(dimX + arrowSize, doorY + doorH - arrowSize);
        ctx.stroke();
        ctx.save();
        ctx.translate(dimX + 20 / this.scale, doorY + doorH / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(`H = ${this.doorHeight}mm`, 0, 0);
        ctx.restore();
        
        // Draw panel dimensions (kích thước từng panel)
        this.panels.forEach((panel, index) => {
            this.drawPanelDimensions(panel, scaleMM, margin, index);
        });
    }
    
    // Draw individual panel dimensions
    drawPanelDimensions(panel, scaleMM, margin, panelIndex) {
        const ctx = this.ctx;
        const panelX = this.panX + margin + panel.x * scaleMM;
        const panelY = this.panY + margin + panel.y * scaleMM;
        const panelW = panel.width * scaleMM;
        const panelH = panel.height * scaleMM;
        
        ctx.strokeStyle = '#666666';
        ctx.fillStyle = '#333333';
        ctx.lineWidth = Math.max(0.5, 1 / this.scale);
        ctx.font = `${Math.max(8, 11 / this.scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const smallDimOffset = 25 / this.scale;
        const arrowSize = 4 / this.scale;
        
        // Panel width dimension (nếu panel đủ rộng)
        if (panelW > 80) {
            const panelDimY = panelY + panelH + smallDimOffset;
            ctx.beginPath();
            ctx.moveTo(panelX, panelDimY);
            ctx.lineTo(panelX + panelW, panelDimY);
            // Extension lines
            ctx.moveTo(panelX, panelY + panelH);
            ctx.lineTo(panelX, panelDimY);
            ctx.moveTo(panelX + panelW, panelY + panelH);
            ctx.lineTo(panelX + panelW, panelDimY);
            // Small arrows
            ctx.moveTo(panelX + arrowSize, panelDimY - arrowSize);
            ctx.lineTo(panelX, panelDimY);
            ctx.lineTo(panelX + arrowSize, panelDimY + arrowSize);
            ctx.moveTo(panelX + panelW - arrowSize, panelDimY - arrowSize);
            ctx.lineTo(panelX + panelW, panelDimY);
            ctx.lineTo(panelX + panelW - arrowSize, panelDimY + arrowSize);
            ctx.stroke();
            ctx.fillText(`${Math.round(panel.width)}mm`, panelX + panelW / 2, panelDimY + 12 / this.scale);
        }
        
        // Panel height dimension (nếu panel đủ cao)
        if (panelH > 80) {
            const panelDimX = panelX + panelW + smallDimOffset;
            ctx.beginPath();
            ctx.moveTo(panelDimX, panelY);
            ctx.lineTo(panelDimX, panelY + panelH);
            // Extension lines
            ctx.moveTo(panelX, panelY);
            ctx.lineTo(panelDimX, panelY);
            ctx.moveTo(panelX, panelY + panelH);
            ctx.lineTo(panelDimX, panelY + panelH);
            // Small arrows
            ctx.moveTo(panelDimX - arrowSize, panelY + arrowSize);
            ctx.lineTo(panelDimX, panelY);
            ctx.lineTo(panelDimX + arrowSize, panelY + arrowSize);
            ctx.moveTo(panelDimX - arrowSize, panelY + panelH - arrowSize);
            ctx.lineTo(panelDimX, panelY + panelH);
            ctx.lineTo(panelDimX + arrowSize, panelY + panelH - arrowSize);
            ctx.stroke();
            ctx.save();
            ctx.translate(panelDimX + 15 / this.scale, panelY + panelH / 2);
            ctx.rotate(Math.PI / 2);
            ctx.fillText(`${Math.round(panel.height)}mm`, 0, 0);
            ctx.restore();
        }
        
        // Hiển thị thông số panel ở góc trên trái của panel (nếu đủ lớn)
        if (panelW > 100 && panelH > 100) {
            ctx.fillStyle = '#000000';
            ctx.font = `bold ${Math.max(9, 12 / this.scale)}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const infoX = panelX + 5 / this.scale;
            const infoY = panelY + 5 / this.scale;
            ctx.fillText(`P${panelIndex + 1}: ${Math.round(panel.width)}×${Math.round(panel.height)}mm`, infoX, infoY);
        }
    }

    // Main draw function - Vẽ khung cửa, panels, đố, kích thước
    draw() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw background
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Tính toán vị trí và kích thước khung cửa
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale;
        const doorX = this.panX + margin;
        const doorY = this.panY + margin;
        const doorW = this.doorWidth * scaleMM;
        const doorH = this.doorHeight * scaleMM;
        
        // 1. Vẽ KHUNG CỬA CHÍNH (Main Frame) - 4 thanh: Left, Right, Top, Bottom
        this.drawMainFrame(doorX, doorY, doorW, doorH, scaleMM);
        
        // 2. Vẽ ĐỐ (Mullions) - Nếu có
        this.drawMullions(doorX, doorY, doorW, doorH, scaleMM);
        
        // 3. Draw frame resize handles
        if (this.showFrameResizeHandles) {
            this.drawFrameResizeHandles(doorX, doorY, doorW, doorH);
        }
        
        // 4. Draw all panels (cánh, kính)
        this.panels.forEach(panel => {
            this.drawPanel(panel);
        });
        
        // 5. Draw dimensions (kích thước)
        this.drawDimensions();
    }
    
    // Vẽ khung cửa chính (4 thanh: Left, Right, Top, Bottom)
    drawMainFrame(x, y, w, h, scaleMM) {
        const ctx = this.ctx;
        const frameWidthMM = this.frameWidth * scaleMM;
        
        ctx.fillStyle = '#d1d5db'; // Màu xám cho khung chính
        ctx.strokeStyle = '#1f2937'; // Màu đen đậm cho viền
        ctx.lineWidth = Math.max(3, 5 / this.scale);
        
        // Vẽ 4 thanh khung
        // Top (thanh trên)
        ctx.fillRect(x, y, w, frameWidthMM);
        ctx.strokeRect(x, y, w, frameWidthMM);
        
        // Bottom (thanh dưới)
        ctx.fillRect(x, y + h - frameWidthMM, w, frameWidthMM);
        ctx.strokeRect(x, y + h - frameWidthMM, w, frameWidthMM);
        
        // Left (thanh trái)
        ctx.fillRect(x, y, frameWidthMM, h);
        ctx.strokeRect(x, y, frameWidthMM, h);
        
        // Right (thanh phải)
        ctx.fillRect(x + w - frameWidthMM, y, frameWidthMM, h);
        ctx.strokeRect(x + w - frameWidthMM, y, frameWidthMM, h);
    }
    
    // Vẽ đố (Mullions) - Đố dọc và đố ngang
    drawMullions(doorX, doorY, doorW, doorH, scaleMM) {
        if (!this.mullions || this.mullions.length === 0) return;
        
        const ctx = this.ctx;
        const mullionWidthMM = this.mullionWidth * scaleMM;
        
        ctx.fillStyle = '#9ca3af'; // Màu xám cho đố
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = Math.max(2, 3 / this.scale);
        
        this.mullions.forEach(mullion => {
            if (mullion.direction === 'vertical') {
                // Đố dọc
                const x = doorX + mullion.position * scaleMM;
                ctx.fillRect(x - mullionWidthMM / 2, doorY, mullionWidthMM, doorH);
                ctx.strokeRect(x - mullionWidthMM / 2, doorY, mullionWidthMM, doorH);
            } else if (mullion.direction === 'horizontal') {
                // Đố ngang
                const y = doorY + mullion.position * scaleMM;
                ctx.fillRect(doorX, y - mullionWidthMM / 2, doorW, mullionWidthMM);
                ctx.strokeRect(doorX, y - mullionWidthMM / 2, doorW, mullionWidthMM);
            }
        });
    }

    // Center canvas
    center() {
        const scaleMM = this.getScaleMM();
        const margin = 100 / this.scale; // Tăng margin để phù hợp với getScaleMM
        const doorW = this.doorWidth * scaleMM;
        const doorH = this.doorHeight * scaleMM;
        
        // Căn giữa cửa trong canvas, có không gian cho thông số
        this.panX = (this.canvasWidth - doorW) / 2 - margin;
        this.panY = (this.canvasHeight - doorH) / 2 - margin;
        
        this.draw();
    }

    // Export as image
    exportImage(format = 'png', quality = 1.0) {
        return this.canvas.toDataURL(`image/${format}`, quality);
    }

    // Get JSON data
    toJSON() {
        return {
            doorWidth: this.doorWidth,
            doorHeight: this.doorHeight,
            panels: this.panels.map(panel => ({
                id: panel.id,
                type: panel.type,
                openDirection: panel.openDirection,
                hinge: panel.hinge,
                widthRatio: panel.widthRatio,
                heightRatio: panel.heightRatio,
                x: panel.x,
                y: panel.y,
                width: panel.width,
                height: panel.height,
                glassColor: panel.glassColor,
                glassOpacity: panel.glassOpacity,
                aluminumProfile: panel.aluminumProfile
            }))
        };
    }

    // Flip horizontal (đảo ngang)
    flipHorizontal() {
        this.panels.forEach(panel => {
            // Flip x position
            panel.x = this.doorWidth - panel.x - panel.width;
            // Flip open direction
            if (panel.openDirection === 'left') {
                panel.openDirection = 'right';
            } else if (panel.openDirection === 'right') {
                panel.openDirection = 'left';
            }
            // Flip hinge
            if (panel.hinge === 'left') {
                panel.hinge = 'right';
            } else if (panel.hinge === 'right') {
                panel.hinge = 'left';
            }
        });
        this.draw();
    }

    // Flip vertical (đảo dọc)
    flipVertical() {
        this.panels.forEach(panel => {
            // Flip y position
            panel.y = this.doorHeight - panel.y - panel.height;
            // Flip hinge if top/bottom
            if (panel.hinge === 'top') {
                panel.hinge = 'bottom';
            } else if (panel.hinge === 'bottom') {
                panel.hinge = 'top';
            }
        });
        this.draw();
    }

    // Change panel direction (đổi hướng mở)
    changePanelDirection() {
        if (!this.selectedPanel) {
            return;
        }

        const panel = this.selectedPanel;
        
        // Toggle between left and right
        if (panel.openDirection === 'left') {
            panel.openDirection = 'right';
            panel.hinge = 'right';
        } else if (panel.openDirection === 'right') {
            panel.openDirection = 'left';
            panel.hinge = 'left';
        } else if (panel.openDirection === 'both') {
            // For sliding doors, toggle between left and right
            panel.openDirection = 'left';
            panel.hinge = 'left';
        }

        this.draw();
    }

    // Load from JSON
    fromJSON(data) {
        this.doorWidth = data.doorWidth || 1800;
        this.doorHeight = data.doorHeight || 2200;
        this.panels = (data.panels || []).map(panelData => {
            const panel = new Panel(panelData);
            panel.calculateDimensions(this.doorWidth, this.doorHeight);
            return panel;
        });
        this.draw();
    }
    
    // Get calculated dimensions (for compatibility)
    getCalculatedDimensions() {
        return {
            width: this.doorWidth,
            height: this.doorHeight,
            panels: this.panels.map(panel => ({
                width: panel.width,
                height: panel.height,
                x: panel.x,
                y: panel.y
            }))
        };
    }
}

