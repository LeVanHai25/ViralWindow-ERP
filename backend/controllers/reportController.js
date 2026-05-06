const db = require("../config/db");

// GET dashboard summary
exports.getDashboard = async (req, res) => {
    try {
        // Doanh thu
        const [revenueRows] = await db.query(
            "SELECT SUM(total_amount) as total FROM quotations WHERE status = 'approved'"
        );
        const total_revenue = revenueRows[0].total || 0;

        // Lợi nhuận
        const [profitRows] = await db.query(
            "SELECT SUM(profit_amount) as total FROM quotations WHERE status = 'approved'"
        );
        const total_profit = profitRows[0].total || 0;

        // Báo giá đã chốt
        const [approvedRows] = await db.query(
            "SELECT COUNT(*) as total FROM quotations WHERE status = 'approved'"
        );
        const approved_quotations = approvedRows[0].total || 0;

        // Tổng số báo giá
        const [totalRows] = await db.query(
            "SELECT COUNT(*) as total FROM quotations"
        );
        const total_quotations = totalRows[0].total || 0;

        // Dự án đang chạy
        const [projectsRows] = await db.query(
            "SELECT COUNT(*) as total FROM projects WHERE status NOT IN ('completed', 'cancelled')"
        );
        const running_projects = projectsRows[0].total || 0;

        res.json({
            success: true,
            data: {
                total_revenue,
                total_profit,
                approved_quotations,
                total_quotations,
                running_projects
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET revenue by month
exports.getRevenueByMonth = async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year || new Date().getFullYear();

        const [rows] = await db.query(`
            SELECT 
                MONTH(quotation_date) as month,
                SUM(total_amount) as revenue,
                SUM(profit_amount) as profit,
                COUNT(*) as quotation_count
            FROM quotations
            WHERE status = 'approved' AND YEAR(quotation_date) = ?
            GROUP BY MONTH(quotation_date)
            ORDER BY month ASC
        `, [targetYear]);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET conversion rate
exports.getConversionRate = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status IN ('draft', 'sent', 'pending') THEN 1 ELSE 0 END) as pending
            FROM quotations
        `);

        const data = rows[0];
        if (data.total > 0) {
            data.conversion_rate = (data.approved / data.total) * 100;
        } else {
            data.conversion_rate = 0;
        }

        res.json({
            success: true,
            data
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET revenue by sales
exports.getRevenueBySales = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                created_by as sales_id,
                COUNT(*) as quotation_count,
                SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END) as revenue,
                SUM(CASE WHEN status = 'approved' THEN profit_amount ELSE 0 END) as profit
            FROM quotations
            WHERE created_by IS NOT NULL
            GROUP BY created_by
            ORDER BY revenue DESC
        `);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET production report
exports.getProductionReport = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM production_orders
            GROUP BY status
        `);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET inventory report
exports.getInventoryReport = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                item_type,
                COUNT(*) as total_items,
                SUM(CASE WHEN quantity < min_stock_level THEN 1 ELSE 0 END) as low_stock,
                0 as total_value
            FROM inventory
            GROUP BY item_type
        `);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET financial report
exports.getFinancialReport = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
            SELECT 
                transaction_type,
                SUM(amount) as total_amount,
                COUNT(*) as transaction_count
            FROM financial_transactions
            WHERE 1=1
        `;
        let params = [];

        if (start_date) {
            query += " AND transaction_date >= ?";
            params.push(start_date);
        }
        if (end_date) {
            query += " AND transaction_date <= ?";
            params.push(end_date);
        }

        query += " GROUP BY transaction_type";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET dashboard statistics (real-time)
exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Dự án đang chạy (projects not completed và progress < 100)
        // Tự động cập nhật progress_percent dựa trên status nếu progress_percent = 0 hoặc NULL
        // Trước tiên, cập nhật progress_percent cho các dự án có status nhưng progress_percent = 0 hoặc NULL
        await db.query(`
            UPDATE projects 
            SET progress_percent = CASE
                WHEN status = 'quotation_pending' OR status = 'waiting_quotation' THEN 10
                WHEN status = 'designing' THEN 25
                WHEN status = 'bom_extraction' OR status LIKE '%bom%' THEN 40
                WHEN status = 'in_production' OR status IN ('cutting', 'welding', 'gluing', 'accessories', 'finishing', 'packaging') THEN 60
                WHEN status = 'installation' THEN 85
                WHEN status = 'handover' THEN 95
                WHEN status = 'completed' THEN 100
                ELSE COALESCE(progress_percent, 0)
            END
            WHERE (progress_percent IS NULL OR progress_percent = 0)
              AND status IS NOT NULL
              AND status != ''
        `);

        // Sau đó đếm dự án đang chạy
        const [projectsRows] = await db.query(`
            SELECT COALESCE(COUNT(*), 0) as count
            FROM projects
            WHERE (status IS NULL OR status != 'completed')
              AND (progress_percent IS NULL OR progress_percent < 100)
        `);
        const runningProjects = parseInt(projectsRows[0]?.count) || 0;

        // 2. Báo giá chờ duyệt (quotations pending/sent)
        // Bao gồm: pending, sent, revision_requested, draft
        const [quotationsRows] = await db.query(`
            SELECT COALESCE(COUNT(*), 0) as count
            FROM quotations
            WHERE status IN ('pending', 'sent', 'revision_requested', 'draft')
        `);
        const pendingQuotations = parseInt(quotationsRows[0]?.count) || 0;

        // 3. Lệnh sản xuất (production orders not completed/cancelled)
        // Bao gồm: pending, in_progress, on_hold, và cả các dự án đã đến giai đoạn sản xuất
        // Đếm production orders thực tế + các dự án đã đến giai đoạn sản xuất nhưng chưa có production order
        const [productionRows] = await db.query(`
            SELECT COALESCE(COUNT(*), 0) as count
            FROM production_orders
            WHERE (status IS NULL OR status = '' OR status NOT IN ('completed', 'cancelled', 'closed'))
        `);
        const productionOrdersFromTable = parseInt(productionRows[0]?.count) || 0;

        // Đếm các dự án đã đến giai đoạn sản xuất (có thể chưa có production order)
        const [projectsInProduction] = await db.query(`
            SELECT COALESCE(COUNT(*), 0) as count
            FROM projects
            WHERE status IN ('in_production', 'cutting', 'welding', 'gluing', 'accessories', 'finishing', 'packaging')
               OR (status = 'designing' AND progress_percent >= 40)
        `);
        const projectsInProductionCount = parseInt(projectsInProduction[0]?.count) || 0;

        // Lấy số lớn hơn giữa production orders thực tế và dự án đang sản xuất
        const productionOrders = Math.max(productionOrdersFromTable, projectsInProductionCount);

        // 4. Dự án đã hoàn thành (completed projects)
        // Bao gồm: status = 'completed' hoặc progress_percent >= 100
        const [completedProjectsRows] = await db.query(`
            SELECT COALESCE(COUNT(*), 0) as count
            FROM projects
            WHERE status = 'completed' 
               OR progress_percent >= 100
        `);
        const completedProjects = parseInt(completedProjectsRows[0]?.count) || 0;

        res.json({
            success: true,
            data: {
                running_projects: runningProjects,
                pending_quotations: pendingQuotations,
                production_orders: productionOrders,
                completed_projects: completedProjects
            }
        });
    } catch (err) {
        console.error('Error getting dashboard stats:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};



