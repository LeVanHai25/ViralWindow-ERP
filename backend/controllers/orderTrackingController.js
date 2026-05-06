// orderTrackingController.js - Controller cho Order Tracking Dashboard
const { emitDataChange } = require('../services/socketService');
const pool = require('../config/db');

// Lấy danh sách đơn hàng với filter
exports.getOrders = async (req, res) => {
    try {
        const { status, month, year, search, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        // Filter theo status
        if (status && status !== 'all') {
            whereClause += ' AND p.status = ?';
            params.push(status);
        }

        // Filter theo tháng
        if (month && year) {
            whereClause += ' AND MONTH(p.created_at) = ? AND YEAR(p.created_at) = ?';
            params.push(parseInt(month), parseInt(year));
        } else if (year) {
            whereClause += ' AND YEAR(p.created_at) = ?';
            params.push(parseInt(year));
        }

        // Tìm kiếm theo tên hoặc mã
        if (search) {
            whereClause += ' AND (p.project_code LIKE ? OR p.project_name LIKE ? OR p.customer_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Query chính - không dùng q.total_area và c.name vì không có trong schema
        const sql = `
            SELECT 
                p.id,
                p.project_code,
                p.project_name,
                NULL as customer_name,
                0 as volume,
                p.created_at,
                p.deadline,
                p.handover_date,
                p.status,
                NULL as manufacturer,
                p.notes,
                CASE 
                    WHEN p.status = 'completed' THEN 'Đã giao hàng'
                    WHEN p.status = 'installation' THEN 'Đang lắp đặt'
                    WHEN p.status = 'production' THEN 'Đang sản xuất'
                    WHEN p.status = 'bom' THEN 'Đang BOM'
                    WHEN p.status = 'design' THEN 'Đang thiết kế'
                    WHEN p.status = 'quotation' THEN 'Báo giá'
                    WHEN p.deadline < CURDATE() AND p.status NOT IN ('completed', 'cancelled') THEN 'Trễ hạn'
                    ELSE 'Chờ xử lý'
                END as status_text,
                CASE 
                    WHEN p.status = 'completed' THEN 'success'
                    WHEN p.deadline < CURDATE() AND p.status NOT IN ('completed', 'cancelled') THEN 'danger'
                    WHEN p.status IN ('production', 'installation') THEN 'warning'
                    ELSE 'secondary'
                END as status_color
            FROM projects p
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await pool.query(sql, params);

        // Đếm tổng số
        const countSql = `
            SELECT COUNT(*) as total 
            FROM projects p
            ${whereClause}
        `;
        const countParams = params.slice(0, -2); // Bỏ limit và offset
        const [countResult] = await pool.query(countSql, countParams);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Error getting orders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Lấy thống kê tổng quan
exports.getStats = async (req, res) => {
    try {
        const { month, year } = req.query;

        let dateFilter = '';
        const params = [];

        if (month && year) {
            dateFilter = 'AND MONTH(created_at) = ? AND YEAR(created_at) = ?';
            params.push(parseInt(month), parseInt(year));
        } else if (year) {
            dateFilter = 'AND YEAR(created_at) = ?';
            params.push(parseInt(year));
        }

        // Tổng đơn hàng
        const [totalOrders] = await pool.query(
            `SELECT COUNT(*) as count FROM projects WHERE 1=1 ${dateFilter}`,
            params
        );

        // Đang sản xuất
        const [inProduction] = await pool.query(
            `SELECT COUNT(*) as count FROM projects WHERE status IN ('production', 'bom', 'design') ${dateFilter}`,
            params
        );

        // Đã giao hàng
        const [delivered] = await pool.query(
            `SELECT COUNT(*) as count FROM projects WHERE status = 'completed' ${dateFilter}`,
            params
        );

        // Trễ hạn
        const [overdue] = await pool.query(
            `SELECT COUNT(*) as count FROM projects WHERE deadline < CURDATE() AND status NOT IN ('completed', 'cancelled') ${dateFilter}`,
            params
        );

        // Tổng khối lượng (m²) - hiện tại return 0 vì không có cột total_area
        const totalVolume = [{ total: 0 }];

        // Thống kê theo tháng (12 tháng gần nhất)
        const [monthlyStats] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as delivered
            FROM projects
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `);

        res.json({
            success: true,
            data: {
                totalOrders: totalOrders[0].count,
                inProduction: inProduction[0].count,
                delivered: delivered[0].count,
                overdue: overdue[0].count,
                totalVolume: parseFloat(totalVolume[0].total || 0).toFixed(2),
                monthlyStats
            }
        });

    } catch (error) {
        console.error('❌ Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Lấy chi tiết đơn hàng
exports.getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const [orders] = await pool.query(`
            SELECT 
                p.*
            FROM projects p
            WHERE p.id = ?
        `, [id]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' });
        }

        // Lấy timeline
        const [timeline] = await pool.query(`
            SELECT 
                created_at as date,
                'Tạo dự án' as action,
                'Dự án được tạo mới' as description
            FROM projects WHERE id = ?
            UNION ALL
            SELECT 
                design_date as date,
                'Thiết kế' as action,
                'Hoàn thành thiết kế' as description
            FROM projects WHERE id = ? AND design_date IS NOT NULL
            UNION ALL
            SELECT 
                bom_date as date,
                'BOM' as action,
                'Hoàn thành BOM' as description
            FROM projects WHERE id = ? AND bom_date IS NOT NULL
            UNION ALL
            SELECT 
                production_date as date,
                'Sản xuất' as action,
                'Bắt đầu sản xuất' as description
            FROM projects WHERE id = ? AND production_date IS NOT NULL
            UNION ALL
            SELECT 
                handover_date as date,
                'Giao hàng' as action,
                'Hoàn thành giao hàng' as description
            FROM projects WHERE id = ? AND handover_date IS NOT NULL
            ORDER BY date ASC
        `, [id, id, id, id, id]);

        res.json({
            success: true,
            data: {
                order: orders[0],
                timeline
            }
        });

    } catch (error) {
        console.error('❌ Error getting order detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Cập nhật thông tin đơn hàng
exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { manufacturer, notes, deadline, handover_date } = req.body;

        const updates = [];
        const params = [];

        if (manufacturer !== undefined) {
            updates.push('manufacturer = ?');
            params.push(manufacturer);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
        }
        if (deadline !== undefined) {
            updates.push('deadline = ?');
            params.push(deadline);
        }
        if (handover_date !== undefined) {
            updates.push('handover_date = ?');
            params.push(handover_date);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'Không có dữ liệu cập nhật' });
        }

        params.push(id);

        await pool.query(
            `UPDATE projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            params
        );

        res.json({ success: true, message: 'Cập nhật thành công' });

    } catch (error) {
        console.error('❌ Error updating order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Export Excel
exports.exportExcel = async (req, res) => {
    try {
        const { month, year, status } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status && status !== 'all') {
            whereClause += ' AND p.status = ?';
            params.push(status);
        }

        if (month && year) {
            whereClause += ' AND MONTH(p.created_at) = ? AND YEAR(p.created_at) = ?';
            params.push(parseInt(month), parseInt(year));
        }

        const [orders] = await pool.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY p.created_at DESC) as 'TT',
                CONCAT(p.project_code, ' - ', p.project_name) as 'Đơn hàng',
                COALESCE(q.total_area, 0) as 'Khối lượng (m²)',
                DATE_FORMAT(p.created_at, '%d/%m/%Y') as 'Ngày tạo',
                DATE_FORMAT(p.deadline, '%d/%m/%Y') as 'Ngày giao dự kiến',
                DATE_FORMAT(p.handover_date, '%d/%m/%Y') as 'Ngày giao thực tế',
                COALESCE(p.manufacturer, '') as 'Đơn vị SX',
                CASE 
                    WHEN p.status = 'completed' THEN 'Đã giao hàng'
                    WHEN p.status = 'production' THEN 'Đang sản xuất'
                    WHEN p.deadline < CURDATE() AND p.status NOT IN ('completed', 'cancelled') THEN 'Trễ hạn'
                    ELSE 'Đang xử lý'
                END as 'Tình trạng',
                COALESCE(p.notes, '') as 'Ghi chú'
            FROM projects p
            LEFT JOIN quotations q ON p.quotation_id = q.id
            ${whereClause}
            ORDER BY p.created_at DESC
        `, params);

        res.json({ success: true, data: orders });

    } catch (error) {
        console.error('❌ Error exporting:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
