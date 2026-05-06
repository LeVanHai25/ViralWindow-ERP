const db = require("../config/db");
const { emitDataChange } = require('../services/socketService');
const NotificationService = require("../services/notificationService");
const NotificationEventService = require("../services/notificationEventService");
const SystemNotifier = require("../services/SystemNotifier");

// GET all inventory items
exports.getAllItems = async (req, res) => {
    try {
        const { item_type } = req.query;
        let query = `SELECT 
                        i.id, i.item_code, i.item_name, i.item_type, i.unit, 
                        i.quantity,
                        i.quantity as stock_quantity, 
                        i.min_stock_level,
                        i.max_stock_level,
                        i.unit_price,
                        i.image_url,
                        i.notes,
                        i.notes as description,
                        i.supplier_id,
                        s.name as supplier_name, 
                        i.location,
                        i.created_at, i.updated_at 
                     FROM inventory i
                     LEFT JOIN suppliers s ON i.supplier_id = s.id
                     WHERE 1=1`;
        let params = [];

        if (item_type && item_type !== 'all') {
            query += " AND i.item_type = ?";
            params.push(item_type);
        }

        query += " ORDER BY i.item_name ASC";

        const [rows] = await db.query(query, params);

        // Tính stock_status và restock_quantity cho mỗi item
        rows.forEach(row => {
            row.quantity = parseFloat(row.quantity) || 0;
            row.stock_quantity = parseFloat(row.quantity) || 0;
            row.unit_price = parseFloat(row.unit_price) || 0;
            row.min_stock_level = parseFloat(row.min_stock_level) || 0;
            row.max_stock_level = parseFloat(row.max_stock_level) || 100;

            // Calculate stock status
            if (row.quantity === 0) {
                row.stock_status = 'OUT_OF_STOCK';
            } else if (row.quantity <= row.min_stock_level) {
                row.stock_status = 'LOW_STOCK';
            } else if (row.quantity > row.max_stock_level) {
                row.stock_status = 'OVERSTOCK';
            } else {
                row.stock_status = 'NORMAL';
            }

            // Calculate restock quantity
            row.restock_quantity = row.max_stock_level > row.quantity
                ? Math.ceil(row.max_stock_level - row.quantity)
                : 0;
        });

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET transactions
exports.getTransactions = async (req, res) => {
    try {
        const { transaction_type } = req.query;
        let query = `
            SELECT 
                it.*,
                i.item_name,
                i.unit
            FROM inventory_transactions it
            LEFT JOIN inventory i ON it.inventory_id = i.id
            WHERE 1=1
        `;
        let params = [];

        if (transaction_type && transaction_type !== 'all') {
            query += " AND it.transaction_type = ?";
            params.push(transaction_type);
        }

        query += " ORDER BY it.transaction_date DESC";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET scraps - Enhanced with status filter (Phase 1)
exports.getScraps = async (req, res) => {
    try {
        const { is_used, status, system_id, min_length, limit = 100 } = req.query;

        // Query using actual table columns - JOIN with stock_documents and projects to get names
        let query = `
            SELECT s.id, s.scrap_code, s.profile_name, s.length_mm, s.is_used, 
                   s.status, s.system_id, s.aluminum_system_id, 
                   s.source_doc_id, s.source_project_id,
                   s.note, s.notes, s.created_at,
                   sd.doc_no AS source_doc_no,
                   p.project_code AS source_project_code,
                   p.project_name AS source_project_name
            FROM aluminum_scraps s
            LEFT JOIN stock_documents sd ON sd.id = s.source_doc_id
            LEFT JOIN projects p ON p.id = s.source_project_id
            WHERE 1=1
        `;
        let params = [];

        // Filter by status (new)
        if (status) {
            query += " AND s.status = ?";
            params.push(status);
        }

        // Legacy filter by is_used (backwards compatible)
        if (is_used !== undefined && !status) {
            query += " AND s.is_used = ?";
            params.push(is_used === 'true' ? 1 : 0);
        }

        // Filter by system
        if (system_id) {
            query += " AND (s.system_id = ? OR s.aluminum_system_id = ?)";
            params.push(parseInt(system_id), parseInt(system_id));
        }

        // Filter by minimum length (in mm)
        if (min_length) {
            query += " AND s.length_mm >= ?";
            params.push(parseInt(min_length));
        }

        query += " ORDER BY s.created_at DESC LIMIT ?";
        params.push(parseInt(limit));

        const [rows] = await db.query(query, params);

        // Process each row: add computed fields for frontend
        for (let row of rows) {
            // Convert mm to cm for frontend display
            row.length_cm = row.length_mm ? Math.round(row.length_mm / 10) : 0;

            // Get system info
            const sysId = row.system_id || row.aluminum_system_id;
            if (sysId) {
                try {
                    const [sys] = await db.query(
                        'SELECT code, name FROM aluminum_systems WHERE id = ?',
                        [sysId]
                    );
                    row.profile_code = sys[0]?.code || null;
                    row.system_name = sys[0]?.name || null;
                } catch (e) {
                    row.profile_code = null;
                    row.system_name = null;
                }
            }

            // Merge notes fields
            row.note = row.note || row.notes || null;
        }

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('getScraps error:', err.message, err.sql);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

// =====================================================
// ISSUE SCRAP - Xuất nhôm thừa cho dự án (Phase 3)
// =====================================================
exports.issueScrap = async (req, res) => {
    try {
        const { id } = req.params;
        const { project_id, use_cm, note } = req.body;
        const user = req.user;

        if (!project_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn dự án'
            });
        }

        if (!use_cm || use_cm <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số cm sử dụng phải > 0'
            });
        }

        // Get scrap
        const [scraps] = await db.query(
            'SELECT * FROM aluminum_scraps WHERE id = ?',
            [id]
        );

        if (scraps.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhôm thừa'
            });
        }

        const scrap = scraps[0];

        if (scrap.status !== 'available') {
            return res.status(400).json({
                success: false,
                message: `Nhôm thừa đang ở trạng thái: ${scrap.status}, không thể xuất`
            });
        }

        if (use_cm > scrap.length_cm) {
            return res.status(400).json({
                success: false,
                message: `Không đủ chiều dài. Tồn: ${scrap.length_cm}cm, Cần: ${use_cm}cm`
            });
        }

        const remainingCm = scrap.length_cm - use_cm;

        if (remainingCm === 0) {
            // Dùng hết → mark as used
            await db.query(`
                UPDATE aluminum_scraps 
                SET status = 'used', is_used = 1, 
                    used_project_id = ?, used_at = NOW(), used_by = ?, note = ?
                WHERE id = ?
            `, [project_id, user?.id || null, note || null, id]);
        } else {
            // Dùng một phần → giảm length_cm, vẫn available
            await db.query(`
                UPDATE aluminum_scraps 
                SET length_cm = ?, note = CONCAT(IFNULL(note, ''), '\nXuất ${use_cm}cm cho dự án ${project_id}')
                WHERE id = ?
            `, [remainingCm, id]);
        }

        // TODO: Write ledger entry for scrap usage

        // Thông báo Xuất nhôm thừa (Chuẩn hóa SystemNotifier)
        try {
            await SystemNotifier.notify('inventory.exported', {
                entityName: scrap.profile_name || `Nhôm Đề C #${id}`,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
                afterData: {
                    use_cm,
                    remaining_cm: remainingCm,
                    project_id: project_id
                }
            });
        } catch (e) { }

        res.json({
            success: true,
            message: remainingCm === 0
                ? `Đã dùng hết ${use_cm}cm nhôm thừa cho dự án`
                : `Đã dùng ${use_cm}cm, còn lại ${remainingCm}cm`,
            data: {
                scrap_id: id,
                use_cm,
                remaining_cm: remainingCm,
                project_id
            }
        });
    } catch (err) {
        console.error('Error issuing scrap:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất nhôm thừa: ' + err.message
        });
    }
};

// =====================================================
// CREATE SCRAP - Tạo Nhôm Đề C (offcut from Kho nhôm)
// Requires aluminum_system_id, copies source info
// =====================================================
exports.createScrap = async (req, res) => {
    try {
        const { aluminum_system_id, scrap_code, length_cm, note, status, source_doc_id, source_project_id } = req.body;
        const user = req.user;

        // aluminum_system_id is REQUIRED
        if (!aluminum_system_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn thanh nhôm nguồn từ Kho nhôm'
            });
        }

        if (!length_cm || length_cm <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập chiều dài còn lại (cm)'
            });
        }

        // Fetch source aluminum system info
        const [systems] = await db.query(`
            SELECT id, code, name, brand, aluminum_system, color, length_m, unit_price
            FROM aluminum_systems 
            WHERE id = ?
        `, [aluminum_system_id]);

        if (systems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Thanh nhôm nguồn không tồn tại trong Kho nhôm'
            });
        }

        const source = systems[0];

        // Validate length_cm <= source length
        const sourceLengthCm = source.length_m ? Math.round(source.length_m * 100) : 600;
        if (parseInt(length_cm) > sourceLengthCm) {
            return res.status(400).json({
                success: false,
                message: `Chiều dài đề c (${length_cm}cm) không được vượt quá độ dài thanh nguồn (${sourceLengthCm}cm)`
            });
        }

        // Convert cm to mm for storage
        const length_mm = parseInt(length_cm) * 10;

        // Auto-generate scrap_code if not provided
        const finalScrapCode = scrap_code || null; // Will be generated by trigger or left null

        // Denormalize source info for fast display
        const profile_name = source.name || source.code || 'Nhôm Đề C';

        const [result] = await db.query(`
            INSERT INTO aluminum_scraps 
            (profile_name, length_mm, status, is_used, aluminum_system_id, note, source_doc_id, source_project_id, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        `, [
            profile_name,
            length_mm,
            status || 'available',
            0, // is_used = false for new scrap
            aluminum_system_id,
            note || null,
            source_doc_id || null,
            source_project_id || null,
            user?.id || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Thêm Nhôm Đề C thành công',
            data: {
                id: result.insertId,
                profile_name: profile_name,
                source: {
                    brand: source.brand,
                    name: source.name,
                    color: source.color
                }
            }
        });
    } catch (err) {
        console.error('Error creating scrap:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo Nhôm Đề C: ' + err.message
        });
    }
};

// =====================================================
// UPDATE SCRAP - Cập nhật Nhôm Đề C
// =====================================================
exports.updateScrap = async (req, res) => {
    try {
        const { id } = req.params;
        const { aluminum_system_id, system_id, scrap_code, length_cm, status, note, source_doc_id, source_project_id } = req.body;

        // Use aluminum_system_id (from FE) or fall back to system_id
        const finalSystemId = aluminum_system_id || system_id || null;

        // aluminum_system_id OR length_cm is required
        if (!finalSystemId && !length_cm) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn thanh nhôm nguồn hoặc nhập chiều dài'
            });
        }

        if (length_cm && length_cm <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Chiều dài phải lớn hơn 0'
            });
        }

        // Fetch profile_name from aluminum_system if provided
        let profile_name = null;
        if (finalSystemId) {
            const [systems] = await db.query(
                'SELECT id, code, name FROM aluminum_systems WHERE id = ?',
                [finalSystemId]
            );
            if (systems.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Hệ nhôm không tồn tại hoặc đã bị xóa.'
                });
            }
            profile_name = systems[0].name || systems[0].code || 'Nhôm Đề C';
        }

        // Convert cm to mm for storage
        const length_mm = length_cm ? parseInt(length_cm) * 10 : null;

        // Build dynamic update query
        let updateFields = [];
        let updateValues = [];

        if (profile_name) {
            updateFields.push('profile_name = ?');
            updateValues.push(profile_name);
        }
        if (length_mm) {
            updateFields.push('length_mm = ?');
            updateValues.push(length_mm);
        }
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status || 'available');
            updateFields.push('is_used = ?');
            updateValues.push(status === 'used' ? 1 : 0);
        }
        if (finalSystemId) {
            updateFields.push('aluminum_system_id = ?');
            updateValues.push(finalSystemId);
        }
        if (note !== undefined) {
            updateFields.push('note = ?');
            updateValues.push(note || null);
        }
        if (scrap_code !== undefined) {
            updateFields.push('scrap_code = ?');
            updateValues.push(scrap_code || null);
        }
        if (source_doc_id !== undefined) {
            updateFields.push('source_doc_id = ?');
            updateValues.push(source_doc_id || null);
        }
        if (source_project_id !== undefined) {
            updateFields.push('source_project_id = ?');
            updateValues.push(source_project_id || null);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có thông tin nào để cập nhật'
            });
        }

        updateValues.push(id);

        const [result] = await db.query(`
            UPDATE aluminum_scraps 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy Nhôm Đề C'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật Nhôm Đề C thành công'
        });
    } catch (err) {
        console.error('Error updating scrap:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật Nhôm Đề C: ' + err.message
        });
    }
};

// GET statistics - Tổng hợp từ 4 module
exports.getStatistics = async (req, res) => {
    try {
        const aggregationService = require("../services/inventoryAggregationService");
        const stats = await aggregationService.getAggregatedStatistics();

        res.json({
            success: true,
            data: {
                total_items: stats.totalItems,
                low_stock: stats.lowStockCount,
                items_in_stock: stats.itemsInStock, // Số vật tư có stock > 0
                total_value: stats.totalValue,
                total_scraps: stats.totalScraps,
                breakdown: stats.breakdown
            }
        });
    } catch (err) {
        console.error('Error getting inventory statistics:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// GET by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT 
                i.id, i.item_code, i.item_name, i.item_type, i.unit, 
                i.quantity,
                i.quantity as stock_quantity, 
                i.min_stock_level, 
                i.unit_price,
                i.image_url,
                i.notes,
                i.notes as description,
                i.supplier_id,
                s.name as supplier_name,
                i.location,
                i.created_at, i.updated_at 
             FROM inventory i
             LEFT JOIN suppliers s ON i.supplier_id = s.id
             WHERE i.id = ?`,
            [id]
        );

        // Đảm bảo quantity và unit_price là number
        if (rows.length > 0) {
            rows[0].quantity = parseFloat(rows[0].quantity) || 0;
            rows[0].stock_quantity = parseFloat(rows[0].quantity) || 0;
            rows[0].unit_price = parseFloat(rows[0].unit_price) || 0;
        }

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy vật tư"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// POST create
exports.create = async (req, res) => {
    try {
        const { item_code, item_name, item_type, unit, quantity, stock_quantity, min_stock_level, max_stock_level, unit_price, description, notes, supplier_id } = req.body;

        // Hỗ trợ cả quantity và stock_quantity - đảm bảo là number
        let qty = 0;
        if (quantity !== undefined && quantity !== null) {
            qty = parseFloat(quantity) || 0;
        } else if (stock_quantity !== undefined && stock_quantity !== null) {
            qty = parseFloat(stock_quantity) || 0;
        }

        const price = parseFloat(unit_price) || 0;
        const minStock = parseInt(min_stock_level) || 10;
        const maxStock = parseInt(max_stock_level) || 100;
        const supplierId = supplier_id ? parseInt(supplier_id) : null;

        // Validate required fields
        if (!item_code || !item_name || !item_type || !unit) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng điền đầy đủ thông tin bắt buộc (Mã, Tên, Loại, Đơn vị)"
            });
        }

        // Check if item_code already exists
        const [existing] = await db.query(
            "SELECT id FROM inventory WHERE item_code = ?",
            [item_code]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Mã vật tư đã tồn tại"
            });
        }

        console.log('Creating inventory item:', { item_code, item_name, quantity: qty, unit_price: price, supplier_id: supplierId }); // Debug

        // Handle uploaded image
        let image_url = null;
        if (req.file) {
            image_url = '/uploads/inventory/' + req.file.filename;
        }

        // Insert with unit_price, image_url and supplier_id
        const [result] = await db.query(
            `INSERT INTO inventory 
             (item_code, item_name, item_type, unit, quantity, min_stock_level, max_stock_level, unit_price, notes, image_url, supplier_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [item_code, item_name, item_type, unit, qty, minStock, maxStock, price, notes || description || null, image_url, supplierId]
        );

        // Thông báo nhập kho mới (Chuẩn hóa SystemNotifier)
        try {
            await SystemNotifier.notify('inventory.imported', {
                entityName: item_name,
                entityId: result.insertId,
                actor: SystemNotifier.getActor(req),
                afterData: {
                    item_code: item_code,
                    quantity: qty,
                    unit: unit
                },
                link: 'inventory.html'
            });
        } catch (notifErr) {
            console.error('[InventoryController] Notification error:', notifErr.message);
        }

        res.status(201).json({
            success: true,
            message: "Thêm vật tư thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error creating inventory item:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi thêm vật tư: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_code, item_name, item_type, unit, quantity, stock_quantity, min_stock_level, max_stock_level, unit_price, description, notes, supplier_id } = req.body;

        // Hỗ trợ cả quantity và stock_quantity - đảm bảo là number
        let qty = 0;
        if (quantity !== undefined && quantity !== null) {
            qty = parseFloat(quantity) || 0;
        } else if (stock_quantity !== undefined && stock_quantity !== null) {
            qty = parseFloat(stock_quantity) || 0;
        }

        const price = parseFloat(unit_price) || 0;
        const minStock = parseInt(min_stock_level) || 10;
        const maxStock = parseInt(max_stock_level) || 100;
        const supplierId = supplier_id ? parseInt(supplier_id) : null;

        console.log('Updating inventory item:', { id, quantity: qty, unit_price: price, supplier_id: supplierId }); // Debug

        // Handle uploaded image
        let image_url = req.body.image_url; // Keep existing if no new upload
        if (req.file) {
            image_url = '/uploads/inventory/' + req.file.filename;
        }

        let query, params;
        if (image_url !== undefined) {
            query = `UPDATE inventory 
                 SET item_code = ?, item_name = ?, item_type = ?, unit = ?, quantity = ?, 
                 min_stock_level = ?, max_stock_level = ?, unit_price = ?, notes = ?, image_url = ?, supplier_id = ? 
                 WHERE id = ?`;
            params = [item_code, item_name, item_type, unit, qty, minStock, maxStock, price, notes || description || null, image_url, supplierId, id];
        } else {
            query = `UPDATE inventory 
                 SET item_code = ?, item_name = ?, item_type = ?, unit = ?, quantity = ?, 
                 min_stock_level = ?, max_stock_level = ?, unit_price = ?, notes = ?, supplier_id = ? 
                 WHERE id = ?`;
            params = [item_code, item_name, item_type, unit, qty, minStock, maxStock, price, notes || description || null, supplierId, id];
        }

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy vật tư"
            });
        }

        // Thông báo Cập nhật vật tư
        try {
            await SystemNotifier.notify('inventory.updated', {
                entityName: item_name,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
                afterData: { quantity: qty, unit_price: price }
            });
        } catch (e) { }

        res.json({
            success: true,
            message: "Cập nhật vật tư thành công",
            data: { image_url }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật vật tư"
        });
    }
};

// Upload image separately
exports.uploadImage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn file ảnh"
            });
        }

        const image_url = '/uploads/inventory/' + req.file.filename;

        const [result] = await db.query(
            "UPDATE inventory SET image_url = ? WHERE id = ?",
            [image_url, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy vật tư"
            });
        }

        res.json({
            success: true,
            message: "Upload ảnh thành công",
            data: { image_url }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi upload ảnh"
        });
    }
};

// DELETE
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "DELETE FROM inventory WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy vật tư"
            });
        }

        res.json({
            success: true,
            message: "Xóa vật tư thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa vật tư"
        });
    }
};

// Mark scrap as used
exports.markScrapUsed = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "UPDATE aluminum_scraps SET is_used = 1 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhôm thừa"
            });
        }

        res.json({
            success: true,
            message: "Đánh dấu nhôm thừa đã sử dụng thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật"
        });
    }
};

// Delete scrap
exports.deleteScrap = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "DELETE FROM aluminum_scraps WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhôm thừa"
            });
        }

        res.json({
            success: true,
            message: "Xóa nhôm thừa thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa nhôm thừa"
        });
    }
};

// GET aggregated items from all modules (for dashboard)
exports.getAggregatedItems = async (req, res) => {
    try {
        const aggregationService = require("../services/inventoryAggregationService");
        const items = await aggregationService.getAllItems();

        res.json({
            success: true,
            data: items,
            count: items.length
        });
    } catch (err) {
        console.error('Error getting aggregated items:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// GET low stock items from all modules
exports.getLowStockItems = async (req, res) => {
    try {
        const aggregationService = require("../services/inventoryAggregationService");
        const items = await aggregationService.getLowStockItems();

        res.json({
            success: true,
            data: items,
            count: items.length
        });
    } catch (err) {
        console.error('Error getting low stock items:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// GET dashboard alerts summary
exports.getDashboardAlertsSummary = async (req, res) => {
    try {
        const aggregationService = require("../services/inventoryAggregationService");
        const summary = await aggregationService.getDashboardAlertsSummary();

        res.json({
            success: true,
            data: summary
        });
    } catch (err) {
        console.error('Error getting dashboard alerts summary:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// GET next VRPK code for accessories and other items
exports.getNextVRPKCode = async (req, res) => {
    try {
        // Tìm mã VRPK lớn nhất trong cả accessories và inventory (item_type = 'other')
        const [accessoryRows] = await db.query(
            "SELECT code FROM accessories WHERE code LIKE 'VRPK%' AND is_active = 1 ORDER BY code DESC LIMIT 1"
        );

        const [inventoryRows] = await db.query(
            "SELECT item_code as code FROM inventory WHERE item_code LIKE 'VRPK%' AND item_type IN ('accessory', 'other') ORDER BY item_code DESC LIMIT 1"
        );

        let maxCode = 0;

        // Parse mã từ accessories
        if (accessoryRows.length > 0) {
            const code = accessoryRows[0].code;
            const match = code.match(/VRPK(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxCode) maxCode = num;
            }
        }

        // Parse mã từ inventory
        if (inventoryRows.length > 0) {
            const code = inventoryRows[0].code;
            const match = code.match(/VRPK(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxCode) maxCode = num;
            }
        }

        // Tạo mã mới
        const nextNum = maxCode + 1;
        const nextCode = `VRPK${String(nextNum).padStart(3, '0')}`;

        res.json({
            success: true,
            data: { code: nextCode }
        });
    } catch (err) {
        console.error('Error getting next VRPK code:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// DELETE all inventory data
exports.deleteAllInventory = async (req, res) => {
    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Xóa tất cả dữ liệu từ các bảng liên quan
            await connection.query("DELETE FROM inventory_transactions");
            await connection.query("DELETE FROM inventory_in_items");
            await connection.query("DELETE FROM inventory_in");
            await connection.query("DELETE FROM inventory_out_items");
            await connection.query("DELETE FROM inventory_out");
            await connection.query("DELETE FROM inventory");
            await connection.query("DELETE FROM accessories WHERE is_active = 1");
            await connection.query("DELETE FROM aluminum_scraps");

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: "Đã xóa toàn bộ dữ liệu kho thành công"
            });
        } catch (err) {
            await connection.rollback();
            connection.release();
            throw err;
        }
    } catch (err) {
        console.error('Error deleting all inventory:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa dữ liệu: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// =====================================================
// GET EXPORT SLIPS FOR ALUMINUM - Lấy danh sách phiếu xuất chứa hệ nhôm
// Used for smart source slip selection in Nhôm Đề C form
// =====================================================
exports.getExportSlipsForAluminum = async (req, res) => {
    try {
        const { aluminum_system_id } = req.params; if (!aluminum_system_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp aluminum_system_id'
            });
        }

        // Get aluminum system info first
        const [aluminumSystems] = await db.query(
            'SELECT id, code, name, brand FROM aluminum_systems WHERE id = ?',
            [aluminum_system_id]
        );

        if (aluminumSystems.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'Không tìm thấy hệ nhôm'
            });
        }

        const aluminum = aluminumSystems[0];

        // Query stock_documents that have lines with this aluminum_system_id
        // Filter only export documents (doc_type = 'export')
        const [slips] = await db.query(`
            SELECT DISTINCT 
                sd.id,
                sd.doc_no,
                sd.doc_type,
                sd.project_id,
                p.project_code,
                p.project_name,
                sd.posted_at,
                sd.note
            FROM stock_documents sd
            INNER JOIN stock_document_lines sdl ON sd.id = sdl.document_id
            LEFT JOIN projects p ON sd.project_id = p.id
            WHERE sd.doc_type = 'export'
              AND sd.status = 'posted'
              AND sdl.item_type = 'aluminum'
              AND sdl.item_id = ?
            ORDER BY sd.posted_at DESC
            LIMIT 50
        `, [aluminum_system_id]);

        // Format the response
        const formattedSlips = slips.map(slip => ({
            id: slip.id,
            doc_code: slip.doc_no, // Map doc_no to doc_code for frontend
            project_id: slip.project_id,
            project_code: slip.project_code,
            project_name: slip.project_name,
            posted_at: slip.posted_at,
            notes: slip.note,
            label: `${slip.doc_no}${slip.project_code ? ` - ${slip.project_code}` : ''}${slip.project_name ? ` (${slip.project_name})` : ''}`
        }));

        res.json({
            success: true,
            data: formattedSlips,
            aluminum: {
                id: aluminum.id,
                code: aluminum.code,
                name: aluminum.name,
                brand: aluminum.brand
            },
            count: formattedSlips.length
        });
    } catch (err) {
        console.error('Error getting export slips for aluminum:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phiếu xuất: ' + err.message
        });
    }
};

// =====================================================
// AI RESTOCK SUGGESTION - Đề xuất nhập kho thông minh
// Phân tích vật tư hết/sắp hết và đề xuất SL cần nhập
// =====================================================
exports.getAIRestockSuggestion = async (req, res) => {
    try {
        const aggregationService = require("../services/inventoryAggregationService");
        const lowStockItems = await aggregationService.getLowStockItems();

        // Tính toán đề xuất cho mỗi item
        const suggestions = lowStockItems.map(item => {
            const currentQty = parseFloat(item.quantity) || 0;
            const minStock = parseFloat(item.min_stock_level) || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;

            // Công thức: nhập đủ để đạt gấp đôi mức tối thiểu
            const targetQty = Math.max(minStock * 2, 1);
            const suggestQty = Math.max(Math.ceil(targetQty - currentQty), 1);

            // Ưu tiên: hết hàng = critical, sắp hết = warning
            let priority = 'warning';
            let priorityLabel = 'Sắp hết';
            if (currentQty <= 0) {
                priority = 'critical';
                priorityLabel = 'Hết hàng';
            }

            return {
                id: item.id,
                item_code: item.item_code,
                item_name: item.item_name,
                module_type: item.module_type,   // accessory | aluminum | glass | other
                module_name: item.module_name,   // Phụ kiện | Kho nhôm | Kính | Vật tư phụ
                unit: item.unit || 'cái',
                current_qty: currentQty,
                min_stock_level: minStock,
                suggest_qty: suggestQty,
                unit_price: unitPrice,
                estimated_cost: suggestQty * unitPrice,
                priority,
                priorityLabel,
                // Enhanced fields
                warehouse_id: item.warehouse_id || 1,
                warehouse_name: item.warehouse_name || 'Kho chính',
                category_name: item.category_name || item.item_type || '-',
                aluminum_system: item.aluminum_system || null
            };
        });

        // Sắp xếp: critical trước, rồi warning
        suggestions.sort((a, b) => {
            if (a.priority === 'critical' && b.priority !== 'critical') return -1;
            if (a.priority !== 'critical' && b.priority === 'critical') return 1;
            return a.current_qty - b.current_qty; // Tồn ít nhất trước
        });

        // Tổng hợp thống kê
        const totalItems = suggestions.length;
        const criticalCount = suggestions.filter(s => s.priority === 'critical').length;
        const warningCount = suggestions.filter(s => s.priority === 'warning').length;
        const totalEstimatedCost = suggestions.reduce((sum, s) => sum + s.estimated_cost, 0);
        const totalSuggestQty = suggestions.reduce((sum, s) => sum + s.suggest_qty, 0);

        res.json({
            success: true,
            data: suggestions,
            summary: {
                totalItems,
                criticalCount,
                warningCount,
                totalSuggestQty,
                totalEstimatedCost
            }
        });
    } catch (err) {
        console.error('Error getting AI restock suggestion:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + (err.message || 'Lỗi không xác định')
        });
    }
};
