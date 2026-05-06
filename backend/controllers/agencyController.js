// agencyController.js - Controller quản lý Đại lý/Chi nhánh
const pool = require('../config/db');

// ========== CRUD OPERATIONS ==========

// Lấy danh sách đại lý với thống kê
const getAgencies = async (req, res) => {
    try {
        const { search, region, status } = req.query;

        let sql = `
            SELECT a.*,
                   (SELECT COUNT(*) FROM customers WHERE agency_id = a.id) as customer_count,
                   (SELECT COUNT(*) FROM projects WHERE agency_id = a.id AND status NOT IN ('completed','handover')) as active_project_count,
                   (SELECT COUNT(*) FROM projects WHERE agency_id = a.id) as total_project_count
            FROM agencies a
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ` AND (a.name LIKE ? OR a.code LIKE ? OR a.region LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (region) {
            sql += ` AND a.region = ?`;
            params.push(region);
        }
        if (status) {
            sql += ` AND a.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY a.name`;

        const [agencies] = await pool.query(sql, params);
        res.json({ success: true, data: agencies });
    } catch (error) {
        console.error('Error getting agencies:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy chi tiết 1 đại lý
const getAgencyById = async (req, res) => {
    try {
        const { id } = req.params;
        const [agencies] = await pool.query('SELECT * FROM agencies WHERE id = ?', [id]);

        if (agencies.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý' });
        }

        res.json({ success: true, data: agencies[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Tạo đại lý mới
const createAgency = async (req, res) => {
    try {
        const { code, name, address, phone, email, region, manager_name, manager_phone, notes } = req.body;

        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Mã và tên đại lý là bắt buộc' });
        }

        const [result] = await pool.query(
            `INSERT INTO agencies (code, name, address, phone, email, region, manager_name, manager_phone, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, name, address, phone, email, region, manager_name, manager_phone, notes]
        );

        res.json({
            success: true,
            message: 'Tạo đại lý thành công',
            data: { id: result.insertId, code, name }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Mã đại lý đã tồn tại' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật đại lý
const updateAgency = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, address, phone, email, region, manager_name, manager_phone, notes, status } = req.body;

        await pool.query(
            `UPDATE agencies SET code = ?, name = ?, address = ?, phone = ?, email = ?, 
             region = ?, manager_name = ?, manager_phone = ?, notes = ?, status = ?
             WHERE id = ?`,
            [code, name, address, phone, email, region, manager_name, manager_phone, notes, status || 'active', id]
        );

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Xóa hẳn đại lý khỏi database (hard delete)
const deleteAgency = async (req, res) => {
    try {
        const { id } = req.params;
        // Gỡ liên kết khách hàng trước khi xóa
        await pool.query(`UPDATE customers SET agency_id = NULL WHERE agency_id = ?`, [id]);
        // Xóa hẳn khỏi database
        await pool.query(`DELETE FROM agencies WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Đã xóa đại lý thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========== DASHBOARD & STATS ==========

// Dashboard thống kê của 1 đại lý
const getAgencyDashboard = async (req, res) => {
    try {
        const { id } = req.params;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Thống kê cơ bản
        const [stats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM customers WHERE agency_id = ?) as total_customers,
                (SELECT COUNT(*) FROM projects WHERE agency_id = ? AND status NOT IN ('completed','handover')) as active_projects,
                (SELECT COUNT(*) FROM projects WHERE agency_id = ?) as total_projects,
                (SELECT COUNT(*) FROM projects WHERE agency_id = ? AND status IN ('completed','handover')) as completed_projects
        `, [id, id, id, id]);

        // Doanh số tháng (từ quotations approved)
        const [revenue] = await pool.query(`
            SELECT COALESCE(SUM(q.total_amount), 0) as month_revenue
            FROM quotations q
            JOIN projects p ON q.project_id = p.id
            WHERE p.agency_id = ? 
            AND q.status = 'approved'
            AND MONTH(q.updated_at) = ? AND YEAR(q.updated_at) = ?
        `, [id, currentMonth, currentYear]);

        // Tỷ lệ hoàn thành đúng hạn
        const [onTime] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN handover_date <= deadline THEN 1 END) as on_time,
                COUNT(*) as total
            FROM projects 
            WHERE agency_id = ? AND status IN ('completed','handover') AND deadline IS NOT NULL
        `, [id]);

        const onTimeRate = onTime[0].total > 0
            ? Math.round((onTime[0].on_time / onTime[0].total) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                total_customers: stats[0].total_customers,
                active_projects: stats[0].active_projects,
                total_projects: stats[0].total_projects,
                completed_projects: stats[0].completed_projects,
                month_revenue: revenue[0].month_revenue,
                on_time_rate: onTimeRate
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy khách hàng của đại lý
const getAgencyCustomers = async (req, res) => {
    try {
        const { id } = req.params;
        const [customers] = await pool.query(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM projects WHERE customer_id = c.id) as project_count,
                   (SELECT COUNT(*) FROM quotations q JOIN projects p ON q.project_id = p.id WHERE p.customer_id = c.id) as quotation_count
            FROM customers c
            WHERE c.agency_id = ?
            ORDER BY c.full_name
        `, [id]);

        res.json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy dự án của đại lý
const getAgencyProjects = async (req, res) => {
    try {
        const { id } = req.params;
        const [projects] = await pool.query(`
            SELECT p.*, c.full_name as customer_name
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.agency_id = ?
            ORDER BY p.created_at DESC
        `, [id]);

        res.json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========== CUSTOMER ASSIGNMENT ==========

// Gán khách hàng vào đại lý
const assignCustomer = async (req, res) => {
    try {
        const { id } = req.params; // agency_id
        const { customer_id, reason } = req.body;
        const user_id = req.user?.id || null;

        // Lấy agency hiện tại của khách
        const [customer] = await pool.query('SELECT agency_id FROM customers WHERE id = ?', [customer_id]);
        if (customer.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        }

        const fromAgencyId = customer[0].agency_id;

        // Cập nhật agency
        await pool.query('UPDATE customers SET agency_id = ? WHERE id = ?', [id, customer_id]);

        // Cập nhật projects của khách hàng
        await pool.query('UPDATE projects SET agency_id = ? WHERE customer_id = ?', [id, customer_id]);

        // Lưu lịch sử
        await pool.query(
            `INSERT INTO customer_agency_history (customer_id, from_agency_id, to_agency_id, transferred_by, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [customer_id, fromAgencyId, id, user_id, reason || 'Gán vào đại lý']
        );

        res.json({ success: true, message: 'Đã gán khách hàng vào đại lý' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Chuyển khách hàng sang đại lý khác (với lý do)
const transferCustomer = async (req, res) => {
    try {
        const { customer_id, to_agency_id, reason } = req.body;
        const user_id = req.user?.id || null;

        if (!customer_id || !to_agency_id) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
        }

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do chuyển đại lý' });
        }

        // Lấy agency hiện tại
        const [customer] = await pool.query('SELECT agency_id, full_name FROM customers WHERE id = ?', [customer_id]);
        if (customer.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        }

        const fromAgencyId = customer[0].agency_id;

        if (fromAgencyId === to_agency_id) {
            return res.status(400).json({ success: false, message: 'Khách hàng đã thuộc đại lý này' });
        }

        // Cập nhật customer
        await pool.query('UPDATE customers SET agency_id = ? WHERE id = ?', [to_agency_id, customer_id]);

        // Cập nhật projects
        await pool.query('UPDATE projects SET agency_id = ? WHERE customer_id = ?', [to_agency_id, customer_id]);

        // Lưu lịch sử audit
        await pool.query(
            `INSERT INTO customer_agency_history (customer_id, from_agency_id, to_agency_id, transferred_by, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [customer_id, fromAgencyId, to_agency_id, user_id, reason]
        );

        res.json({
            success: true,
            message: `Đã chuyển khách hàng "${customer[0].full_name}" sang đại lý mới`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy lịch sử chuyển đại lý của khách hàng
const getCustomerAgencyHistory = async (req, res) => {
    try {
        const { customer_id } = req.params;

        const [history] = await pool.query(`
            SELECT h.*, 
                   fa.name as from_agency_name, fa.code as from_agency_code,
                   ta.name as to_agency_name, ta.code as to_agency_code,
                   u.full_name as transferred_by_name
            FROM customer_agency_history h
            LEFT JOIN agencies fa ON h.from_agency_id = fa.id
            LEFT JOIN agencies ta ON h.to_agency_id = ta.id
            LEFT JOIN users u ON h.transferred_by = u.id
            WHERE h.customer_id = ?
            ORDER BY h.transferred_at DESC
        `, [customer_id]);

        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy tất cả regions (cho filter)
const getRegions = async (req, res) => {
    try {
        const [regions] = await pool.query('SELECT DISTINCT region FROM agencies WHERE region IS NOT NULL ORDER BY region');
        res.json({ success: true, data: regions.map(r => r.region) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Tổng quan tất cả đại lý
const getAgenciesOverview = async (req, res) => {
    try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const [overview] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM agencies WHERE status = 'active') as total_agencies,
                (SELECT COUNT(*) FROM customers WHERE agency_id IS NOT NULL) as total_customers,
                (SELECT COUNT(*) FROM projects WHERE agency_id IS NOT NULL AND status NOT IN ('completed','handover')) as active_projects,
                (SELECT COALESCE(SUM(q.total_amount), 0) FROM quotations q 
                 JOIN projects p ON q.project_id = p.id 
                 WHERE q.status = 'approved' AND MONTH(q.updated_at) = ? AND YEAR(q.updated_at) = ?) as month_revenue
        `, [currentMonth, currentYear]);

        res.json({ success: true, data: overview[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAgencies,
    getAgencyById,
    createAgency,
    updateAgency,
    deleteAgency,
    getAgencyDashboard,
    getAgencyCustomers,
    getAgencyProjects,
    assignCustomer,
    transferCustomer,
    getCustomerAgencyHistory,
    getRegions,
    getAgenciesOverview
};
