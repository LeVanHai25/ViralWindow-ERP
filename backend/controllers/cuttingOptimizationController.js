const db = require("../config/db");

/**
 * Thuật toán tối ưu cắt nhôm - First Fit Decreasing (FFD)
 * Input: Danh sách các đoạn cần cắt (length, quantity)
 * Output: Cách cắt tối ưu để giảm dư thừa
 * 
 * @param {Array} cutItems - Danh sách các đoạn cần cắt
 * @param {Number} barLength - Chiều dài thanh nhôm tiêu chuẩn (mm)
 * @param {Number} kerfWidth - Độ rộng lưỡi cắt (mm)
 * @param {String} algorithm - Thuật toán sử dụng: 'ffd' (First Fit Decreasing), 'bfd' (Best Fit Decreasing), 'wfd' (Worst Fit Decreasing)
 */
function optimizeCutting(cutItems, barLength = 6000, kerfWidth = 3, algorithm = 'ffd') {
    // Tạo danh sách tất cả các đoạn cần cắt (nhân với quantity)
    const allCuts = [];
    cutItems.forEach(item => {
        for (let i = 0; i < (item.quantity || 1); i++) {
            allCuts.push({
                length: item.length_mm || item.length || 0,
                name: item.item_name || item.name || 'N/A',
                code: item.item_code || item.code || '',
                symbol: item.symbol || '',
                position: item.position || '',
                bom_item_id: item.bom_item_id || item.id || null,
                original_item: item
            });
        }
    });

    // Sắp xếp giảm dần theo chiều dài (First Fit Decreasing)
    allCuts.sort((a, b) => b.length - a.length);

    // Tối ưu cắt theo thuật toán được chọn
    let bars = [];
    
    if (algorithm === 'bfd') {
        bars = bestFitDecreasing(allCuts, barLength, kerfWidth);
    } else if (algorithm === 'wfd') {
        bars = worstFitDecreasing(allCuts, barLength, kerfWidth);
    } else {
        // Default: First Fit Decreasing (FFD)
        bars = firstFitDecreasing(allCuts, barLength, kerfWidth);
    }

    // Tính hiệu suất cho mỗi thanh
    bars.forEach(bar => {
        bar.efficiency = ((bar.used / barLength) * 100).toFixed(2);
    });

    // Tính tổng kết
    const totalBars = bars.length;
    const totalUsed = bars.reduce((sum, bar) => sum + bar.used, 0);
    const totalWaste = bars.reduce((sum, bar) => sum + bar.waste, 0);
    const totalLength = totalBars * barLength;
    const overallEfficiency = totalLength > 0 ? ((totalUsed / totalLength) * 100).toFixed(2) : 0;

    return {
        bars,
        algorithm_used: algorithm,
        summary: {
            total_bars: totalBars,
            total_length_mm: totalLength,
            total_used_mm: totalUsed,
            total_waste_mm: totalWaste,
            overall_efficiency_percent: parseFloat(overallEfficiency),
            bar_length_mm: barLength,
            kerf_width_mm: kerfWidth
        }
    };
}

/**
 * First Fit Decreasing (FFD) - Đặt vào thanh đầu tiên có thể chứa
 */
function firstFitDecreasing(allCuts, barLength, kerfWidth) {
    const bars = [];
    const usedCuts = new Set();

    allCuts.forEach(cut => {
        if (usedCuts.has(cut)) return;

        let placed = false;
        
        // Tìm thanh nhôm đầu tiên có thể chứa đoạn này
        for (let bar of bars) {
            const remaining = barLength - bar.used - kerfWidth;
            if (remaining >= cut.length) {
                bar.cuts.push({
                    ...cut,
                    position_in_bar: bar.cuts.length + 1
                });
                bar.used += cut.length + kerfWidth;
                bar.waste = barLength - bar.used;
                usedCuts.add(cut);
                placed = true;
                break;
            }
        }

        // Nếu không tìm thấy thanh nào phù hợp, tạo thanh mới
        if (!placed) {
            const newBar = {
                bar_number: bars.length + 1,
                cuts: [{
                    ...cut,
                    position_in_bar: 1
                }],
                used: cut.length + kerfWidth,
                waste: barLength - (cut.length + kerfWidth),
                efficiency: 0
            };
            bars.push(newBar);
            usedCuts.add(cut);
        }
    });

    // Tính hiệu suất cho mỗi thanh
    bars.forEach(bar => {
        bar.efficiency = ((bar.used / barLength) * 100).toFixed(2);
    });

    return bars;
}

/**
 * Best Fit Decreasing (BFD) - Đặt vào thanh có ít dư thừa nhất
 */
function bestFitDecreasing(allCuts, barLength, kerfWidth) {
    const bars = [];
    const usedCuts = new Set();

    allCuts.forEach(cut => {
        if (usedCuts.has(cut)) return;

        let bestBar = null;
        let bestWaste = Infinity;
        
        // Tìm thanh nhôm có ít dư thừa nhất có thể chứa đoạn này
        for (let bar of bars) {
            const remaining = barLength - bar.used - kerfWidth;
            if (remaining >= cut.length) {
                const waste = remaining - cut.length;
                if (waste < bestWaste) {
                    bestWaste = waste;
                    bestBar = bar;
                }
            }
        }

        // Nếu tìm thấy thanh tốt nhất, đặt vào đó
        if (bestBar) {
            bestBar.cuts.push({
                ...cut,
                position_in_bar: bestBar.cuts.length + 1
            });
            bestBar.used += cut.length + kerfWidth;
            bestBar.waste = barLength - bestBar.used;
            usedCuts.add(cut);
        } else {
            // Nếu không tìm thấy thanh nào phù hợp, tạo thanh mới
            const newBar = {
                bar_number: bars.length + 1,
                cuts: [{
                    ...cut,
                    position_in_bar: 1
                }],
                used: cut.length + kerfWidth,
                waste: barLength - (cut.length + kerfWidth),
                efficiency: 0
            };
            bars.push(newBar);
            usedCuts.add(cut);
        }
    });

    // Tính hiệu suất cho mỗi thanh
    bars.forEach(bar => {
        bar.efficiency = ((bar.used / barLength) * 100).toFixed(2);
    });

    return bars;
}

/**
 * Worst Fit Decreasing (WFD) - Đặt vào thanh có nhiều dư thừa nhất
 */
function worstFitDecreasing(allCuts, barLength, kerfWidth) {
    const bars = [];
    const usedCuts = new Set();

    allCuts.forEach(cut => {
        if (usedCuts.has(cut)) return;

        let worstBar = null;
        let worstWaste = -1;
        
        // Tìm thanh nhôm có nhiều dư thừa nhất có thể chứa đoạn này
        for (let bar of bars) {
            const remaining = barLength - bar.used - kerfWidth;
            if (remaining >= cut.length) {
                const waste = remaining - cut.length;
                if (waste > worstWaste) {
                    worstWaste = waste;
                    worstBar = bar;
                }
            }
        }

        // Nếu tìm thấy thanh, đặt vào đó
        if (worstBar) {
            worstBar.cuts.push({
                ...cut,
                position_in_bar: worstBar.cuts.length + 1
            });
            worstBar.used += cut.length + kerfWidth;
            worstBar.waste = barLength - worstBar.used;
            usedCuts.add(cut);
        } else {
            // Nếu không tìm thấy thanh nào phù hợp, tạo thanh mới
            const newBar = {
                bar_number: bars.length + 1,
                cuts: [{
                    ...cut,
                    position_in_bar: 1
                }],
                used: cut.length + kerfWidth,
                waste: barLength - (cut.length + kerfWidth),
                efficiency: 0
            };
            bars.push(newBar);
            usedCuts.add(cut);
        }
    });

    // Tính hiệu suất cho mỗi thanh
    bars.forEach(bar => {
        bar.efficiency = ((bar.used / barLength) * 100).toFixed(2);
    });

    return bars;
}

/**
 * Tối ưu cắt cho một cửa (từ BOM)
 */
exports.optimizeDoorCutting = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;
        const { bar_length_mm = 6000, kerf_width_mm = 3, algorithm = 'ffd' } = req.query;

        // Lấy BOM của cửa với thông tin profile
        const [bomRows] = await db.query(`
            SELECT 
                bi.*,
                a.code AS aluminum_code,
                a.name AS aluminum_name,
                ap.profile_code,
                ap.profile_name,
                ap.profile_type,
                ap.length_per_unit,
                ap.weight_per_meter,
                ap.unit_price AS profile_unit_price
            FROM bom_items bi
            LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id
            LEFT JOIN aluminum_profiles ap ON bi.profile_code = ap.profile_code AND ap.system_id = a.id
            WHERE bi.design_id = ? AND bi.item_type = 'frame'
            ORDER BY bi.length_mm DESC
        `, [doorId]);

        if (bomRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy BOM cho cửa này. Vui lòng tính BOM trước."
            });
        }

        // Nhóm theo aluminum_system_id
        const groupedBySystem = {};
        bomRows.forEach(item => {
            const systemId = item.aluminum_system_id || 'default';
            if (!groupedBySystem[systemId]) {
                groupedBySystem[systemId] = {
                    aluminum_system_id: item.aluminum_system_id,
                    aluminum_code: item.aluminum_code,
                    aluminum_name: item.aluminum_name,
                    items: []
                };
            }
            groupedBySystem[systemId].items.push(item);
        });

        // Tối ưu cho từng hệ nhôm
        const optimizations = [];
        for (const systemId in groupedBySystem) {
            const group = groupedBySystem[systemId];
            
            // Lấy bar length từ profile nếu có (có thể khác nhau cho từng profile type)
            // Hoặc sử dụng giá trị mặc định
            const defaultBarLength = parseInt(bar_length_mm);
            
            // Tối ưu với thuật toán được chọn
            const optimization = optimizeCutting(
                group.items, 
                defaultBarLength, 
                parseInt(kerf_width_mm),
                algorithm
            );
            
            // Tính thêm thông tin chi phí nếu có
            const totalCost = calculateOptimizationCost(optimization.bars, group.items);
            
            optimizations.push({
                aluminum_system_id: group.aluminum_system_id,
                aluminum_code: group.aluminum_code,
                aluminum_name: group.aluminum_name,
                ...optimization,
                estimated_cost: totalCost
            });
        }

        res.json({
            success: true,
            data: {
                door_id: parseInt(doorId),
                optimizations,
                total_summary: {
                    total_bars: optimizations.reduce((sum, opt) => sum + opt.summary.total_bars, 0),
                    total_waste_mm: optimizations.reduce((sum, opt) => sum + opt.summary.total_waste_mm, 0),
                    overall_efficiency_percent: optimizations.length > 0 
                        ? (optimizations.reduce((sum, opt) => sum + opt.summary.overall_efficiency_percent, 0) / optimizations.length).toFixed(2)
                        : 0
                }
            }
        });
    } catch (err) {
        console.error('Error optimizing cutting:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tối ưu cắt: " + err.message
        });
    }
};

/**
 * Tối ưu cắt cho toàn bộ dự án
 */
exports.optimizeProjectCutting = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { bar_length_mm = 6000, kerf_width_mm = 3, algorithm = 'ffd' } = req.query;

        // Lấy tất cả BOM của dự án
        const [bomRows] = await db.query(`
            SELECT 
                bi.*,
                dd.id AS door_id,
                dd.design_code,
                a.code AS aluminum_code,
                a.name AS aluminum_name
            FROM bom_items bi
            INNER JOIN door_designs dd ON bi.design_id = dd.id
            LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id
            WHERE dd.project_id = ? AND bi.item_type = 'frame'
            ORDER BY dd.id, bi.length_mm DESC
        `, [projectId]);

        if (bomRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy BOM cho dự án này."
            });
        }

        // Nhóm theo door_id và aluminum_system_id
        const groupedByDoorAndSystem = {};
        bomRows.forEach(item => {
            const key = `${item.door_id}_${item.aluminum_system_id || 'default'}`;
            if (!groupedByDoorAndSystem[key]) {
                groupedByDoorAndSystem[key] = {
                    door_id: item.door_id,
                    door_code: item.design_code,
                    aluminum_system_id: item.aluminum_system_id,
                    aluminum_code: item.aluminum_code,
                    aluminum_name: item.aluminum_name,
                    items: []
                };
            }
            groupedByDoorAndSystem[key].items.push(item);
        });

        // Tối ưu cho từng nhóm
        const doorOptimizations = [];
        for (const key in groupedByDoorAndSystem) {
            const group = groupedByDoorAndSystem[key];
            const optimization = optimizeCutting(group.items, parseInt(bar_length_mm), parseInt(kerf_width_mm));
            
            doorOptimizations.push({
                door_id: group.door_id,
                door_code: group.door_code,
                aluminum_system_id: group.aluminum_system_id,
                aluminum_code: group.aluminum_code,
                aluminum_name: group.aluminum_name,
                ...optimization
            });
        }

        // Tổng hợp theo hệ nhôm (gộp tất cả cửa cùng hệ nhôm)
        const systemOptimizations = {};
        doorOptimizations.forEach(doorOpt => {
            const systemId = doorOpt.aluminum_system_id || 'default';
            if (!systemOptimizations[systemId]) {
                systemOptimizations[systemId] = {
                    aluminum_system_id: doorOpt.aluminum_system_id,
                    aluminum_code: doorOpt.aluminum_code,
                    aluminum_name: doorOpt.aluminum_name,
                    bars: [],
                    doors: []
                };
            }
            systemOptimizations[systemId].doors.push({
                door_id: doorOpt.door_id,
                door_code: doorOpt.door_code,
                bars_count: doorOpt.summary.total_bars
            });
            systemOptimizations[systemId].bars.push(...doorOpt.bars);
        });

        // Tối ưu lại cho từng hệ nhôm (gộp tất cả thanh lại)
        const finalOptimizations = [];
        for (const systemId in systemOptimizations) {
            const system = systemOptimizations[systemId];
            // Lấy tất cả các đoạn cần cắt từ các thanh đã tối ưu
            const allCuts = [];
            system.bars.forEach(bar => {
                bar.cuts.forEach(cut => {
                    allCuts.push(cut.original_item || cut);
                });
            });
            
            // Tối ưu lại với thuật toán được chọn
            const finalOptimization = optimizeCutting(
                allCuts, 
                parseInt(bar_length_mm), 
                parseInt(kerf_width_mm),
                algorithm
            );
            finalOptimizations.push({
                aluminum_system_id: system.aluminum_system_id,
                aluminum_code: system.aluminum_code,
                aluminum_name: system.aluminum_name,
                doors: system.doors,
                ...finalOptimization
            });
        }

        res.json({
            success: true,
            data: {
                project_id: parseInt(projectId),
                optimizations: finalOptimizations,
                total_summary: {
                    total_bars: finalOptimizations.reduce((sum, opt) => sum + opt.summary.total_bars, 0),
                    total_waste_mm: finalOptimizations.reduce((sum, opt) => sum + opt.summary.total_waste_mm, 0),
                    overall_efficiency_percent: finalOptimizations.length > 0 
                        ? (finalOptimizations.reduce((sum, opt) => sum + opt.summary.overall_efficiency_percent, 0) / finalOptimizations.length).toFixed(2)
                        : 0
                }
            }
        });
    } catch (err) {
        console.error('Error optimizing project cutting:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tối ưu cắt dự án: " + err.message
        });
    }
};

/**
 * Tính chi phí ước tính cho kết quả tối ưu
 */
function calculateOptimizationCost(bars, items) {
    // Lấy giá từ items nếu có
    let costPerMeter = 0;
    if (items.length > 0 && items[0].profile_unit_price) {
        costPerMeter = items[0].profile_unit_price;
    }
    
    if (costPerMeter === 0) {
        return null; // Không có thông tin giá
    }
    
    // Tính tổng chi phí
    const totalLength = bars.reduce((sum, bar) => {
        return sum + (bar.used / 1000); // Convert mm to meters
    }, 0);
    
    return {
        total_cost: totalLength * costPerMeter,
        cost_per_meter: costPerMeter,
        total_length_m: totalLength
    };
}

/**
 * So sánh các thuật toán tối ưu
 */
exports.compareAlgorithms = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;
        const { bar_length_mm = 6000, kerf_width_mm = 3 } = req.query;

        // Lấy BOM
        const [bomRows] = await db.query(`
            SELECT 
                bi.*,
                a.code AS aluminum_code,
                a.name AS aluminum_name
            FROM bom_items bi
            LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id
            WHERE bi.design_id = ? AND bi.item_type = 'frame'
            ORDER BY bi.length_mm DESC
        `, [doorId]);

        if (bomRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy BOM cho cửa này."
            });
        }

        // Nhóm theo hệ nhôm
        const groupedBySystem = {};
        bomRows.forEach(item => {
            const systemId = item.aluminum_system_id || 'default';
            if (!groupedBySystem[systemId]) {
                groupedBySystem[systemId] = {
                    aluminum_system_id: item.aluminum_system_id,
                    aluminum_code: item.aluminum_code,
                    aluminum_name: item.aluminum_name,
                    items: []
                };
            }
            groupedBySystem[systemId].items.push(item);
        });

        // So sánh các thuật toán
        const algorithms = ['ffd', 'bfd', 'wfd'];
        const comparisons = [];

        for (const systemId in groupedBySystem) {
            const group = groupedBySystem[systemId];
            const systemComparisons = {
                aluminum_system_id: group.aluminum_system_id,
                aluminum_code: group.aluminum_code,
                aluminum_name: group.aluminum_name,
                algorithms: {}
            };

            for (const algo of algorithms) {
                const optimization = optimizeCutting(
                    group.items,
                    parseInt(bar_length_mm),
                    parseInt(kerf_width_mm),
                    algo
                );
                
                systemComparisons.algorithms[algo] = {
                    algorithm: algo,
                    algorithm_name: algo === 'ffd' ? 'First Fit Decreasing' : 
                                   algo === 'bfd' ? 'Best Fit Decreasing' : 
                                   'Worst Fit Decreasing',
                    ...optimization.summary
                };
            }

            // Tìm thuật toán tốt nhất (ít thanh nhất, hiệu suất cao nhất)
            const bestAlgorithm = Object.values(systemComparisons.algorithms).reduce((best, current) => {
                if (!best || current.total_bars < best.total_bars) {
                    return current;
                }
                if (current.total_bars === best.total_bars && 
                    current.overall_efficiency_percent > best.overall_efficiency_percent) {
                    return current;
                }
                return best;
            }, null);

            systemComparisons.best_algorithm = bestAlgorithm.algorithm;
            comparisons.push(systemComparisons);
        }

        res.json({
            success: true,
            data: {
                door_id: parseInt(doorId),
                comparisons
            }
        });
    } catch (err) {
        console.error('Error comparing algorithms:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi so sánh thuật toán: " + err.message
        });
    }
};

/**
 * Lưu kết quả tối ưu cắt
 */
exports.saveOptimization = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;
        const { aluminum_system_id, bars, summary } = req.body;

        if (!bars || !Array.isArray(bars)) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu tối ưu cắt không hợp lệ"
            });
        }

        // Tạo optimization record
        const [optResult] = await db.query(`
            INSERT INTO cutting_optimizations 
            (design_id, aluminum_profile_id, profile_length_mm, efficiency_percent, waste_mm)
            VALUES (?, ?, ?, ?, ?)
        `, [
            doorId,
            aluminum_system_id,
            summary.bar_length_mm || 6000,
            summary.overall_efficiency_percent || 0,
            summary.total_waste_mm || 0
        ]);

        const optimizationId = optResult.insertId;

        // Lưu chi tiết cắt
        for (const bar of bars) {
            for (const cut of bar.cuts) {
                if (cut.bom_item_id) {
                    await db.query(`
                        INSERT INTO cutting_details 
                        (optimization_id, bom_item_id, cut_length_mm, position_order)
                        VALUES (?, ?, ?, ?)
                    `, [
                        optimizationId,
                        cut.bom_item_id,
                        cut.length,
                        cut.position_in_bar || 1
                    ]);
                }
            }
        }

        res.json({
            success: true,
            message: "Lưu kết quả tối ưu cắt thành công",
            data: {
                optimization_id: optimizationId,
                door_id: parseInt(doorId)
            }
        });
    } catch (err) {
        console.error('Error saving optimization:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu tối ưu cắt: " + err.message
        });
    }
};

/**
 * Lấy kết quả tối ưu cắt đã lưu
 */
exports.getOptimization = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;

        const [optRows] = await db.query(`
            SELECT 
                co.*,
                a.code AS aluminum_code,
                a.name AS aluminum_name
            FROM cutting_optimizations co
            LEFT JOIN aluminum_systems a ON co.aluminum_profile_id = a.id
            WHERE co.design_id = ?
            ORDER BY co.created_at DESC
        `, [doorId]);

        if (optRows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: "Chưa có kết quả tối ưu cắt"
            });
        }

        // Lấy chi tiết cắt
        const optimizations = [];
        for (const opt of optRows) {
            const [detailRows] = await db.query(`
                SELECT 
                    cd.*,
                    bi.item_name,
                    bi.item_code,
                    bi.symbol,
                    bi.position
                FROM cutting_details cd
                INNER JOIN bom_items bi ON cd.bom_item_id = bi.id
                WHERE cd.optimization_id = ?
                ORDER BY cd.position_order
            `, [opt.id]);

            optimizations.push({
                ...opt,
                details: detailRows
            });
        }

        res.json({
            success: true,
            data: optimizations
        });
    } catch (err) {
        console.error('Error getting optimization:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy kết quả tối ưu cắt: " + err.message
        });
    }
};

