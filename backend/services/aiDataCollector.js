/**
 * =====================================================
 * AI DATA COLLECTOR
 * =====================================================
 * Truy vấn database để xây dựng context cho AI
 * ĐÃ FIX: Tất cả SQL queries khớp với schema thực tế
 * 
 * Schema thực tế:
 * - projects: project_code (ko phải order_code), total_value, customer_id (JOIN customers)
 * - customers: full_name (ko phải name)
 * - quotations: customer_id (JOIN customers), total_amount OK
 * - financial_transactions: transaction_type (ko phải type)
 * - accessories: category (string, ko JOIN)
 * - aluminum_systems: có unit_price, ko có warehouse_id
 * - material_requests: order_code OK
 */

const db = require('../config/db');

// Helper: safe query with error catching per-query
async function safeQuery(sql, params = []) {
    try {
        const [rows] = await db.query(sql, params);
        return rows;
    } catch (error) {
        console.warn('⚠️ SQL warning:', error.message, '| Query:', sql.substring(0, 80));
        return [];
    }
}

// Từ điển Mapping Hệ thống Trạng Thái Dữ Liệu
const VI_STATUS = {
    'active': 'Đang triển khai', 'in_progress': 'Đang triển khai', 'processing': 'Đang xử lý',
    'pending': 'Chờ xử lý', 'completed': 'Hoàn thành', 'done': 'Hoàn thành',
    'cancelled': 'Đã huỷ', 'new': 'Mới tạo', 'draft': 'Nháp',
    'in_production': 'Đang sản xuất', 'production': 'Sản xuất',
    'handover': 'Bàn giao', 'installation': 'Lắp đặt',
    'import': 'Nhập kho', 'export': 'Xuất kho', 'transfer': 'Chuyển kho',
    'posted': 'Đã duyệt', 'balanced': 'Đã cân bằng', 'paused': 'Tạm dừng',
    'income': 'Thu', 'expense': 'Chi', 'revenue': 'Doanh thu',
    'approved': 'Đã duyệt', 'rejected': 'Từ chối', 'sent': 'Đã gửi',
    'confirmed': 'Đã xác nhận', 'received': 'Đã nhận', 'shipped': 'Đã giao',
    'waiting_quotation': 'Chờ báo giá', 'quotation_approved': 'Đã chốt báo giá',
    'designing': 'Đang thiết kế', 'design': 'Đang thiết kế', 'boc_tach': 'Đang bóc tách'
};

function vn(status) {
    if (!status) return status;
    return VI_STATUS[String(status).toLowerCase()] || status;
}

// =====================================================
// 1. DASHBOARD CONTEXT
// =====================================================
async function getDashboardContext() {
    const context = {};

    try {
        // === DỰ ÁN ===
        const projectStats = await safeQuery(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('active','in_progress','processing','pending') THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status IN ('completed','done') THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN deadline IS NOT NULL AND deadline < CURDATE() AND status NOT IN ('completed','done','cancelled') THEN 1 ELSE 0 END) as overdue
            FROM projects
        `);
        context.projects = projectStats[0] || {};

        // Dự án gần đây (JOIN customers để lấy tên KH)
        context.recent_projects = await safeQuery(`
            SELECT p.project_name, p.project_code, p.status, p.deadline, 
                   p.total_value, c.full_name as customer_name
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            ORDER BY p.created_at DESC LIMIT 5
        `);

        // === KHO VẬT TƯ ===
        // Phụ kiện
        const accessoryStats = await safeQuery(`
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN stock_quantity <= 5 THEN 1 ELSE 0 END) as low_stock
            FROM accessories
        `);
        context.accessories = accessoryStats[0] || {};

        // Nhôm
        const aluminumStats = await safeQuery(`
            SELECT 
                COUNT(*) as total_items,
                SUM(quantity) as total_quantity,
                SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) as low_stock
            FROM aluminum_systems
        `);
        context.aluminum = aluminumStats[0] || {};

        // Kính / Inventory
        const inventoryStats = await safeQuery(`
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) as low_stock
            FROM inventory
        `);
        context.inventory = inventoryStats[0] || {};

        // === PHIẾU KHO (7 ngày gần đây) ===
        context.stock_docs_7days = await safeQuery(`
            SELECT 
                doc_type,
                COUNT(*) as count,
                COALESCE(SUM(total_value), 0) as total_value
            FROM stock_documents 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY doc_type
        `);

        // === TÀI CHÍNH (30 ngày) ===
        context.financial_30days = await safeQuery(`
            SELECT 
                transaction_type,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY transaction_type
        `);

        // === BÁO GIÁ ===
        const quotationStats = await safeQuery(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) as approved_value
            FROM quotations
        `);
        context.quotations = quotationStats[0] || {};

        // === YÊU CẦU VẬT TƯ ===
        const materialRequests = await safeQuery(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM material_requests
        `);
        context.material_requests = materialRequests[0] || {};

        context.generated_at = new Date().toISOString();

    } catch (error) {
        console.error('❌ aiDataCollector.getDashboardContext error:', error.message);
        context.error = error.message;
    }

    translateContextStatuses(context);
    return context;
}

// =====================================================
// 2. SEARCH
// =====================================================
async function executeSearch(parsedQuery) {
    const results = [];

    try {
        for (const table of (parsedQuery.tables || [])) {
            let query = '';
            let params = [];
            const keywords = (parsedQuery.keywords || []).join('%');
            const kw = `%${keywords}%`;

            switch (table) {
                case 'projects':
                    query = `SELECT p.id, p.project_name, p.project_code, p.status, p.deadline,
                             p.total_value, c.full_name as customer_name
                             FROM projects p
                             LEFT JOIN customers c ON p.customer_id = c.id
                             WHERE p.project_name LIKE ? OR p.project_code LIKE ? OR c.full_name LIKE ?
                             ORDER BY p.created_at DESC LIMIT 20`;
                    params = [kw, kw, kw];
                    break;

                case 'stock_documents':
                    query = `SELECT id, doc_no, doc_type, status, note, 
                             total_value, created_at
                             FROM stock_documents
                             WHERE doc_no LIKE ? OR note LIKE ?
                             ORDER BY created_at DESC LIMIT 20`;
                    params = [kw, kw];
                    break;

                case 'financial_transactions':
                    query = `SELECT id, transaction_type, amount, category, description, transaction_date
                             FROM financial_transactions
                             WHERE description LIKE ? OR category LIKE ?
                             ORDER BY transaction_date DESC LIMIT 20`;
                    params = [kw, kw];
                    break;

                case 'inventory':
                    query = `SELECT id, item_code, item_name, quantity, unit_price
                             FROM inventory
                             WHERE item_code LIKE ? OR item_name LIKE ?
                             ORDER BY item_name LIMIT 20`;
                    params = [kw, kw];
                    break;

                case 'accessories':
                    query = `SELECT id, code, name, stock_quantity, sale_price, category
                             FROM accessories
                             WHERE code LIKE ? OR name LIKE ?
                             ORDER BY name LIMIT 20`;
                    params = [kw, kw];
                    break;

                case 'aluminum_systems':
                    query = `SELECT id, code, name, quantity, unit_price, color
                             FROM aluminum_systems
                             WHERE code LIKE ? OR name LIKE ?
                             ORDER BY name LIMIT 20`;
                    params = [kw, kw];
                    break;

                case 'customers':
                    query = `SELECT id, full_name, phone, email, address
                             FROM customers
                             WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ?
                             ORDER BY full_name LIMIT 20`;
                    params = [kw, kw, kw];
                    break;

                case 'quotations':
                    query = `SELECT q.id, c.full_name as customer_name, q.status, 
                             q.total_amount, q.created_at
                             FROM quotations q
                             LEFT JOIN customers c ON q.customer_id = c.id
                             WHERE c.full_name LIKE ? OR q.quotation_code LIKE ?
                             ORDER BY q.created_at DESC LIMIT 20`;
                    params = [kw, kw];
                    break;

                case 'material_requests':
                    query = `SELECT id, order_code, category, status, project_name, created_at
                             FROM material_requests
                             WHERE order_code LIKE ? OR project_name LIKE ?
                             ORDER BY created_at DESC LIMIT 20`;
                    params = [kw, kw];
                    break;

                default:
                    continue;
            }

            const rows = await safeQuery(query, params);
            results.push({
                table,
                count: rows.length,
                data: rows
            });
        }
    } catch (error) {
        console.error('❌ aiDataCollector.executeSearch error:', error.message);
        results.push({ error: error.message });
    }

    translateContextStatuses(results);
    return results;
}

// =====================================================
// 3. CHAT CONTEXT
// =====================================================
async function getChatContext(message) {
    const context = {};
    const msgLower = message.toLowerCase();

    try {
        if (msgLower.includes('tồn kho') || msgLower.includes('kho') || msgLower.includes('vật tư') || msgLower.includes('nhôm') || msgLower.includes('kính') || msgLower.includes('phụ kiện')) {
            context.accessories_low = await safeQuery(`
                SELECT code, name, stock_quantity, sale_price FROM accessories 
                WHERE stock_quantity > 0 ORDER BY stock_quantity ASC LIMIT 10
            `);
            context.aluminum_low = await safeQuery(`
                SELECT code, name, quantity, color FROM aluminum_systems
                ORDER BY quantity ASC LIMIT 10
            `);
            context.inventory_low = await safeQuery(`
                SELECT item_code, item_name, quantity FROM inventory
                ORDER BY quantity ASC LIMIT 10
            `);
        }

        if (msgLower.includes('dự án') || msgLower.includes('project') || msgLower.includes('tiến độ') || msgLower.includes('deadline')) {
            context.active_projects = await safeQuery(`
                SELECT p.project_name, p.project_code, p.status, p.deadline, 
                       p.total_value, c.full_name as customer_name
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.status NOT IN ('completed','done','cancelled')
                ORDER BY p.deadline ASC LIMIT 10
            `);
        }

        if (msgLower.includes('tài chính') || msgLower.includes('doanh thu') || msgLower.includes('chi phí') || msgLower.includes('thu') || msgLower.includes('chi') || msgLower.includes('tiền')) {
            context.financial_summary = await safeQuery(`
                SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
                FROM financial_transactions
                WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY transaction_type
            `);
        }

        if (msgLower.includes('báo giá') || msgLower.includes('quotation')) {
            context.recent_quotations = await safeQuery(`
                SELECT q.id, c.full_name as customer_name, q.status, 
                       q.total_amount, q.created_at
                FROM quotations q
                LEFT JOIN customers c ON q.customer_id = c.id
                ORDER BY q.created_at DESC LIMIT 10
            `);
        }

        if (msgLower.includes('khách') || msgLower.includes('customer')) {
            context.recent_customers = await safeQuery(`
                SELECT full_name, phone, email, address FROM customers
                ORDER BY created_at DESC LIMIT 10
            `);
        }

        // Tìm mã code cụ thể (VR001, VRA-55...)
        const codeMatch = message.match(/[A-Z]{2,}[-\s]?\d+/gi);
        if (codeMatch) {
            for (const code of codeMatch.slice(0, 3)) {
                const cleanCode = code.trim();
                const accRows = await safeQuery('SELECT code, name, stock_quantity, sale_price FROM accessories WHERE code = ? LIMIT 1', [cleanCode]);
                if (accRows.length > 0) context[`item_${cleanCode}`] = { type: 'accessory', ...accRows[0] };

                const aluRows = await safeQuery('SELECT code, name, quantity, color FROM aluminum_systems WHERE code = ? LIMIT 1', [cleanCode]);
                if (aluRows.length > 0) context[`item_${cleanCode}`] = { type: 'aluminum', ...aluRows[0] };

                const invRows = await safeQuery('SELECT item_code, item_name, quantity FROM inventory WHERE item_code = ? LIMIT 1', [cleanCode]);
                if (invRows.length > 0) context[`item_${cleanCode}`] = { type: 'inventory', ...invRows[0] };
            }
        }

    } catch (error) {
        console.error('❌ aiDataCollector.getChatContext error:', error.message);
        context.error = error.message;
    }

    translateContextStatuses(context);
    return context;
}

// =====================================================
// 4. REPORT DATA (Category-aware + Filters)
// =====================================================

/**
 * Build SQL date condition from timeRange
 */
function buildDateFilter(filters = {}) {
    const tr = filters.timeRange || 'week';
    switch (tr) {
        case 'today': return 'CURDATE()';
        case 'week':  return 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        case 'month': return 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        case 'quarter': return 'DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
        case 'custom':
            // custom dates handled via params
            return null;
        default: return 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    }
}

async function getReportData(type = 'daily', filters = {}) {
    const data = {};
    const category = filters.category || 'overview';

    try {
        // Date filter
        const dateSql = buildDateFilter(filters);
        const dateFrom = filters.date_from || null;
        const dateTo = filters.date_to || null;

        // Build reusable date WHERE fragment
        function dateWhere(column) {
            if (dateSql) return `${column} >= ${dateSql}`;
            if (dateFrom && dateTo) return `${column} >= ? AND ${column} <= ?`;
            if (dateFrom) return `${column} >= ?`;
            if (dateTo) return `${column} <= ?`;
            return `${column} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
        }
        function dateParams() {
            const p = [];
            if (!dateSql) {
                if (dateFrom) p.push(dateFrom);
                if (dateTo) p.push(dateTo);
            }
            return p;
        }

        // ============================================
        // PROJECTS — cho overview, projects, customers
        // ============================================
        if (['overview', 'projects', 'customers', 'hr'].includes(category)) {
            let projectWhere = [dateWhere('p.updated_at')];
            let projectParams = [...dateParams()];

            if (filters.project_id) {
                projectWhere.push('p.id = ?');
                projectParams.push(filters.project_id);
            }
            if (filters.customer_id) {
                projectWhere.push('p.customer_id = ?');
                projectParams.push(filters.customer_id);
            }
            if (filters.status) {
                projectWhere.push('p.status = ?');
                projectParams.push(filters.status);
            }
            if (filters.branch_id) {
                projectWhere.push('p.agency_id = ?');
                projectParams.push(filters.branch_id);
            }

            const whereClause = projectWhere.length > 0 ? 'WHERE ' + projectWhere.join(' AND ') : '';

            data.projects_updated = await safeQuery(`
                SELECT p.project_name, p.project_code, p.status, p.deadline, 
                       p.total_value, p.updated_at, c.full_name as customer_name,
                       p.workforce
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                ${whereClause}
                ORDER BY p.updated_at DESC LIMIT 30
            `, projectParams);

            // Project stats
            data.project_stats = await safeQuery(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN p.status IN ('active','in_progress','processing','pending') THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN p.status IN ('completed','done') THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN p.deadline IS NOT NULL AND p.deadline < CURDATE() AND p.status NOT IN ('completed','done','cancelled') THEN 1 ELSE 0 END) as overdue,
                    COALESCE(SUM(p.total_value), 0) as total_value
                FROM projects p
                ${whereClause}
            `, projectParams);
        }

        // ============================================
        // STOCK / INVENTORY — cho overview, inventory
        // ============================================
        if (['overview', 'inventory'].includes(category)) {
            let stockWhere = [dateWhere('created_at')];
            let stockParams = [...dateParams()];

            if (filters.branch_id) {
                stockWhere.push('warehouse_id = ?');
                stockParams.push(filters.branch_id);
            }

            data.stock_documents = await safeQuery(`
                SELECT doc_no, doc_type, status, total_value, note, created_at
                FROM stock_documents
                WHERE ${stockWhere.join(' AND ')}
                ORDER BY created_at DESC LIMIT 30
            `, stockParams);

            // Stock summary by type
            data.stock_summary = await safeQuery(`
                SELECT doc_type, COUNT(*) as count, COALESCE(SUM(total_value), 0) as total_value
                FROM stock_documents
                WHERE ${stockWhere.join(' AND ')}
                GROUP BY doc_type
            `, stockParams);

            // Low stock items (always relevant for inventory)
            data.low_stock_items = await safeQuery(`
                (SELECT 'accessory' as item_type, code, name, stock_quantity as qty FROM accessories WHERE stock_quantity <= 5 LIMIT 15)
                UNION ALL
                (SELECT 'aluminum' as item_type, code, name, quantity as qty FROM aluminum_systems WHERE quantity <= 5 LIMIT 15)
                UNION ALL
                (SELECT 'inventory' as item_type, item_code as code, item_name as name, quantity as qty FROM inventory WHERE quantity <= 5 LIMIT 15)
            `);

            // Inventory totals
            data.inventory_totals = {
                accessories: (await safeQuery('SELECT COUNT(*) as total, SUM(CASE WHEN stock_quantity <= 5 THEN 1 ELSE 0 END) as low FROM accessories'))[0] || {},
                aluminum: (await safeQuery('SELECT COUNT(*) as total, SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) as low FROM aluminum_systems'))[0] || {},
                glass: (await safeQuery('SELECT COUNT(*) as total, SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) as low FROM inventory'))[0] || {}
            };
        }

        // ============================================
        // FINANCE — cho overview, finance
        // ============================================
        if (['overview', 'finance'].includes(category)) {
            let finWhere = [dateWhere('transaction_date')];
            let finParams = [...dateParams()];

            if (filters.project_id) {
                finWhere.push('project_id = ?');
                finParams.push(filters.project_id);
            }
            if (filters.branch_id) {
                finWhere.push('agency_id = ?');
                finParams.push(filters.branch_id);
            }

            data.financial_summary = await safeQuery(`
                SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
                FROM financial_transactions
                WHERE ${finWhere.join(' AND ')}
                GROUP BY transaction_type
            `, finParams);

            data.financial_detail = await safeQuery(`
                SELECT transaction_type, category, SUM(amount) as total, COUNT(*) as count
                FROM financial_transactions
                WHERE ${finWhere.join(' AND ')}
                GROUP BY transaction_type, category
                ORDER BY total DESC
                LIMIT 20
            `, finParams);

            // Recent transactions
            data.recent_transactions = await safeQuery(`
                SELECT transaction_type, amount, category, description, transaction_date
                FROM financial_transactions
                WHERE ${finWhere.join(' AND ')}
                ORDER BY transaction_date DESC
                LIMIT 15
            `, finParams);
        }

        // ============================================
        // CUSTOMERS — cho customers
        // ============================================
        if (category === 'customers') {
            let custWhere = [];
            let custParams = [];

            if (filters.customer_id) {
                custWhere.push('c.id = ?');
                custParams.push(filters.customer_id);
            }

            const custWhereClause = custWhere.length > 0 ? 'WHERE ' + custWhere.join(' AND ') : '';

            data.customers = await safeQuery(`
                SELECT c.id, c.full_name, c.phone, c.email, c.address,
                       COUNT(p.id) as project_count,
                       COALESCE(SUM(p.total_value), 0) as total_project_value,
                       MAX(p.created_at) as last_project_date
                FROM customers c
                LEFT JOIN projects p ON c.id = p.customer_id
                ${custWhereClause}
                GROUP BY c.id, c.full_name, c.phone, c.email, c.address
                ORDER BY total_project_value DESC
                LIMIT 30
            `, custParams);

            // Top customers by revenue
            data.top_customers = await safeQuery(`
                SELECT c.full_name, COUNT(p.id) as projects, 
                       COALESCE(SUM(p.total_value), 0) as revenue
                FROM customers c
                INNER JOIN projects p ON c.id = p.customer_id
                GROUP BY c.id, c.full_name
                ORDER BY revenue DESC
                LIMIT 10
            `);
        }

        // ============================================
        // HR — cho hr (Nhân sự & Năng suất)
        // ============================================
        if (category === 'hr') {
            // Workforce from projects
            data.workforce_summary = await safeQuery(`
                SELECT p.project_name, p.project_code, p.workforce, p.status,
                       c.full_name as customer_name
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.workforce IS NOT NULL AND p.workforce != ''
                ORDER BY p.updated_at DESC
                LIMIT 20
            `);

            // Project count by status (productivity indicator)
            data.productivity = await safeQuery(`
                SELECT status, COUNT(*) as count
                FROM projects
                GROUP BY status
            `);
        }

        // Metadata
        data.report_type = type;
        data.category = category;
        data.filters_applied = {
            category,
            timeRange: filters.timeRange || 'week',
            project_id: filters.project_id || null,
            customer_id: filters.customer_id || null,
            branch_id: filters.branch_id || null,
            status: filters.status || null,
            format: filters.format || 'detailed'
        };
        data.generated_at = new Date().toISOString();

    } catch (error) {
        console.error('❌ aiDataCollector.getReportData error:', error.message);
        data.error = error.message;
    }

    translateContextStatuses(data);
    return data;
}

// =====================================================
// HELPER: Auto-translate all status strings
// =====================================================
function translateContextStatuses(obj) {
    if (obj == null || typeof obj !== 'object') return;
    for (const key in obj) {
        if (key === 'status') {
            obj[key] = vn(obj[key]);
        } else if (typeof obj[key] === 'object') {
            translateContextStatuses(obj[key]);
        }
    }
}

module.exports = {
    getDashboardContext,
    executeSearch,
    getChatContext,
    getReportData
};
