/**
 * DOOR MODEL ENGINE
 * Xử lý JSON model cửa, chuyển đổi giữa template và model thực tế
 */

class DoorModel {
    constructor(template = null, width = 1800, height = 2200) {
        this.width = width;
        this.height = height;
        this.type = template?.type || 'door_open';
        this.templateId = template?.id || null;
        this.panels = [];
        this.frame = {
            vertical: 2,  // 2 thanh đứng
            horizontal: 2 // 2 thanh ngang
        };
        this.bars = []; // Đố ngang/đứng
        this.aluminumSystem = null;
        this.glassType = '8ly';
        
        if (template) {
            this.loadFromTemplate(template);
        }
    }

    /**
     * Load từ template JSON
     */
    loadFromTemplate(template) {
        this.type = template.type;
        this.templateId = template.id;
        this.panels = this.parsePanels(template.panels || [], this.width, this.height);
    }

    /**
     * Parse panels từ template
     */
    parsePanels(panels, totalWidth, totalHeight) {
        const result = [];
        let currentY = 0;
        let currentX = 0;

        panels.forEach((panel, index) => {
            if (panel.type === 'fix') {
                // Vách cố định
                const fixPanel = {
                    id: panel.id || `FIX${index + 1}`,
                    type: 'fix',
                    width: totalWidth * (panel.width_ratio || 1),
                    height: totalHeight * (panel.height_ratio || 1),
                    x: currentX,
                    y: currentY,
                    glass: this.glassType
                };
                result.push(fixPanel);
                
                if (panel.width_ratio && panel.width_ratio < 1) {
                    currentX += fixPanel.width;
                } else if (panel.height_ratio && panel.height_ratio < 1) {
                    currentY += fixPanel.height;
                }
            } else if (panel.type === 'door' && panel.panels) {
                // Block có nhiều cánh con
                const blockHeight = totalHeight * (panel.height_ratio || 1);
                const blockWidth = totalWidth * (panel.width_ratio || 1);
                const doorPanels = this.parsePanels(panel.panels, blockWidth, blockHeight);
                doorPanels.forEach(dp => {
                    dp.y += currentY;
                    dp.x += currentX;
                });
                result.push(...doorPanels);
                currentY += blockHeight;
            } else {
                // Cánh cửa thông thường
                const doorPanel = {
                    id: panel.id || `K${index + 1}`,
                    width: totalWidth * (panel.width_ratio || 1),
                    height: totalHeight * (panel.height_ratio || 1),
                    x: currentX,
                    y: currentY,
                    openType: panel.open || 'left',
                    hinges: 3,
                    glass: this.glassType,
                    profile: this.aluminumSystem || 'Cửa đi XF 55'
                };
                result.push(doorPanel);
                
                if (panel.width_ratio && panel.width_ratio < 1) {
                    currentX += doorPanel.width;
                } else if (panel.height_ratio && panel.height_ratio < 1) {
                    currentY += doorPanel.height;
                }
            }
        });

        return result;
    }

    /**
     * Cập nhật kích thước
     */
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        
        // Recalculate panel positions
        if (this.templateId) {
            // Reload from template with new dimensions
            const template = this.getTemplateById(this.templateId);
            if (template) {
                this.panels = this.parsePanels(template.panels, width, height);
            }
        } else {
            // Scale existing panels proportionally
            const widthRatio = width / this.width;
            const heightRatio = height / this.height;
            
            this.panels.forEach(panel => {
                panel.width *= widthRatio;
                panel.height *= heightRatio;
                panel.x *= widthRatio;
                panel.y *= heightRatio;
            });
        }
    }

    /**
     * Thêm đố đứng
     */
    addVerticalBar(position) {
        // position: 0-1 (0 = trái, 1 = phải)
        const x = this.width * position;
        this.bars.push({
            type: 'vertical',
            x: x,
            y: 0,
            length: this.height
        });
        
        // Split panels at this position
        this.splitPanelsAtX(x);
    }

    /**
     * Thêm đố ngang
     */
    addHorizontalBar(position) {
        // position: 0-1 (0 = trên, 1 = dưới)
        const y = this.height * position;
        this.bars.push({
            type: 'horizontal',
            x: 0,
            y: y,
            length: this.width
        });
        
        // Split panels at this position
        this.splitPanelsAtY(y);
    }

    /**
     * Chia panels tại vị trí X
     */
    splitPanelsAtX(x) {
        const newPanels = [];
        
        this.panels.forEach(panel => {
            if (panel.x < x && panel.x + panel.width > x) {
                // Panel bị chia
                const leftWidth = x - panel.x;
                const rightWidth = panel.width - leftWidth;
                
                // Panel trái
                newPanels.push({
                    ...panel,
                    id: panel.id + '_L',
                    width: leftWidth
                });
                
                // Panel phải
                newPanels.push({
                    ...panel,
                    id: panel.id + '_R',
                    x: x,
                    width: rightWidth
                });
            } else {
                newPanels.push(panel);
            }
        });
        
        this.panels = newPanels;
    }

    /**
     * Chia panels tại vị trí Y
     */
    splitPanelsAtY(y) {
        const newPanels = [];
        
        this.panels.forEach(panel => {
            if (panel.y < y && panel.y + panel.height > y) {
                // Panel bị chia
                const topHeight = y - panel.y;
                const bottomHeight = panel.height - topHeight;
                
                // Panel trên
                newPanels.push({
                    ...panel,
                    id: panel.id + '_T',
                    height: topHeight
                });
                
                // Panel dưới
                newPanels.push({
                    ...panel,
                    id: panel.id + '_B',
                    y: y,
                    height: bottomHeight
                });
            } else {
                newPanels.push(panel);
            }
        });
        
        this.panels = newPanels;
    }

    /**
     * Đảo chiều mở của panel
     */
    togglePanelOpenDirection(panelId) {
        const panel = this.panels.find(p => p.id === panelId);
        if (panel && panel.openType) {
            panel.openType = panel.openType === 'left' ? 'right' : 'left';
        }
    }

    /**
     * Đổi màu kính
     */
    changeGlassType(glassType) {
        this.glassType = glassType;
        this.panels.forEach(panel => {
            if (panel.type !== 'fix' || !panel.type) {
                panel.glass = glassType;
            }
        });
    }

    /**
     * Đổi hệ nhôm
     */
    changeAluminumSystem(systemName) {
        this.aluminumSystem = systemName;
        this.panels.forEach(panel => {
            if (panel.type !== 'fix' || !panel.type) {
                panel.profile = systemName;
            }
        });
    }

    /**
     * Export to JSON
     */
    toJSON() {
        return {
            width: this.width,
            height: this.height,
            type: this.type,
            templateId: this.templateId,
            panels: this.panels.map(panel => ({
                id: panel.id,
                width: Math.round(panel.width),
                height: Math.round(panel.height),
                x: Math.round(panel.x),
                y: Math.round(panel.y),
                openType: panel.openType,
                hinges: panel.hinges || 3,
                glass: panel.glass,
                profile: panel.profile,
                type: panel.type
            })),
            bars: this.bars.map(bar => ({
                type: bar.type,
                x: Math.round(bar.x),
                y: Math.round(bar.y),
                length: Math.round(bar.length)
            })),
            frame: this.frame,
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
        this.panels = json.panels || [];
        this.bars = json.bars || [];
        this.frame = json.frame || { vertical: 2, horizontal: 2 };
        this.aluminumSystem = json.aluminumSystem;
        this.glassType = json.glassType;
    }

    /**
     * Get template by ID (helper method)
     */
    getTemplateById(templateId) {
        // This should be loaded from door-templates.json
        if (window.doorTemplates) {
            return window.doorTemplates.templates.find(t => t.id === templateId);
        }
        return null;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DoorModel;
} else {
    window.DoorModel = DoorModel;
}

























