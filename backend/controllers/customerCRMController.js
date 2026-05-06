const db = require("../config/db");

/**
 * Lấy thông tin CRM đầy đủ của khách hàng
 */
exports.getCustomerCRM = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin khách hàng
        const [customerRows] = await db.query(
            "SELECT * FROM customers WHERE id = ?",
            [id]
        );

        if (customerRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy khách hàng"
            });
        }

        const customer = customerRows[0];

        // Lấy lịch sử báo giá
        const [quotations] = await db.query(`
            SELECT 
                q.*,
                p.project_name
            FROM quotations q
            LEFT JOIN projects p ON q.project_id = p.id
            WHERE q.customer_id = ?
            ORDER BY q.created_at DESC
            LIMIT 20
        `, [id]);

        // Lấy lịch hẹn
        const [appointments] = await db.query(`
            SELECT * FROM customer_appointments
            WHERE customer_id = ?
            ORDER BY appointment_date DESC
            LIMIT 20
        `, [id]);

        // Lấy lịch sử tương tác
        const [interactions] = await db.query(`
            SELECT 
                ci.*,
                q.quotation_code
            FROM customer_interactions ci
            LEFT JOIN quotations q ON ci.related_quotation_id = q.id
            WHERE ci.customer_id = ?
            ORDER BY ci.interaction_date DESC
            LIMIT 30
        `, [id]);

        // Thống kê
        const stats = {
            total_quotations: quotations.length,
            approved_quotations: quotations.filter(q => q.status === 'approved').length,
            total_value: quotations
                .filter(q => q.status === 'approved')
                .reduce((sum, q) => sum + (parseFloat(q.total_amount) || 0), 0),
            pending_appointments: appointments.filter(a => a.status === 'scheduled').length,
            last_interaction: interactions.length > 0 ? interactions[0].interaction_date : null
        };

        res.json({
            success: true,
            data: {
                customer,
                quotations,
                appointments,
                interactions,
                stats
            }
        });
    } catch (err) {
        console.error('Error getting customer CRM:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy thông tin CRM: " + err.message
        });
    }
};

/**
 * Tạo lịch hẹn
 */
exports.createAppointment = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { appointment_date, appointment_type, title, description, location } = req.body;

        console.log('📅 createAppointment called with:', { customerId, params: req.params, body: req.body });

        const customer_id = customerId || req.body.customer_id;

        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "Thiếu customer_id"
            });
        }

        const [result] = await db.query(`
            INSERT INTO customer_appointments 
            (customer_id, appointment_date, appointment_type, title, description, location)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [customer_id, appointment_date, appointment_type || 'meeting', title, description || null, location || null]);

        // Tự động tạo interaction
        await db.query(`
            INSERT INTO customer_interactions 
            (customer_id, interaction_type, interaction_date, title, description)
            VALUES (?, 'meeting', ?, ?, ?)
        `, [customer_id, appointment_date, `Lịch hẹn: ${title}`, description || null]);

        res.status(201).json({
            success: true,
            message: "Tạo lịch hẹn thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error creating appointment:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo lịch hẹn: " + err.message
        });
    }
};

/**
 * Cập nhật lịch hẹn
 */
exports.updateAppointment = async (req, res) => {
    try {
        const { id, customerId } = req.params;
        const { appointment_date, appointment_type, title, description, location, status } = req.body;

        // Verify appointment belongs to customer
        const [checkRows] = await db.query(
            `SELECT id FROM customer_appointments WHERE id = ? AND customer_id = ?`,
            [id, customerId]
        );

        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lịch hẹn"
            });
        }

        const [result] = await db.query(`
            UPDATE customer_appointments
            SET appointment_date = ?, appointment_type = ?, title = ?, 
                description = ?, location = ?, status = ?
            WHERE id = ? AND customer_id = ?
        `, [appointment_date, appointment_type, title, description, location, status || 'scheduled', id, customerId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lịch hẹn"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật lịch hẹn thành công"
        });
    } catch (err) {
        console.error('Error updating appointment:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật lịch hẹn: " + err.message
        });
    }
};

/**
 * Xóa lịch hẹn
 */
exports.deleteAppointment = async (req, res) => {
    try {
        const { id, customerId } = req.params;

        const [result] = await db.query(
            `DELETE FROM customer_appointments WHERE id = ? AND customer_id = ?`,
            [id, customerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lịch hẹn"
            });
        }

        res.json({
            success: true,
            message: "Xóa lịch hẹn thành công"
        });
    } catch (err) {
        console.error('Error deleting appointment:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa lịch hẹn: " + err.message
        });
    }
};

/**
 * Tạo tương tác với khách hàng
 */
exports.createInteraction = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { interaction_type, interaction_date, title, description, related_quotation_id } = req.body;

        console.log('💬 createInteraction called with:', { customerId, params: req.params, body: req.body });

        const customer_id = customerId || req.body.customer_id;

        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "Thiếu customer_id"
            });
        }

        const [result] = await db.query(`
            INSERT INTO customer_interactions 
            (customer_id, interaction_type, interaction_date, title, description, related_quotation_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [customer_id, interaction_type, interaction_date || new Date(), title, description || null, related_quotation_id || null]);

        // Cập nhật last_contact_date của khách hàng
        await db.query(`
            UPDATE customers 
            SET last_contact_date = ? 
            WHERE id = ?
        `, [interaction_date || new Date(), customer_id]);

        res.status(201).json({
            success: true,
            message: "Tạo tương tác thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error creating interaction:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo tương tác: " + err.message
        });
    }
};

/**
 * Xóa tương tác
 */
exports.deleteInteraction = async (req, res) => {
    try {
        const { id, customerId } = req.params;

        const [result] = await db.query(
            `DELETE FROM customer_interactions WHERE id = ? AND customer_id = ?`,
            [id, customerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tương tác"
            });
        }

        res.json({
            success: true,
            message: "Xóa tương tác thành công"
        });
    } catch (err) {
        console.error('Error deleting interaction:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa tương tác: " + err.message
        });
    }
};

/**
 * Cập nhật trạng thái khách hàng
 */
exports.updateCustomerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { customer_status, next_followup_date } = req.body;

        const [result] = await db.query(`
            UPDATE customers
            SET customer_status = ?, next_followup_date = ?
            WHERE id = ?
        `, [customer_status, next_followup_date || null, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy khách hàng"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật trạng thái thành công"
        });
    } catch (err) {
        console.error('Error updating customer status:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật trạng thái: " + err.message
        });
    }
};

/**
 * Lấy danh sách lịch hẹn sắp tới
 */
exports.getUpcomingAppointments = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + parseInt(days));

        const [appointments] = await db.query(`
            SELECT 
                ca.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone
            FROM customer_appointments ca
            INNER JOIN customers c ON ca.customer_id = c.id
            WHERE ca.appointment_date >= NOW() 
            AND ca.appointment_date <= ?
            AND ca.status = 'scheduled'
            ORDER BY ca.appointment_date ASC
        `, [endDate]);

        res.json({
            success: true,
            data: appointments
        });
    } catch (err) {
        console.error('Error getting upcoming appointments:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy lịch hẹn: " + err.message
        });
    }
};




























