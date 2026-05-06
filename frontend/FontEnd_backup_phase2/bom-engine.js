/**
 * BOM ENGINE - Bóc tách BOM theo công thức hệ nhôm
 * Áp dụng công thức trừ cho từng hệ nhôm
 */

class BOMEngine {
    constructor() {
        // Công thức trừ cho các hệ nhôm phổ biến
        this.aluminumFormulas = {
            'Xingfa 55': {
                frame: {
                    vertical: { deduction: 76 },      // H - 76
                    horizontal: { deduction: 76 }     // B - 76
                },
                panel: {
                    vertical: { deduction: 76 },      // H - 76
                    horizontal: { deduction: 46 }     // B - 46
                },
                glass: {
                    widthDeduction: 30,               // Trừ 30mm mỗi bên
                    heightDeduction: 30
                }
            },
            'Xingfa 60': {
                frame: {
                    vertical: { deduction: 80 },
                    horizontal: { deduction: 80 }
                },
                panel: {
                    vertical: { deduction: 80 },
                    horizontal: { deduction: 50 }
                },
                glass: {
                    widthDeduction: 32,
                    heightDeduction: 32
                }
            },
            'Xingfa 70': {
                frame: {
                    vertical: { deduction: 90 },
                    horizontal: { deduction: 90 }
                },
                panel: {
                    vertical: { deduction: 90 },
                    horizontal: { deduction: 60 }
                },
                glass: {
                    widthDeduction: 35,
                    heightDeduction: 35
                }
            },
            'Cửa đi XF 55': {
                frame: {
                    vertical: { deduction: 76 },
                    horizontal: { deduction: 76 }
                },
                panel: {
                    vertical: { deduction: 76 },
                    horizontal: { deduction: 46 }
                },
                glass: {
                    widthDeduction: 30,
                    heightDeduction: 30
                }
            }
        };
    }

    /**
     * Tính BOM từ door model
     */
    calculateBOM(doorModel, aluminumSystem = 'Xingfa 55') {
        const formulas = this.aluminumFormulas[aluminumSystem] || this.aluminumFormulas['Xingfa 55'];
        const materials = [];

        // 1. Tính khung bao (Frame)
        const frameMaterials = this.calculateFrame(doorModel, formulas);
        materials.push(...frameMaterials);

        // 2. Tính đố (Bars)
        const barMaterials = this.calculateBars(doorModel, formulas);
        materials.push(...barMaterials);

        // 3. Tính cánh (Panels)
        const panelMaterials = this.calculatePanels(doorModel, formulas);
        materials.push(...panelMaterials);

        // 4. Tính kính (Glass)
        const glassMaterials = this.calculateGlass(doorModel, formulas);
        materials.push(...glassMaterials);

        // 5. Tính phụ kiện (Accessories)
        const accessoryMaterials = this.calculateAccessories(doorModel);
        materials.push(...accessoryMaterials);

        return {
            materials: materials,
            summary: this.calculateSummary(materials)
        };
    }

    /**
     * Tính khung bao
     */
    calculateFrame(doorModel, formulas) {
        const materials = [];
        const { width, height } = doorModel;
        const frameFormulas = formulas.frame;

        // Khung đứng (2 thanh)
        const verticalLength = Math.max(0, height - frameFormulas.vertical.deduction);
        materials.push({
            type: 'profile',
            name: 'Khung bao đứng',
            code: 'FRAME_V',
            length: Math.round(verticalLength),
            quantity: 2,
            unit: 'mm'
        });

        // Khung ngang (2 thanh)
        const horizontalLength = Math.max(0, width - frameFormulas.horizontal.deduction);
        materials.push({
            type: 'profile',
            name: 'Khung bao ngang',
            code: 'FRAME_H',
            length: Math.round(horizontalLength),
            quantity: 2,
            unit: 'mm'
        });

        return materials;
    }

    /**
     * Tính đố
     */
    calculateBars(doorModel, formulas) {
        const materials = [];
        const { bars, width, height } = doorModel;

        bars.forEach((bar, index) => {
            if (bar.type === 'vertical') {
                const length = Math.max(0, bar.length - formulas.frame.vertical.deduction);
                materials.push({
                    type: 'profile',
                    name: `Đố đứng ${index + 1}`,
                    code: `BAR_V${index + 1}`,
                    length: Math.round(length),
                    quantity: 1,
                    unit: 'mm'
                });
            } else if (bar.type === 'horizontal') {
                const length = Math.max(0, bar.length - formulas.frame.horizontal.deduction);
                materials.push({
                    type: 'profile',
                    name: `Đố ngang ${index + 1}`,
                    code: `BAR_H${index + 1}`,
                    length: Math.round(length),
                    quantity: 1,
                    unit: 'mm'
                });
            }
        });

        return materials;
    }

    /**
     * Tính cánh
     */
    calculatePanels(doorModel, formulas) {
        const materials = [];
        const panelFormulas = formulas.panel;

        doorModel.panels.forEach((panel, index) => {
            if (panel.type === 'fix') {
                // Vách cố định - tính như panel nhưng không có bản lề
                const verticalLength = Math.max(0, panel.height - panelFormulas.vertical.deduction);
                const horizontalLength = Math.max(0, panel.width - panelFormulas.horizontal.deduction);

                materials.push({
                    type: 'profile',
                    name: `Vách đứng ${index + 1}`,
                    code: `FIX_V${index + 1}`,
                    length: Math.round(verticalLength),
                    quantity: 2,
                    unit: 'mm'
                });

                materials.push({
                    type: 'profile',
                    name: `Vách ngang ${index + 1}`,
                    code: `FIX_H${index + 1}`,
                    length: Math.round(horizontalLength),
                    quantity: 2,
                    unit: 'mm'
                });
            } else {
                // Cánh cửa
                const verticalLength = Math.max(0, panel.height - panelFormulas.vertical.deduction);
                const horizontalLength = Math.max(0, panel.width - panelFormulas.horizontal.deduction);

                materials.push({
                    type: 'profile',
                    name: `${panel.profile || 'Cánh'} đứng ${panel.id}`,
                    code: `PANEL_V${panel.id}`,
                    length: Math.round(verticalLength),
                    quantity: 2, // 2 thanh đứng mỗi cánh
                    unit: 'mm'
                });

                materials.push({
                    type: 'profile',
                    name: `${panel.profile || 'Cánh'} ngang ${panel.id}`,
                    code: `PANEL_H${panel.id}`,
                    length: Math.round(horizontalLength),
                    quantity: 2, // 2 thanh ngang mỗi cánh
                    unit: 'mm'
                });
            }
        });

        return materials;
    }

    /**
     * Tính kính
     */
    calculateGlass(doorModel, formulas) {
        const materials = [];
        const glassFormulas = formulas.glass;

        doorModel.panels.forEach((panel, index) => {
            const glassWidth = Math.max(0, panel.width - glassFormulas.widthDeduction);
            const glassHeight = Math.max(0, panel.height - glassFormulas.heightDeduction);
            const area = (glassWidth * glassHeight) / 1000000; // m²

            materials.push({
                type: 'glass',
                name: `Kính ${panel.glass || doorModel.glassType}`,
                code: `GLASS_${panel.id}`,
                width: Math.round(glassWidth),
                height: Math.round(glassHeight),
                area: parseFloat(area.toFixed(3)),
                quantity: 1,
                unit: 'm²'
            });
        });

        return materials;
    }

    /**
     * Tính phụ kiện
     */
    calculateAccessories(doorModel) {
        const materials = [];
        let hingeCount = 0;
        let lockCount = 0;
        let handleCount = 0;

        doorModel.panels.forEach(panel => {
            if (panel.type !== 'fix' && panel.openType) {
                // Bản lề
                hingeCount += panel.hinges || 3;
                
                // Khóa
                if (panel.openType === 'left' || panel.openType === 'right') {
                    lockCount += 1;
                    handleCount += 1;
                }
            }
        });

        if (hingeCount > 0) {
            materials.push({
                type: 'accessory',
                name: 'Bản lề',
                code: 'HINGE',
                quantity: hingeCount,
                unit: 'bộ'
            });
        }

        if (lockCount > 0) {
            materials.push({
                type: 'accessory',
                name: 'Khóa cửa',
                code: 'LOCK',
                quantity: lockCount,
                unit: 'bộ'
            });
        }

        if (handleCount > 0) {
            materials.push({
                type: 'accessory',
                name: 'Tay nắm',
                code: 'HANDLE',
                quantity: handleCount,
                unit: 'bộ'
            });
        }

        // Gioăng kính
        const totalPerimeter = doorModel.panels.reduce((sum, panel) => {
            return sum + (panel.width + panel.height) * 2;
        }, 0);
        
        materials.push({
            type: 'accessory',
            name: 'Gioăng kính',
            code: 'GASKET',
            length: Math.round(totalPerimeter),
            quantity: 1,
            unit: 'mm'
        });

        return materials;
    }

    /**
     * Tính tổng kết
     */
    calculateSummary(materials) {
        const summary = {
            totalProfiles: 0,
            totalProfileLength: 0,
            totalGlass: 0,
            totalGlassArea: 0,
            totalAccessories: 0
        };

        materials.forEach(material => {
            if (material.type === 'profile') {
                summary.totalProfiles += material.quantity;
                summary.totalProfileLength += (material.length * material.quantity) / 1000; // m
            } else if (material.type === 'glass') {
                summary.totalGlass += material.quantity;
                summary.totalGlassArea += material.area || 0;
            } else if (material.type === 'accessory') {
                summary.totalAccessories += material.quantity || 0;
            }
        });

        return summary;
    }

    /**
     * Export BOM ra bảng Excel format
     */
    exportToTable(materials) {
        const table = [];
        let index = 1;

        materials.forEach(material => {
            if (material.type === 'profile') {
                table.push({
                    stt: index++,
                    ma: material.code,
                    ten: material.name,
                    kichThuoc: `${material.length}mm`,
                    soLuong: material.quantity,
                    donVi: material.unit
                });
            } else if (material.type === 'glass') {
                table.push({
                    stt: index++,
                    ma: material.code,
                    ten: material.name,
                    kichThuoc: `${material.width} × ${material.height}mm (${material.area}m²)`,
                    soLuong: material.quantity,
                    donVi: material.unit
                });
            } else if (material.type === 'accessory') {
                table.push({
                    stt: index++,
                    ma: material.code,
                    ten: material.name,
                    kichThuoc: material.length ? `${material.length}mm` : '-',
                    soLuong: material.quantity,
                    donVi: material.unit
                });
            }
        });

        return table;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BOMEngine;
} else {
    window.BOMEngine = BOMEngine;
}

























