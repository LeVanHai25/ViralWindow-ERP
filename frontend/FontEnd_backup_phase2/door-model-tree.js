/**
 * DOOR MODEL ENGINE V2 - Panel Tree Structure
 * Tất cả chỉ là Panel Tree - mọi thao tác đều sửa cây
 */

class PanelNode {
    constructor(options = {}) {
        this.id = options.id || `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.isLeaf = options.isLeaf !== undefined ? options.isLeaf : true;
        this.split = options.split || null; // 'vertical' | 'horizontal' | null
        this.children = options.children || []; // Array of PanelNode
        
        // Leaf panel properties
        this.type = options.type || 'fixed'; // 'fixed' | 'window-turn-left' | 'window-turn-right' | 'window-tilt' | 'window-tilt-turn' | 'door-single-left' | 'door-single-right' | 'door-french' | 'sliding'
        this.openDirection = options.openDirection || null; // 'left' | 'right' | 'top' | 'bottom'
        this.isDoor = options.isDoor || false;
        this.isWindow = options.isWindow || false;
        
        // Hardware/accessories
        this.hardware = options.hardware || {
            hinges: 0,
            handle: false,
            lock: false
        };
        
        // Glass properties
        this.glassColor = options.glassColor || '#87CEEB';
        this.glassType = options.glassType || '8ly';
        
        // Dimensions (relative to parent or absolute)
        this.widthRatio = options.widthRatio || 1.0; // 0-1
        this.heightRatio = options.heightRatio || 1.0; // 0-1
        this.x = options.x || 0; // Absolute position (mm)
        this.y = options.y || 0; // Absolute position (mm)
        this.width = options.width || 0; // Absolute width (mm)
        this.height = options.height || 0; // Absolute height (mm)
        
        // Coupling (for joining multiple frames)
        this.coupled = options.coupled || false;
        this.couplingType = options.couplingType || null; // 'vertical' | 'horizontal'
        
        // Sliding door specific
        this.slidingPanels = options.slidingPanels || null; // For sliding doors
        this.slidingCount = options.slidingCount || 0;
    }
    
    /**
     * Check if this is a leaf panel
     */
    isLeafPanel() {
        return this.isLeaf && !this.split && this.children.length === 0;
    }
    
    /**
     * Check if this is a split panel
     */
    isSplitPanel() {
        return !this.isLeaf && this.split && this.children.length > 0;
    }
    
    /**
     * Clone this panel node
     */
    clone() {
        return new PanelNode({
            id: this.id + '_clone',
            isLeaf: this.isLeaf,
            split: this.split,
            children: this.children.map(c => c.clone()),
            type: this.type,
            openDirection: this.openDirection,
            isDoor: this.isDoor,
            isWindow: this.isWindow,
            hardware: { ...this.hardware },
            glassColor: this.glassColor,
            glassType: this.glassType,
            widthRatio: this.widthRatio,
            heightRatio: this.heightRatio,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            coupled: this.coupled,
            couplingType: this.couplingType,
            slidingPanels: this.slidingPanels ? [...this.slidingPanels] : null,
            slidingCount: this.slidingCount
        });
    }
    
    /**
     * Calculate absolute dimensions from parent
     */
    calculateDimensions(parentWidth, parentHeight, parentX = 0, parentY = 0) {
        this.width = parentWidth * this.widthRatio;
        this.height = parentHeight * this.heightRatio;
        this.x = parentX;
        this.y = parentY;
        
        // Recursively calculate children
        if (this.isSplitPanel()) {
            let currentX = this.x;
            let currentY = this.y;
            
            this.children.forEach((child, index) => {
                if (this.split === 'vertical') {
                    child.widthRatio = child.widthRatio || (1.0 / this.children.length);
                    child.calculateDimensions(
                        this.width * child.widthRatio,
                        this.height,
                        currentX,
                        this.y
                    );
                    currentX += child.width;
                } else if (this.split === 'horizontal') {
                    child.heightRatio = child.heightRatio || (1.0 / this.children.length);
                    child.calculateDimensions(
                        this.width,
                        this.height * child.heightRatio,
                        this.x,
                        currentY
                    );
                    currentY += child.height;
                }
            });
        }
    }
    
    /**
     * Find panel by path
     */
    findPanelByPath(path) {
        if (path.length === 0) {
            return this;
        }
        
        const [firstIndex, ...restPath] = path;
        if (this.children[firstIndex]) {
            return this.children[firstIndex].findPanelByPath(restPath);
        }
        
        return null;
    }
    
    /**
     * Get all leaf panels (flatten tree)
     */
    getAllLeafPanels() {
        if (this.isLeafPanel()) {
            return [this];
        }
        
        const leaves = [];
        this.children.forEach(child => {
            leaves.push(...child.getAllLeafPanels());
        });
        return leaves;
    }
    
    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            isLeaf: this.isLeaf,
            split: this.split,
            children: this.children.map(c => c.toJSON()),
            type: this.type,
            openDirection: this.openDirection,
            isDoor: this.isDoor,
            isWindow: this.isWindow,
            hardware: this.hardware,
            glassColor: this.glassColor,
            glassType: this.glassType,
            widthRatio: this.widthRatio,
            heightRatio: this.heightRatio,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            coupled: this.coupled,
            couplingType: this.couplingType,
            slidingPanels: this.slidingPanels,
            slidingCount: this.slidingCount
        };
    }
    
    /**
     * Load from JSON
     */
    static fromJSON(json) {
        const panel = new PanelNode({
            id: json.id,
            isLeaf: json.isLeaf,
            split: json.split,
            type: json.type,
            openDirection: json.openDirection,
            isDoor: json.isDoor,
            isWindow: json.isWindow,
            hardware: json.hardware,
            glassColor: json.glassColor,
            glassType: json.glassType,
            widthRatio: json.widthRatio,
            heightRatio: json.heightRatio,
            x: json.x,
            y: json.y,
            width: json.width,
            height: json.height,
            coupled: json.coupled,
            couplingType: json.couplingType,
            slidingPanels: json.slidingPanels,
            slidingCount: json.slidingCount
        });
        
        if (json.children && json.children.length > 0) {
            panel.children = json.children.map(c => PanelNode.fromJSON(c));
        }
        
        return panel;
    }
}

class DoorModelTree {
    constructor(width = 1800, height = 2200) {
        this.width = width;
        this.height = height;
        this.type = 'door_open';
        this.templateId = null;
        
        // Root panel (always exists)
        this.rootPanel = new PanelNode({
            id: 'root',
            isLeaf: false,
            width: width,
            height: height,
            x: 0,
            y: 0
        });
        
        // Initialize with single leaf panel
        const initialPanel = new PanelNode({
            id: 'panel_1',
            isLeaf: true,
            type: 'fixed',
            widthRatio: 1.0,
            heightRatio: 1.0
        });
        initialPanel.calculateDimensions(width, height, 0, 0);
        
        this.rootPanel.children = [initialPanel];
        this.rootPanel.split = null; // Root doesn't split, just contains one child
        
        this.aluminumSystem = null;
        this.glassType = '8ly';
        this.bars = []; // Mullions (for visualization)
    }
    
    /**
     * Update dimensions and recalculate all panels
     */
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.rootPanel.width = width;
        this.rootPanel.height = height;
        
        // Recalculate all children
        if (this.rootPanel.children.length > 0) {
            this.rootPanel.children.forEach(child => {
                child.calculateDimensions(width, height, 0, 0);
            });
        }
    }
    
    /**
     * Find panel by path (array of indices)
     */
    findPanelByPath(path) {
        if (path.length === 0) {
            return this.rootPanel;
        }
        
        // Path starts from rootPanel's children
        let current = this.rootPanel;
        for (const index of path) {
            if (current.children && current.children[index]) {
                current = current.children[index];
            } else {
                return null;
            }
        }
        return current;
    }
    
    /**
     * Split panel at path
     * @param {Array} path - Path to panel to split
     * @param {String} direction - 'vertical' | 'horizontal'
     * @param {Number} count - Number of panels to create (default: 2)
     * @param {Array} ratios - Optional array of ratios (e.g., [0.4, 0.6] or [1, 1, 1] for equal)
     */
    splitPanel(path, direction, count = 2, ratios = null) {
        const panel = this.findPanelByPath(path);
        if (!panel) {
            throw new Error(`Panel not found at path: ${path.join(',')}`);
        }
        
        if (!panel.isLeafPanel()) {
            throw new Error('Cannot split a non-leaf panel');
        }
        
        // Calculate ratios
        if (!ratios) {
            ratios = new Array(count).fill(1.0 / count); // Equal split
        } else if (ratios.length !== count) {
            throw new Error(`Ratios array length (${ratios.length}) must match count (${count})`);
        }
        
        // Normalize ratios
        const sum = ratios.reduce((a, b) => a + b, 0);
        ratios = ratios.map(r => r / sum);
        
        // Create children
        const children = [];
        let currentPos = 0;
        
        for (let i = 0; i < count; i++) {
            const child = new PanelNode({
                id: `${panel.id}_${i + 1}`,
                isLeaf: true,
                type: panel.type, // Inherit type
                openDirection: panel.openDirection,
                isDoor: panel.isDoor,
                isWindow: panel.isWindow,
                hardware: { ...panel.hardware },
                glassColor: panel.glassColor,
                glassType: panel.glassType,
                widthRatio: direction === 'vertical' ? ratios[i] : 1.0,
                heightRatio: direction === 'horizontal' ? ratios[i] : 1.0
            });
            
            children.push(child);
        }
        
        // Convert panel to split panel
        panel.isLeaf = false;
        panel.split = direction;
        panel.children = children;
        
        // Recalculate dimensions
        panel.calculateDimensions(panel.width, panel.height, panel.x, panel.y);
        
        // Add mullion bar
        if (direction === 'vertical') {
            for (let i = 1; i < count; i++) {
                const x = panel.x + children.slice(0, i).reduce((sum, c) => sum + c.width, 0);
                this.bars.push({
                    type: 'vertical',
                    x: x,
                    y: panel.y,
                    length: panel.height
                });
            }
        } else {
            for (let i = 1; i < count; i++) {
                const y = panel.y + children.slice(0, i).reduce((sum, c) => sum + c.height, 0);
                this.bars.push({
                    type: 'horizontal',
                    x: panel.x,
                    y: y,
                    length: panel.width
                });
            }
        }
        
        return panel;
    }
    
    /**
     * Merge panels (remove split, combine children)
     * @param {Array} path - Path to split panel to merge
     */
    mergePanels(path) {
        const panel = this.findPanelByPath(path);
        if (!panel) {
            throw new Error(`Panel not found at path: ${path.join(',')}`);
        }
        
        if (!panel.isSplitPanel()) {
            throw new Error('Cannot merge a non-split panel');
        }
        
        if (panel.children.length === 0) {
            throw new Error('Cannot merge panel with no children');
        }
        
        // Get first child as base
        const firstChild = panel.children[0];
        
        // Convert back to leaf
        panel.isLeaf = true;
        panel.split = null;
        panel.type = firstChild.type;
        panel.openDirection = firstChild.openDirection;
        panel.isDoor = firstChild.isDoor;
        panel.isWindow = firstChild.isWindow;
        panel.hardware = { ...firstChild.hardware };
        panel.glassColor = firstChild.glassColor;
        panel.glassType = firstChild.glassType;
        panel.widthRatio = 1.0;
        panel.heightRatio = 1.0;
        panel.children = [];
        
        // Recalculate dimensions
        panel.calculateDimensions(panel.width, panel.height, panel.x, panel.y);
        
        // Remove mullion bars for this panel
        this.bars = this.bars.filter(bar => {
            if (panel.split === 'vertical') {
                return !(bar.type === 'vertical' && 
                        bar.x >= panel.x && bar.x <= panel.x + panel.width &&
                        bar.y === panel.y);
            } else {
                return !(bar.type === 'horizontal' && 
                        bar.y >= panel.y && bar.y <= panel.y + panel.height &&
                        bar.x === panel.x);
            }
        });
        
        return panel;
    }
    
    /**
     * Apply window type to panel
     * @param {Array} path - Path to panel
     * @param {String} type - 'turn-left' | 'turn-right' | 'tilt' | 'tilt-turn' | 'tilt-slide' | 'fixed'
     */
    applyWindowType(path, type) {
        const panel = this.findPanelByPath(path);
        if (!panel) {
            throw new Error(`Panel not found at path: ${path.join(',')}`);
        }
        
        if (!panel.isLeafPanel()) {
            throw new Error('Cannot apply window type to non-leaf panel');
        }
        
        panel.type = `window-${type}`;
        panel.isWindow = true;
        panel.isDoor = false;
        
        // Set open direction
        if (type === 'turn-left') {
            panel.openDirection = 'left';
            panel.hardware = {
                hinges: 3,
                handle: true,
                lock: false
            };
        } else if (type === 'turn-right') {
            panel.openDirection = 'right';
            panel.hardware = {
                hinges: 3,
                handle: true,
                lock: false
            };
        } else if (type === 'tilt') {
            panel.openDirection = 'top';
            panel.hardware = {
                hinges: 2,
                handle: true,
                lock: false
            };
        } else if (type === 'tilt-turn') {
            panel.openDirection = 'left'; // Default
            panel.hardware = {
                hinges: 3, // 3D hinges
                handle: true,
                lock: false
            };
        } else if (type === 'tilt-slide') {
            panel.openDirection = 'top';
            panel.hardware = {
                hinges: 2,
                handle: true,
                lock: false
            };
        } else if (type === 'fixed') {
            panel.openDirection = null;
            panel.hardware = {
                hinges: 0,
                handle: false,
                lock: false
            };
        }
        
        return panel;
    }
    
    /**
     * Apply door type to panel
     * @param {Array} path - Path to panel
     * @param {String} type - 'single-left' | 'single-right' | 'french'
     */
    applyDoorType(path, type) {
        const panel = this.findPanelByPath(path);
        if (!panel) {
            throw new Error(`Panel not found at path: ${path.join(',')}`);
        }
        
        if (!panel.isLeafPanel()) {
            throw new Error('Cannot apply door type to non-leaf panel');
        }
        
        panel.type = `door-${type}`;
        panel.isDoor = true;
        panel.isWindow = false;
        
        if (type === 'single-left') {
            panel.openDirection = 'left';
            panel.hardware = {
                hinges: 3,
                handle: true,
                lock: true
            };
        } else if (type === 'single-right') {
            panel.openDirection = 'right';
            panel.hardware = {
                hinges: 3,
                handle: true,
                lock: true
            };
        } else if (type === 'french') {
            // French door: create master and slave panels
            // For now, just mark as french master
            panel.openDirection = 'left';
            panel.hardware = {
                hinges: 3,
                handle: true,
                lock: true
            };
            
            // TODO: Create adjacent slave panel if needed
        }
        
        return panel;
    }
    
    /**
     * Apply sliding door type
     * @param {Array} path - Path to panel (or parent if creating multiple)
     * @param {Number} count - Number of sliding panels (2, 3, or 4)
     */
    applySliding(path, count) {
        if (count < 2 || count > 4) {
            throw new Error('Sliding door count must be between 2 and 4');
        }
        
        const panel = this.findPanelByPath(path);
        if (!panel) {
            throw new Error(`Panel not found at path: ${path.join(',')}`);
        }
        
        // If panel is not split, split it first
        if (panel.isLeafPanel()) {
            this.splitPanel(path, 'vertical', count);
            panel = this.findPanelByPath(path); // Get updated panel
        }
        
        // Apply sliding type to all children
        panel.children.forEach((child, index) => {
            child.type = 'sliding';
            child.isWindow = false;
            child.isDoor = true;
            child.slidingCount = count;
            child.slidingPanels = {
                position: index,
                direction: index === 0 ? 'left' : 'right',
                isActive: index === 0 // First panel is active
            };
            child.hardware = {
                hinges: 0, // No hinges for sliding
                handle: true,
                lock: false,
                rail: true, // Sliding rail
                wheels: 2 // Sliding wheels
            };
        });
        
        return panel;
    }
    
    /**
     * Get all leaf panels (flat list)
     */
    getAllLeafPanels() {
        return this.rootPanel.getAllLeafPanels();
    }
    
    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            width: this.width,
            height: this.height,
            type: this.type,
            templateId: this.templateId,
            rootPanel: this.rootPanel.toJSON(),
            bars: this.bars,
            aluminumSystem: this.aluminumSystem,
            glassType: this.glassType
        };
    }
    
    /**
     * Load from JSON
     */
    fromJSON(json) {
        this.width = json.width;
        this.height = json.height;
        this.type = json.type;
        this.templateId = json.templateId;
        this.rootPanel = PanelNode.fromJSON(json.rootPanel);
        this.bars = json.bars || [];
        this.aluminumSystem = json.aluminumSystem;
        this.glassType = json.glassType;
        
        // Recalculate dimensions
        this.updateDimensions(this.width, this.height);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DoorModelTree, PanelNode };
} else {
    window.DoorModelTree = DoorModelTree;
    window.PanelNode = PanelNode;
}






















