/**
 * Export Slip Controller
 * Quản lý phiếu xuất kho cho dự án
 */

const db = require('../config/db');

/**
 * Helper: Tạo mã phiếu xuất kho tự động
 * Format: PXK-YYYY-XXXX
 */
async function generateSlipCode(connection) {
    const year = new Date().getFullYear();

    // Lấy và tăng sequence
    const [seqResult] = await connection.query(
        `INSERT INTO export_slip_sequence (year, last_number) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE last_number = last_number + 1`,
        [year]
    );

    const [seqRow] = await connection.query(
        `SELECT last_number FROM export_slip_sequence WHERE year = ?`,
        [year]
    );

    const number = seqRow[0]?.last_number || 1;
    return `PXK-${year}-${String(number).padStart(4, '0')}`;
}

/**
 * Helper: Lấy tồn kho hiện tại của vật tư
 */
async function getStockOnHand(connection, materialType, materialId, materialName, materialCode) {
    let stockOnHand = 0;
    let foundId = null;

    if (materialType === 'accessory') {
        let rows = [];
        if (materialId && materialId !== 0) {
            [rows] = await connection.query(
                `SELECT id, stock_quantity FROM accessories WHERE id = ?`, [materialId]
            );
        } else if (materialCode) {
            [rows] = await connection.query(
                `SELECT id, stock_quantity FROM accessories WHERE code = ?`, [materialCode]
            );
        }
        if (rows.length === 0 && materialName) {
            [rows] = await connection.query(
                `SELECT id, stock_quantity FROM accessories WHERE name = ? OR name LIKE ? LIMIT 1`,
                [materialName, `%${materialName}%`]
            );
        }
        if (rows.length > 0) {
            stockOnHand = parseFloat(rows[0].stock_quantity) || 0;
            foundId = rows[0].id;
        }
    } else if (materialType === 'aluminum') {
        let rows = [];
        if (materialId && materialId !== 0) {
            [rows] = await connection.query(
                `SELECT id, CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock FROM aluminum_systems WHERE id = ?`, [materialId]
            );
        } else if (materialCode) {
            [rows] = await connection.query(
                `SELECT id, CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock FROM aluminum_systems WHERE code = ?`, [materialCode]
            );
        }
        if (rows.length === 0 && materialName) {
            [rows] = await connection.query(
                `SELECT id, CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock FROM aluminum_systems WHERE name = ? OR name LIKE ? LIMIT 1`,
                [materialName, `%${materialName}%`]
            );
        }
        if (rows.length > 0) {
            stockOnHand = parseFloat(rows[0].stock) || 0;
            foundId = rows[0].id;
        }
    } else if (materialType === 'glass' || materialType === 'other') {
        let rows = [];
        if (materialId && materialId !== 0) {
            [rows] = await connection.query(
                `SELECT id, CAST(quantity AS DECIMAL(12,3)) as stock FROM inventory WHERE id = ?`, [materialId]
            );
        } else if (materialCode) {
            [rows] = await connection.query(
                `SELECT id, CAST(quantity AS DECIMAL(12,3)) as stock FROM inventory WHERE item_code = ?`, [materialCode]
            );
        }
        if (rows.length === 0 && materialName) {
            [rows] = await connection.query(
                `SELECT id, CAST(quantity AS DECIMAL(12,3)) as stock FROM inventory WHERE item_name = ? OR item_name LIKE ? LIMIT 1`,
                [materialName, `%${materialName}%`]
            );
        }
        if (rows.length > 0) {
            stockOnHand = parseFloat(rows[0].stock) || 0;
            foundId = rows[0].id;
        }
    }

    return { stockOnHand, foundId };
}

/**
 * Helper: Trừ kho cho vật tư
 */
async function deductStock(connection, materialType, foundId, qty) {
    let tableName = '';
    let stockColumn = '';

    switch (materialType) {
        case 'accessory':
            tableName = 'accessories';
            stockColumn = 'stock_quantity';
            break;
        case 'aluminum':
            tableName = 'aluminum_systems';
            stockColumn = 'quantity';
            break;
        case 'glass':
        case 'other':
            tableName = 'inventory';
            stockColumn = 'quantity';
            break;
        default:
            return 0;
    }

    const [result] = await connection.query(
        `UPDATE ${tableName} SET ${stockColumn} = GREATEST(0, ${stockColumn} - ?) WHERE id = ?`,
        [qty, foundId]
    );

    return result.affectedRows;
}

/**
 * GET /api/export-slips/project/:projectId/materials
 * Lấy danh sách vật tư của dự án với phân loại real-time
 */
exports.getProjectMaterialsClassified = async (req, res) => {
    try {
        const { projectId } = req.params;
        const connection = await db.getConnection();

        // Lấy tất cả vật tư của dự án
        const [materials] = await connection.query(
            `SELECT 
                pm.id,
                pm.project_id,
                pm.material_type,
                pm.material_id,
                pm.material_code,
                pm.material_name,
                COALESCE(pm.required_qty, pm.quantity, 0) as required_qty,
                COALESCE(pm.exported_qty, 0) as exported_qty,
                pm.unit,
                pm.unit_price,
                pm.notes,
                pm.created_at
             FROM project_materials pm
             WHERE pm.project_id = ?
             ORDER BY pm.created_at DESC`,
            [projectId]
        );

        const canExport = [];
        const insufficient = [];
        const exported = [];

        for (const mat of materials) {
            const requiredQty = parseFloat(mat.required_qty) || 0;
            const exportedQty = parseFloat(mat.exported_qty) || 0;
            const remainingQty = Math.max(0, requiredQty - exportedQty);

            // Lấy tồn kho real-time
            const { stockOnHand, foundId } = await getStockOnHand(
                connection,
                mat.material_type,
                mat.material_id,
                mat.material_name,
                mat.material_code
            );

            // Số lượng có thể xuất ngay = min(remaining, stock)
            const canExportQty = Math.min(remainingQty, stockOnHand);

            const enrichedMat = {
                ...mat,
                required_qty: requiredQty,
                exported_qty: exportedQty,
                remaining_qty: remainingQty,
                stock_on_hand: stockOnHand,
                can_export_qty: canExportQty,
                found_material_id: foundId
            };

            // Phân loại
            if (remainingQty <= 0) {
                // Đã xuất đủ
                exported.push(enrichedMat);
            } else if (stockOnHand > 0) {
                // Có thể xuất (còn hàng trong kho)
                canExport.push(enrichedMat);
            } else {
                // Chưa đủ kho
                insufficient.push(enrichedMat);
            }
        }

        connection.release();

        res.json({
            success: true,
            data: {
                can_export: canExport,
                insufficient: insufficient,
                exported: exported,
                summary: {
                    total: materials.length,
                    can_export_count: canExport.length,
                    insufficient_count: insufficient.length,
                    exported_count: exported.length
                }
            }
        });

    } catch (err) {
        console.error('Error getting classified materials:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách vật tư: ' + err.message
        });
    }
};

/**
 * POST /api/export-slips/project/:projectId/confirm
 * Xác nhận xuất kho - Tạo phiếu xuất và trừ kho
 */
exports.confirmExport = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { projectId } = req.params;
        const { materials, note } = req.body; // materials: [{ id, qty }] hoặc rỗng = xuất tất cả có thể
        const userId = req.user?.id || 1; // Từ auth middleware

        // Lấy tất cả vật tư có thể xuất
        const [allMaterials] = await connection.query(
            `SELECT 
                pm.id,
                pm.material_type,
                pm.material_id,
                pm.material_code,
                pm.material_name,
                COALESCE(pm.required_qty, pm.quantity, 0) as required_qty,
                COALESCE(pm.exported_qty, 0) as exported_qty,
                pm.unit,
                pm.unit_price
             FROM project_materials pm
             WHERE pm.project_id = ?`,
            [projectId]
        );

        const exportedItems = [];
        const skippedItems = [];
        let totalQty = 0;
        let totalValue = 0;

        for (const mat of allMaterials) {
            const requiredQty = parseFloat(mat.required_qty) || 0;
            const exportedQty = parseFloat(mat.exported_qty) || 0;
            const remainingQty = Math.max(0, requiredQty - exportedQty);

            if (remainingQty <= 0) continue; // Đã xuất đủ

            // Lấy tồn kho real-time
            const { stockOnHand, foundId } = await getStockOnHand(
                connection,
                mat.material_type,
                mat.material_id,
                mat.material_name,
                mat.material_code
            );

            if (!foundId || stockOnHand <= 0) {
                // Không có hàng
                skippedItems.push({
                    name: mat.material_name,
                    required: remainingQty,
                    available: 0,
                    reason: 'no_stock'
                });
                continue;
            }

            // Số lượng xuất = min(remaining, stock)
            // Nếu user chỉ định cụ thể, dùng số đó
            let qtyToExport = Math.min(remainingQty, stockOnHand);

            if (materials && materials.length > 0) {
                const specified = materials.find(m => m.id === mat.id);
                if (specified) {
                    qtyToExport = Math.min(specified.qty, qtyToExport);
                } else {
                    continue; // Không nằm trong danh sách chọn
                }
            }

            if (qtyToExport <= 0) continue;

            // Trừ kho
            await deductStock(connection, mat.material_type, foundId, qtyToExport);

            // Cập nhật exported_qty trong project_materials
            await connection.query(
                `UPDATE project_materials 
                 SET exported_qty = COALESCE(exported_qty, 0) + ?,
                     stock_deducted = CASE 
                         WHEN COALESCE(exported_qty, 0) + ? >= COALESCE(required_qty, quantity, 0) 
                         THEN 1 ELSE 0 
                     END
                 WHERE id = ?`,
                [qtyToExport, qtyToExport, mat.id]
            );

            const unitPrice = parseFloat(mat.unit_price) || 0;
            const lineTotal = qtyToExport * unitPrice;

            exportedItems.push({
                project_material_id: mat.id,
                material_type: mat.material_type,
                material_id: mat.material_id,
                material_code: mat.material_code,
                material_name: mat.material_name,
                qty: qtyToExport,
                unit: mat.unit,
                unit_price: unitPrice,
                total_price: lineTotal,
                stock_before: stockOnHand,
                stock_after: stockOnHand - qtyToExport
            });

            totalQty += qtyToExport;
            totalValue += lineTotal;
        }

        // Nếu không có gì để xuất
        if (exportedItems.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Không có vật tư nào có thể xuất. Vui lòng nhập thêm kho.',
                skipped: skippedItems
            });
        }

        // Tạo mã phiếu
        const slipCode = await generateSlipCode(connection);

        // Tạo phiếu xuất kho
        const [slipResult] = await connection.query(
            `INSERT INTO export_slips 
             (code, project_id, exported_by, total_items, total_qty, total_value, note, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'POSTED')`,
            [slipCode, projectId, userId, exportedItems.length, totalQty, totalValue, note || null]
        );

        const slipId = slipResult.insertId;

        // Tạo chi tiết phiếu xuất
        for (const item of exportedItems) {
            await connection.query(
                `INSERT INTO export_slip_items 
                 (slip_id, project_material_id, material_type, material_id, material_code, 
                  material_name, qty, unit, unit_price, total_price, stock_before, stock_after)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [slipId, item.project_material_id, item.material_type, item.material_id,
                    item.material_code, item.material_name, item.qty, item.unit,
                    item.unit_price, item.total_price, item.stock_before, item.stock_after]
            );
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: `Đã tạo phiếu xuất kho ${slipCode} với ${exportedItems.length} vật tư.`,
            data: {
                slip_code: slipCode,
                slip_id: slipId,
                exported_count: exportedItems.length,
                total_qty: totalQty,
                total_value: totalValue,
                exported_items: exportedItems,
                skipped_items: skippedItems
            }
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error confirming export:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xác nhận xuất kho: ' + err.message
        });
    }
};

/**
 * GET /api/export-slips/project/:projectId
 * Lấy danh sách phiếu xuất kho của dự án
 */
exports.getProjectExportSlips = async (req, res) => {
    try {
        const { projectId } = req.params;

        const [slips] = await db.query(
            `SELECT 
                es.*,
                u.fullname as exported_by_name
             FROM export_slips es
             LEFT JOIN users u ON es.exported_by = u.id
             WHERE es.project_id = ?
             ORDER BY es.exported_at DESC`,
            [projectId]
        );

        res.json({
            success: true,
            data: slips
        });

    } catch (err) {
        console.error('Error getting export slips:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phiếu xuất: ' + err.message
        });
    }
};

/**
 * GET /api/export-slips/:slipId
 * Lấy chi tiết phiếu xuất kho
 */
exports.getExportSlipDetail = async (req, res) => {
    try {
        const { slipId } = req.params;

        const [slips] = await db.query(
            `SELECT 
                es.*,
                p.project_code,
                p.project_name,
                u.fullname as exported_by_name
             FROM export_slips es
             LEFT JOIN projects p ON es.project_id = p.id
             LEFT JOIN users u ON es.exported_by = u.id
             WHERE es.id = ?`,
            [slipId]
        );

        if (slips.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiếu xuất kho'
            });
        }

        const [items] = await db.query(
            `SELECT * FROM export_slip_items WHERE slip_id = ?`,
            [slipId]
        );

        res.json({
            success: true,
            data: {
                ...slips[0],
                items: items
            }
        });

    } catch (err) {
        console.error('Error getting export slip detail:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết phiếu xuất: ' + err.message
        });
    }
};

/**
 * GET /api/export-slips
 * Lấy tất cả phiếu xuất kho (có phân trang)
 */
exports.getAllExportSlips = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (status) {
            whereClause += ' AND es.status = ?';
            params.push(status);
        }

        const [slips] = await db.query(
            `SELECT 
                es.*,
                p.project_code,
                p.project_name,
                u.fullname as exported_by_name,
                (SELECT COUNT(*) FROM export_slip_items WHERE export_slip_id = es.id) as item_count
             FROM export_slips es
             LEFT JOIN projects p ON es.project_id = p.id
             LEFT JOIN users u ON es.exported_by = u.id
             WHERE ${whereClause}
             ORDER BY es.exported_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        const [[countResult]] = await db.query(
            `SELECT COUNT(*) as total FROM export_slips es WHERE ${whereClause}`,
            params
        );

        res.json({
            success: true,
            data: slips,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (err) {
        console.error('Error getting all export slips:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phiếu xuất: ' + err.message
        });
    }
};
