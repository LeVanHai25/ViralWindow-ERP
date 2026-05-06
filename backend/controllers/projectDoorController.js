const db = require("../config/db");
const productBomService = require("../services/productBomService");

// ============================================
// PROJECT DOOR CONTROLLER
// Quản lý cửa trong dự án - liên kết với Door Catalog
// ============================================

/**
 * Lấy danh sách cửa của dự án
 */
exports.getProjectDoors = async (req, res) => {
    try {
        const { projectId } = req.params;

        const [doors] = await db.query(`
            SELECT 
                pdi.*,
                dt.code as door_code,
                dt.name as door_name,
                dt.category as door_category,
                dt.family as door_family,
                dt.preview_image,
                dt.param_schema,
                COALESCE(pdi.custom_width_mm, dt.default_width_mm) as width_mm,
                COALESCE(pdi.custom_height_mm, dt.default_height_mm) as height_mm,
                COALESCE(pdi.custom_glass_type, dt.glass_type) as glass_type
            FROM project_door_items pdi
            JOIN door_templates dt ON dt.id = pdi.door_template_id
            WHERE pdi.project_id = ?
            ORDER BY pdi.created_at DESC
        `, [projectId]);

        res.json({
            success: true,
            data: doors,
            count: doors.length
        });
    } catch (err) {
        console.error("Error getting project doors:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Thêm cửa vào dự án
 */
exports.addDoorToProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            door_template_id,
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
        if (!door_template_id || !aluminum_system) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn mẫu cửa và hệ nhôm"
            });
        }

        // Kiểm tra template tồn tại
        const [templates] = await db.query(
            "SELECT id, name FROM door_templates WHERE id = ? AND is_active = 1",
            [door_template_id]
        );

        if (templates.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mẫu cửa không tồn tại hoặc đã ngừng sử dụng"
            });
        }

        const [result] = await db.query(`
            INSERT INTO project_door_items 
            (project_id, door_template_id, aluminum_system, quantity, 
             custom_width_mm, custom_height_mm, custom_glass_type, 
             custom_accessories_json, location, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            projectId,
            door_template_id,
            aluminum_system,
            quantity || 1,
            custom_width_mm || null,
            custom_height_mm || null,
            custom_glass_type || null,
            custom_accessories_json ? JSON.stringify(custom_accessories_json) : null,
            location || null,
            notes || null
        ]);

        res.status(201).json({
            success: true,
            message: `Đã thêm ${quantity || 1} cửa "${templates[0].name}" vào dự án`,
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error("Error adding door to project:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Cập nhật cửa trong dự án
 */
exports.updateProjectDoor = async (req, res) => {
    try {
        const { projectId, id } = req.params;
        const {
            aluminum_system,
            quantity,
            custom_width_mm,
            custom_height_mm,
            custom_glass_type,
            custom_accessories_json,
            location,
            notes
        } = req.body;

        const [result] = await db.query(`
            UPDATE project_door_items SET
                aluminum_system = COALESCE(?, aluminum_system),
                quantity = COALESCE(?, quantity),
                custom_width_mm = ?,
                custom_height_mm = ?,
                custom_glass_type = ?,
                custom_accessories_json = ?,
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
            location || null,
            notes || null,
            id,
            projectId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa trong dự án"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật thành công"
        });
    } catch (err) {
        console.error("Error updating project door:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Xóa cửa khỏi dự án
 */
exports.removeProjectDoor = async (req, res) => {
    try {
        const { projectId, id } = req.params;

        const [result] = await db.query(
            "DELETE FROM project_door_items WHERE id = ? AND project_id = ?",
            [id, projectId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa trong dự án"
            });
        }

        res.json({
            success: true,
            message: "Đã xóa cửa khỏi dự án"
        });
    } catch (err) {
        console.error("Error removing project door:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Bóc tách BOM cho toàn bộ cửa trong dự án
 */
exports.extractBOM = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Lấy tất cả cửa trong dự án
        const [doors] = await db.query(`
            SELECT 
                pdi.*,
                dt.name as door_name,
                dt.code as door_code,
                dt.param_schema,
                dt.structure_json,
                dt.template_json,
                COALESCE(pdi.custom_width_mm, dt.default_width_mm, 1200) as width_mm,
                COALESCE(pdi.custom_height_mm, dt.default_height_mm, 2200) as height_mm,
                COALESCE(pdi.custom_glass_type, dt.glass_type, 'Kính 8mm') as glass_type
            FROM project_door_items pdi
            JOIN door_templates dt ON dt.id = pdi.door_template_id
            WHERE pdi.project_id = ?
        `, [projectId]);

        if (doors.length === 0) {
            return res.json({
                success: true,
                message: "Dự án chưa có cửa nào",
                data: { items: [], total: {} }
            });
        }

        // Tính BOM cho từng cửa và gom nhóm
        const bomByDoor = [];
        const aggregatedBom = {
            profiles: new Map(),
            glass: new Map(),
            accessories: new Map()
        };

        for (const door of doors) {
            let doorBom = null;
            try {
                const templateJson = door.template_json
                    ? (typeof door.template_json === 'string' ? JSON.parse(door.template_json) : door.template_json)
                    : null;
                const structureJson = door.structure_json
                    ? (typeof door.structure_json === 'string' ? JSON.parse(door.structure_json) : door.structure_json)
                    : null;

                doorBom = await productBomService.generateDoorBomFromTemplate({
                    templateJson,
                    structureJson,
                    widthMm: door.width_mm,
                    heightMm: door.height_mm,
                    aluminumSystemIdOrCode: door.aluminum_system
                });
            } catch (e) {
                doorBom = null;
            }

            if (!doorBom) {
                doorBom = calculateDoorBom(door);
            }
            bomByDoor.push({
                door_item_id: door.id,
                door_name: door.door_name,
                door_code: door.door_code,
                quantity: door.quantity,
                width_mm: door.width_mm,
                height_mm: door.height_mm,
                aluminum_system: door.aluminum_system,
                bom: doorBom
            });

            // Gom nhóm vật tư
            aggregateBom(aggregatedBom, doorBom, door.quantity);
        }

        // Chuyển Map thành Array
        const totalBom = {
            profiles: Array.from(aggregatedBom.profiles.values()),
            glass: Array.from(aggregatedBom.glass.values()),
            accessories: Array.from(aggregatedBom.accessories.values())
        };

        res.json({
            success: true,
            data: {
                project_id: projectId,
                doors: bomByDoor,
                total: totalBom,
                summary: {
                    total_doors: doors.reduce((sum, d) => sum + d.quantity, 0),
                    total_door_types: doors.length,
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
 * Kiểm tra tồn kho cho dự án
 */
exports.checkStockAvailability = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Lấy BOM tổng hợp
        const bomResult = await getBOMForProject(projectId);
        if (!bomResult.success) {
            return res.json(bomResult);
        }

        const stockCheck = {
            available: [],
            insufficient: [],
            not_found: []
        };

        // Kiểm tra profiles (nhôm)
        for (const item of bomResult.data.profiles) {
            const stockInfo = await checkItemStock('profile', item);
            const required = item.total_length_m || 0;
            categorizeStockResult(stockCheck, item, stockInfo, required);
        }

        // Kiểm tra glass (kính)
        for (const item of bomResult.data.glass) {
            const stockInfo = await checkItemStock('glass', item);
            const required = item.total_area_m2 || 0;
            categorizeStockResult(stockCheck, item, stockInfo, required);
        }

        // Kiểm tra accessories (phụ kiện)
        for (const item of bomResult.data.accessories) {
            const stockInfo = await checkItemStock('accessory', item);
            const required = item.total_qty || item.qty || 0;
            categorizeStockResult(stockCheck, item, stockInfo, required);
        }

        const hasInsufficientStock = stockCheck.insufficient.length > 0 || stockCheck.not_found.length > 0;

        res.json({
            success: true,
            data: {
                project_id: projectId,
                status: hasInsufficientStock ? 'insufficient' : 'available',
                available_count: stockCheck.available.length,
                insufficient_count: stockCheck.insufficient.length,
                not_found_count: stockCheck.not_found.length,
                details: stockCheck
            }
        });
    } catch (err) {
        console.error("Error checking stock:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDoorBom(door) {
    const FRAME_WIDTH = 70;
    const SASH_WIDTH = 60;
    const GLASS_CLEARANCE = 8;
    const system = door.aluminum_system || 'XINGFA_55';

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
        length_mm: door.height_mm,
        total_length_m: Math.round(2 * door.height_mm / 10) / 100
    });
    bom.profiles.push({
        code: `${system}_KHUNG_NGANG`,
        name: 'Khung bao ngang',
        qty: 2,
        length_mm: door.width_mm - 2 * FRAME_WIDTH,
        total_length_m: Math.round(2 * (door.width_mm - 2 * FRAME_WIDTH) / 10) / 100
    });

    // Kính
    const glassW = door.width_mm - 2 * (FRAME_WIDTH + GLASS_CLEARANCE);
    const glassH = door.height_mm - 2 * (FRAME_WIDTH + GLASS_CLEARANCE);
    bom.glass.push({
        code: 'KINH_8MM',
        name: door.glass_type || 'Kính 8mm',
        qty: 1,
        width_mm: glassW,
        height_mm: glassH,
        area_m2: Math.round(glassW * glassH / 10000) / 100
    });

    // Phụ kiện
    bom.accessories.push(
        { code: 'BAN_LE', name: 'Bản lề', qty: 3 },
        { code: 'TAY_NAM', name: 'Tay nắm', qty: 1 },
        { code: 'KHOA', name: 'Khóa', qty: 1 },
        { code: 'GIOANG', name: 'Gioăng', qty: Math.round((door.width_mm + door.height_mm) * 2 / 100) / 10, unit: 'm' }
    );

    return bom;
}

function aggregateBom(aggregated, doorBom, doorQty) {
    // Profiles
    for (const item of doorBom.profiles) {
        const key = `${item.code}__${item.length_mm || 0}`;
        if (aggregated.profiles.has(key)) {
            const existing = aggregated.profiles.get(key);
            existing.total_qty += item.qty * doorQty;
            existing.total_length_m += (item.total_length_m || 0) * doorQty;
        } else {
            aggregated.profiles.set(key, {
                ...item,
                total_qty: item.qty * doorQty,
                total_length_m: (item.total_length_m || 0) * doorQty
            });
        }
    }

    // Glass
    for (const item of doorBom.glass) {
        const key = `${item.code}__${item.width_mm || 0}x${item.height_mm || 0}`;
        if (aggregated.glass.has(key)) {
            const existing = aggregated.glass.get(key);
            existing.total_qty += item.qty * doorQty;
            existing.total_area_m2 += (item.area_m2 || 0) * doorQty;
        } else {
            aggregated.glass.set(key, {
                ...item,
                total_qty: item.qty * doorQty,
                total_area_m2: (item.area_m2 || 0) * doorQty
            });
        }
    }

    // Accessories
    for (const item of doorBom.accessories) {
        const key = item.code;
        if (aggregated.accessories.has(key)) {
            const existing = aggregated.accessories.get(key);
            existing.total_qty += item.qty * doorQty;
        } else {
            aggregated.accessories.set(key, {
                ...item,
                total_qty: item.qty * doorQty
            });
        }
    }
}

async function getBOMForProject(projectId) {
    const [doors] = await db.query(`
        SELECT 
            pdi.*,
            dt.name as door_name,
            dt.structure_json,
            dt.template_json,
            COALESCE(pdi.custom_width_mm, dt.default_width_mm, 1200) as width_mm,
            COALESCE(pdi.custom_height_mm, dt.default_height_mm, 2200) as height_mm,
            COALESCE(pdi.custom_glass_type, dt.glass_type) as glass_type
        FROM project_door_items pdi
        JOIN door_templates dt ON dt.id = pdi.door_template_id
        WHERE pdi.project_id = ?
    `, [projectId]);

    if (doors.length === 0) {
        return { success: true, data: { profiles: [], glass: [], accessories: [] } };
    }

    const aggregated = {
        profiles: new Map(),
        glass: new Map(),
        accessories: new Map()
    };

    for (const door of doors) {
        let bom = null;
        try {
            const templateJson = door.template_json
                ? (typeof door.template_json === 'string' ? JSON.parse(door.template_json) : door.template_json)
                : null;
            const structureJson = door.structure_json
                ? (typeof door.structure_json === 'string' ? JSON.parse(door.structure_json) : door.structure_json)
                : null;

            bom = await productBomService.generateDoorBomFromTemplate({
                templateJson,
                structureJson,
                widthMm: door.width_mm,
                heightMm: door.height_mm,
                aluminumSystemIdOrCode: door.aluminum_system
            });
        } catch (e) {
            bom = null;
        }

        if (!bom) {
            bom = calculateDoorBom(door);
        }
        aggregateBom(aggregated, bom, door.quantity);
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

async function checkItemStock(type, item) {
    try {
        let rows = [];
        const itemCode = (item.code || item.item_code || '').trim();
        const itemName = (item.name || item.item_name || '').trim();

        // ƯU TIÊN TÌM THEO MÃ VẬT TƯ (code/item_code) TRƯỚC
        // Chỉ fallback sang tên nếu không tìm thấy theo mã

        if (type === 'accessory') {
            // 1. Thử tìm chính xác theo code trước
            if (itemCode) {
                [rows] = await db.query(
                    `SELECT stock_quantity as quantity FROM accessories WHERE code = ? AND is_active = 1`,
                    [itemCode]
                );
            }
            // 2. Nếu không tìm thấy theo code, thử tìm theo tên (exact match)
            if (rows.length === 0 && itemName) {
                [rows] = await db.query(
                    `SELECT stock_quantity as quantity FROM accessories WHERE name = ? AND is_active = 1`,
                    [itemName]
                );
            }
        } else if (type === 'profile') {
            // 1. Thử tìm chính xác theo item_code trước
            if (itemCode) {
                [rows] = await db.query(
                    `SELECT quantity as quantity FROM inventory WHERE item_code = ? AND item_type = 'aluminum' LIMIT 1`,
                    [itemCode]
                );
            }
            // 2. Nếu không tìm thấy theo code, thử tìm theo tên (exact match)
            if (rows.length === 0 && itemName) {
                [rows] = await db.query(
                    `SELECT quantity as quantity FROM inventory WHERE item_name = ? AND item_type = 'aluminum' LIMIT 1`,
                    [itemName]
                );
            }
        } else {
            // Glass type
            // 1. Thử tìm chính xác theo item_code trước
            if (itemCode) {
                [rows] = await db.query(
                    `SELECT quantity as quantity FROM inventory WHERE item_code = ? AND item_type = 'glass' LIMIT 1`,
                    [itemCode]
                );
            }
            // 2. Nếu không tìm thấy theo code, thử tìm theo tên (exact match)
            if (rows.length === 0 && itemName) {
                [rows] = await db.query(
                    `SELECT quantity as quantity FROM inventory WHERE item_name = ? AND item_type = 'glass' LIMIT 1`,
                    [itemName]
                );
            }
        }

        if (rows.length === 0) {
            console.log(`📦 checkItemStock: Không tìm thấy vật tư - type=${type}, code=${itemCode}, name=${itemName}`);
            return { found: false, available: 0 };
        }

        console.log(`✅ checkItemStock: Tìm thấy vật tư - type=${type}, code=${itemCode}, quantity=${rows[0].quantity}`);
        return {
            found: true,
            available: parseFloat(rows[0].quantity) || 0
        };
    } catch (err) {
        console.error(`❌ checkItemStock error:`, err.message);
        return { found: false, available: 0, error: err.message };
    }
}

function categorizeStockResult(stockCheck, item, stockInfo, requiredQuantity) {
    const required = parseFloat(requiredQuantity) || 0;

    if (!stockInfo.found) {
        stockCheck.not_found.push({
            ...item,
            required,
            message: 'Vật tư không tìm thấy trong kho'
        });
    } else if (stockInfo.available >= required) {
        stockCheck.available.push({
            ...item,
            required,
            available: stockInfo.available,
            remaining: stockInfo.available - required
        });
    } else {
        stockCheck.insufficient.push({
            ...item,
            required,
            available: stockInfo.available,
            shortage: required - stockInfo.available
        });
    }
}

/**
 * Xuất vật tư BOM ra kho (tạo phiếu xuất kho)
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
                message: "Dự án chưa có cửa nào hoặc BOM trống"
            });
        }

        const exportedItems = [];
        const errors = [];
        const exportDate = export_date || new Date().toISOString().slice(0, 19).replace('T', ' ');

        // 2. Xuất nhôm (profiles) - tìm trong inventory
        for (const item of bomResult.data.profiles) {
            try {
                // Tìm vật tư tương ứng trong inventory
                const [inventoryRows] = await connection.query(
                    `SELECT id, item_name, quantity, unit, unit_price FROM inventory 
                     WHERE (item_code = ? OR item_name LIKE ?) AND quantity > 0
                     ORDER BY id LIMIT 1`,
                    [item.code, `%${item.name}%`]
                );

                if (inventoryRows.length > 0) {
                    const inv = inventoryRows[0];
                    const exportQty = item.total_length_m || item.total_qty || 0;

                    // Kiểm tra đủ tồn kho
                    if (inv.quantity >= exportQty) {
                        // Tạo transaction xuất kho
                        await connection.query(`
                            INSERT INTO inventory_transactions 
                            (inventory_id, project_id, transaction_type, quantity, notes, transaction_date)
                            VALUES (?, ?, 'export', ?, ?, ?)
                        `, [inv.id, projectId, exportQty,
                        `Xuất BOM - ${item.name} cho dự án`, exportDate]);

                        // Cập nhật tồn kho
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
                const [inventoryRows] = await connection.query(
                    `SELECT id, item_name, quantity, unit, unit_price FROM inventory 
                     WHERE (item_code = ? OR item_name LIKE ?) AND quantity > 0
                     ORDER BY id LIMIT 1`,
                    [item.code, `%${item.name}%`]
                );

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
                const [accRows] = await connection.query(
                    `SELECT id, name, stock_quantity, unit, price FROM accessories 
                     WHERE (code = ? OR name LIKE ?) AND is_active = 1 AND stock_quantity > 0
                     ORDER BY id LIMIT 1`,
                    [item.code, `%${item.name}%`]
                );

                if (accRows.length > 0) {
                    const acc = accRows[0];
                    const exportQty = item.total_qty || item.qty || 0;

                    if (acc.stock_quantity >= exportQty) {
                        // Cập nhật tồn kho phụ kiện
                        await connection.query(
                            `UPDATE accessories SET stock_quantity = stock_quantity - ? WHERE id = ?`,
                            [exportQty, acc.id]
                        );

                        // Ghi transaction (nếu bảng inventory_transactions hỗ trợ accessory_id)
                        try {
                            await connection.query(`
                                INSERT INTO inventory_transactions 
                                (accessory_id, project_id, transaction_type, quantity, notes, transaction_date)
                                VALUES (?, ?, 'export', ?, ?, ?)
                            `, [acc.id, projectId, exportQty,
                            `Xuất BOM phụ kiện - ${item.name}`, exportDate]);
                        } catch (e) {
                            // Bỏ qua nếu bảng không có cột accessory_id
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

        // 5. Nếu có lỗi nghiêm trọng (không xuất được gì) thì rollback
        if (exportedItems.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Không thể xuất vật tư nào",
                errors: errors
            });
        }

        // 6. Commit transaction
        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: `Xuất kho thành công ${exportedItems.length} vật tư`,
            data: {
                project_id: projectId,
                export_date: exportDate,
                exported_items: exportedItems,
                errors: errors.length > 0 ? errors : undefined,
                notes: notes
            }
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error exporting BOM to warehouse:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};
