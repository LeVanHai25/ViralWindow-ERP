/**
 * CUT OPTIMIZATION ENGINE
 * Thuật toán tối ưu cắt nhôm: Guillotine cutting, 1D Bin Packing
 */

class CutOptimizer {
    constructor() {
        // Độ dài thanh nhôm tiêu chuẩn (mm)
        this.standardBars = [5850, 6000];
        this.defaultBarLength = 5850;
    }

    /**
     * Tối ưu cắt từ danh sách vật tư
     */
    optimize(materials, barLength = null) {
        const targetLength = barLength || this.defaultBarLength;
        
        // Lọc ra các thanh profile cần cắt
        const cuts = this.extractCuts(materials);
        
        // Sắp xếp giảm dần (First Fit Decreasing)
        cuts.sort((a, b) => b.length - a.length);
        
        // Áp dụng thuật toán
        const result = this.firstFitDecreasing(cuts, targetLength);
        
        return {
            bars: result,
            summary: this.calculateOptimizationSummary(result, cuts, targetLength)
        };
    }

    /**
     * Trích xuất danh sách cắt từ materials
     */
    extractCuts(materials) {
        const cuts = [];
        
        materials.forEach(material => {
            if (material.type === 'profile' && material.length > 0) {
                // Thêm số lượng cần cắt
                for (let i = 0; i < material.quantity; i++) {
                    cuts.push({
                        length: material.length,
                        name: material.name,
                        code: material.code,
                        id: `${material.code}_${i + 1}`
                    });
                }
            }
        });
        
        return cuts;
    }

    /**
     * First Fit Decreasing Algorithm
     */
    firstFitDecreasing(cuts, barLength) {
        const bars = [];
        
        cuts.forEach(cut => {
            let placed = false;
            
            // Tìm thanh có thể chứa
            for (let i = 0; i < bars.length; i++) {
                const remaining = bars[i].remaining;
                if (remaining >= cut.length) {
                    bars[i].cuts.push(cut);
                    bars[i].remaining -= cut.length;
                    bars[i].waste = bars[i].remaining;
                    placed = true;
                    break;
                }
            }
            
            // Nếu không tìm thấy, tạo thanh mới
            if (!placed) {
                bars.push({
                    barNumber: bars.length + 1,
                    barLength: barLength,
                    cuts: [cut],
                    remaining: barLength - cut.length,
                    waste: barLength - cut.length
                });
            }
        });
        
        return bars;
    }

    /**
     * Best Fit Decreasing Algorithm (alternative)
     */
    bestFitDecreasing(cuts, barLength) {
        const bars = [];
        
        cuts.forEach(cut => {
            let bestBarIndex = -1;
            let bestRemaining = barLength + 1;
            
            // Tìm thanh có waste nhỏ nhất nhưng vẫn đủ chỗ
            for (let i = 0; i < bars.length; i++) {
                const remaining = bars[i].remaining;
                if (remaining >= cut.length && remaining < bestRemaining) {
                    bestRemaining = remaining;
                    bestBarIndex = i;
                }
            }
            
            if (bestBarIndex >= 0) {
                bars[bestBarIndex].cuts.push(cut);
                bars[bestBarIndex].remaining -= cut.length;
                bars[bestBarIndex].waste = bars[bestBarIndex].remaining;
            } else {
                // Tạo thanh mới
                bars.push({
                    barNumber: bars.length + 1,
                    barLength: barLength,
                    cuts: [cut],
                    remaining: barLength - cut.length,
                    waste: barLength - cut.length
                });
            }
        });
        
        return bars;
    }

    /**
     * Tính tổng kết tối ưu hóa
     */
    calculateOptimizationSummary(result, originalCuts, barLength) {
        const totalBars = result.length;
        const totalWaste = result.reduce((sum, bar) => sum + bar.waste, 0);
        const totalUsed = result.reduce((sum, bar) => sum + (bar.barLength - bar.remaining), 0);
        const totalLength = totalBars * barLength;
        const efficiency = totalLength > 0 ? ((totalUsed / totalLength) * 100).toFixed(2) : 0;
        const averageWaste = totalBars > 0 ? (totalWaste / totalBars).toFixed(0) : 0;
        
        return {
            totalBars: totalBars,
            totalLength: totalLength,
            totalUsed: totalUsed,
            totalWaste: totalWaste,
            efficiency: parseFloat(efficiency),
            averageWaste: parseFloat(averageWaste),
            totalCuts: originalCuts.length
        };
    }

    /**
     * Hiển thị kết quả dạng UI
     */
    formatResultForUI(result) {
        return result.map(bar => {
            const cutsDisplay = bar.cuts.map(cut => `${cut.length}mm`).join(' | ');
            const wastePercent = ((bar.waste / bar.barLength) * 100).toFixed(1);
            
            return {
                barNumber: bar.barNumber,
                barLength: bar.barLength,
                cuts: bar.cuts,
                cutsDisplay: cutsDisplay,
                waste: bar.waste,
                wastePercent: parseFloat(wastePercent),
                usage: bar.barLength - bar.remaining,
                usagePercent: (((bar.barLength - bar.remaining) / bar.barLength) * 100).toFixed(1)
            };
        });
    }

    /**
     * Tối ưu với nhiều độ dài thanh khác nhau
     */
    optimizeWithMultipleBarLengths(materials, barLengths = null) {
        const lengths = barLengths || this.standardBars;
        let bestResult = null;
        let bestEfficiency = 0;
        
        lengths.forEach(length => {
            const result = this.optimize(materials, length);
            if (result.summary.efficiency > bestEfficiency) {
                bestEfficiency = result.summary.efficiency;
                bestResult = {
                    ...result,
                    barLength: length
                };
            }
        });
        
        return bestResult || this.optimize(materials, this.defaultBarLength);
    }

    /**
     * Xuất kết quả ra Excel format
     */
    exportToExcel(result) {
        const rows = [];
        
        result.bars.forEach(bar => {
            bar.cuts.forEach((cut, index) => {
                rows.push({
                    'Thanh': `Thanh ${bar.barNumber}`,
                    'Độ dài thanh': `${bar.barLength}mm`,
                    'STT cắt': index + 1,
                    'Tên vật tư': cut.name,
                    'Mã': cut.code,
                    'Độ dài cắt': `${cut.length}mm`,
                    'Thừa': index === bar.cuts.length - 1 ? `${bar.waste}mm` : '-'
                });
            });
        });
        
        return rows;
    }

    /**
     * Vẽ biểu diễn trực quan
     */
    generateVisualization(bar) {
        const scale = 100; // 1mm = scale pixels
        const barWidth = 20;
        const barLengthPx = (bar.barLength / scale) * 10; // Scale down for display
        
        let currentX = 0;
        const segments = bar.cuts.map(cut => {
            const width = (cut.length / scale) * 10;
            const segment = {
                x: currentX,
                width: width,
                length: cut.length,
                name: cut.name,
                color: this.getColorForLength(cut.length)
            };
            currentX += width;
            return segment;
        });
        
        // Waste segment
        if (bar.waste > 0) {
            const wasteWidth = (bar.waste / scale) * 10;
            segments.push({
                x: currentX,
                width: wasteWidth,
                length: bar.waste,
                name: 'Thừa',
                color: '#e5e7eb',
                isWaste: true
            });
        }
        
        return {
            barLength: bar.barLength,
            barLengthPx: barLengthPx,
            segments: segments,
            totalWidth: currentX + (bar.waste > 0 ? (bar.waste / scale) * 10 : 0)
        };
    }

    /**
     * Lấy màu theo độ dài
     */
    getColorForLength(length) {
        if (length > 2000) return '#3b82f6'; // Blue
        if (length > 1000) return '#10b981'; // Green
        if (length > 500) return '#f59e0b';  // Orange
        return '#ef4444'; // Red
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CutOptimizer;
} else {
    window.CutOptimizer = CutOptimizer;
}

























