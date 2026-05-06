const db = require("../config/db");
const bomCtrlV2 = require("./bomControllerV2");

/**
 * Tự động tính BOM cho tất cả cửa trong dự án nếu chưa có
 */
async function ensureBOMCalculated(projectId) {
    try {
        // Lấy danh sách cửa trong dự án
        const [doors] = await db.query(
            `SELECT id, design_code FROM door_designs WHERE project_id = ?`,
            [projectId]
        );

        if (doors.length === 0) {
            return { calculated: 0, skipped: 0 };
        }

        let calculated = 0;
        let skipped = 0;

        // Kiểm tra và tính BOM cho từng cửa
        for (const door of doors) {
            // Kiểm tra xem cửa đã có BOM chưa
            const [bomRows] = await db.query(
                `SELECT COUNT(*) as count FROM bom_items WHERE design_id = ?`,
                [door.id]
            );

            if (bomRows[0].count > 0) {
                skipped++;
                continue; // Đã có BOM, bỏ qua
            }

            // Tính BOM cho cửa này bằng cách gọi trực tiếp hàm tính BOM
            try {
                // Tạo request và response mock
                const reqMock = {
                    params: {
                        projectId: projectId,
                        doorId: door.id
                    }
                };

                let bomResult = null;
                const resMock = {
                    json: (data) => {
                        bomResult = data;
                    },
                    status: (code) => ({
                        json: (data) => {
                            bomResult = data;
                        }
                    })
                };

                // Gọi hàm calculateBOM trực tiếp
                await bomCtrlV2.calculateBOM(reqMock, resMock);

                // Lưu BOM vào database nếu có dữ liệu
                if (bomResult && bomResult.success && bomResult.data && bomResult.data.items) {
                    const bomItems = bomResult.data.items;

                    // Xóa BOM cũ nếu có
                    await db.query(`DELETE FROM bom_items WHERE design_id = ?`, [door.id]);

                    // Lưu BOM mới
                    if (bomItems.length > 0) {
                        await Promise.all(
                            bomItems.map(item => {
                                return db.query(
                                    `INSERT INTO bom_items 
                                    (design_id, item_type, item_code, item_name, length_mm, width_mm, height_mm, 
                                     quantity, unit, weight_kg, area_m2, aluminum_system_id, accessory_id, position)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        door.id,
                                        item.item_type,
                                        item.item_code || null,
                                        item.item_name,
                                        item.length_mm || null,
                                        item.width_mm || null,
                                        item.height_mm || null,
                                        item.quantity || 1,
                                        item.unit || 'pcs',
                                        item.weight_kg || null,
                                        item.area_m2 || null,
                                        item.aluminum_system_id || null,
                                        item.accessory_id || null,
                                        item.position || null
                                    ]
                                );
                            })
                        );
                        calculated++;
                    }
                }
            } catch (err) {
                console.error(`Error calculating BOM for door ${door.id}:`, err);
                // Tiếp tục với cửa tiếp theo
            }
        }

        return { calculated, skipped, total: doors.length };
    } catch (err) {
        console.error('Error ensuring BOM calculated:', err);
        return { calculated: 0, skipped: 0, error: err.message };
    }
}

// ============================================
// ALUMINUM SUMMARY
// ============================================
exports.getAluminumSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Get aluminum summary from database
        const [rows] = await db.query(
            `SELECT * FROM project_aluminum_summary WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`,
            [projectId]
        );

        // If no summary exists, calculate from door designs
        if (rows.length === 0) {
            // Tự động tính BOM cho các cửa chưa có BOM
            await ensureBOMCalculated(projectId);

            const calculated = await calculateAluminumSummary(projectId);
            return res.json({
                success: true,
                data: calculated,
                calculated: true
            });
        }

        // Parse JSON fields if they exist
        const summary = rows[0];
        if (summary.items_json && typeof summary.items_json === 'string') {
            try {
                summary.items = JSON.parse(summary.items_json);
            } catch (e) {
                summary.items = [];
            }
        } else if (!summary.items) {
            summary.items = [];
        }

        res.json({
            success: true,
            data: summary,
            calculated: false
        });
    } catch (err) {
        console.error('Error in getAluminumSummary:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải tổng hợp nhôm: " + (err.message || 'Lỗi không xác định')
        });
    }
};

async function calculateAluminumSummary(projectId) {
    try {
        // Lấy BOM items từ tất cả cửa trong dự án
        const [bomItems] = await db.query(
            `SELECT 
                bi.*,
                dd.design_code,
                dd.door_type,
                a.name as aluminum_name,
                a.code as aluminum_code
             FROM bom_items bi
             INNER JOIN door_designs dd ON bi.design_id = dd.id
             LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id OR dd.aluminum_system_id = a.id
             WHERE dd.project_id = ? 
             AND (bi.item_type = 'frame' OR bi.item_type = 'mullion' OR bi.item_type = 'profile')
             ORDER BY bi.item_name, bi.item_code`,
            [projectId]
        );

        const summary = {
            project_id: parseInt(projectId),
            total_length_m: 0,
            total_length_mm: 0,
            total_weight_kg: 0,
            items: []
        };

        if (bomItems.length === 0) {
            // Nếu không có BOM, thử tính từ door_designs
            const [doors] = await db.query(
                `SELECT dd.*, a.name as aluminum_name, a.code as aluminum_code, a.weight_per_meter
                 FROM door_designs dd
                 LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
                 WHERE dd.project_id = ?`,
                [projectId]
            );

            doors.forEach(door => {
                if (!door.width_mm || !door.height_mm) return;

                const frameLengthMM = (door.width_mm + door.height_mm) * 2;
                const frameLengthM = frameLengthMM / 1000;
                const weight = frameLengthM * (door.weight_per_meter || 0);

                summary.total_length_m += frameLengthM;
                summary.total_length_mm += frameLengthMM;
                summary.total_weight_kg += weight;

                summary.items.push({
                    door_code: door.design_code || `Cửa ${door.id}`,
                    aluminum_name: door.aluminum_name || 'Chưa xác định',
                    aluminum_code: door.aluminum_code || '-',
                    symbol: door.aluminum_code || '-',
                    length_m: parseFloat(frameLengthM.toFixed(2)),
                    length_mm: frameLengthMM,
                    weight_kg: parseFloat(weight.toFixed(2)),
                    quantity: 1,
                    unit_price: 0
                });
            });
        } else {
            // Nhóm BOM items theo tên và mã
            const itemsMap = {};

            bomItems.forEach(item => {
                const key = `${item.item_name || ''}_${item.item_code || ''}_${item.aluminum_code || ''}`;
                if (!itemsMap[key]) {
                    itemsMap[key] = {
                        aluminum_name: item.item_name || item.aluminum_name || 'Chưa xác định',
                        aluminum_code: item.item_code || item.aluminum_code || '-',
                        symbol: item.item_code || item.aluminum_code || '-',
                        length_m: 0,
                        length_mm: 0,
                        weight_kg: 0,
                        quantity: 0,
                        unit_price: 0
                    };
                }

                const lengthMM = item.length_mm || 0;
                const lengthM = lengthMM / 1000;
                const weight = item.weight_kg || 0;
                const qty = item.quantity || 1;

                itemsMap[key].length_mm += lengthMM * qty;
                itemsMap[key].length_m += lengthM * qty;
                itemsMap[key].weight_kg += weight * qty;
                itemsMap[key].quantity += qty;
            });

            // Chuyển map thành array
            Object.values(itemsMap).forEach(item => {
                item.length_m = parseFloat(item.length_m.toFixed(2));
                item.weight_kg = parseFloat(item.weight_kg.toFixed(2));
                summary.items.push(item);

                summary.total_length_m += item.length_m;
                summary.total_length_mm += item.length_mm;
                summary.total_weight_kg += item.weight_kg;
            });
        }

        summary.total_length_m = parseFloat(summary.total_length_m.toFixed(2));
        summary.total_weight_kg = parseFloat(summary.total_weight_kg.toFixed(2));

        return summary;
    } catch (err) {
        console.error('Error calculating aluminum summary:', err);
        return {
            project_id: parseInt(projectId),
            total_length_m: 0,
            total_length_mm: 0,
            total_weight_kg: 0,
            items: []
        };
    }
}

exports.createAluminumSummary = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { items, notes } = req.body;

        // Delete existing summary
        await db.query(
            "DELETE FROM project_aluminum_summary WHERE project_id = ?",
            [projectId]
        );

        // Calculate totals
        let totalLength = 0;
        let totalWeight = 0;
        items.forEach(item => {
            totalLength += item.length_m || 0;
            totalWeight += item.weight_kg || 0;
        });

        const [result] = await db.query(
            `INSERT INTO project_aluminum_summary 
             (project_id, total_length_mm, total_weight_kg, items_json, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [
                projectId,
                totalLength,
                totalWeight,
                JSON.stringify(items),
                notes || null
            ]
        );

        res.json({
            success: true,
            message: "Lưu tổng hợp nhôm thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu tổng hợp nhôm"
        });
    }
};

exports.updateAluminumSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { items, notes } = req.body;

        let totalLength = 0;
        let totalWeight = 0;
        items.forEach(item => {
            totalLength += item.length_m || 0;
            totalWeight += item.weight_kg || 0;
        });

        const [result] = await db.query(
            `UPDATE project_aluminum_summary 
             SET total_length_mm = ?, total_weight_kg = ?, items_json = ?, notes = ?
             WHERE id = ?`,
            [totalLength, totalWeight, JSON.stringify(items), notes || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tổng hợp nhôm"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật tổng hợp nhôm thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật tổng hợp nhôm"
        });
    }
};

// ============================================
// GLASS SUMMARY
// ============================================
exports.getGlassSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        const [rows] = await db.query(
            `SELECT * FROM project_glass_summary WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`,
            [projectId]
        );

        if (rows.length === 0) {
            // Tự động tính BOM cho các cửa chưa có BOM
            await ensureBOMCalculated(projectId);

            const calculated = await calculateGlassSummary(projectId);
            return res.json({
                success: true,
                data: calculated,
                calculated: true
            });
        }

        // Parse JSON fields if they exist
        const summary = rows[0];
        if (summary.items_json && typeof summary.items_json === 'string') {
            try {
                summary.items = JSON.parse(summary.items_json);
            } catch (e) {
                summary.items = [];
            }
        } else if (!summary.items) {
            summary.items = [];
        }

        res.json({
            success: true,
            data: summary,
            calculated: false
        });
    } catch (err) {
        console.error('Error in getGlassSummary:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải tổng hợp kính: " + (err.message || 'Lỗi không xác định')
        });
    }
};

async function calculateGlassSummary(projectId) {
    try {
        // Lấy BOM items kính từ tất cả cửa trong dự án
        const [bomItems] = await db.query(
            `SELECT 
                bi.*,
                dd.design_code,
                dd.door_type
             FROM bom_items bi
             INNER JOIN door_designs dd ON bi.design_id = dd.id
             WHERE dd.project_id = ? 
             AND bi.item_type = 'glass'
             ORDER BY dd.design_code, bi.item_name`,
            [projectId]
        );

        const summary = {
            project_id: parseInt(projectId),
            total_area_m2: 0,
            items: []
        };

        if (bomItems.length === 0) {
            // Nếu không có BOM, thử tính từ door_designs
            const [doors] = await db.query(
                `SELECT dd.*, dd.area_m2
                 FROM door_designs dd
                 WHERE dd.project_id = ?`,
                [projectId]
            );

            doors.forEach(door => {
                if (!door.width_mm || !door.height_mm) return;

                const area = door.area_m2 || (door.width_mm * door.height_mm / 1000000);
                summary.total_area_m2 += area;

                summary.items.push({
                    door_code: door.design_code || `Cửa ${door.id}`,
                    glass_type: door.glass_type || '12',
                    width_mm: door.width_mm,
                    height_mm: door.height_mm,
                    area_m2: parseFloat((Number(area) || 0).toFixed(4)),
                    quantity: 1,
                    unit_price: 0
                });
            });
        } else {
            // Lấy dữ liệu từ BOM
            bomItems.forEach(item => {
                const area = item.area_m2 || ((item.width_mm || 0) * (item.height_mm || 0) / 1000000);
                const qty = item.quantity || 1;
                const totalArea = area * qty;

                summary.total_area_m2 += totalArea;

                summary.items.push({
                    door_code: item.design_code || `Cửa ${item.design_id}`,
                    glass_type: item.item_name || item.glass_type || '12',
                    width_mm: item.width_mm || 0,
                    height_mm: item.height_mm || 0,
                    area_m2: parseFloat((Number(area) || 0).toFixed(4)),
                    quantity: qty,
                    unit_price: 0
                });
            });
        }

        summary.total_area_m2 = parseFloat(summary.total_area_m2.toFixed(4));

        return summary;
    } catch (err) {
        console.error('Error calculating glass summary:', err);
        return {
            project_id: parseInt(projectId),
            total_area_m2: 0,
            items: []
        };
    }
}

exports.createGlassSummary = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { items, notes } = req.body;

        await db.query(
            "DELETE FROM project_glass_summary WHERE project_id = ?",
            [projectId]
        );

        let totalArea = 0;
        items.forEach(item => {
            totalArea += item.area_m2 || 0;
        });

        const [result] = await db.query(
            `INSERT INTO project_glass_summary 
             (project_id, total_area_m2, items_json, notes)
             VALUES (?, ?, ?, ?)`,
            [projectId, totalArea, JSON.stringify(items), notes || null]
        );

        res.json({
            success: true,
            message: "Lưu tổng hợp kính thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu tổng hợp kính"
        });
    }
};

exports.updateGlassSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { items, notes } = req.body;

        let totalArea = 0;
        items.forEach(item => {
            totalArea += item.area_m2 || 0;
        });

        const [result] = await db.query(
            `UPDATE project_glass_summary 
             SET total_area_m2 = ?, items_json = ?, notes = ?
             WHERE id = ?`,
            [totalArea, JSON.stringify(items), notes || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tổng hợp kính"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật tổng hợp kính thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật tổng hợp kính"
        });
    }
};

// ============================================
// ACCESSORIES SUMMARY
// ============================================
exports.getAccessoriesSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        const [rows] = await db.query(
            `SELECT * FROM project_accessories_summary WHERE project_id = ? ORDER BY created_at DESC`,
            [projectId]
        );

        if (rows.length === 0) {
            // Tự động tính BOM cho các cửa chưa có BOM
            await ensureBOMCalculated(projectId);

            const calculated = await calculateAccessoriesSummary(projectId);
            return res.json({
                success: true,
                data: calculated,
                calculated: true
            });
        }

        res.json({
            success: true,
            data: rows[0],
            calculated: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

async function calculateAccessoriesSummary(projectId) {
    try {
        // Lấy BOM items phụ kiện từ tất cả cửa trong dự án
        const [bomItems] = await db.query(
            `SELECT 
                bi.*,
                dd.design_code,
                acc.sale_price as accessory_price,
                acc.name as accessory_name,
                acc.code as accessory_code
             FROM bom_items bi
             INNER JOIN door_designs dd ON bi.design_id = dd.id
             LEFT JOIN accessories acc ON bi.accessory_id = acc.id
             WHERE dd.project_id = ? 
             AND (bi.item_type = 'accessory' OR bi.item_type = 'hardware' OR bi.item_type = 'gasket' OR bi.item_type = 'glue')
             ORDER BY bi.item_type, bi.item_name`,
            [projectId]
        );

        const summary = {
            project_id: parseInt(projectId),
            accessories: [],
            gaskets: [],
            glue: [],
            total_cost: 0
        };

        if (bomItems.length === 0) {
            return summary;
        }

        // Phân loại items
        bomItems.forEach(item => {
            const itemData = {
                name: item.item_name || item.accessory_name || 'Chưa xác định',
                code: item.item_code || item.accessory_code || '-',
                quantity: item.quantity || 1,
                unit: item.unit || 'cái',
                unit_price: item.accessory_price || item.purchase_price || 0,
                total_price: (item.accessory_price || item.purchase_price || 0) * (item.quantity || 1)
            };

            if (item.item_type === 'gasket') {
                summary.gaskets.push(itemData);
            } else if (item.item_type === 'glue') {
                summary.glue.push(itemData);
            } else {
                summary.accessories.push(itemData);
            }

            summary.total_cost += itemData.total_price;
        });

        summary.total_cost = parseFloat(summary.total_cost.toFixed(2));

        return summary;
    } catch (err) {
        console.error('Error calculating accessories summary:', err);
        return {
            project_id: parseInt(projectId),
            accessories: [],
            gaskets: [],
            glue: [],
            total_cost: 0
        };
    }
}

exports.createAccessoriesSummary = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { accessories, gaskets, glue, notes } = req.body;

        await db.query(
            "DELETE FROM project_accessories_summary WHERE project_id = ?",
            [projectId]
        );

        let totalCost = 0;
        const allItems = [...(accessories || []), ...(gaskets || []), ...(glue || [])];
        allItems.forEach(item => {
            totalCost += (item.unit_price || 0) * (item.quantity || 0);
        });

        // Insert each item separately
        for (const item of allItems) {
            await db.query(
                `INSERT INTO project_accessories_summary 
                 (project_id, accessory_code, accessory_name, category, quantity, unit, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    projectId,
                    item.code || item.item_code || 'N/A',
                    item.name || item.item_name || item.accessory_name || 'N/A',
                    item.category || item.item_type || 'accessory',
                    item.quantity || 1,
                    item.unit || 'cái',
                    item.unit_price || 0,
                    (item.unit_price || 0) * (item.quantity || 1)
                ]
            );
        }

        res.json({
            success: true,
            message: "Lưu tổng hợp phụ kiện thành công",
            data: { project_id: projectId }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu tổng hợp phụ kiện"
        });
    }
};

exports.updateAccessoriesSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { accessories, gaskets, glue, notes } = req.body;

        let totalCost = 0;
        [...(accessories || []), ...(gaskets || []), ...(glue || [])].forEach(item => {
            totalCost += (item.unit_price || 0) * (item.quantity || 0);
        });

        // For update, we'll delete and recreate items
        await db.query(
            "DELETE FROM project_accessories_summary WHERE project_id = (SELECT project_id FROM project_accessories_summary WHERE id = ?)",
            [id]
        );

        // Re-insert items
        const allItems = [...(accessories || []), ...(gaskets || []), ...(glue || [])];
        for (const item of allItems) {
            await db.query(
                `INSERT INTO project_accessories_summary 
                 (project_id, accessory_code, accessory_name, category, quantity, unit, unit_price, total_price)
                 VALUES ((SELECT project_id FROM (SELECT project_id FROM project_accessories_summary WHERE id = ?) AS temp), ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    item.code || item.item_code || 'N/A',
                    item.name || item.item_name || item.accessory_name || 'N/A',
                    item.category || item.item_type || 'accessory',
                    item.quantity || 1,
                    item.unit || 'cái',
                    item.unit_price || 0,
                    (item.unit_price || 0) * (item.quantity || 1)
                ]
            );
        }

        // Check if items were inserted
        if (allItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có dữ liệu để cập nhật"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật tổng hợp phụ kiện thành công",
            data: { project_id: id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật tổng hợp phụ kiện"
        });
    }
};

// ============================================
// QUOTATION SUMMARY
// ============================================
exports.getQuotationSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Use quotations table instead
        const [rows] = await db.query(
            `SELECT * FROM quotations WHERE project_id = ? ORDER BY created_at DESC`,
            [projectId]
        );

        // Calculate total from quotations
        let totalAmount = 0;
        rows.forEach(q => {
            totalAmount += parseFloat(q.total_amount || 0);
        });

        return res.json({
            success: true,
            data: {
                project_id: projectId,
                total_amount: totalAmount,
                items: rows
            },
            calculated: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

exports.createQuotationSummary = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { items, total_amount, notes } = req.body;

        // Quotation summary is calculated from quotations table
        // No need to create separate table
        res.json({
            success: true,
            message: "Bảng báo giá được tính từ bảng quotations",
            data: { project_id: projectId }
        });

        res.json({
            success: true,
            message: "Lưu bảng báo giá thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu bảng báo giá"
        });
    }
};

exports.updateQuotationSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { items, total_amount, notes } = req.body;

        // Quotation summary is calculated from quotations table
        res.json({
            success: true,
            message: "Bảng báo giá được tính từ bảng quotations"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật bảng báo giá"
        });
    }
};

// ============================================
// FINANCIAL SUMMARY
// ============================================
exports.getFinancialSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        const [rows] = await db.query(
            `SELECT * FROM project_finances WHERE project_id = ? ORDER BY created_at DESC`,
            [projectId]
        );

        if (rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    project_id: projectId,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    debt: 0
                },
                calculated: true
            });
        }

        res.json({
            success: true,
            data: rows[0],
            calculated: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

exports.createFinancialSummary = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { revenue, cost, profit, debt, notes } = req.body;

        await db.query(
            "DELETE FROM project_finances WHERE project_id = ?",
            [projectId]
        );

        const [result] = await db.query(
            `INSERT INTO project_finances 
             (project_id, revenue_from_quotation, total_cost, profit_before_debt, total_customer_debt)
             VALUES (?, ?, ?, ?, ?)`,
            [
                projectId,
                revenue || 0,
                cost || 0,
                (revenue || 0) - (cost || 0),
                debt || 0
            ]
        );

        res.json({
            success: true,
            message: "Lưu tài chính công trình thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu tài chính công trình"
        });
    }
};

exports.updateFinancialSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { revenue, cost, profit, debt, notes } = req.body;

        const [result] = await db.query(
            `UPDATE project_finances 
             SET revenue_from_quotation = ?, total_cost = ?, profit_before_debt = ?, total_customer_debt = ?
             WHERE id = ?`,
            [revenue || 0, cost || 0, (revenue || 0) - (cost || 0), debt || 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài chính công trình"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật tài chính công trình thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật tài chính công trình"
        });
    }
};

// ============================================
// MATERIAL SUMMARY (Tổng hợp vật tư cho báo giá)
// ============================================
/**
 * Lấy tổng hợp vật tư cho project (từ projects_material_summary)
 * Dùng để tạo báo giá
 */
exports.getMaterialSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Lấy tổng hợp vật tư từ projects_material_summary
        const [rows] = await db.query(
            `SELECT * FROM projects_material_summary 
             WHERE project_id = ? 
             ORDER BY item_type, item_code`,
            [projectId]
        );

        // Nhóm theo item_type
        const grouped = {
            frame: [],
            mullion: [],
            glass: [],
            accessory: [],
            gasket: [],
            other: []
        };

        let totals = {
            total_aluminum_length_m: 0,
            total_aluminum_weight_kg: 0,
            total_glass_area_m2: 0,
            total_accessories: 0,
            total_gaskets_length_m: 0
        };

        rows.forEach(row => {
            const type = row.item_type || 'other';
            const item = {
                id: row.id,
                item_type: row.item_type,
                item_code: row.item_code,
                total_qty: parseFloat(row.total_qty) || 0,
                total_length_mm: row.total_length_mm || 0,
                total_area_m2: parseFloat(row.total_area_m2) || 0,
                total_cost: parseFloat(row.total_cost) || 0
            };

            // Nhóm vào category phù hợp
            if (type === 'frame' || type === 'profile') {
                grouped.frame.push(item);
                totals.total_aluminum_length_m += (row.total_length_mm || 0) / 1000;
            } else if (type === 'mullion') {
                grouped.mullion.push(item);
                totals.total_aluminum_length_m += (row.total_length_mm || 0) / 1000;
            } else if (type === 'glass') {
                grouped.glass.push(item);
                totals.total_glass_area_m2 += parseFloat(row.total_area_m2) || 0;
            } else if (type === 'accessory') {
                grouped.accessory.push(item);
                totals.total_accessories += parseFloat(row.total_qty) || 0;
            } else if (type === 'gasket') {
                grouped.gasket.push(item);
                totals.total_gaskets_length_m += (row.total_length_mm || 0) / 1000;
            } else {
                grouped.other.push(item);
            }
        });

        // Tính tổng hợp nhôm (frame + mullion)
        const allAluminum = [...grouped.frame, ...grouped.mullion];

        res.json({
            success: true,
            data: {
                items: rows,
                grouped: grouped,
                summary: {
                    aluminum: {
                        items: allAluminum,
                        total_length_m: parseFloat(totals.total_aluminum_length_m.toFixed(3)),
                        total_items: allAluminum.length
                    },
                    glass: {
                        items: grouped.glass,
                        total_area_m2: parseFloat(totals.total_glass_area_m2.toFixed(3)),
                        total_items: grouped.glass.length
                    },
                    accessories: {
                        items: grouped.accessory,
                        total_qty: parseFloat(totals.total_accessories.toFixed(2)),
                        total_items: grouped.accessory.length
                    },
                    gaskets: {
                        items: grouped.gasket,
                        total_length_m: parseFloat(totals.total_gaskets_length_m.toFixed(3)),
                        total_items: grouped.gasket.length
                    },
                    other: {
                        items: grouped.other,
                        total_items: grouped.other.length
                    }
                },
                totals: totals
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy tổng hợp vật tư: " + err.message
        });
    }
};

/**
 * Cập nhật lại tổng hợp vật tư cho project
 * (Tính lại từ tất cả BOM của các cửa)
 */
exports.refreshMaterialSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Gọi hàm cập nhật từ bomAutoSave
        const bomAutoSave = require("../services/bomAutoSave");
        await bomAutoSave.updateProjectMaterialSummary(projectId);

        // Lấy lại dữ liệu sau khi cập nhật
        const [rows] = await db.query(
            `SELECT * FROM projects_material_summary 
             WHERE project_id = ? 
             ORDER BY item_type, item_code`,
            [projectId]
        );

        res.json({
            success: true,
            message: "Đã cập nhật tổng hợp vật tư thành công",
            data: {
                items: rows,
                count: rows.length
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật tổng hợp vật tư: " + err.message
        });
    }
};

