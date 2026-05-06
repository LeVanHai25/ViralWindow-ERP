const db = require("../config/db");
const QRCode = require("qrcode");

/**
 * Generate QR code data URL
 */
async function generateQRCode(text) {
    try {
        const dataUrl = await QRCode.toDataURL(text, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            width: 200
        });
        return dataUrl;
    } catch (err) {
        console.error('Error generating QR code:', err);
        throw err;
    }
}

/**
 * Get inventory item label data
 */
exports.getInventoryLabel = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT * FROM inventory WHERE id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy vật tư"
            });
        }

        const item = rows[0];
        
        // Generate QR code with item info
        const qrData = JSON.stringify({
            type: 'inventory',
            id: item.id,
            code: item.item_code,
            name: item.item_name
        });
        
        const qrCode = await generateQRCode(qrData);

        res.json({
            success: true,
            data: {
                item: item,
                qrCode: qrCode,
                qrData: qrData
            }
        });
    } catch (err) {
        console.error('Error getting inventory label:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Get door design label data
 */
exports.getDoorLabel = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT 
                dd.*,
                p.project_code,
                p.project_name,
                c.full_name AS customer_name,
                dt.name AS template_name,
                dt.code AS template_code,
                a.name AS aluminum_system_name
            FROM door_designs dd
            LEFT JOIN projects p ON dd.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = rows[0];
        
        // Generate QR code with door info
        const qrData = JSON.stringify({
            type: 'door',
            id: door.id,
            code: door.design_code || `DOOR-${door.id}`,
            project: door.project_code,
            width: door.width_mm,
            height: door.height_mm
        });
        
        const qrCode = await generateQRCode(qrData);

        res.json({
            success: true,
            data: {
                door: door,
                qrCode: qrCode,
                qrData: qrData
            }
        });
    } catch (err) {
        console.error('Error getting door label:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Batch get inventory labels
 */
exports.getBatchInventoryLabels = async (req, res) => {
    try {
        const { ids } = req.body; // Array of inventory IDs

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Danh sách ID không hợp lệ"
            });
        }

        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await db.query(`
            SELECT * FROM inventory WHERE id IN (${placeholders})
        `, ids);

        const labels = await Promise.all(rows.map(async (item) => {
            const qrData = JSON.stringify({
                type: 'inventory',
                id: item.id,
                code: item.item_code,
                name: item.item_name
            });
            
            const qrCode = await generateQRCode(qrData);
            
            return {
                item: item,
                qrCode: qrCode,
                qrData: qrData
            };
        }));

        res.json({
            success: true,
            data: labels
        });
    } catch (err) {
        console.error('Error getting batch inventory labels:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Batch get door labels
 */
exports.getBatchDoorLabels = async (req, res) => {
    try {
        const { ids } = req.body; // Array of door IDs

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Danh sách ID không hợp lệ"
            });
        }

        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await db.query(`
            SELECT 
                dd.*,
                p.project_code,
                p.project_name,
                c.full_name AS customer_name,
                dt.name AS template_name,
                dt.code AS template_code,
                a.name AS aluminum_system_name
            FROM door_designs dd
            LEFT JOIN projects p ON dd.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.id IN (${placeholders})
        `, ids);

        const labels = await Promise.all(rows.map(async (door) => {
            const qrData = JSON.stringify({
                type: 'door',
                id: door.id,
                code: door.design_code || `DOOR-${door.id}`,
                project: door.project_code,
                width: door.width_mm,
                height: door.height_mm
            });
            
            const qrCode = await generateQRCode(qrData);
            
            return {
                door: door,
                qrCode: qrCode,
                qrData: qrData
            };
        }));

        res.json({
            success: true,
            data: labels
        });
    } catch (err) {
        console.error('Error getting batch door labels:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Get labels for a production order (all doors in the order)
 */
exports.getProductionOrderLabels = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Get order info
        const [orderRows] = await db.query(`
            SELECT * FROM production_orders WHERE id = ?
        `, [orderId]);

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        const order = orderRows[0];

        // Get all doors in the project
        const [doors] = await db.query(`
            SELECT 
                dd.*,
                p.project_code,
                p.project_name,
                c.full_name AS customer_name,
                dt.name AS template_name,
                dt.code AS template_code,
                a.name AS aluminum_system_name
            FROM door_designs dd
            LEFT JOIN projects p ON dd.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.project_id = ?
            ORDER BY dd.created_at ASC
        `, [order.project_id]);

        const labels = await Promise.all(doors.map(async (door) => {
            const qrData = JSON.stringify({
                type: 'door',
                id: door.id,
                code: door.design_code || `DOOR-${door.id}`,
                project: door.project_code,
                order: order.order_code,
                width: door.width_mm,
                height: door.height_mm
            });
            
            const qrCode = await generateQRCode(qrData);
            
            return {
                door: door,
                qrCode: qrCode,
                qrData: qrData,
                order: order
            };
        }));

        res.json({
            success: true,
            data: {
                order: order,
                labels: labels
            }
        });
    } catch (err) {
        console.error('Error getting production order labels:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};




























