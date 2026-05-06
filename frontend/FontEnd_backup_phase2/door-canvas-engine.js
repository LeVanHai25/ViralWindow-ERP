// ============================================
// DOOR CANVAS ENGINE - Vẽ cửa từ LayoutNode
// ============================================

class DoorCanvasEngine {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.margin = 100;       // chừa chỗ vẽ kích thước
        this.baseScale = 0.15;   // mm → px (tùy bạn chỉnh)
        this.hitRegions = [];    // Lưu các vùng panel để hitTest
        this.dividerRegions = []; // Lưu các vùng divider (mullion) để resize
        this.originX = 0;
        this.originY = 0;
        this.aluminumSystem = 'Xingfa 55'; // Default system
        this.profileConfig = null; // Will be loaded from getProfileConfig
        this.showGrid = true; // Show grid by default
        this.gridSize = 10; // Grid size in mm
    }
    
    /**
     * Set aluminum system and load profile config
     */
    setAluminumSystem(systemName) {
        this.aluminumSystem = systemName;
        if (typeof getProfileConfig !== 'undefined') {
            this.profileConfig = getProfileConfig(systemName);
        }
    }

    /**
     * Render 1 thiết kế cửa
     * @param {DoorDesign|DoorModel} door - Door design hoặc DoorModel
     * @param {number} widthMm
     * @param {number} heightMm
     * @param {number} zoom  // 1 = bình thường
     * @param {Array} selectedPath - Path đến panel đang chọn [0,1,2,...]
     */
    render(door, widthMm, heightMm, zoom = 1, selectedPath = null) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Reset hit regions
        this.hitRegions = [];
        this.dividerRegions = [];

        const scale = this.baseScale * zoom;

        const drawWidth = widthMm * scale;
        const drawHeight = heightMm * scale;

        // canh giữa canvas
        this.originX = (this.canvas.width - drawWidth) / 2;
        this.originY = (this.canvas.height - drawHeight) / 2;

        this.scale = scale;

        // Vẽ grid (nếu enabled)
        if (this.showGrid !== false) {
            this._drawGrid();
        }

        // Vẽ layout - hỗ trợ cả DoorModelTree, DoorModel và layout cũ
        if (door instanceof DoorModelTree || (door.rootPanel && typeof DoorModelTree !== 'undefined')) {
            // DoorModelTree format - Panel Tree structure
            this._drawPanelTree(door, selectedPath);
        } else if (door.panels && Array.isArray(door.panels)) {
            // DoorModel format (flat array)
            this._drawDoorModel(door, selectedPath);
        } else if (door.layout) {
            // Layout format cũ
        this._drawLayoutNode(
            door.layout,
                this.originX,
                this.originY,
            drawWidth,
                drawHeight,
                selectedPath
        );
        }

        // vẽ kích thước
        this._drawDimensions(this.originX, this.originY, drawWidth, drawHeight, widthMm, heightMm);
    }

    /**
     * Vẽ Panel Tree (DoorModelTree format) - đệ quy
     */
    _drawPanelTree(doorModelTree, selectedPath = null) {
        const scale = this.scale;
        
        // Render root panel's children recursively
        if (doorModelTree.rootPanel && doorModelTree.rootPanel.children) {
            doorModelTree.rootPanel.children.forEach((child, index) => {
                this._renderPanelNode(child, [index], selectedPath, scale);
            });
        }
        
        // Vẽ bars (mullions)
        if (doorModelTree.bars) {
            doorModelTree.bars.forEach(bar => {
                this._drawBar(bar, scale);
            });
        }
    }
    
    /**
     * Render panel node recursively (Panel Tree)
     */
    _renderPanelNode(panelNode, currentPath, selectedPath, scale) {
        const x = this.originX + (panelNode.x * scale);
        const y = this.originY + (panelNode.y * scale);
        const w = panelNode.width * scale;
        const h = panelNode.height * scale;
        
        // Check if this panel is selected
        const isSelected = selectedPath && this.isSamePath(currentPath, selectedPath);
        
        // If it's a split panel, render children recursively and register dividers
        if (panelNode.isSplitPanel() && panelNode.children) {
            let currentX = panelNode.x;
            let currentY = panelNode.y;
            
            panelNode.children.forEach((child, index) => {
                this._renderPanelNode(child, [...currentPath, index], selectedPath, scale);
                
                // Register divider region for resizing (except last child)
                if (index < panelNode.children.length - 1) {
                    if (panelNode.split === 'vertical') {
                        const dividerX = this.originX + (currentX + child.width) * scale;
                        this.dividerRegions.push({
                            type: 'divider',
                            direction: 'vertical',
                            parentPath: [...currentPath],
                            bounds: {
                                x: dividerX - 5, // 5px tolerance
                                y: this.originY + (panelNode.y * scale),
                                w: 10,
                                h: panelNode.height * scale
                            }
                        });
                        currentX += child.width;
                    } else if (panelNode.split === 'horizontal') {
                        const dividerY = this.originY + (currentY + child.height) * scale;
                        this.dividerRegions.push({
                            type: 'divider',
                            direction: 'horizontal',
                            parentPath: [...currentPath],
                            bounds: {
                                x: this.originX + (panelNode.x * scale),
                                y: dividerY - 5,
                                w: panelNode.width * scale,
                                h: 10
                            }
                        });
                        currentY += child.height;
                    }
                }
            });
        } else {
            // Leaf panel - draw it
            // Lưu hit region
            this.hitRegions.push({
                type: 'panel',
                path: [...currentPath],
                panelId: panelNode.id,
                bounds: { x, y, w, h }
            });
            
            // Vẽ panel
            this._drawPanel(panelNode, x, y, w, h, isSelected);
        }
    }
    
    /**
     * Vẽ DoorModel (format mới với panels array - flat)
     */
    _drawDoorModel(doorModel, selectedPath = null) {
        const { w, h } = this.getSize();
        const scale = this.scale;
        
        doorModel.panels.forEach((panel, index) => {
            const x = this.originX + (panel.x * scale);
            const y = this.originY + (panel.y * scale);
            const w = panel.width * scale;
            const h = panel.height * scale;
            
            // Lưu hit region
            this.hitRegions.push({
                type: 'panel',
                path: [index], // Simple path for flat panels array
                panelId: panel.id,
                bounds: { x, y, w, h }
            });
            
            // Vẽ panel
            this._drawPanel(panel, x, y, w, h, selectedPath && selectedPath[0] === index);
        });
        
        // Vẽ bars (mullions)
        if (doorModel.bars) {
            doorModel.bars.forEach(bar => {
                this._drawBar(bar, scale);
            });
        }
    }

    /**
     * Vẽ một panel với profile thật (khung & cánh)
     */
    _drawPanel(panel, x, y, w, h, isSelected = false) {
        const ctx = this.ctx;
        
        // Get profile config
        const profile = this.profileConfig || (typeof getProfileConfig !== 'undefined' ? getProfileConfig(this.aluminumSystem) : null);
        
        // Convert mm to pixels
        const scale = this.scale || this.baseScale;
        const frameWidth = profile ? (profile.frame.width * scale) : (8 * scale);
        const sashWidth = profile ? (profile.sash.width * scale) : (6 * scale);
        const glassOffset = profile ? (profile.glassOffset * scale) : (15 * scale);
        const sashOffset = profile ? (profile.sashOffset * scale) : (5 * scale);
        
        ctx.save();
        
        // 1. Vẽ khung ngoài (outer frame) - dày hơn
        ctx.lineWidth = frameWidth;
        ctx.strokeStyle = isSelected ? "#fbbf24" : "#666"; // Vàng khi được chọn, xám khi không
        ctx.strokeRect(
            x + frameWidth / 2, 
            y + frameWidth / 2, 
            w - frameWidth, 
            h - frameWidth
        );
        
        // Highlight nếu được chọn - border vàng dày
        if (isSelected) {
            ctx.strokeStyle = "#fbbf24"; // Màu vàng
            ctx.lineWidth = frameWidth + 2;
            ctx.strokeRect(
                x + frameWidth / 2 - 1, 
                y + frameWidth / 2 - 1, 
                w - frameWidth + 2, 
                h - frameWidth + 2
            );
        }
        
        // 2. Vẽ cánh trong (inner sash frame) - mỏng hơn
        ctx.lineWidth = sashWidth;
        ctx.strokeStyle = "#888";
        ctx.strokeRect(
            x + sashOffset + sashWidth / 2, 
            y + sashOffset + sashWidth / 2, 
            w - (sashOffset + sashWidth) * 2, 
            h - (sashOffset + sashWidth) * 2
        );
        
        // 3. Vẽ kính (glass area)
        ctx.fillStyle = panel.glassColor || "#87CEEB";
        ctx.globalAlpha = 0.3; // Transparency
        ctx.fillRect(
            x + glassOffset, 
            y + glassOffset, 
            w - glassOffset * 2, 
            h - glassOffset * 2
        );
        ctx.globalAlpha = 1.0;
        
        // 4. Vẽ viền kính (glass edge)
        ctx.strokeStyle = "rgba(200, 220, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
            x + glassOffset, 
            y + glassOffset, 
            w - glassOffset * 2, 
            h - glassOffset * 2
        );
        
        // 5. Vẽ hướng mở (opening direction) - đường chéo tam giác
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Support both old format (openType) and new format (type, openDirection)
        let openType = panel.openType || panel.open || 'fixed';
        let openDirection = panel.openDirection;
        let panelType = panel.type;
        const isDoor = panel.isDoor || panelType?.startsWith('door-');
        const isWindow = panel.isWindow || panelType?.startsWith('window-');
        
        // If using PanelNode format
        if (panelType && panelType.includes('-')) {
            if (panelType.startsWith('window-')) {
                const windowType = panelType.replace('window-', '');
                if (windowType === 'turn-left') openType = 'turn-left';
                else if (windowType === 'turn-right') openType = 'turn-right';
                else if (windowType === 'tilt') openType = 'tilt';
                else if (windowType === 'tilt-turn') openType = 'tilt-turn';
                else if (windowType === 'tilt-slide') openType = 'tilt-slide';
                else if (windowType === 'fixed') openType = 'fixed';
            } else if (panelType.startsWith('door-')) {
                const doorType = panelType.replace('door-', '');
                if (doorType === 'single-left') openType = 'turn-left';
                else if (doorType === 'single-right') openType = 'turn-right';
                else if (doorType === 'french') openType = 'french';
            } else if (panelType === 'sliding') {
                openType = 'sliding';
            }
        }
        
        // Use openDirection if available
        if (openDirection) {
            if (openDirection === 'left') openType = 'turn-left';
            else if (openDirection === 'right') openType = 'turn-right';
            else if (openDirection === 'top') openType = 'tilt';
        }
        
        // Draw opening direction triangle
        if (openType === "left" || openType === "turn-left") {
            // Triangle pointing left (hinge on left)
            this._drawOpeningTriangle(ctx, x + glassOffset, y + glassOffset, x + glassOffset, y + h - glassOffset, x + w - glassOffset, y + h / 2);
        } else if (openType === "right" || openType === "turn-right") {
            // Triangle pointing right (hinge on right)
            this._drawOpeningTriangle(ctx, x + w - glassOffset, y + glassOffset, x + w - glassOffset, y + h - glassOffset, x + glassOffset, y + h / 2);
        } else if (openType === "tilt") {
            // Triangle pointing up (hinge on top)
            this._drawOpeningTriangle(ctx, x + glassOffset, y + glassOffset, x + w - glassOffset, y + glassOffset, x + w / 2, y + h - glassOffset);
        } else if (openType === "tilt-turn") {
            // Draw both tilt and turn
            this._drawOpeningTriangle(ctx, x + glassOffset, y + glassOffset, x + glassOffset, y + h - glassOffset, x + w - glassOffset, y + h / 2);
            ctx.moveTo(x + glassOffset, y + glassOffset);
            ctx.lineTo(x + w / 2, y + h - glassOffset);
        } else if (openType && (openType.startsWith("slide") || openType === "sliding")) {
            // Draw sliding rail and arrows
            this._drawSlidingRail(panel, x, y, w, h, glassOffset);
            ctx.stroke();
            ctx.restore();
            return;
        } else if (openType === "fixed" || panelType === "fix" || (panelType && panelType.includes('fixed'))) {
            // Vách cố định - không vẽ gì
            ctx.stroke();
            ctx.restore();
            return;
        }
        
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fill();
        
        // 6. Vẽ bản lề (hinges)
        if (panel.hardware && panel.hardware.hinges > 0) {
            this._drawHinges(panel, x, y, w, h, openType, openDirection, glassOffset, sashOffset);
        }
        
        // 7. Vẽ tay nắm (handle)
        if (panel.hardware && panel.hardware.handle) {
            this._drawHandle(panel, x, y, w, h, openType, openDirection, glassOffset, isDoor, isWindow);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw opening direction triangle
     */
    _drawOpeningTriangle(ctx, x1, y1, x2, y2, x3, y3) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
    }
    
    /**
     * Draw hinges on panel
     */
    _drawHinges(panel, x, y, w, h, openType, openDirection, glassOffset, sashOffset) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = "#444";
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 1;
        
        const hingeCount = panel.hardware.hinges || 3;
        const hingeSize = 8; // px
        const hingeSpacing = (h - glassOffset * 2) / (hingeCount + 1);
        
        // Determine hinge position based on opening direction
        let hingeX, hingeY;
        let isVertical = false;
        
        if (openDirection === 'left' || openType === 'turn-left') {
            hingeX = x + sashOffset;
            isVertical = true;
        } else if (openDirection === 'right' || openType === 'turn-right') {
            hingeX = x + w - sashOffset - hingeSize;
            isVertical = true;
        } else if (openDirection === 'top' || openType === 'tilt') {
            hingeY = y + sashOffset;
            isVertical = false;
        } else {
            // Default: left side
            hingeX = x + sashOffset;
            isVertical = true;
        }
        
        // Draw hinges
        for (let i = 1; i <= hingeCount; i++) {
            if (isVertical) {
                hingeY = y + glassOffset + (hingeSpacing * i) - hingeSize / 2;
                // Draw hinge as rectangle
                ctx.fillRect(hingeX, hingeY, hingeSize, hingeSize * 1.5);
                ctx.strokeRect(hingeX, hingeY, hingeSize, hingeSize * 1.5);
            } else {
                hingeX = x + glassOffset + (hingeSpacing * i) - hingeSize / 2;
                ctx.fillRect(hingeX, hingeY, hingeSize * 1.5, hingeSize);
                ctx.strokeRect(hingeX, hingeY, hingeSize * 1.5, hingeSize);
            }
        }
        
        ctx.restore();
    }
    
    /**
     * Draw handle on panel (chính xác theo loại cửa)
     */
    _drawHandle(panel, x, y, w, h, openType, openDirection, glassOffset, isDoor, isWindow) {
        const ctx = this.ctx;
        ctx.save();
        
        // Handle size based on door/window type
        const handleSize = isDoor ? 12 : 8; // Door handle larger
        const handleHeight = isDoor ? 20 : 15;
        
        // Position handle: 900-1100mm from bottom (standard)
        const handleHeightFromBottom = 1000 * this.scale; // Convert mm to px
        let handleX, handleY;
        
        if (openDirection === 'left' || openType === 'turn-left') {
            // Handle on right side, middle height
            handleX = x + w - glassOffset - handleSize;
            handleY = y + h - handleHeightFromBottom;
        } else if (openDirection === 'right' || openType === 'turn-right') {
            // Handle on left side
            handleX = x + glassOffset;
            handleY = y + h - handleHeightFromBottom;
        } else if (openDirection === 'top' || openType === 'tilt') {
            // Handle on bottom, center
            handleX = x + w / 2;
            handleY = y + h - glassOffset - handleSize;
        } else {
            // Default: right side
            handleX = x + w - glassOffset - handleSize;
            handleY = y + h - handleHeightFromBottom;
        }
        
        // Draw handle
        ctx.fillStyle = "#555";
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        
        if (isDoor) {
            // Door handle (lockset) - larger, more detailed
            ctx.beginPath();
            ctx.rect(handleX - handleSize / 2, handleY - handleHeight / 2, handleSize, handleHeight);
            ctx.fill();
            ctx.stroke();
            // Draw lock indicator
            ctx.fillStyle = "#777";
            ctx.beginPath();
            ctx.arc(handleX, handleY, handleSize / 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Window handle - smaller, simpler
            ctx.beginPath();
            ctx.arc(handleX, handleY, handleSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw sliding rail and arrows
     */
    _drawSlidingRail(panel, x, y, w, h, glassOffset) {
        const ctx = this.ctx;
        ctx.save();
        
        // Draw rail at bottom
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + glassOffset, y + h - glassOffset);
        ctx.lineTo(x + w - glassOffset, y + h - glassOffset);
        ctx.stroke();
        
        // Draw rail groove
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + glassOffset, y + h - glassOffset - 2);
        ctx.lineTo(x + w - glassOffset, y + h - glassOffset - 2);
        ctx.moveTo(x + glassOffset, y + h - glassOffset + 2);
        ctx.lineTo(x + w - glassOffset, y + h - glassOffset + 2);
        ctx.stroke();
        
        // Draw sliding arrows
        const arrowSize = 15;
        const arrowY = y + h - glassOffset;
        
        // Left arrow
        ctx.strokeStyle = "#0066cc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + glassOffset + 20, arrowY);
        ctx.lineTo(x + glassOffset + 20 + arrowSize, arrowY);
        ctx.lineTo(x + glassOffset + 20 + arrowSize - 5, arrowY - 5);
        ctx.moveTo(x + glassOffset + 20 + arrowSize, arrowY);
        ctx.lineTo(x + glassOffset + 20 + arrowSize - 5, arrowY + 5);
        ctx.stroke();
        
        // Right arrow
        ctx.beginPath();
        ctx.moveTo(x + w - glassOffset - 20, arrowY);
        ctx.lineTo(x + w - glassOffset - 20 - arrowSize, arrowY);
        ctx.lineTo(x + w - glassOffset - 20 - arrowSize + 5, arrowY - 5);
        ctx.moveTo(x + w - glassOffset - 20 - arrowSize, arrowY);
        ctx.lineTo(x + w - glassOffset - 20 - arrowSize + 5, arrowY + 5);
        ctx.stroke();
        
        // Draw overlapping panels if sliding
        if (panel.slidingPanels) {
            const panelCount = panel.slidingCount || 2;
            const panelWidth = (w - glassOffset * 2) / panelCount;
            
            for (let i = 0; i < panelCount; i++) {
                const panelX = x + glassOffset + (panelWidth * i);
                // Draw panel outline
                ctx.strokeStyle = "#0066cc";
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(panelX, y + glassOffset, panelWidth, h - glassOffset * 2);
                ctx.setLineDash([]);
            }
        }
        
        ctx.restore();
    }

    /**
     * Vẽ bar (mullion)
     */
    _drawBar(bar, scale) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        if (bar.type === 'vertical') {
            const x = this.originX + (bar.x * scale);
            ctx.moveTo(x, this.originY);
            ctx.lineTo(x, this.originY + (bar.length * scale));
        } else if (bar.type === 'horizontal') {
            const y = this.originY + (bar.y * scale);
            ctx.moveTo(this.originX, y);
            ctx.lineTo(this.originX + (bar.length * scale), y);
        }
        
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Helper để lấy size (nếu cần)
     */
    getSize() {
        return {
            w: this.canvas.width,
            h: this.canvas.height
        };
    }

    _drawLayoutNode(node, x, y, w, h, selectedPath = null, path = []) {
        const ctx = this.ctx;

        if (node.kind === "panel") {
            // Lưu hit region
            this.hitRegions.push({
                type: 'panel',
                path: [...path],
                panelId: node.id || `panel-${path.join('-')}`,
                bounds: { x, y, w, h }
            });
            
            // Kiểm tra có được chọn không
            const isSelected = selectedPath && this.isSamePath(path, selectedPath);
            // viền khung cánh
            const frame = 8; // px độ dày khung hiển thị (chỉ là hình minh họa)
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.strokeStyle = isSelected ? "#ff6600" : "#999";
            ctx.strokeRect(x, y, w, h);
            
            // Highlight nếu được chọn
            if (isSelected) {
                ctx.save();
                ctx.strokeStyle = "#ff6600";
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
                ctx.setLineDash([]);
                ctx.restore();
            }

            // kính
            ctx.fillStyle = "#5be8ff";
            ctx.fillRect(x + frame, y + frame, w - 2 * frame, h - 2 * frame);

            // đường chéo thể hiện hướng mở
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            
            if (node.open === "left") {
                ctx.moveTo(x + frame, y + frame);
                ctx.lineTo(x + w - frame, y + h - frame);
            } else if (node.open === "right") {
                ctx.moveTo(x + w - frame, y + frame);
                ctx.lineTo(x + frame, y + h - frame);
            } else if (node.open === "tilt") {
                ctx.moveTo(x + frame, y + frame);
                ctx.lineTo(x + w - frame, y + h * 0.4);
            } else if (node.open && node.open.startsWith("slide")) {
                // mũi tên trượt
                this._drawSlideArrow(node.open, x, y, w, h);
                ctx.stroke();
                return;
            } else if (node.open === "fixed" || node.role === "fix") {
                // Vách cố định - không vẽ đường chéo
                ctx.stroke();
                return;
            }
            
            ctx.stroke();

            return;
        }

        // nếu là group → chia ô
        if (node.kind === "group") {
            if (node.split === "vertical") {
                const totalRatio = node.children.reduce((sum, c) => sum + (c.widthRatio || 1), 0);
                let curX = x;
                
                node.children.forEach((child, index) => {
                    const r = child.widthRatio || 1;
                    const cw = (r / totalRatio) * w;
                    this._drawLayoutNode(child, curX, y, cw, h, selectedPath, [...path, index]);
                    curX += cw;
                });
            } else if (node.split === "horizontal") {
                const totalRatio = node.children.reduce((sum, c) => sum + (c.heightRatio || 1), 0);
                let curY = y;
                
                node.children.forEach((child, index) => {
                    const r = child.heightRatio || 1;
                    const ch = (r / totalRatio) * h;
                    this._drawLayoutNode(child, x, curY, w, ch, selectedPath, [...path, index]);
                    curY += ch;
                });
            }
        }
    }

    _drawSlideArrow(direction, x, y, w, h) {
        const ctx = this.ctx;
        const midY = y + h / 2;
        const padding = w * 0.15;
        const arrowSize = 8;

        ctx.beginPath();
        ctx.strokeStyle = "#0080ff";
        ctx.lineWidth = 2;

        if (direction === "slide_left") {
            ctx.moveTo(x + w - padding, midY);
            ctx.lineTo(x + padding, midY);
            ctx.lineTo(x + padding + arrowSize, midY - arrowSize);
            ctx.moveTo(x + padding, midY);
            ctx.lineTo(x + padding + arrowSize, midY + arrowSize);
        } else {
            ctx.moveTo(x + padding, midY);
            ctx.lineTo(x + w - padding, midY);
            ctx.lineTo(x + w - padding - arrowSize, midY - arrowSize);
            ctx.moveTo(x + w - padding, midY);
            ctx.lineTo(x + w - padding - arrowSize, midY + arrowSize);
        }
    }

    /**
     * Draw grid background (like AutoCAD)
     */
    _drawGrid() {
        const ctx = this.ctx;
        ctx.save();
        
        const gridSize = 10 * this.scale; // 10mm grid in real units
        const gridColor = '#e5e7eb'; // Light gray
        const majorGridColor = '#d1d5db'; // Slightly darker for major lines
        
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        
        // Draw vertical lines
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        
        // Draw major grid lines (every 100mm)
        ctx.strokeStyle = majorGridColor;
        ctx.lineWidth = 1;
        const majorGridSize = 100 * this.scale;
        
        for (let x = 0; x < this.canvas.width; x += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    _drawDimensions(x, y, w, h, widthMm, heightMm) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = "#555";
        ctx.fillStyle = "#000";
        ctx.lineWidth = 1;

        // kích thước đứng
        const offs = 40;
        const leftX = x - offs;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(leftX, y + h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(leftX - 5, y);
        ctx.lineTo(leftX + 5, y);
        ctx.moveTo(leftX - 5, y + h);
        ctx.lineTo(leftX + 5, y + h);
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px Arial";
        ctx.fillText(`${heightMm}`, leftX - 25, y + h / 2);

        // kích thước ngang
        const bottomY = y + h + offs;
        ctx.beginPath();
        ctx.moveTo(x, bottomY);
        ctx.lineTo(x + w, bottomY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, bottomY - 5);
        ctx.lineTo(x, bottomY + 5);
        ctx.moveTo(x + w, bottomY - 5);
        ctx.lineTo(x + w, bottomY + 5);
        ctx.stroke();

        ctx.fillText(`${widthMm}`, x + w / 2, bottomY + 20);

        ctx.restore();
    }

    /**
     * So sánh 2 path có giống nhau không
     */
    isSamePath(p1, p2) {
        if (!p1 || !p2 || p1.length !== p2.length) return false;
        return p1.every((v, i) => v === p2[i]);
    }

    /**
     * Hit test - tìm panel tại vị trí click
     * @param {number} x - Canvas x coordinate
     * @param {number} y - Canvas y coordinate
     * @returns {Object|null} Hit region hoặc null
     */
    hitTest(x, y) {
        // Đi ngược từ cuối về đầu để ưu tiên panel trên cùng
        for (let i = this.hitRegions.length - 1; i >= 0; i--) {
            const r = this.hitRegions[i];
            const { x: rx, y: ry, w, h } = r.bounds;
            if (x >= rx && x <= rx + w && y >= ry && y <= ry + h) {
                return r;
            }
        }
        return null;
    }
    
    /**
     * Hit test for dividers (mullions) - for resizing panels
     * @param {number} x - Canvas x coordinate
     * @param {number} y - Canvas y coordinate
     * @returns {Object|null} Divider region hoặc null
     */
    hitTestDivider(x, y) {
        for (let i = this.dividerRegions.length - 1; i >= 0; i--) {
            const r = this.dividerRegions[i];
            const { x: rx, y: ry, w, h } = r.bounds;
            if (x >= rx && x <= rx + w && y >= ry && y <= ry + h) {
                return {
                    ...r,
                    parentPath: r.parentPath
                };
            }
        }
        return null;
    }
}

// Export để sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DoorCanvasEngine };
}
