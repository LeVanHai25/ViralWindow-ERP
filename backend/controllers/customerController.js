const db = require("../config/db");
const NotificationService = require("../services/notificationService");
const NotificationEventService = require("../services/notificationEventService");
const SystemNotifier = require("../services/SystemNotifier");

/**
 * Helper function to generate next customer code
 */
async function generateNextCustomerCode() {
    try {
        // Get all customer codes that match the pattern KH-XXX or KHXXX
        const [rows] = await db.query(`
            SELECT customer_code 
            FROM customers 
            WHERE customer_code LIKE 'KH-%' OR customer_code LIKE 'KH%'
        `);

        let maxNumber = 0;

        // Find the maximum number from existing codes
        // Handle both formats: KH-XXX and KHXXX
        if (rows.length > 0) {
            for (const row of rows) {
                if (row.customer_code) {
                    // Match both KH-XXX and KHXXX formats
                    const match = row.customer_code.match(/KH-?(\d+)/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num) && num > maxNumber) {
                            maxNumber = num;
                        }
                    }
                }
            }
        }

        // Generate next code with format KH-XXX (3 digits)
        const nextNumber = maxNumber + 1;
        return 'KH-' + String(nextNumber).padStart(3, '0');
    } catch (err) {
        console.error('Error generating customer code:', err);
        // Fallback: return a timestamp-based code if query fails
        const timestamp = Date.now().toString().slice(-6);
        return 'KH-' + timestamp;
    }
}

// GET next customer code (for frontend to display before submit)
exports.getNextCode = async (req, res) => {
    try {
        console.log('GET /api/customers/next-code called');
        const nextCode = await generateNextCustomerCode();
        console.log('Generated customer code:', nextCode);
        res.json({
            success: true,
            data: { customer_code: nextCode }
        });
    } catch (err) {
        console.error('Error in getNextCode:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo mã khách hàng",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// GET all customers
exports.getAllCustomers = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                c.*,
                a.name as agency_name,
                a.code as agency_code,
                a.region as agency_region,
                (SELECT COUNT(*) FROM quotations q WHERE q.customer_id = c.id) as total_quotations,
                (SELECT COUNT(*) FROM projects p WHERE p.customer_id = c.id) as total_projects,
                (SELECT COUNT(*) FROM quotations q2 WHERE q2.customer_id = c.id AND q2.status = 'approved') as approved_quotations
            FROM customers c
            LEFT JOIN agencies a ON c.agency_id = a.id
        `;
        let params = [];

        if (search) {
            query += " WHERE (c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.customer_code LIKE ?)";
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        }

        query += " ORDER BY c.created_at DESC";

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
            `SELECT c.*, a.name as agency_name, a.code as agency_code 
             FROM customers c 
             LEFT JOIN agencies a ON c.agency_id = a.id 
             WHERE c.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy khách hàng"
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
        let { customer_code, full_name, phone, email, address, tax_code, notes, customer_status, source, agency_id } = req.body;

        // Tự động tạo mã nếu chưa có
        if (!customer_code || customer_code.trim() === '') {
            customer_code = await generateNextCustomerCode();
        }

        // Check if code already exists
        const [existing] = await db.query(
            "SELECT id FROM customers WHERE customer_code = ?",
            [customer_code]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Mã khách hàng "${customer_code}" đã tồn tại. Vui lòng nhập mã khác hoặc để trống để hệ thống tự tạo.`
            });
        }

        const [result] = await db.query(
            `INSERT INTO customers 
             (customer_code, full_name, phone, email, address, tax_code, notes, customer_status, source, agency_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [customer_code, full_name, phone || null, email || null, address || null, tax_code || null, notes || null, customer_status || 'potential', source || null, agency_id || null]
        );

        // Tạo thông báo & Audit Log (ChangeTracker Standard)
        try {
            await SystemNotifier.track('customer.created', {
                entityType: 'customer',
                entityId: result.insertId,
                entityName: full_name,
                action: 'created',
                after: { customer_code, full_name, phone, email, address, source },
                actor: SystemNotifier.getActor(req),
                extraMetadata: { customer_name: full_name }
            });
        } catch (notifErr) {
            console.error('[CustomerController] Notification error:', notifErr.message);
        }

        res.status(201).json({
            success: true,
            message: "Thêm khách hàng thành công",
            data: { id: result.insertId, customer_code }
        });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Mã khách hàng đã tồn tại. Vui lòng nhập mã khác hoặc để trống để hệ thống tự tạo."
            });
        }
        res.status(500).json({
            success: false,
            message: "Lỗi khi thêm khách hàng"
        });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        // Fetch old data for ChangeTracker
        const [oldRows] = await db.query("SELECT * FROM customers WHERE id = ?", [id]);
        const oldData = oldRows[0];

        const [result] = await db.query(
            `UPDATE customers 
             SET full_name = ?, phone = ?, email = ?, address = ?, tax_code = ?, notes = ?, customer_status = ?, source = ?, agency_id = ? 
             WHERE id = ?`,
            [full_name, phone || null, email || null, address || null, tax_code || null, notes || null, customer_status || 'potential', source || null, agency_id || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy khách hàng"
            });
        }

        // Gửi thông báo cập nhật (ChangeTracker Standard)
        try {
            await SystemNotifier.track('customer.updated', {
                entityType: 'customer',
                entityId: parseInt(id),
                entityName: full_name,
                action: 'updated',
                before: oldData,
                after: { full_name, phone, email, address, tax_code, notes, customer_status, source, agency_id },
                actor: SystemNotifier.getActor(req),
                extraMetadata: { customer_name: full_name }
            });
        } catch (e) { /* không block response */ }

        res.json({
            success: true,
            message: "Cập nhật khách hàng thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật khách hàng"
        });
    }
};

// DELETE
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra xem khách hàng có tồn tại không
        const [customerRows] = await db.query(
            "SELECT id, full_name, customer_code FROM customers WHERE id = ?",
            [id]
        );

        if (customerRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy khách hàng"
            });
        }

        const customer = customerRows[0];

        // Kiểm tra xem khách hàng có đang được sử dụng trong quotations không
        const [quotationRows] = await db.query(
            "SELECT COUNT(*) as count FROM quotations WHERE customer_id = ?",
            [id]
        );
        const quotationCount = quotationRows[0]?.count || 0;

        // Kiểm tra xem khách hàng có đang được sử dụng trong projects không
        const [projectRows] = await db.query(
            "SELECT COUNT(*) as count FROM projects WHERE customer_id = ?",
            [id]
        );
        const projectCount = projectRows[0]?.count || 0;

        // Nếu khách hàng đang được sử dụng, không cho xóa
        if (quotationCount > 0 || projectCount > 0) {
            let message = `Không thể xóa khách hàng "${customer.full_name}" (${customer.customer_code}) vì đang được sử dụng trong: `;
            const reasons = [];
            if (quotationCount > 0) {
                reasons.push(`${quotationCount} báo giá`);
            }
            if (projectCount > 0) {
                reasons.push(`${projectCount} dự án`);
            }
            message += reasons.join(' và ');

            return res.status(400).json({
                success: false,
                message: message,
                data: {
                    quotation_count: quotationCount,
                    project_count: projectCount
                }
            });
        }

        // Xóa khách hàng
        const [result] = await db.query(
            "DELETE FROM customers WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy khách hàng"
            });
        }

        // Gửi thông báo xóa (ChangeTracker Standard)
        try {
            await SystemNotifier.track('customer.deleted', {
                entityType: 'customer',
                entityId: parseInt(id),
                entityName: customer.full_name,
                action: 'deleted',
                actor: SystemNotifier.getActor(req),
                extraMetadata: { customer_name: customer.full_name }
            });
        } catch (e) { /* không block response */ }

        res.json({
            success: true,
            message: "Xóa khách hàng thành công"
        });
    } catch (err) {
        console.error('Error deleting customer:', err);

        // Xử lý lỗi foreign key constraint
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED' || err.code === '23000') {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa khách hàng vì đang được sử dụng trong báo giá hoặc dự án. Vui lòng xóa các báo giá và dự án liên quan trước."
            });
        }

        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa khách hàng",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};






