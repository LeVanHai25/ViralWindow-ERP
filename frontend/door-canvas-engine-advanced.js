// ============================================
// DOOR CANVAS ENGINE ADVANCED - Vẽ cửa tự động với Zoom, Pan, Resize, Kéo thả
// Giống phần mềm draw.phanmemcua.com
// ============================================

class DoorCanvasEngineAdvanced {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.template = null;
        this.widthMM = options.defaultWidth || 1200;
        this.heightMM = options.defaultHeight || 2400;
        
        // Zoom và Pan
        this.scale = options.initialScale || 1.0;
        this.minScale = options.minScale || 0.1;
        this.maxScale = options.maxScale || 5.0;
        this.panX = 0;
        this.panY = 0;
        
        // Kích thước canvas
        this.canvasWidth = this.canvas.width || this.canvas.clientWidth;
        this.canvasHeight = this.canvas.height || this.canvas.clientHeight;
        
        // Resize handles
        this.resizeHandles = [];
        this.selectedHandle = null;
        this.isResizing = false;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        // Show resize handles by default
        this.showResizeHandles = true;
        
        // Glass color
        this.glassColor = options.glassColor || '#87CEEB';
        
        // Tính toán kích thước
        this.calculatedDimensions = {};
        
        // Event listeners
        this.setupEventListeners();
        
        // Initial draw
        this.draw();
    }

    // Setup event listeners cho zoom, pan, resize
    setupEventListeners() {
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom(delta, e.offsetX, e.offsetY);
        });

        // Pan với mouse drag
        let isPanning = false;
        let panStartX = 0;
        let panStartY = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Kiểm tra xem có click vào resize handle không
            const handle = this.getHandleAt(x, y);
            if (handle) {
                this.selectedHandle = handle;
                this.isResizing = true;
                this.dragStartX = x;
                this.dragStartY = y;
                this.canvas.style.cursor = 'nwse-resize';
                return;
            }

            // Kiểm tra xem có click vào cửa không (để drag)
            if (this.isPointInDoor(x, y)) {
                this.isDragging = true;
                this.dragStartX = x;
                this.dragStartY = y;
                this.canvas.style.cursor = 'move';
                return;
            }

            // Pan
            isPanning = true;
            panStartX = x;
            panStartY = y;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.isResizing && this.selectedHandle) {
                this.handleResize(x, y);
                return;
            }

            if (this.isDragging) {
                this.handleDrag(x, y);
                return;
            }

            // Update cursor
            const handle = this.getHandleAt(x, y);
            if (handle) {
                this.canvas.style.cursor = 'nwse-resize';
            } else if (this.isPointInDoor(x, y)) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'default';
            }

            if (isPanning) {
                const dx = x - panStartX;
                const dy = y - panStartY;
                this.panX += dx;
                this.panY += dy;
                panStartX = x;
                panStartY = y;
                this.draw();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            isPanning = false;
            this.isResizing = false;
            this.isDragging = false;
            this.selectedHandle = null;
            this.canvas.style.cursor = 'default';
        });

        this.canvas.addEventListener('mouseleave', () => {
            isPanning = false;
            this.isResizing = false;
            this.isDragging = false;
            this.selectedHandle = null;
            this.canvas.style.cursor = 'default';
        });
    }

    // Zoom
    zoom(factor, centerX, centerY) {
        const oldScale = this.scale;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
        
        // Zoom về điểm center
        const scaleChange = this.scale / oldScale;
        this.panX = centerX - (centerX - this.panX) * scaleChange;
        this.panY = centerY - (centerY - this.panY) * scaleChange;
        
        this.draw();
    }

    // Set zoom level
    setZoom(level) {
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, level));
        this.draw();
    }

    // Reset pan và zoom
    resetView() {
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.draw();
    }

    // Kiểm tra điểm có trong cửa không
    isPointInDoor(x, y) {
        const doorRect = this.getDoorRect();
        return x >= doorRect.x && x <= doorRect.x + doorRect.w &&
               y >= doorRect.y && y <= doorRect.y + doorRect.h;
    }

    // Lấy kích thước cửa trên canvas
    getDoorRect() {
        const margin = 20;
        const scaleMM = this.getScaleMM();
        const doorW = this.widthMM * scaleMM;
        const doorH = this.heightMM * scaleMM;
        const centerX = this.canvasWidth / 2 + this.panX;
        const centerY = this.canvasHeight / 2 + this.panY;
        
        return {
            x: centerX - doorW / 2,
            y: centerY - doorH / 2,
            w: doorW,
            h: doorH
        };
    }

    // Tính scale từ mm sang pixel
    getScaleMM() {
        const margin = 20;
        const availableW = (this.canvasWidth - margin * 2) / this.scale;
        const availableH = (this.canvasHeight - margin * 2) / this.scale;
        const scaleX = availableW / this.widthMM;
        const scaleY = availableH / this.heightMM;
        return Math.min(scaleX, scaleY) * this.scale;
    }

    // Lấy resize handle tại vị trí
    getHandleAt(x, y) {
        const doorRect = this.getDoorRect();
        const handleSize = 8;
        
        const handles = [
            { type: 'se', x: doorRect.x + doorRect.w, y: doorRect.y + doorRect.h }, // Bottom-right
            { type: 'sw', x: doorRect.x, y: doorRect.y + doorRect.h }, // Bottom-left
            { type: 'ne', x: doorRect.x + doorRect.w, y: doorRect.y }, // Top-right
            { type: 'nw', x: doorRect.x, y: doorRect.y }, // Top-left
            { type: 'e', x: doorRect.x + doorRect.w, y: doorRect.y + doorRect.h / 2 }, // Right
            { type: 'w', x: doorRect.x, y: doorRect.y + doorRect.h / 2 }, // Left
            { type: 's', x: doorRect.x + doorRect.w / 2, y: doorRect.y + doorRect.h }, // Bottom
            { type: 'n', x: doorRect.x + doorRect.w / 2, y: doorRect.y } // Top
        ];

        for (const handle of handles) {
            if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
                return handle;
            }
        }
        return null;
    }

    // Xử lý resize
    handleResize(x, y) {
        if (!this.selectedHandle) return;

        const doorRect = this.getDoorRect();
        const scaleMM = this.getScaleMM();
        const handle = this.selectedHandle;

        let newWidthMM = this.widthMM;
        let newHeightMM = this.heightMM;

        // Tính toán kích thước mới dựa vào handle
        if (handle.type.includes('e')) {
            const newWidth = (x - doorRect.x) / scaleMM;
            newWidthMM = Math.max(300, Math.min(5000, newWidth));
        }
        if (handle.type.includes('w')) {
            const newWidth = (doorRect.x + doorRect.w - x) / scaleMM;
            newWidthMM = Math.max(300, Math.min(5000, newWidth));
            this.panX += (this.widthMM - newWidthMM) * scaleMM / 2;
        }
        if (handle.type.includes('s')) {
            const newHeight = (y - doorRect.y) / scaleMM;
            newHeightMM = Math.max(300, Math.min(5000, newHeight));
        }
        if (handle.type.includes('n')) {
            const newHeight = (doorRect.y + doorRect.h - y) / scaleMM;
            newHeightMM = Math.max(300, Math.min(5000, newHeight));
            this.panY += (this.heightMM - newHeightMM) * scaleMM / 2;
        }

        this.widthMM = newWidthMM;
        this.heightMM = newHeightMM;
        this.calculateDimensions();
        this.draw();
        
        // Trigger event
        if (this.onDimensionsChange) {
            this.onDimensionsChange(this.widthMM, this.heightMM);
        }
    }

    // Xử lý drag cửa
    handleDrag(x, y) {
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        this.panX += dx;
        this.panY += dy;
        this.dragStartX = x;
        this.dragStartY = y;
        this.draw();
    }

    // Set template
    setTemplate(template) {
        this.template = template;
        if (template && template.defaultWidth) {
            this.widthMM = template.defaultWidth;
        }
        if (template && template.defaultHeight) {
            this.heightMM = template.defaultHeight;
        }
        this.calculateDimensions();
        this.draw();
    }

    // Set dimensions
    setDimensions(widthMM, heightMM) {
        this.widthMM = Math.max(300, Math.min(5000, widthMM));
        this.heightMM = Math.max(300, Math.min(5000, heightMM));
        this.calculateDimensions();
        this.draw();
    }

    // Set glass color
    setGlassColor(color) {
        this.glassColor = color;
        this.draw();
    }

    // Tính toán kích thước (K1, K2, K3, K4, glass dimensions)
    calculateDimensions() {
        if (!this.template) {
            this.calculatedDimensions = {
                H_total: this.heightMM,
                B_total: this.widthMM
            };
            return;
        }

        const structure = this.template.structure || {};
        const cells = this.template.cells || [];
        const rows = this.template.rows || 1;
        const cols = this.template.cols || 1;

        // Tính kích thước frame deduction (giả sử 50mm cho width, 30mm cho height)
        const frameDeductionW = 50;
        const frameDeductionH = 30;
        const glassDeductionW = 40;
        const glassDeductionH = 40;

        // Tính kích thước từng cell
        const cellWidth = (this.widthMM - frameDeductionW * 2) / cols;
        const cellHeight = (this.heightMM - frameDeductionH * 2) / rows;

        const dimensions = {
            H_total: this.heightMM,
            B_total: this.widthMM,
            cells: []
        };

        cells.forEach((cell, index) => {
            const cellW = cellWidth;
            const cellH = cellHeight;
            const glassW = cellW - glassDeductionW;
            const glassH = cellH - glassDeductionH;

            dimensions.cells.push({
                label: cell.label || `K${index + 1}`,
                width: Math.round(cellW),
                height: Math.round(cellH),
                glass_width: Math.round(glassW),
                glass_height: Math.round(glassH)
            });
        });

        // Tính tổng kích thước kính
        dimensions.glass_total_width = dimensions.cells.reduce((sum, cell) => sum + cell.glass_width, 0);
        dimensions.glass_total_height = dimensions.cells[0]?.glass_height || 0;

        this.calculatedDimensions = dimensions;
    }

    // Get calculated dimensions
    getCalculatedDimensions() {
        return this.calculatedDimensions;
    }

    // Draw door
    draw() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!this.template) {
            // Draw placeholder
            ctx.fillStyle = '#999999';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Chọn template cửa để bắt đầu', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Apply transform
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);

        const margin = 20 / this.scale;
        const scaleMM = this.getScaleMM() / this.scale;
        
        const doorW = this.widthMM * scaleMM;
        const doorH = this.heightMM * scaleMM;
        const centerX = (canvas.width / this.scale) / 2;
        const centerY = (canvas.height / this.scale) / 2;
        
        const startX = centerX - doorW / 2;
        const startY = centerY - doorH / 2;

        // Draw outer frame
        ctx.lineWidth = 3 / this.scale;
        ctx.strokeStyle = '#333333';
        ctx.strokeRect(startX, startY, doorW, doorH);

        // Frame thickness
        const frameThk = 8 * scaleMM;
        const rows = this.template.rows || 1;
        const cols = this.template.cols || 1;
        const cellW = (doorW - frameThk * 2) / cols;
        const cellH = (doorH - frameThk * 2) / rows;

        // Draw cells
        if (this.template.cells && this.template.cells.length > 0) {
            this.template.cells.forEach(cell => {
                const x = startX + frameThk + cell.c * cellW;
                const y = startY + frameThk + cell.r * cellH;

                // Glass background
                ctx.fillStyle = this.glassColor;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, y, cellW, cellH);
                ctx.globalAlpha = 1.0;

                // Cell border (aluminum frame)
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 2 / this.scale;
                ctx.strokeRect(x, y, cellW, cellH);

                // Draw opening direction
                this.drawOpeningDirection(ctx, cell, x, y, cellW, cellH);

                // Label (K1, K2, etc.)
                if (cell.label) {
                    ctx.fillStyle = '#0000FF';
                    ctx.font = `bold ${Math.max(12, 14 * scaleMM)}px Arial`;
                    ctx.fillText(cell.label, x + cellW * 0.05, y + cellH * 0.15);
                }
            });
        } else {
            // Simple single panel
            const x = startX + frameThk;
            const y = startY + frameThk;
            const w = doorW - frameThk * 2;
            const h = doorH - frameThk * 2;

            ctx.fillStyle = this.glassColor;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1.0;

            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2 / this.scale;
            ctx.strokeRect(x, y, w, h);

            // Diagonal
            ctx.strokeStyle = '#4A90E2';
            ctx.lineWidth = 1 / this.scale;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y + h);
            ctx.moveTo(x + w, y);
            ctx.lineTo(x, y + h);
            ctx.stroke();
        }

        // Draw dimensions
        this.drawDimensions(ctx, startX, startY, doorW, doorH, scaleMM);

        ctx.restore();

        // Draw resize handles nếu đang trong chế độ edit
        if (this.showResizeHandles !== false) {
            this.drawResizeHandles();
        }
    }

    // Vẽ hướng mở cửa
    drawOpeningDirection(ctx, cell, x, y, w, h) {
        if (cell.type !== 'sash') return;

        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2 / this.scale;
        ctx.beginPath();

        if (cell.sashType === 'swing') {
            // Swing door - vẽ mũi tên
            if (cell.openDir === 'left') {
                ctx.moveTo(x + w * 0.2, y + h * 0.5);
                ctx.lineTo(x + w * 0.8, y + h * 0.2);
                ctx.lineTo(x + w * 0.8, y + h * 0.8);
                ctx.closePath();
            } else if (cell.openDir === 'right') {
                ctx.moveTo(x + w * 0.8, y + h * 0.5);
                ctx.lineTo(x + w * 0.2, y + h * 0.2);
                ctx.lineTo(x + w * 0.2, y + h * 0.8);
                ctx.closePath();
            } else if (cell.openDir === 'both') {
                // Cả 2 hướng
                ctx.moveTo(x + w * 0.2, y + h * 0.5);
                ctx.lineTo(x + w * 0.8, y + h * 0.2);
                ctx.lineTo(x + w * 0.8, y + h * 0.8);
                ctx.closePath();
                ctx.moveTo(x + w * 0.8, y + h * 0.5);
                ctx.lineTo(x + w * 0.2, y + h * 0.2);
                ctx.lineTo(x + w * 0.2, y + h * 0.8);
                ctx.closePath();
            }
        } else if (cell.sashType === 'sliding') {
            // Sliding door - vẽ mũi tên ngang
            if (cell.slideDir === 'left') {
                ctx.moveTo(x + w * 0.3, y + h * 0.5);
                ctx.lineTo(x + w * 0.7, y + h * 0.3);
                ctx.lineTo(x + w * 0.7, y + h * 0.7);
                ctx.closePath();
            } else if (cell.slideDir === 'right') {
                ctx.moveTo(x + w * 0.7, y + h * 0.5);
                ctx.lineTo(x + w * 0.3, y + h * 0.3);
                ctx.lineTo(x + w * 0.3, y + h * 0.7);
                ctx.closePath();
            } else if (cell.slideDir === 'both') {
                ctx.moveTo(x + w * 0.3, y + h * 0.5);
                ctx.lineTo(x + w * 0.7, y + h * 0.3);
                ctx.lineTo(x + w * 0.7, y + h * 0.7);
                ctx.closePath();
                ctx.moveTo(x + w * 0.7, y + h * 0.5);
                ctx.lineTo(x + w * 0.3, y + h * 0.3);
                ctx.lineTo(x + w * 0.3, y + h * 0.7);
                ctx.closePath();
            }
        } else if (cell.sashType === 'top_hung') {
            // Top hung - vẽ mũi tên lên trên
            ctx.moveTo(x + w * 0.5, y + h * 0.7);
            ctx.lineTo(x + w * 0.3, y + h * 0.3);
            ctx.lineTo(x + w * 0.7, y + h * 0.3);
            ctx.closePath();
        }

        ctx.stroke();
    }

    // Vẽ kích thước trực tiếp trên canvas
    drawDimensions(ctx, startX, startY, doorW, doorH, scaleMM) {
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 1.5 / this.scale;
        const fontSize = Math.max(12, 14 * scaleMM);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Width dimension (B) - bottom với đường kẻ và số
        const dimY = startY + doorH + 30 / this.scale;
        const dimLineY = startY + doorH + 20 / this.scale;
        
        // Vẽ đường kích thước ngang
        ctx.beginPath();
        ctx.moveTo(startX, dimLineY);
        ctx.lineTo(startX + doorW, dimLineY);
        ctx.stroke();
        
        // Vẽ mũi tên và số ở 2 đầu
        const arrowSize = 6 / this.scale;
        // Mũi tên trái
        ctx.beginPath();
        ctx.moveTo(startX, dimLineY);
        ctx.lineTo(startX + arrowSize, dimLineY - arrowSize);
        ctx.moveTo(startX, dimLineY);
        ctx.lineTo(startX + arrowSize, dimLineY + arrowSize);
        ctx.stroke();
        
        // Mũi tên phải
        ctx.beginPath();
        ctx.moveTo(startX + doorW, dimLineY);
        ctx.lineTo(startX + doorW - arrowSize, dimLineY - arrowSize);
        ctx.moveTo(startX + doorW, dimLineY);
        ctx.lineTo(startX + doorW - arrowSize, dimLineY + arrowSize);
        ctx.stroke();
        
        // Hiển thị số kích thước
        ctx.fillStyle = '#000000';
        ctx.fillText(this.widthMM + ' mm', startX + doorW / 2, dimY);
        ctx.fillText('B', startX + doorW / 2, dimY + 18 / this.scale);

        // Height dimension (H) - right với đường kẻ và số
        const dimX = startX + doorW + 30 / this.scale;
        const dimLineX = startX + doorW + 20 / this.scale;
        
        // Vẽ đường kích thước dọc
        ctx.beginPath();
        ctx.moveTo(dimLineX, startY);
        ctx.lineTo(dimLineX, startY + doorH);
        ctx.stroke();
        
        // Mũi tên trên
        ctx.beginPath();
        ctx.moveTo(dimLineX, startY);
        ctx.lineTo(dimLineX - arrowSize, startY + arrowSize);
        ctx.moveTo(dimLineX, startY);
        ctx.lineTo(dimLineX + arrowSize, startY + arrowSize);
        ctx.stroke();
        
        // Mũi tên dưới
        ctx.beginPath();
        ctx.moveTo(dimLineX, startY + doorH);
        ctx.lineTo(dimLineX - arrowSize, startY + doorH - arrowSize);
        ctx.moveTo(dimLineX, startY + doorH);
        ctx.lineTo(dimLineX + arrowSize, startY + doorH - arrowSize);
        ctx.stroke();
        
        // Hiển thị số kích thước (xoay 90 độ)
        ctx.save();
        ctx.translate(dimX, startY + doorH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(this.heightMM + ' mm', 0, 0);
        ctx.fillText('H', 0, 18 / this.scale);
        ctx.restore();

        // Vẽ kích thước cho từng cell nếu có
        if (this.template && this.template.cells && this.template.cells.length > 0) {
            const rows = this.template.rows || 1;
            const cols = this.template.cols || 1;
            const frameThk = 8 * scaleMM;
            const cellW = (doorW - frameThk * 2) / cols;
            const cellH = (doorH - frameThk * 2) / rows;

            this.template.cells.forEach(cell => {
                const x = startX + frameThk + cell.c * cellW;
                const y = startY + frameThk + cell.r * cellH;
                
                // Tính kích thước thực của cell (mm)
                const cellWidthMM = Math.round(cellW / scaleMM);
                const cellHeightMM = Math.round(cellH / scaleMM);
                
                // Vẽ label K1, K2, K3, K4 ở góc trên trái của cell
                if (cell.label) {
                    ctx.fillStyle = '#0066CC';
                    ctx.font = `bold ${Math.max(14, 16 * scaleMM)}px Arial`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(cell.label, x + 5 / this.scale, y + 5 / this.scale);
                    
                    // Vẽ kích thước cell bên dưới label
                    ctx.fillStyle = '#666666';
                    ctx.font = `${Math.max(10, 11 * scaleMM)}px Arial`;
                    ctx.fillText(`${cellWidthMM} x ${cellHeightMM} mm`, x + 5 / this.scale, y + 25 / this.scale);
                }
            });
        }
    }

    // Vẽ resize handles
    drawResizeHandles() {
        const doorRect = this.getDoorRect();
        const ctx = this.ctx;
        const handleSize = 8;

        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        const handles = [
            { x: doorRect.x + doorRect.w, y: doorRect.y + doorRect.h }, // SE
            { x: doorRect.x, y: doorRect.y + doorRect.h }, // SW
            { x: doorRect.x + doorRect.w, y: doorRect.y }, // NE
            { x: doorRect.x, y: doorRect.y }, // NW
            { x: doorRect.x + doorRect.w, y: doorRect.y + doorRect.h / 2 }, // E
            { x: doorRect.x, y: doorRect.y + doorRect.h / 2 }, // W
            { x: doorRect.x + doorRect.w / 2, y: doorRect.y + doorRect.h }, // S
            { x: doorRect.x + doorRect.w / 2, y: doorRect.y } // N
        ];

        handles.forEach(handle => {
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, handleSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }

    // Get image as data URL
    toDataURL(format = 'image/png', quality = 1.0) {
        // Tạo canvas tạm với kích thước đầy đủ
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.widthMM;
        tempCanvas.height = this.heightMM;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Vẽ lại cửa lên canvas tạm với scale 1:1
        const oldScale = this.scale;
        const oldPanX = this.panX;
        const oldPanY = this.panY;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.canvas = tempCanvas;
        this.ctx = tempCtx;
        this.canvasWidth = tempCanvas.width;
        this.canvasHeight = tempCanvas.height;
        this.draw();
        
        const dataURL = tempCanvas.toDataURL(format, quality);
        
        // Restore
        this.scale = oldScale;
        this.panX = oldPanX;
        this.panY = oldPanY;
        
        return dataURL;
    }

    // Get SVG
    toSVG() {
        if (!this.template) return '';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', this.widthMM);
        svg.setAttribute('height', this.heightMM);
        svg.setAttribute('viewBox', `0 0 ${this.widthMM} ${this.heightMM}`);

        // Draw frame
        const frame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        frame.setAttribute('x', '0');
        frame.setAttribute('y', '0');
        frame.setAttribute('width', this.widthMM);
        frame.setAttribute('height', this.heightMM);
        frame.setAttribute('fill', 'none');
        frame.setAttribute('stroke', '#333333');
        frame.setAttribute('stroke-width', '3');
        svg.appendChild(frame);

        // Draw cells
        if (this.template.cells) {
            const rows = this.template.rows || 1;
            const cols = this.template.cols || 1;
            const frameThk = 8;
            const cellW = (this.widthMM - frameThk * 2) / cols;
            const cellH = (this.heightMM - frameThk * 2) / rows;

            this.template.cells.forEach(cell => {
                const x = frameThk + cell.c * cellW;
                const y = frameThk + cell.r * cellH;

                // Glass
                const glass = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                glass.setAttribute('x', x);
                glass.setAttribute('y', y);
                glass.setAttribute('width', cellW);
                glass.setAttribute('height', cellH);
                glass.setAttribute('fill', this.glassColor);
                glass.setAttribute('opacity', '0.3');
                svg.appendChild(glass);

                // Frame
                const cellFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                cellFrame.setAttribute('x', x);
                cellFrame.setAttribute('y', y);
                cellFrame.setAttribute('width', cellW);
                cellFrame.setAttribute('height', cellH);
                cellFrame.setAttribute('fill', 'none');
                cellFrame.setAttribute('stroke', '#666666');
                cellFrame.setAttribute('stroke-width', '2');
                svg.appendChild(cellFrame);

                // Label
                if (cell.label) {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', x + cellW * 0.05);
                    text.setAttribute('y', y + cellH * 0.15);
                    text.setAttribute('fill', '#0000FF');
                    text.setAttribute('font-size', '14');
                    text.setAttribute('font-weight', 'bold');
                    text.textContent = cell.label;
                    svg.appendChild(text);
                }
            });
        }

        return new XMLSerializer().serializeToString(svg);
    }

    // Resize canvas
    resizeCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.draw();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DoorCanvasEngineAdvanced;
}

