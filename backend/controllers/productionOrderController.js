const db = require("../config/db");
const NotificationEventService = require("../services/notificationEventService");

// GET all production orders
exports.getAllOrders = async (req, res) => {
    try {
        const { status, project_id } = req.query;

        let query = `
            SELECT 
                po.*,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name
            FROM production_orders po
            LEFT JOIN projects p ON po.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE 1=1
        `;
        let params = [];

        if (status) {
            query += " AND po.status = ?";
            params.push(status);
        }

        if (project_id) {
            query += " AND po.project_id = ?";
            params.push(project_id);
        }

        query += " ORDER BY po.order_date DESC, po.created_at DESC";

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

// GET by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT 
                po.*,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name,
                c.phone AS customer_phone
            FROM production_orders po
            LEFT JOIN projects p ON po.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE po.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
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
        const { project_id, order_date, priority, status, notes } = req.body;

        // Tự động tạo mã lệnh sản xuất
        const year = new Date().getFullYear();
        const [countRows] = await db.query(
            "SELECT COUNT(*) as count FROM production_orders WHERE YEAR(order_date) = ?",
            [year]
        );
        const count = countRows[0].count + 1;
        const order_code = `SX-${year}-${String(count).padStart(4, '0')}`;

        const [result] = await db.query(
            `INSERT INTO production_orders 
             (order_code, project_id, order_date, status, priority, notes) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                order_code,
                project_id,
                order_date || new Date().toISOString().split('T')[0],
                status || 'pending',
                priority || 'normal',
                notes || null
            ]
        );

        // Tạo thông báo lệnh sản xuất mới (Event-based)
        try {
            const [projectRows] = await db.query(
                "SELECT project_name FROM projects WHERE id = ?",
                [project_id]
            );
            await NotificationEventService.emit('production.order_created', {
                order_id: result.insertId,
                order_code: order_code,
                project_id: project_id,
                project_name: projectRows[0]?.project_name || 'N/A'
            }, {
                createdBy: req.user?.id,
                entityType: 'production',
                entityId: result.insertId
            });
        } catch (notifErr) {
            console.error('Error creating notification:', notifErr);
        }

        res.status(201).json({
            success: true,
            message: "Tạo lệnh sản xuất thành công",
            data: { id: result.insertId, order_code }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo lệnh sản xuất"
        });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { project_id, order_date, priority, status, notes } = req.body;

        const [result] = await db.query(
            `UPDATE production_orders 
             SET project_id = ?, order_date = ?, priority = ?, status = ?, notes = ? 
             WHERE id = ?`,
            [project_id, order_date, priority, status, notes || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật lệnh sản xuất thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật lệnh sản xuất"
        });
    }
};

// PUT update status only
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [result] = await db.query(
            "UPDATE production_orders SET status = ? WHERE id = ?",
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật trạng thái thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật trạng thái"
        });
    }
};

// DELETE
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "DELETE FROM production_orders WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        res.json({
            success: true,
            message: "Xóa lệnh sản xuất thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa lệnh sản xuất"
        });
    }
};






