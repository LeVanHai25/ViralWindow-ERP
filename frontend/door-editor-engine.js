/**
 * DOOR EDITOR ENGINE - Canvas Engine với Konva.js
 * Vẽ cửa, kéo thả, chia đố, đổi loại cửa
 */

class DoorEditorEngine {
    constructor(canvasId, options = {}) {
        this.canvasId = canvasId;
        this.width = options.width || 1200;
        this.height = options.height || 800;
        this.scale = options.scale || 1;
        this.panX = 0;
        this.panY = 0;
        
        // Initialize Konva stage
        this.stage = new Konva.Stage({
            container: canvasId,
            width: this.width,
            height: this.height
        });
        
        // Main layer
        this.mainLayer = new Konva.Layer();
        this.stage.add(this.mainLayer);
        
        // Grid layer
        this.gridLayer = new Konva.Layer();
        this.stage.add(this.gridLayer);
        this.drawGrid();
        
        // Door model
        this.doorModel = null;
        
        // Selected panel
        this.selectedPanel = null;
        
        // Event handlers
        this.setupEventHandlers();
    }

    /**
     * Load door model
     */
    loadDoorModel(doorModel) {
        this.doorModel = doorModel;
        this.render();
    }

    /**
     * Load from template
     */
    async loadTemplate(templateId, width = 1800, height = 2200) {
        // Load templates
        if (!window.doorTemplates) {
            const response = await fetch('door-templates.json');
            window.doorTemplates = await response.json();
        }
        
        const template = window.doorTemplates.templates.find(t => t.id === templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        
        this.doorModel = new DoorModel(template, width, height);
        this.render();
        
        return this.doorModel;
    }

    /**
     * Render door trên canvas
     */
    render() {
        if (!this.doorModel) return;
        
        // Clear main layer
        this.mainLayer.destroyChildren();
        
        const { width, height, panels, bars } = this.doorModel;
        const scale = Math.min(this.width / (width + 200), this.height / (height + 200), 1) * 0.8;
        const offsetX = (this.width - width * scale) / 2;
        const offsetY = (this.height - height * scale) / 2;
        
        // Draw frame
        this.drawFrame(width, height, scale, offsetX, offsetY);
        
        // Draw bars
        bars.forEach(bar => {
            this.drawBar(bar, scale, offsetX, offsetY);
        });
        
        // Draw panels
        panels.forEach((panel, index) => {
            this.drawPanel(panel, scale, offsetX, offsetY, index);
        });
        
        // Draw dimensions
        this.drawDimensions(width, height, scale, offsetX, offsetY);
        
        this.mainLayer.draw();
    }

    /**
     * Vẽ khung bao
     */
    drawFrame(width, height, scale, offsetX, offsetY) {
        const frameGroup = new Konva.Group({
            x: offsetX,
            y: offsetY
        });
        
        // Khung bao
        const frameRect = new Konva.Rect({
            x: 0,
            y: 0,
            width: width * scale,
            height: height * scale,
            stroke: '#1f2937',
            strokeWidth: 3,
            fill: 'transparent',
            dash: [5, 5]
        });
        
        frameGroup.add(frameRect);
        this.mainLayer.add(frameGroup);
    }

    /**
     * Vẽ đố
     */
    drawBar(bar, scale, offsetX, offsetY) {
        const barGroup = new Konva.Group({
            x: offsetX + bar.x * scale,
            y: offsetY + bar.y * scale
        });
        
        if (bar.type === 'vertical') {
            const line = new Konva.Line({
                points: [0, 0, 0, bar.length * scale],
                stroke: '#6b7280',
                strokeWidth: 2,
                dash: [3, 3]
            });
            barGroup.add(line);
        } else if (bar.type === 'horizontal') {
            const line = new Konva.Line({
                points: [0, 0, bar.length * scale, 0],
                stroke: '#6b7280',
                strokeWidth: 2,
                dash: [3, 3]
            });
            barGroup.add(line);
        }
        
        this.mainLayer.add(barGroup);
    }

    /**
     * Vẽ cánh
     */
    drawPanel(panel, scale, offsetX, offsetY, index) {
        const panelGroup = new Konva.Group({
            x: offsetX + panel.x * scale,
            y: offsetY + panel.y * scale,
            draggable: false
        });
        
        // Panel rectangle
        const rect = new Konva.Rect({
            width: panel.width * scale,
            height: panel.height * scale,
            stroke: panel.type === 'fix' ? '#9ca3af' : '#3b82f6',
            strokeWidth: 2,
            fill: panel.type === 'fix' ? '#f3f4f6' : 'rgba(59, 130, 246, 0.1)',
            cornerRadius: 2
        });
        
        // Glass fill
        const glassFill = new Konva.Rect({
            width: panel.width * scale - 20,
            height: panel.height * scale - 20,
            x: 10,
            y: 10,
            fill: this.getGlassColor(panel.glass),
            opacity: 0.3,
            cornerRadius: 2
        });
        
        panelGroup.add(rect);
        panelGroup.add(glassFill);
        
        // Draw opening direction arrow
        if (panel.openType) {
            this.drawOpeningArrow(panelGroup, panel, scale);
        }
        
        // Panel ID label
        const label = new Konva.Text({
            x: 5,
            y: 5,
            text: panel.id,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#1f2937',
            fontStyle: 'bold'
        });
        panelGroup.add(label);
        
        // Dimensions
        const dimText = new Konva.Text({
            x: panel.width * scale / 2,
            y: panel.height * scale / 2,
            text: `${Math.round(panel.width)}×${Math.round(panel.height)}`,
            fontSize: 10,
            fontFamily: 'Arial',
            fill: '#6b7280',
            align: 'center',
            offsetX: 30,
            offsetY: 5
        });
        panelGroup.add(dimText);
        
        // Click handler
        panelGroup.on('click', () => {
            this.selectPanel(panel, panelGroup);
        });
        
        // Store reference
        panelGroup.panelData = panel;
        
        this.mainLayer.add(panelGroup);
    }

    /**
     * Vẽ mũi tên hướng mở
     */
    drawOpeningArrow(group, panel, scale) {
        const centerX = panel.width * scale / 2;
        const centerY = panel.height * scale / 2;
        const arrowSize = Math.min(panel.width, panel.height) * scale * 0.15;
        
        let arrowPoints = [];
        
        if (panel.openType === 'left') {
            arrowPoints = [
                centerX, centerY,
                centerX - arrowSize, centerY - arrowSize / 2,
                centerX - arrowSize * 0.7, centerY,
                centerX - arrowSize, centerY + arrowSize / 2
            ];
        } else if (panel.openType === 'right') {
            arrowPoints = [
                centerX, centerY,
                centerX + arrowSize, centerY - arrowSize / 2,
                centerX + arrowSize * 0.7, centerY,
                centerX + arrowSize, centerY + arrowSize / 2
            ];
        } else if (panel.openType === 'tilt') {
            arrowPoints = [
                centerX, centerY,
                centerX, centerY - arrowSize,
                centerX - arrowSize / 2, centerY - arrowSize * 0.7,
                centerX, centerY - arrowSize * 0.5,
                centerX + arrowSize / 2, centerY - arrowSize * 0.7
            ];
        }
        
        if (arrowPoints.length > 0) {
            const arrow = new Konva.Arrow({
                points: arrowPoints,
                pointerLength: arrowSize * 0.3,
                pointerWidth: arrowSize * 0.3,
                fill: '#ef4444',
                stroke: '#ef4444',
                strokeWidth: 2
            });
            group.add(arrow);
        }
    }

    /**
     * Vẽ kích thước
     */
    drawDimensions(width, height, scale, offsetX, offsetY) {
        const dimGroup = new Konva.Group();
        
        // Width dimension
        const widthLine = new Konva.Line({
            points: [offsetX, offsetY - 30, offsetX + width * scale, offsetY - 30],
            stroke: '#6b7280',
            strokeWidth: 1
        });
        dimGroup.add(widthLine);
        
        const widthText = new Konva.Text({
            x: offsetX + width * scale / 2,
            y: offsetY - 45,
            text: `${width}mm`,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#374151',
            align: 'center',
            offsetX: 25
        });
        dimGroup.add(widthText);
        
        // Height dimension
        const heightLine = new Konva.Line({
            points: [offsetX - 30, offsetY, offsetX - 30, offsetY + height * scale],
            stroke: '#6b7280',
            strokeWidth: 1
        });
        dimGroup.add(heightLine);
        
        const heightText = new Konva.Text({
            x: offsetX - 50,
            y: offsetY + height * scale / 2,
            text: `${height}mm`,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#374151',
            align: 'center',
            offsetX: 25,
            rotation: -90
        });
        dimGroup.add(heightText);
        
        this.mainLayer.add(dimGroup);
    }

    /**
     * Vẽ grid
     */
    drawGrid() {
        const gridSize = 20;
        const gridLines = [];
        
        for (let i = 0; i < this.width; i += gridSize) {
            gridLines.push(
                new Konva.Line({
                    points: [i, 0, i, this.height],
                    stroke: '#e5e7eb',
                    strokeWidth: 0.5
                })
            );
        }
        
        for (let i = 0; i < this.height; i += gridSize) {
            gridLines.push(
                new Konva.Line({
                    points: [0, i, this.width, i],
                    stroke: '#e5e7eb',
                    strokeWidth: 0.5
                })
            );
        }
        
        gridLines.forEach(line => this.gridLayer.add(line));
        this.gridLayer.draw();
    }

    /**
     * Select panel
     */
    selectPanel(panel, group) {
        // Deselect previous
        if (this.selectedPanel) {
            this.selectedPanel.stroke('#3b82f6');
            this.selectedPanel.strokeWidth(2);
        }
        
        // Select new
        this.selectedPanel = group.findOne('Rect');
        if (this.selectedPanel) {
            this.selectedPanel.stroke('#ef4444');
            this.selectedPanel.strokeWidth(3);
        }
        
        this.mainLayer.draw();
        
        // Trigger event
        if (this.onPanelSelect) {
            this.onPanelSelect(panel);
        }
    }

    /**
     * Thêm đố đứng
     */
    addVerticalBar(position) {
        if (!this.doorModel) return;
        this.doorModel.addVerticalBar(position);
        this.render();
    }

    /**
     * Thêm đố ngang
     */
    addHorizontalBar(position) {
        if (!this.doorModel) return;
        this.doorModel.addHorizontalBar(position);
        this.render();
    }

    /**
     * Đảo chiều mở
     */
    toggleOpenDirection(panelId) {
        if (!this.doorModel) return;
        this.doorModel.togglePanelOpenDirection(panelId);
        this.render();
    }

    /**
     * Đổi màu kính
     */
    changeGlassType(glassType) {
        if (!this.doorModel) return;
        this.doorModel.changeGlassType(glassType);
        this.render();
    }

    /**
     * Đổi hệ nhôm
     */
    changeAluminumSystem(systemName) {
        if (!this.doorModel) return;
        this.doorModel.changeAluminumSystem(systemName);
        this.render();
    }

    /**
     * Zoom
     */
    zoom(factor) {
        this.scale *= factor;
        this.stage.scale({ x: this.scale, y: this.scale });
        this.stage.draw();
    }

    /**
     * Reset zoom
     */
    resetZoom() {
        this.scale = 1;
        this.stage.scale({ x: 1, y: 1 });
        this.stage.draw();
    }

    /**
     * Pan
     */
    pan(dx, dy) {
        this.panX += dx;
        this.panY += dy;
        this.stage.position({ x: this.panX, y: this.panY });
        this.stage.draw();
    }

    /**
     * Center view
     */
    centerView() {
        this.panX = 0;
        this.panY = 0;
        this.scale = 1;
        this.stage.position({ x: 0, y: 0 });
        this.stage.scale({ x: 1, y: 1 });
        this.render();
    }

    /**
     * Export PNG
     */
    exportPNG() {
        const dataURL = this.stage.toDataURL({ pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = 'door-design.png';
        link.href = dataURL;
        link.click();
    }

    /**
     * Export SVG
     */
    exportSVG() {
        const svg = this.stage.toSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'door-design.svg';
        link.href = url;
        link.click();
    }

    /**
     * Get glass color
     */
    getGlassColor(glassType) {
        const colors = {
            '8ly': '#87ceeb',
            '10ly': '#4682b4',
            '12ly': '#1e90ff',
            'clear': '#e0f2fe',
            'tinted': '#4a5568'
        };
        return colors[glassType] || colors['8ly'];
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Mouse wheel zoom
        this.stage.on('wheel', (e) => {
            e.evt.preventDefault();
            const scaleBy = 1.1;
            const oldScale = this.stage.scaleX();
            const pointer = this.stage.getPointerPosition();
            const mousePointTo = {
                x: (pointer.x - this.stage.x()) / oldScale,
                y: (pointer.y - this.stage.y()) / oldScale
            };
            const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
            this.stage.scale({ x: newScale, y: newScale });
            const newPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale
            };
            this.stage.position(newPos);
            this.scale = newScale;
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DoorEditorEngine;
} else {
    window.DoorEditorEngine = DoorEditorEngine;
}

























