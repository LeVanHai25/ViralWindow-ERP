/**
 * CUTTING ENGINE - Tối ưu cắt thanh nhôm
 * Implement Best Fit Decreasing algorithm
 */

/**
 * Best Fit Decreasing Algorithm
 * Tối ưu hơn First Fit - tìm cây có ít dư nhất nhưng vẫn đủ chỗ
 * 
 * @param {Array<number>} pieces - Mảng chiều dài các đoạn cần cắt (mm)
 * @param {number} stockLength - Chiều dài thanh nhôm chuẩn (mm), mặc định 6000
 * @param {number} kerf - Độ rộng lưỡi cắt (mm), mặc định 3
 * @returns {Array} Danh sách các cây nhôm với cách cắt
 */
function bestFitDecreasing(pieces, stockLength = 6000, kerf = 3) {
    if (!pieces || pieces.length === 0) {
        return [];
    }

    // Sort giảm dần (decreasing)
    const sorted = [...pieces].sort((a, b) => b - a);

    const bars = []; // Mỗi bar = { remaining, pieces: [] }

    for (const piece of sorted) {
        // Validate piece
        if (piece > stockLength) {
            console.warn(`Đoạn ${piece}mm vượt quá chiều dài thanh ${stockLength}mm, bỏ qua`);
            continue;
        }

        let bestIndex = -1;
        let bestRemaining = Number.MAX_SAFE_INTEGER;

        // Tìm cây tốt nhất (ít dư nhất nhưng vẫn đủ chỗ)
        for (let i = 0; i < bars.length; i++) {
            const bar = bars[i];
            // Tính chiều dài cần thiết: piece + kerf (nếu đã có đoạn trước)
            const required = piece + (bar.pieces.length > 0 ? kerf : 0);
            
            if (bar.remaining >= required) {
                const newRemaining = bar.remaining - required;
                if (newRemaining < bestRemaining) {
                    bestRemaining = newRemaining;
                    bestIndex = i;
                }
            }
        }

        if (bestIndex === -1) {
            // Không tìm thấy cây phù hợp → tạo cây mới
            bars.push({
                remaining: stockLength - piece,
                pieces: [piece]
            });
        } else {
            // Thêm vào cây tốt nhất
            const bar = bars[bestIndex];
            bar.pieces.push(piece);
            // Tính lại remaining: stockLength - tổng pieces - tổng kerf
            const totalUsed = bar.pieces.reduce((sum, p, idx) => 
                sum + p + (idx > 0 ? kerf : 0), 0
            );
            bar.remaining = stockLength - totalUsed;
        }
    }

    // Format kết quả
    return bars.map((bar, idx) => {
        const used = stockLength - bar.remaining;
        const efficiency = used > 0 ? (used * 100 / stockLength) : 0;
        
        return {
            barIndex: idx + 1,
            pieces: bar.pieces,
            usedLength: Math.round(used),
            waste: Math.round(bar.remaining),
            efficiency: parseFloat(efficiency.toFixed(2))
        };
    });
}

/**
 * First Fit Decreasing Algorithm (fallback)
 * Đơn giản hơn nhưng kém tối ưu hơn Best Fit
 */
function firstFitDecreasing(pieces, stockLength = 6000, kerf = 3) {
    if (!pieces || pieces.length === 0) {
        return [];
    }

    const sorted = [...pieces].sort((a, b) => b - a);
    const bars = [];

    for (const piece of sorted) {
        if (piece > stockLength) {
            console.warn(`Đoạn ${piece}mm vượt quá chiều dài thanh ${stockLength}mm, bỏ qua`);
            continue;
        }

        const required = piece + kerf;
        let placed = false;

        // Tìm cây đầu tiên có thể chứa
        for (let i = 0; i < bars.length; i++) {
            const bar = bars[i];
            const needed = piece + (bar.pieces.length > 0 ? kerf : 0);
            
            if (bar.remaining >= needed) {
                bar.pieces.push(piece);
                const totalUsed = bar.pieces.reduce((sum, p, idx) => 
                    sum + p + (idx > 0 ? kerf : 0), 0
                );
                bar.remaining = stockLength - totalUsed;
                placed = true;
                break;
            }
        }

        if (!placed) {
            // Tạo cây mới
            bars.push({
                remaining: stockLength - piece,
                pieces: [piece]
            });
        }
    }

    return bars.map((bar, idx) => {
        const used = stockLength - bar.remaining;
        const efficiency = used > 0 ? (used * 100 / stockLength) : 0;
        
        return {
            barIndex: idx + 1,
            pieces: bar.pieces,
            usedLength: Math.round(used),
            waste: Math.round(bar.remaining),
            efficiency: parseFloat(efficiency.toFixed(2))
        };
    });
}

/**
 * Calculate cutting plan for multiple profiles
 * @param {Object} profilePieces - { profileCode: [length1, length2, ...], ... }
 * @param {number} stockLength - Chiều dài thanh nhôm chuẩn
 * @param {number} kerf - Độ rộng lưỡi cắt
 * @param {string} algorithm - 'best-fit' hoặc 'first-fit'
 * @returns {Object} { profileCode: [bars...], ... }
 */
function calculateCuttingPlan(profilePieces, stockLength = 6000, kerf = 3, algorithm = 'best-fit') {
    const result = {};
    const algoFunc = algorithm === 'best-fit' ? bestFitDecreasing : firstFitDecreasing;

    for (const [profileCode, pieces] of Object.entries(profilePieces)) {
        if (pieces && pieces.length > 0) {
            result[profileCode] = algoFunc(pieces, stockLength, kerf);
        }
    }

    return result;
}

/**
 * Calculate summary statistics for cutting plan
 */
function calculateCuttingSummary(cuttingPlan) {
    const summary = {
        totalBars: 0,
        totalUsed: 0,
        totalWaste: 0,
        totalStock: 0,
        overallEfficiency: 0,
        byProfile: {}
    };

    for (const [profileCode, bars] of Object.entries(cuttingPlan)) {
        const profileSummary = {
            bars: bars.length,
            used: 0,
            waste: 0,
            stock: 0,
            efficiency: 0
        };

        bars.forEach(bar => {
            profileSummary.used += bar.usedLength;
            profileSummary.waste += bar.waste;
            profileSummary.stock += bar.usedLength + bar.waste;
            summary.totalBars++;
            summary.totalUsed += bar.usedLength;
            summary.totalWaste += bar.waste;
        });

        profileSummary.stock = profileSummary.used + profileSummary.waste;
        profileSummary.efficiency = profileSummary.stock > 0 
            ? (profileSummary.used * 100 / profileSummary.stock) 
            : 0;

        summary.byProfile[profileCode] = profileSummary;
    }

    summary.totalStock = summary.totalUsed + summary.totalWaste;
    summary.overallEfficiency = summary.totalStock > 0 
        ? (summary.totalUsed * 100 / summary.totalStock) 
        : 0;

    return summary;
}

module.exports = {
    bestFitDecreasing,
    firstFitDecreasing,
    calculateCuttingPlan,
    calculateCuttingSummary
};






















