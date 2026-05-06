const db = require("../config/db");
const productBomService = require("../services/productBomService");
const { calcProduct } = require("../services/calcEngine");
const { mergeSnapshotConfig, createInitialSnapshot, validateSnapshot } = require("../services/snapshotMerge");

// ============================================
// PROJECT ITEM CONTROLLER
// Quản lý sản phẩm trong dự án (ATC Style)
// Hỗ trợ tất cả loại sản phẩm + snapshot + bom_override + calcEngine
// ============================================

/**
 * Lấy danh sách sản phẩm của dự án
 */
exports.getProjectItems = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { product_type } = req.query;

        let query = `
            SELECT 
                pi.*,
                pt.code as product_code,
                pt.name as product_name,
                pt.product_type,
                pt.category as product_category,
                pt.family as product_family,
                pt.preview_image,
                pt.param_schema,
                pt.bom_rules,
                COALESCE(pi.custom_width_mm, pt.default_width_mm) as width_mm,
                COALESCE(pi.custom_height_mm, pt.default_height_mm) as height_mm,
                COALESCE(pi.custom_glass_type, pt.glass_type) as glass_type
            FROM project_items pi
            JOIN product_templates pt ON pt.id = pi.product_template_id
            WHERE pi.project_id = ?
        `;
        const params = [projectId];

        if (product_type) {
            query += ` AND pt.product_type = ?`;
            params.push(product_type);
        }

        query += ` ORDER BY pt.product_type, pi.created_at DESC`;

        const [items] = await db.query(query, params);

        // Group by product_type for frontend
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.product_type]) {
                grouped[item.product_type] = [];
            }
            grouped[item.product_type].push(item);
        });

        res.json({
            success: true,
            data: items,
            grouped,
            count: items.length
        });
    } catch (err) {
        console.error("Error getting project items:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Thêm sản phẩm vào dự án
 */
exports.addItemToProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            product_template_id,
            aluminum_system,
            quantity,
            custom_width_mm,
            custom_height_mm,
            custom_glass_type,
            custom_accessories_json,
            location,
            notes
        } = req.body;

        // Validate required fields
        if (!product_template_id || !aluminum_system) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn mẫu sản phẩm và hệ nhôm"
            });
        }

        // Kiểm tra template tồn tại
        const [templates] = await db.query(
            "SELECT id, name, product_type FROM product_templates WHERE id = ? AND is_active = 1",
            [product_template_id]
        );

        if (templates.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mẫu sản phẩm không tồn tại hoặc đã ngừng sử dụng"
            });
        }

        const [result] = await db.query(`
            INSERT INTO project_items 
            (project_id, product_template_id, aluminum_system, quantity, 
             custom_width_mm, custom_height_mm, custom_glass_type, 
             custom_accessories_json, location, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            projectId,
            product_template_id,
            aluminum_system,
            quantity || 1,
            custom_width_mm || null,
            custom_height_mm || null,
            custom_glass_type || null,
            custom_accessories_json ? JSON.stringify(custom_accessories_json) : null,
            location || null,
            notes || null
        ]);

        const template = templates[0];
        res.status(201).json({
            success: true,
            message: `Đã thêm ${quantity || 1} "${template.name}" vào dự án`,
            data: {
                id: result.insertId,
                product_type: template.product_type
            }
        });
    } catch (err) {
        console.error("Error adding item to project:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Cập nhật sản phẩm trong dự án
 */
exports.updateProjectItem = async (req, res) => {
    try {
        const { projectId, id } = req.params;
        const {
            aluminum_system,
            quantity,
            custom_width_mm,
            custom_height_mm,
            custom_glass_type,
            custom_accessories_json,
            snapshot_config,
            bom_override,
            location,
            notes
        } = req.body;

        const [result] = await db.query(`
            UPDATE project_items SET
                aluminum_system = COALESCE(?, aluminum_system),
                quantity = COALESCE(?, quantity),
                custom_width_mm = ?,
                custom_height_mm = ?,
                custom_glass_type = ?,
                custom_accessories_json = ?,
                snapshot_config = ?,
                bom_override = ?,
                location = ?,
                notes = ?
            WHERE id = ? AND project_id = ?
        `, [
            aluminum_system,
            quantity,
            custom_width_mm || null,
            custom_height_mm || null,
            custom_glass_type || null,
            custom_accessories_json ? JSON.stringify(custom_accessories_json) : null,
            snapshot_config ? JSON.stringify(snapshot_config) : null,
            bom_override ? JSON.stringify(bom_override) : null,
            location || null,
            notes || null,
            id,
            projectId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm trong dự án"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật thành công"
        });
    } catch (err) {
        console.error("Error updating project item:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Xóa sản phẩm khỏi dự án
 */
exports.removeProjectItem = async (req, res) => {
    try {
        const { projectId, id } = req.params;

        const [result] = await db.query(
            "DELETE FROM project_items WHERE id = ? AND project_id = ?",
            [id, projectId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm trong dự án"
            });
        }

        res.json({
            success: true,
            message: "Đã xóa sản phẩm khỏi dự án"
        });
    } catch (err) {
        console.error("Error removing project item:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Bóc tách BOM cho toàn bộ sản phẩm trong dự án
 */
exports.extractBOM = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Lấy tất cả sản phẩm trong dự án
        const [items] = await db.query(`
            SELECT 
                pi.*,
                pt.name as product_name,
                pt.code as product_code,
                pt.product_type,
                pt.param_schema,
                pt.structure_json,
                pt.template_json,
                pt.bom_rules,
                COALESCE(pi.custom_width_mm, pt.default_width_mm, 1200) as width_mm,
                COALESCE(pi.custom_height_mm, pt.default_height_mm, 2200) as height_mm,
                COALESCE(pi.custom_glass_type, pt.glass_type, 'Kính 8mm') as glass_type
            FROM project_items pi
            JOIN product_templates pt ON pt.id = pi.product_template_id
            WHERE pi.project_id = ?
        `, [projectId]);

        if (items.length === 0) {
            return res.json({
                success: true,
                message: "Dự án chưa có sản phẩm nào",
                data: { items: [], total: {} }
            });
        }

        // Tính BOM cho từng sản phẩm và gom nhóm
        const bomByItem = [];
        const aggregatedBom = {
            profiles: new Map(),
            glass: new Map(),
            accessories: new Map()
        };

        for (const item of items) {
            let itemBom = null;

            // Check if has bom_override
            if (item.bom_override) {
                try {
                    itemBom = typeof item.bom_override === 'string'
                        ? JSON.parse(item.bom_override)
                        : item.bom_override;
                } catch (e) { }
            }

            // If no override, calculate BOM
            if (!itemBom) {
                try {
                    const templateJson = item.template_json
                        ? (typeof item.template_json === 'string' ? JSON.parse(item.template_json) : item.template_json)
                        : null;
                    const structureJson = item.structure_json
                        ? (typeof item.structure_json === 'string' ? JSON.parse(item.structure_json) : item.structure_json)
                        : null;

                    itemBom = await productBomService.generateDoorBomFromTemplate({
                        templateJson,
                        structureJson,
                        widthMm: item.width_mm,
                        heightMm: item.height_mm,
                        aluminumSystemIdOrCode: item.aluminum_system
                    });
                } catch (e) {
                    itemBom = null;
                }
            }

            if (!itemBom) {
                itemBom = calculateItemBom(item);
            }

            bomByItem.push({
                item_id: item.id,
                product_name: item.product_name,
                product_code: item.product_code,
                product_type: item.product_type,
                quantity: item.quantity,
                width_mm: item.width_mm,
                height_mm: item.height_mm,
                aluminum_system: item.aluminum_system,
                bom: itemBom
            });

            // Gom nhóm vật tư
            aggregateBom(aggregatedBom, itemBom, item.quantity);
        }

        // Chuyển Map thành Array
        const totalBom = {
            profiles: Array.from(aggregatedBom.profiles.values()),
            glass: Array.from(aggregatedBom.glass.values()),
            accessories: Array.from(aggregatedBom.accessories.values())
        };

        // Group summary by product_type
        const summaryByType = {};
        items.forEach(item => {
            if (!summaryByType[item.product_type]) {
                summaryByType[item.product_type] = { count: 0, total_qty: 0 };
            }
            summaryByType[item.product_type].count++;
            summaryByType[item.product_type].total_qty += item.quantity;
        });

        res.json({
            success: true,
            data: {
                project_id: projectId,
                items: bomByItem,
                total: totalBom,
                summary: {
                    total_items: items.reduce((sum, d) => sum + d.quantity, 0),
                    total_item_types: items.length,
                    by_product_type: summaryByType,
                    total_profile_types: totalBom.profiles.length,
                    total_glass_types: totalBom.glass.length,
                    total_accessory_types: totalBom.accessories.length
                }
            }
        });
    } catch (err) {
        console.error("Error extracting BOM:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Tạo snapshot cho project items (khi chốt báo giá)
 */
exports.createSnapshot = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Lấy tất cả items với thông tin đầy đủ
        const [items] = await db.query(`
            SELECT 
                pi.id,
                pi.product_template_id,
                pi.aluminum_system,
                pi.quantity,
                COALESCE(pi.custom_width_mm, pt.default_width_mm) as width_mm,
                COALESCE(pi.custom_height_mm, pt.default_height_mm) as height_mm,
                COALESCE(pi.custom_glass_type, pt.glass_type) as glass_type,
                pt.name as product_name,
                pt.product_type,
                pt.category
            FROM project_items pi
            JOIN product_templates pt ON pt.id = pi.product_template_id
            WHERE pi.project_id = ?
        `, [projectId]);

        if (items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Dự án chưa có sản phẩm nào"
            });
        }

        // Update snapshot_config for each item
        for (const item of items) {
            const snapshotConfig = {
                snapshot_date: new Date().toISOString(),
                product_name: item.product_name,
                product_type: item.product_type,
                category: item.category,
                aluminum_system: item.aluminum_system,
                width_mm: item.width_mm,
                height_mm: item.height_mm,
                glass_type: item.glass_type,
                quantity: item.quantity
            };

            await db.query(
                `UPDATE project_items SET snapshot_config = ? WHERE id = ?`,
                [JSON.stringify(snapshotConfig), item.id]
            );
        }

        res.json({
            success: true,
            message: `Đã tạo snapshot cho ${items.length} sản phẩm`,
            data: { items_count: items.length }
        });
    } catch (err) {
        console.error("Error creating snapshot:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Xuất vật tư BOM ra kho
 */
exports.exportBOMToWarehouse = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { projectId } = req.params;
        const { export_date, notes } = req.body;

        // 1. Lấy BOM tổng hợp của dự án
        const bomResult = await getBOMForProject(projectId);
        if (!bomResult.success ||
            (bomResult.data.profiles.length === 0 &&
                bomResult.data.glass.length === 0 &&
                bomResult.data.accessories.length === 0)) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Dự án chưa có sản phẩm nào hoặc BOM trống"
            });
        }

        const exportedItems = [];
        const errors = [];
        const exportDate = export_date || new Date().toISOString().slice(0, 19).replace('T', ' ');

        // 2. Xuất nhôm (profiles)
        for (const item of bomResult.data.profiles) {
            try {
                const itemCode = (item.code || item.item_code || '').trim();
                const itemName = (item.name || item.item_name || '').trim();

                // ƯU TIÊN TÌM THEO MÃ VT (item_code) TRƯỚC
                let inventoryRows = [];
                if (itemCode) {
                    [inventoryRows] = await connection.query(
                        `SELECT id, item_name, quantity, unit, unit_price FROM inventory 
                         WHERE item_code = ? AND quantity > 0
                         LIMIT 1`,
                        [itemCode]
                    );
                }
                // Nếu không tìm thấy theo code, thử tìm theo tên (exact match)
                if (inventoryRows.length === 0 && itemName) {
                    [inventoryRows] = await connection.query(
                        `SELECT id, item_name, quantity, unit, unit_price FROM inventory 
                         WHERE item_name = ? AND quantity > 0
                         LIMIT 1`,
                        [itemName]
                    );
                }

                if (inventoryRows.length > 0) {
                    const inv = inventoryRows[0];
                    const exportQty = item.total_length_m || item.total_qty || 0;

                    if (inv.quantity >= exportQty) {
                        await connection.query(`
                            INSERT INTO inventory_transactions 
                            (inventory_id, project_id, transaction_type, quantity, notes, transaction_date)
                            VALUES (?, ?, 'export', ?, ?, ?)
                        `, [inv.id, projectId, exportQty,
                        `Xuất BOM - ${item.name} cho dự án`, exportDate]);

                        await connection.query(
                            `UPDATE inventory SET quantity = quantity - ? WHERE id = ?`,
                            [exportQty, inv.id]
                        );

                        exportedItems.push({
                            type: 'profile',
                            code: item.code,
                            name: item.name,
                            quantity: exportQty,
                            unit: inv.unit || 'm'
                        });
                    } else {
                        errors.push({
                            type: 'profile',
                            code: item.code,
                            name: item.name,
                            required: exportQty,
                            available: inv.quantity,
                            error: 'Không đủ tồn kho'
                        });
                    }
                } else {
                    errors.push({
                        type: 'profile',
                        code: item.code,
                        name: item.name,
                        error: 'Không tìm thấy trong kho'
                    });
                }
            } catch (err) {
                errors.push({ type: 'profile', code: item.code, error: err.message });
            }
        }

        // 3. Xuất kính (glass)
        for (const item of bomResult.data.glass) {
            try {
                const glassCode = (item.code || item.item_code || '').trim();
                const glassName = (item.name || item.item_name || '').trim();

                // ƯU TIÊN TÌM THEO MÃ VT (item_code) TRƯỚC
                let inventoryRows = [];
                if (glassCode) {
                    [inventoryRows] = await connection.query(
                        `SELECT id, item_name, quantity, unit, unit_price FROM inventory 
                         WHERE item_code = ? AND quantity > 0
                         LIMIT 1`,
                        [glassCode]
                    );
                }
                // Nếu không tìm thấy theo code, thử tìm theo tên (exact match)
                if (inventoryRows.length === 0 && glassName) {
                    [inventoryRows] = await connection.query(
                        `SELECT id, item_name, quantity, unit, unit_price FROM inventory 
                         WHERE item_name = ? AND quantity > 0
                         LIMIT 1`,
                        [glassName]
                    );
                }

                if (inventoryRows.length > 0) {
                    const inv = inventoryRows[0];
                    const exportQty = item.total_area_m2 || item.total_qty || 0;

                    if (inv.quantity >= exportQty) {
                        await connection.query(`
                            INSERT INTO inventory_transactions 
                            (inventory_id, project_id, transaction_type, quantity, notes, transaction_date)
                            VALUES (?, ?, 'export', ?, ?, ?)
                        `, [inv.id, projectId, exportQty,
                        `Xuất BOM - ${item.name} cho dự án`, exportDate]);

                        await connection.query(
                            `UPDATE inventory SET quantity = quantity - ? WHERE id = ?`,
                            [exportQty, inv.id]
                        );

                        exportedItems.push({
                            type: 'glass',
                            code: item.code,
                            name: item.name,
                            quantity: exportQty,
                            unit: inv.unit || 'm²'
                        });
                    } else {
                        errors.push({
                            type: 'glass',
                            code: item.code,
                            name: item.name,
                            required: exportQty,
                            available: inv.quantity,
                            error: 'Không đủ tồn kho'
                        });
                    }
                } else {
                    errors.push({ type: 'glass', code: item.code, name: item.name, error: 'Không tìm thấy trong kho' });
                }
            } catch (err) {
                errors.push({ type: 'glass', code: item.code, error: err.message });
            }
        }

        // 4. Xuất phụ kiện (accessories)
        for (const item of bomResult.data.accessories) {
            try {
                const accCode = (item.code || '').trim();
                const accName = (item.name || '').trim();

                // ƯU TIÊN TÌM THEO MÃ VT (code) TRƯỚC
                let accRows = [];
                if (accCode) {
                    [accRows] = await connection.query(
                        `SELECT id, name, stock_quantity, unit, price FROM accessories 
                         WHERE code = ? AND is_active = 1 AND stock_quantity > 0
                         LIMIT 1`,
                        [accCode]
                    );
                }
                // Nếu không tìm thấy theo code, thử tìm theo tên (exact match)
                if (accRows.length === 0 && accName) {
                    [accRows] = await connection.query(
                        `SELECT id, name, stock_quantity, unit, price FROM accessories 
                         WHERE name = ? AND is_active = 1 AND stock_quantity > 0
                         LIMIT 1`,
                        [accName]
                    );
                }

                if (accRows.length > 0) {
                    const acc = accRows[0];
                    const exportQty = item.total_qty || item.qty || 0;

                    if (acc.stock_quantity >= exportQty) {
                        await connection.query(
                            `UPDATE accessories SET stock_quantity = stock_quantity - ? WHERE id = ?`,
                            [exportQty, acc.id]
                        );

                        try {
                            await connection.query(`
                                INSERT INTO inventory_transactions 
                                (accessory_id, project_id, transaction_type, quantity, notes, transaction_date)
                                VALUES (?, ?, 'export', ?, ?, ?)
                            `, [acc.id, projectId, exportQty,
                            `Xuất BOM phụ kiện - ${item.name}`, exportDate]);
                        } catch (e) {
                            console.log('Note: accessory_id column may not exist:', e.message);
                        }

                        exportedItems.push({
                            type: 'accessory',
                            code: item.code,
                            name: item.name,
                            quantity: exportQty,
                            unit: item.unit || 'cái'
                        });
                    } else {
                        errors.push({
                            type: 'accessory',
                            code: item.code,
                            name: item.name,
                            required: exportQty,
                            available: acc.stock_quantity,
                            error: 'Không đủ tồn kho'
                        });
                    }
                } else {
                    errors.push({ type: 'accessory', code: item.code, name: item.name, error: 'Không tìm thấy trong kho' });
                }
            } catch (err) {
                errors.push({ type: 'accessory', code: item.code, error: err.message });
            }
        }

        // 5. Cập nhật trạng thái dự án thành "Sản xuất" nếu export thành công
        if (exportedItems.length > 0) {
            await connection.query(
                `UPDATE projects SET status = 'Sản xuất' WHERE id = ? AND status = 'Bóc tách'`,
                [projectId]
            );
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: `Đã xuất ${exportedItems.length} vật tư`,
            data: {
                project_id: projectId,
                exported_count: exportedItems.length,
                error_count: errors.length,
                exported_items: exportedItems,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error exporting BOM:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateItemBom(item) {
    const FRAME_WIDTH = 70;
    const GLASS_CLEARANCE = 8;
    const system = item.aluminum_system || 'XINGFA_55';

    const bom = {
        profiles: [],
        glass: [],
        accessories: []
    };

    // Khung bao
    bom.profiles.push({
        code: `${system}_KHUNG_DUNG`,
        name: 'Khung bao đứng',
        qty: 2,
        length_mm: item.height_mm,
        total_length_m: Math.round(2 * item.height_mm / 10) / 100
    });
    bom.profiles.push({
        code: `${system}_KHUNG_NGANG`,
        name: 'Khung bao ngang',
        qty: 2,
        length_mm: item.width_mm - 2 * FRAME_WIDTH,
        total_length_m: Math.round(2 * (item.width_mm - 2 * FRAME_WIDTH) / 10) / 100
    });

    // Kính
    const glassW = item.width_mm - 2 * (FRAME_WIDTH + GLASS_CLEARANCE);
    const glassH = item.height_mm - 2 * (FRAME_WIDTH + GLASS_CLEARANCE);
    bom.glass.push({
        code: 'KINH_8MM',
        name: item.glass_type || 'Kính 8mm',
        qty: 1,
        width_mm: glassW,
        height_mm: glassH,
        area_m2: Math.round(glassW * glassH / 10000) / 100
    });

    // Phụ kiện theo product_type
    if (item.product_type === 'door' || item.product_type === 'window') {
        bom.accessories.push(
            { code: 'BAN_LE', name: 'Bản lề', qty: 3 },
            { code: 'TAY_NAM', name: 'Tay nắm', qty: 1 },
            { code: 'KHOA', name: 'Khóa', qty: 1 }
        );
    } else if (item.product_type === 'railing') {
        bom.accessories.push(
            { code: 'KEP_KINH', name: 'Kẹp kính', qty: Math.ceil(item.width_mm / 333) },
            { code: 'TRU_INOX', name: 'Trụ inox', qty: Math.ceil(item.width_mm / 1000) },
            { code: 'TAY_VIN', name: 'Tay vịn', qty: 1, length_mm: item.width_mm }
        );
    } else if (item.product_type === 'roof') {
        bom.accessories.push(
            { code: 'XA_GO', name: 'Xà gồ', qty: Math.ceil(item.height_mm / 500) }
        );
    }

    bom.accessories.push({
        code: 'GIOANG',
        name: 'Gioăng',
        qty: Math.round((item.width_mm + item.height_mm) * 2 / 100) / 10,
        unit: 'm'
    });

    return bom;
}

function aggregateBom(aggregated, itemBom, itemQty) {
    // Profiles
    for (const item of itemBom.profiles || []) {
        const key = `${item.code}__${item.length_mm || 0}`;
        if (aggregated.profiles.has(key)) {
            const existing = aggregated.profiles.get(key);
            existing.total_qty += item.qty * itemQty;
            existing.total_length_m += (item.total_length_m || 0) * itemQty;
        } else {
            aggregated.profiles.set(key, {
                ...item,
                total_qty: item.qty * itemQty,
                total_length_m: (item.total_length_m || 0) * itemQty
            });
        }
    }

    // Glass
    for (const item of itemBom.glass || []) {
        const key = `${item.code}__${item.width_mm || 0}x${item.height_mm || 0}`;
        if (aggregated.glass.has(key)) {
            const existing = aggregated.glass.get(key);
            existing.total_qty += item.qty * itemQty;
            existing.total_area_m2 += (item.area_m2 || 0) * itemQty;
        } else {
            aggregated.glass.set(key, {
                ...item,
                total_qty: item.qty * itemQty,
                total_area_m2: (item.area_m2 || 0) * itemQty
            });
        }
    }

    // Accessories
    for (const item of itemBom.accessories || []) {
        const key = item.code;
        if (aggregated.accessories.has(key)) {
            const existing = aggregated.accessories.get(key);
            existing.total_qty += item.qty * itemQty;
        } else {
            aggregated.accessories.set(key, {
                ...item,
                total_qty: item.qty * itemQty
            });
        }
    }
}

async function getBOMForProject(projectId) {
    const [items] = await db.query(`
        SELECT 
            pi.*,
            pt.name as product_name,
            pt.product_type,
            pt.structure_json,
            pt.template_json,
            pt.bom_rules,
            COALESCE(pi.custom_width_mm, pt.default_width_mm, 1200) as width_mm,
            COALESCE(pi.custom_height_mm, pt.default_height_mm, 2200) as height_mm,
            COALESCE(pi.custom_glass_type, pt.glass_type) as glass_type
        FROM project_items pi
        JOIN product_templates pt ON pt.id = pi.product_template_id
        WHERE pi.project_id = ?
    `, [projectId]);

    if (items.length === 0) {
        return { success: true, data: { profiles: [], glass: [], accessories: [] } };
    }

    const aggregated = {
        profiles: new Map(),
        glass: new Map(),
        accessories: new Map()
    };

    for (const item of items) {
        let bom = null;

        // Check bom_override first
        if (item.bom_override) {
            try {
                bom = typeof item.bom_override === 'string'
                    ? JSON.parse(item.bom_override)
                    : item.bom_override;
            } catch (e) { }
        }

        if (!bom) {
            try {
                const templateJson = item.template_json
                    ? (typeof item.template_json === 'string' ? JSON.parse(item.template_json) : item.template_json)
                    : null;
                const structureJson = item.structure_json
                    ? (typeof item.structure_json === 'string' ? JSON.parse(item.structure_json) : item.structure_json)
                    : null;

                bom = await productBomService.generateDoorBomFromTemplate({
                    templateJson,
                    structureJson,
                    widthMm: item.width_mm,
                    heightMm: item.height_mm,
                    aluminumSystemIdOrCode: item.aluminum_system
                });
            } catch (e) {
                bom = null;
            }
        }

        if (!bom) {
            bom = calculateItemBom(item);
        }
        aggregateBom(aggregated, bom, item.quantity);
    }

    return {
        success: true,
        data: {
            profiles: Array.from(aggregated.profiles.values()),
            glass: Array.from(aggregated.glass.values()),
            accessories: Array.from(aggregated.accessories.values())
        }
    };
}

// ============================================
// NEW APIs FOR ATC-STYLE DESIGN WORKFLOW
// ============================================

/**
 * Import project items từ báo giá đã chốt
 * POST /api/projects/:projectId/items/from-quotation
 */
exports.createItemsFromQuotation = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { quotation_id, include_items } = req.body;

        if (!quotation_id) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp quotation_id"
            });
        }

        // 1. Kiểm tra báo giá tồn tại và đã được duyệt
        const [quotations] = await db.query(
            `SELECT id, project_id, status, customer_id FROM quotations WHERE id = ?`,
            [quotation_id]
        );

        if (quotations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy báo giá"
            });
        }

        const quotation = quotations[0];

        // Verify project match or auto-link
        if (quotation.project_id && quotation.project_id != projectId) {
            return res.status(400).json({
                success: false,
                message: "Báo giá này thuộc dự án khác"
            });
        }

        // 2. Lấy các items từ báo giá
        const [quotationItems] = await db.query(
            `SELECT * FROM quotation_items WHERE quotation_id = ?`,
            [quotation_id]
        );

        if (quotationItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Báo giá không có sản phẩm nào"
            });
        }

        // 3. Tạo project_items từ quotation_items
        const createdItems = [];
        for (const qItem of quotationItems) {
            // Try to find matching product_template
            let productTemplateId = null;

            // Search by item_name in product_templates
            const [templates] = await db.query(
                `SELECT id, product_type, default_width_mm, default_height_mm, glass_type 
                 FROM product_templates 
                 WHERE name LIKE ? OR code LIKE ?
                 LIMIT 1`,
                [`%${qItem.item_name}%`, `%${qItem.item_name}%`]
            );

            if (templates.length > 0) {
                productTemplateId = templates[0].id;
            }

            // Build snapshot_config from quotation item
            const snapshotConfig = {
                source: 'quotation',
                quotation_date: quotation.created_at,
                original_item_name: qItem.item_name,
                original_description: qItem.description,
                original_unit_price: qItem.unit_price,
                original_total_price: qItem.total_price,
                size: {
                    w: templates.length > 0 ? templates[0].default_width_mm : 1200,
                    h: templates.length > 0 ? templates[0].default_height_mm : 2200,
                    unit: 'mm'
                },
                open_direction: 'left',
                open_style: 'swing',
                leaf_count: 1,
                aluminum_system: 'XINGFA_55',
                glass: {
                    type: templates.length > 0 ? templates[0].glass_type : 'tempered',
                    thickness_mm: 8
                },
                color: 'white',
                notes: qItem.description || ''
            };

            // Insert project_item
            const [result] = await db.query(`
                INSERT INTO project_items 
                (project_id, product_template_id, quantity, snapshot_config, 
                 source_quotation_id, source_quotation_item_id, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, 'DESIGNING', ?)
            `, [
                projectId,
                productTemplateId,
                qItem.quantity || 1,
                JSON.stringify(snapshotConfig),
                quotation_id,
                qItem.id,
                qItem.description || qItem.item_name
            ]);

            createdItems.push({
                id: result.insertId,
                item_name: qItem.item_name,
                quantity: qItem.quantity || 1,
                product_template_id: productTemplateId
            });
        }

        // 4. Cập nhật project status
        await db.query(
            `UPDATE projects SET status = 'designing' WHERE id = ? AND status IN ('new', 'quotation_approved')`,
            [projectId]
        );

        res.status(201).json({
            success: true,
            message: `Đã import ${createdItems.length} hạng mục từ báo giá`,
            data: {
                quotation_id,
                items_count: createdItems.length,
                items: createdItems
            }
        });
    } catch (err) {
        console.error("Error creating items from quotation:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Xác nhận thiết kế (chuyển status DESIGNING → DESIGN_CONFIRMED)
 * POST /api/projects/:projectId/items/:itemId/confirm-design
 */
exports.confirmDesign = async (req, res) => {
    try {
        const { projectId, itemId } = req.params;

        // 1. Kiểm tra item tồn tại và có snapshot_config
        const [items] = await db.query(
            `SELECT id, status, snapshot_config FROM project_items WHERE id = ? AND project_id = ?`,
            [itemId, projectId]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hạng mục"
            });
        }

        const item = items[0];

        if (item.status === 'DESIGN_CONFIRMED') {
            return res.status(400).json({
                success: false,
                message: "Hạng mục đã được xác nhận thiết kế trước đó"
            });
        }

        // 2. Validate snapshot_config có đầy đủ thông tin
        let snapshotConfig = null;
        try {
            snapshotConfig = item.snapshot_config
                ? (typeof item.snapshot_config === 'string' ? JSON.parse(item.snapshot_config) : item.snapshot_config)
                : null;
        } catch (e) { }

        if (!snapshotConfig || !snapshotConfig.size) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng hoàn tất thông tin thiết kế trước khi xác nhận"
            });
        }

        // 3. Cập nhật status
        const confirmedAt = new Date().toISOString();
        snapshotConfig.confirmed_at = confirmedAt;
        snapshotConfig.confirmed_by = req.user?.id || null;

        await db.query(
            `UPDATE project_items SET status = 'DESIGN_CONFIRMED', snapshot_config = ? WHERE id = ?`,
            [JSON.stringify(snapshotConfig), itemId]
        );

        res.json({
            success: true,
            message: "Đã xác nhận thiết kế",
            data: {
                item_id: itemId,
                status: 'DESIGN_CONFIRMED',
                confirmed_at: confirmedAt
            }
        });
    } catch (err) {
        console.error("Error confirming design:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Preview BOM + giá cho một item (không lưu vào DB)
 * POST /api/projects/:projectId/items/:itemId/calc
 */
exports.calculateItemBomPreview = async (req, res) => {
    try {
        const { projectId, itemId } = req.params;

        // 1. Lấy thông tin item
        const [items] = await db.query(`
            SELECT 
                pi.*,
                pt.name as product_name,
                pt.product_type,
                pt.bom_rules,
                pt.structure_json,
                pt.template_json,
                COALESCE(pi.custom_width_mm, pt.default_width_mm, 1200) as width_mm,
                COALESCE(pi.custom_height_mm, pt.default_height_mm, 2200) as height_mm,
                COALESCE(pi.custom_glass_type, pt.glass_type) as glass_type
            FROM project_items pi
            LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
            WHERE pi.id = ? AND pi.project_id = ?
        `, [itemId, projectId]);

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hạng mục"
            });
        }

        const item = items[0];

        // 2. Parse snapshot_config để lấy kích thước thực
        let snapshotConfig = null;
        try {
            snapshotConfig = item.snapshot_config
                ? (typeof item.snapshot_config === 'string' ? JSON.parse(item.snapshot_config) : item.snapshot_config)
                : null;
        } catch (e) { }

        const width = snapshotConfig?.size?.w || item.width_mm || 1200;
        const height = snapshotConfig?.size?.h || item.height_mm || 2200;
        const aluminumSystem = snapshotConfig?.aluminum_system || item.aluminum_system || 'XINGFA_55';

        // 3. Tính BOM sử dụng calcEngine
        let calcResult = null;

        // Check bom_override first
        if (item.bom_override) {
            try {
                const bomOverride = typeof item.bom_override === 'string'
                    ? JSON.parse(item.bom_override)
                    : item.bom_override;
                calcResult = { bom: bomOverride, cost: {}, price: {} };
            } catch (e) { }
        }

        if (!calcResult) {
            // Sử dụng calcEngine ATC style
            const productType = item.product_type || snapshotConfig?.product_type || 'door';
            try {
                calcResult = await calcProduct({
                    productType,
                    snapshotConfig: snapshotConfig || {
                        size: { w: width, h: height },
                        aluminum_system: aluminumSystem,
                        leaf_count: item.number_of_panels || 2
                    },
                    templateId: item.product_template_id
                });
            } catch (calcError) {
                console.error('CalcEngine error:', calcError);
                // Fallback to old calculation
                calcResult = {
                    bom: calculateItemBom({
                        ...item,
                        width_mm: width,
                        height_mm: height,
                        aluminum_system: aluminumSystem
                    }),
                    cost: { aluminum: 0, glass: 0, accessories: 0, total_cost: 0 },
                    price: { profit_percent: 25, sale_price: 0 }
                };
            }
        }

        const bom = calcResult.bom;

        // 4. Tính giá (lấy từ inventory/accessories)
        let totalCost = 0;
        const costBreakdown = {
            aluminum: 0,
            glass: 0,
            accessories: 0
        };

        // Tính giá nhôm
        for (const profile of bom.profiles || []) {
            const [invRows] = await db.query(
                `SELECT unit_price FROM inventory WHERE item_code = ? OR item_name LIKE ? LIMIT 1`,
                [profile.code, `%${profile.name}%`]
            );
            if (invRows.length > 0) {
                const cost = (profile.total_length_m || 0) * (invRows[0].unit_price || 0);
                costBreakdown.aluminum += cost;
            }
        }

        // Tính giá kính
        for (const glass of bom.glass || []) {
            const [invRows] = await db.query(
                `SELECT unit_price FROM inventory WHERE item_code = ? OR item_name LIKE ? LIMIT 1`,
                [glass.code, `%${glass.name}%`]
            );
            if (invRows.length > 0) {
                const cost = (glass.area_m2 || 0) * (invRows[0].unit_price || 0);
                costBreakdown.glass += cost;
            }
        }

        // Tính giá phụ kiện
        for (const acc of bom.accessories || []) {
            const [accRows] = await db.query(
                `SELECT price FROM accessories WHERE code = ? OR name LIKE ? LIMIT 1`,
                [acc.code, `%${acc.name}%`]
            );
            if (accRows.length > 0) {
                const cost = (acc.qty || 0) * (accRows[0].price || 0);
                costBreakdown.accessories += cost;
            }
        }

        totalCost = costBreakdown.aluminum + costBreakdown.glass + costBreakdown.accessories;

        // 5. Build calc_cache
        const calcCache = {
            last_calc_at: new Date().toISOString(),
            bom_summary: {
                aluminum_m: bom.profiles?.reduce((sum, p) => sum + (p.total_length_m || 0), 0) || 0,
                glass_m2: bom.glass?.reduce((sum, g) => sum + (g.area_m2 || 0), 0) || 0,
                accessories_count: bom.accessories?.length || 0
            },
            cost_summary: {
                aluminum: Math.round(costBreakdown.aluminum),
                glass: Math.round(costBreakdown.glass),
                accessories: Math.round(costBreakdown.accessories),
                total_cost: Math.round(totalCost)
            }
        };

        // 6. Optionally save calc_cache to DB
        await db.query(
            `UPDATE project_items SET calc_cache = ? WHERE id = ?`,
            [JSON.stringify(calcCache), itemId]
        );

        res.json({
            success: true,
            data: {
                item_id: itemId,
                product_name: item.product_name,
                dimensions: { width, height },
                aluminum_system: aluminumSystem,
                bom: bom,
                calc_cache: calcCache
            }
        });
    } catch (err) {
        console.error("Error calculating item BOM:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Get single project item by ID
 * GET /api/projects/:projectId/items/:itemId
 */
exports.getProjectItemById = async (req, res) => {
    try {
        const { projectId, itemId } = req.params;

        const [items] = await db.query(`
            SELECT 
                pi.*,
                pt.code as product_code,
                pt.name as product_name,
                pt.product_type,
                pt.category as product_category,
                pt.family as product_family,
                pt.preview_image,
                pt.param_schema,
                pt.bom_rules,
                COALESCE(pi.custom_width_mm, pt.default_width_mm) as width_mm,
                COALESCE(pi.custom_height_mm, pt.default_height_mm) as height_mm,
                COALESCE(pi.custom_glass_type, pt.glass_type) as glass_type
            FROM project_items pi
            LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
            WHERE pi.id = ? AND pi.project_id = ?
        `, [itemId, projectId]);

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hạng mục"
            });
        }

        const item = items[0];

        // Parse JSON fields
        try {
            if (item.snapshot_config && typeof item.snapshot_config === 'string') {
                item.snapshot_config = JSON.parse(item.snapshot_config);
            }
            if (item.bom_override && typeof item.bom_override === 'string') {
                item.bom_override = JSON.parse(item.bom_override);
            }
            if (item.calc_cache && typeof item.calc_cache === 'string') {
                item.calc_cache = JSON.parse(item.calc_cache);
            }
        } catch (e) { }

        res.json({
            success: true,
            data: item
        });
    } catch (err) {
        console.error("Error getting project item:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

module.exports = exports;

