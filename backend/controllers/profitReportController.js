const db = require("../config/db");

/**
 * Báo cáo lợi nhuận
 * Lợi nhuận = Doanh thu - Giá vốn (BOM) - Chi phí thi công
 */
exports.getProfitReport = async (req, res) => {
    try {
        const { project_id, start_date, end_date } = req.query;

        let whereClause = "WHERE 1=1";
        let params = [];

        if (project_id) {
            whereClause += " AND p.id = ?";
            params.push(project_id);
        }

        if (start_date) {
            whereClause += " AND q.quotation_date >= ?";
            params.push(start_date);
        }

        if (end_date) {
            whereClause += " AND q.quotation_date <= ?";
            params.push(end_date);
        }

        // Lấy doanh thu từ báo giá đã duyệt
        const [revenueRows] = await db.query(`
            SELECT 
                p.id AS project_id,
                p.project_name,
                p.project_code,
                SUM(q.total_amount) AS total_revenue,
                COUNT(q.id) AS quotation_count
            FROM quotations q
            INNER JOIN projects p ON q.project_id = p.id
            ${whereClause}
            AND q.status = 'approved'
            GROUP BY p.id, p.project_name, p.project_code
        `, params);

        // Tính giá vốn từ BOM
        const projectIds = revenueRows.map(r => r.project_id);
        let bomCosts = {};

        if (projectIds.length > 0) {
            const placeholders = projectIds.map(() => '?').join(',');
            const [bomRows] = await db.query(`
                SELECT 
                    dd.project_id,
                    SUM(bi.quantity * COALESCE(i.unit_price, a.unit_price, 0)) AS bom_cost
                FROM bom_items bi
                INNER JOIN door_designs dd ON bi.design_id = dd.id
                LEFT JOIN inventory i ON bi.item_code = i.item_code
                LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id
                WHERE dd.project_id IN (${placeholders})
                GROUP BY dd.project_id
            `, projectIds);

            bomRows.forEach(row => {
                bomCosts[row.project_id] = parseFloat(row.bom_cost) || 0;
            });
        }

        // Tính chi phí thi công, vận chuyển từ financial_transactions
        let constructionCosts = {};
        let transportCosts = {};

        if (projectIds.length > 0) {
            const placeholders = projectIds.map(() => '?').join(',');
            const [costRows] = await db.query(`
                SELECT 
                    project_id,
                    expense_type,
                    SUM(amount) AS total_cost
                FROM financial_transactions
                WHERE project_id IN (${placeholders})
                AND transaction_type = 'expense'
                AND (expense_type = 'construction_cost' OR expense_type = 'transport_cost')
                GROUP BY project_id, expense_type
            `, projectIds);

            costRows.forEach(row => {
                if (row.expense_type === 'construction_cost') {
                    constructionCosts[row.project_id] = parseFloat(row.total_cost) || 0;
                } else if (row.expense_type === 'transport_cost') {
                    transportCosts[row.project_id] = parseFloat(row.total_cost) || 0;
                }
            });
        }

        // Tính tổng chi phí từ inventory_in (giá vốn thực tế)
        let actualMaterialCosts = {};
        if (projectIds.length > 0) {
            const placeholders = projectIds.map(() => '?').join(',');
            const [materialRows] = await db.query(`
                SELECT 
                    io.project_id,
                    SUM(io.quantity * COALESCE(ii.unit_price, 0)) AS material_cost
                FROM inventory_out io
                LEFT JOIN inventory_in ii ON io.item_code = ii.item_code 
                    AND DATE(ii.receipt_date) <= DATE(io.issue_date)
                WHERE io.project_id IN (${placeholders})
                GROUP BY io.project_id
            `, projectIds);

            materialRows.forEach(row => {
                actualMaterialCosts[row.project_id] = parseFloat(row.material_cost) || 0;
            });
        }

        // Tính toán lợi nhuận
        const report = revenueRows.map(project => {
            const projectId = project.project_id;
            const revenue = parseFloat(project.total_revenue) || 0;
            const bomCost = bomCosts[projectId] || 0;
            const actualMaterialCost = actualMaterialCosts[projectId] || 0;
            const constructionCost = constructionCosts[projectId] || 0;
            const transportCost = transportCosts[projectId] || 0;

            // Sử dụng giá vốn thực tế nếu có, nếu không dùng BOM cost
            const materialCost = actualMaterialCost > 0 ? actualMaterialCost : bomCost;
            const totalCost = materialCost + constructionCost + transportCost;
            const profit = revenue - totalCost;
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

            return {
                project_id: projectId,
                project_name: project.project_name,
                project_code: project.project_code,
                quotation_count: project.quotation_count,
                revenue: revenue,
                costs: {
                    material_cost: materialCost,
                    construction_cost: constructionCost,
                    transport_cost: transportCost,
                    total_cost: totalCost
                },
                profit: profit,
                profit_margin: profitMargin
            };
        });

        // Tính tổng
        const totals = report.reduce((acc, item) => {
            acc.total_revenue += item.revenue;
            acc.total_material_cost += item.costs.material_cost;
            acc.total_construction_cost += item.costs.construction_cost;
            acc.total_transport_cost += item.costs.transport_cost;
            acc.total_cost += item.costs.total_cost;
            acc.total_profit += item.profit;
            return acc;
        }, {
            total_revenue: 0,
            total_material_cost: 0,
            total_construction_cost: 0,
            total_transport_cost: 0,
            total_cost: 0,
            total_profit: 0
        });

        totals.total_profit_margin = totals.total_revenue > 0 
            ? (totals.total_profit / totals.total_revenue) * 100 
            : 0;

        res.json({
            success: true,
            data: {
                projects: report,
                totals: totals,
                period: {
                    start_date: start_date || null,
                    end_date: end_date || null
                }
            }
        });
    } catch (err) {
        console.error('Error getting profit report:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy báo cáo lợi nhuận: " + err.message
        });
    }
};

/**
 * Báo cáo lợi nhuận theo dự án
 */
exports.getProjectProfit = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Lấy doanh thu
        const [revenueRows] = await db.query(`
            SELECT 
                SUM(total_amount) AS total_revenue,
                COUNT(*) AS quotation_count
            FROM quotations
            WHERE project_id = ? AND status = 'approved'
        `, [projectId]);

        const revenue = parseFloat(revenueRows[0]?.total_revenue) || 0;

        // Lấy giá vốn từ BOM
        const [bomRows] = await db.query(`
            SELECT 
                SUM(bi.quantity * COALESCE(i.unit_price, a.unit_price, 0)) AS bom_cost
            FROM bom_items bi
            INNER JOIN door_designs dd ON bi.design_id = dd.id
            LEFT JOIN inventory i ON bi.item_code = i.item_code
            LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id
            WHERE dd.project_id = ?
        `, [projectId]);

        const bomCost = parseFloat(bomRows[0]?.bom_cost) || 0;

        // Lấy giá vốn thực tế từ inventory_out
        const [materialRows] = await db.query(`
            SELECT 
                SUM(io.quantity * COALESCE(ii.unit_price, 0)) AS material_cost
            FROM inventory_out io
            LEFT JOIN inventory_in ii ON io.item_code = ii.item_code 
                AND DATE(ii.receipt_date) <= DATE(io.issue_date)
            WHERE io.project_id = ?
        `, [projectId]);

        const actualMaterialCost = parseFloat(materialRows[0]?.material_cost) || 0;

        // Lấy chi phí thi công và vận chuyển
        const [costRows] = await db.query(`
            SELECT 
                expense_type,
                SUM(amount) AS total_cost
            FROM financial_transactions
            WHERE project_id = ?
            AND transaction_type = 'expense'
            AND (expense_type = 'construction_cost' OR expense_type = 'transport_cost')
            GROUP BY expense_type
        `, [projectId]);

        let constructionCost = 0;
        let transportCost = 0;

        costRows.forEach(row => {
            if (row.expense_type === 'construction_cost') {
                constructionCost = parseFloat(row.total_cost) || 0;
            } else if (row.expense_type === 'transport_cost') {
                transportCost = parseFloat(row.total_cost) || 0;
            }
        });

        // Tính toán
        const materialCost = actualMaterialCost > 0 ? actualMaterialCost : bomCost;
        const totalCost = materialCost + constructionCost + transportCost;
        const profit = revenue - totalCost;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

        res.json({
            success: true,
            data: {
                project_id: parseInt(projectId),
                revenue: revenue,
                costs: {
                    material_cost: materialCost,
                    construction_cost: constructionCost,
                    transport_cost: transportCost,
                    total_cost: totalCost
                },
                profit: profit,
                profit_margin: profitMargin
            }
        });
    } catch (err) {
        console.error('Error getting project profit:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy lợi nhuận dự án: " + err.message
        });
    }
};




























