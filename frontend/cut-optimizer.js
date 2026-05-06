// ============================================
// CUT OPTIMIZER - Tối ưu cắt nhôm
// Thuật toán: First-Fit Decreasing (FFD)
// ============================================

class CutOptimizer {
    constructor(stockLength) {
        this.stockLength = stockLength; // 6000
    }

    /**
     * @param {CutPart[]} parts
     * @returns {CutBar[]}
     */
    optimize(parts) {
        // 1. flatten theo qty
        const arr = [];
        parts.forEach(p => {
            for (let i = 0; i < p.qty; i++) {
                arr.push({ code: p.code, length: p.length });
            }
        });

        // 2. sort giảm dần theo length
        arr.sort((a, b) => b.length - a.length);

        // 3. first-fit
        const bars = [];
        arr.forEach(part => {
            let placed = false;
            for (const bar of bars) {
                if (bar.used + part.length <= this.stockLength) {
                    bar.parts.push(part);
                    bar.used += part.length;
                    bar.waste = this.stockLength - bar.used;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                bars.push({
                    index: bars.length + 1,
                    parts: [part],
                    used: part.length,
                    waste: this.stockLength - part.length
                });
            }
        });

        return bars;
    }

    /**
     * Tính hiệu suất sử dụng
     * @param {CutBar[]} bars
     * @returns {number} Hiệu suất % (0-100)
     */
    calculateEfficiency(bars) {
        if (bars.length === 0) return 0;
        const totalUsed = bars.reduce((sum, bar) => sum + bar.used, 0);
        const totalAvailable = bars.length * this.stockLength;
        return (totalUsed / totalAvailable) * 100;
    }
}

// Export để sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CutOptimizer };
}

























