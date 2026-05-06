/**
 * =====================================================
 * AI BRAIN — DATA TOOLS (Layer 4)
 * =====================================================
 * Các hàm truy vấn dữ liệu an toàn mà AI có thể "gọi".
 * Mỗi tool có: description, parameters, execute().
 * 
 * AI KHÔNG BAO GIỜ chạy SQL trực tiếp.
 * AI chỉ gọi tool → tool chạy SQL an toàn → trả kết quả.
 *
 * @author ViralWindow AI Brain
 */

const db = require('../config/db');

// Helper: safe query with error catching
async function safeQuery(sql, params = []) {
    try {
        const [rows] = await db.query(sql, params);
        return rows;
    } catch (error) {
        console.warn('⚠️ DataTool SQL warning:', error.message, '| Query:', sql.substring(0, 80));
        return [];
    }
}

// =====================================================
// TOOL DEFINITIONS
// =====================================================
const DATA_TOOLS = {

    // ==========================================
    // 1. DỰ ÁN (Projects)
    // ==========================================
    getProjectStats: {
        description: 'Lấy thống kê tổng quan dự án: tổng số, đang làm, hoàn thành, quá hạn, tổng giá trị',
        parameters: {
            status: { type: 'string', required: false, description: 'Lọc theo trạng thái: pending, active, in_progress, completed, cancelled' },
            customer_id: { type: 'number', required: false, description: 'Lọc theo ID khách hàng' },
            agency_id: { type: 'number', required: false, description: 'Lọc theo ID chi nhánh' }
        },
        execute: async (params = {}) => {
            let where = [];
            let values = [];
            if (params.status) { where.push('status = ?'); values.push(params.status); }
            if (params.customer_id) { where.push('customer_id = ?'); values.push(params.customer_id); }
            if (params.agency_id) { where.push('agency_id = ?'); values.push(params.agency_id); }
            const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

            return await safeQuery(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status IN ('active','in_progress','processing','pending') THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status IN ('completed','done') THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN deadline IS NOT NULL AND deadline < CURDATE() AND status NOT IN ('completed','done','cancelled') THEN 1 ELSE 0 END) as overdue,
                    COALESCE(SUM(total_value), 0) as total_value
                FROM projects ${whereClause}
            `, values);
        }
    },

    getProjectList: {
        description: 'Lấy danh sách dự án gần đây với thông tin khách hàng',
        parameters: {
            status: { type: 'string', required: false, description: 'Lọc trạng thái' },
            customer_id: { type: 'number', required: false },
            limit: { type: 'number', required: false, default: 5, description: 'Số lượng dự án trả về' }
        },
        execute: async (params = {}) => {
            let where = [];
            let values = [];
            if (params.status) { where.push('p.status = ?'); values.push(params.status); }
            if (params.customer_id) { where.push('p.customer_id = ?'); values.push(params.customer_id); }
            const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
            const limit = params.limit || 15;

            return await safeQuery(`
                SELECT p.id, p.project_name, p.project_code, p.status, p.deadline, 
                       p.total_value, p.workforce, c.full_name as customer_name
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                ${whereClause}
                ORDER BY p.updated_at DESC LIMIT 5
            `, [...values]);
        }
    },

    getOverdueProjects: {
        description: 'Lấy danh sách dự án quá hạn (deadline đã qua nhưng chưa hoàn thành)',
        parameters: {},
        execute: async () => {
            return await safeQuery(`
                SELECT p.project_name, p.project_code, p.status, p.deadline, 
                       p.total_value, c.full_name as customer_name,
                       DATEDIFF(CURDATE(), p.deadline) as days_overdue
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.deadline IS NOT NULL AND p.deadline < CURDATE() 
                  AND p.status NOT IN ('completed','done','cancelled')
                ORDER BY p.deadline ASC LIMIT 5
            `);
        }
    },

    // ==========================================
    // 2. KHO VẬT TƯ (Inventory)
    // ==========================================
    getInventoryAlerts: {
        description: 'Lấy danh sách vật tư sắp hết hàng (tồn kho <= ngưỡng cảnh báo)',
        parameters: {
            threshold: { type: 'number', required: false, default: 5, description: 'Ngưỡng cảnh báo (mặc định: 5)' },
            item_type: { type: 'string', required: false, description: 'Loại: accessory, aluminum, glass/inventory (mặc định: tất cả)' }
        },
        execute: async (params = {}) => {
            const threshold = params.threshold || 5;
            const queries = [];

            if (!params.item_type || params.item_type === 'accessory') {
                queries.push(safeQuery(
                    `SELECT 'Phụ kiện' as loai, code as ma, name as ten, stock_quantity as ton_kho, sale_price as gia
                     FROM accessories WHERE stock_quantity <= ? ORDER BY stock_quantity ASC LIMIT 5`, [threshold]
                ));
            }
            if (!params.item_type || params.item_type === 'aluminum') {
                queries.push(safeQuery(
                    `SELECT 'Nhôm' as loai, code as ma, name as ten, quantity as ton_kho, unit_price as gia
                     FROM aluminum_systems WHERE quantity <= ? ORDER BY quantity ASC LIMIT 5`, [threshold]
                ));
            }
            if (!params.item_type || params.item_type === 'glass' || params.item_type === 'inventory') {
                queries.push(safeQuery(
                    `SELECT 'Kính/Khác' as loai, item_code as ma, item_name as ten, quantity as ton_kho, unit_price as gia
                     FROM inventory WHERE quantity <= ? ORDER BY quantity ASC LIMIT 5`, [threshold]
                ));
            }

            const results = await Promise.all(queries);
            return results.flat();
        }
    },

    getInventoryTotals: {
        description: 'Lấy tổng quan kho: tổng số mặt hàng, số hàng sắp hết, tổng giá trị',
        parameters: {},
        execute: async () => {
            const [accessories, aluminum, glass] = await Promise.all([
                safeQuery('SELECT COUNT(*) as total, SUM(CASE WHEN stock_quantity <= 5 THEN 1 ELSE 0 END) as low_stock, COALESCE(SUM(stock_quantity * sale_price), 0) as total_value FROM accessories'),
                safeQuery('SELECT COUNT(*) as total, SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) as low_stock, COALESCE(SUM(quantity * unit_price), 0) as total_value FROM aluminum_systems'),
                safeQuery('SELECT COUNT(*) as total, SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) as low_stock, COALESCE(SUM(quantity * unit_price), 0) as total_value FROM inventory')
            ]);
            return {
                phu_kien: accessories[0] || {},
                nhom: aluminum[0] || {},
                kinh_vattu_khac: glass[0] || {}
            };
        }
    },

    searchInventoryItem: {
        description: 'Tìm kiếm vật tư theo mã hoặc tên trong tất cả kho (phụ kiện, nhôm, kính)',
        parameters: {
            keyword: { type: 'string', required: true, description: 'Mã hoặc tên vật tư cần tìm' }
        },
        execute: async (params = {}) => {
            const kw = `%${params.keyword}%`;
            const [accessories, aluminum, inventory] = await Promise.all([
                safeQuery(`SELECT 'Phụ kiện' as loai, code as ma, name as ten, stock_quantity as ton_kho, sale_price as gia, category as danh_muc
                           FROM accessories WHERE code LIKE ? OR name LIKE ? LIMIT 5`, [kw, kw]),
                safeQuery(`SELECT 'Nhôm' as loai, code as ma, name as ten, quantity as ton_kho, unit_price as gia, color as mau
                           FROM aluminum_systems WHERE code LIKE ? OR name LIKE ? LIMIT 5`, [kw, kw]),
                safeQuery(`SELECT 'Kính/Khác' as loai, item_code as ma, item_name as ten, quantity as ton_kho, unit_price as gia
                           FROM inventory WHERE item_code LIKE ? OR item_name LIKE ? LIMIT 5`, [kw, kw])
            ]);
            return [...accessories, ...aluminum, ...inventory];
        }
    },

    // ==========================================
    // 3. TÀI CHÍNH (Finance)
    // ==========================================
    getFinancialSummary: {
        description: 'Tổng hợp thu chi theo khoảng thời gian: doanh thu, chi phí, lãi lỗ',
        parameters: {
            days: { type: 'number', required: false, default: 30, description: 'Số ngày gần đây (mặc định: 30)' },
            project_id: { type: 'number', required: false, description: 'Lọc theo ID dự án' }
        },
        execute: async (params = {}) => {
            const days = params.days || 30;
            let where = [`transaction_date >= DATE_SUB(CURDATE(), INTERVAL ${parseInt(days)} DAY)`];
            let values = [];
            if (params.project_id) { where.push('project_id = ?'); values.push(params.project_id); }

            const summary = await safeQuery(`
                SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
                FROM financial_transactions
                WHERE ${where.join(' AND ')}
                GROUP BY transaction_type
            `, values);

            const byCategory = await safeQuery(`
                SELECT transaction_type, category, SUM(amount) as total, COUNT(*) as count
                FROM financial_transactions
                WHERE ${where.join(' AND ')}
                GROUP BY transaction_type, category
                ORDER BY total DESC LIMIT 5
            `, values);

            const income = summary.find(s => s.transaction_type === 'income');
            const expense = summary.find(s => s.transaction_type === 'expense');

            return {
                doanh_thu: income ? income.total : 0,
                chi_phi: expense ? expense.total : 0,
                loi_nhuan: (income ? income.total : 0) - (expense ? expense.total : 0),
                so_giao_dich: summary.reduce((sum, s) => sum + s.count, 0),
                chi_tiet_theo_danh_muc: byCategory
            };
        }
    },

    getRecentTransactions: {
        description: 'Lấy các giao dịch tài chính gần đây nhất',
        parameters: {
            limit: { type: 'number', required: false, default: 5 },
            type: { type: 'string', required: false, description: 'income hoặc expense' }
        },
        execute: async (params = {}) => {
            let where = [];
            let values = [];
            if (params.type) { where.push('transaction_type = ?'); values.push(params.type); }
            const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

            return await safeQuery(`
                SELECT transaction_type as loai, amount as so_tien, category as danh_muc, 
                       description as mo_ta, transaction_date as ngay
                FROM financial_transactions
                ${whereClause}
                ORDER BY transaction_date DESC LIMIT 5
            `, [...values]);
        }
    },

    // ==========================================
    // 4. KHÁCH HÀNG (Customers)
    // ==========================================
    getCustomerRanking: {
        description: 'Xếp hạng khách hàng theo doanh thu và số lượng dự án',
        parameters: {
            limit: { type: 'number', required: false, default: 10 }
        },
        execute: async (params = {}) => {
            const limit = params.limit || 10;
            return await safeQuery(`
                SELECT c.id, c.full_name as ten_kh, c.phone as sdt, c.email,
                       COUNT(p.id) as so_du_an,
                       COALESCE(SUM(p.total_value), 0) as tong_gia_tri,
                       MAX(p.created_at) as du_an_gan_nhat
                FROM customers c
                LEFT JOIN projects p ON c.id = p.customer_id
                GROUP BY c.id, c.full_name, c.phone, c.email
                ORDER BY tong_gia_tri DESC
                LIMIT 5
            `);
        }
    },

    searchCustomer: {
        description: 'Tìm kiếm khách hàng theo tên, số điện thoại hoặc email',
        parameters: {
            keyword: { type: 'string', required: true, description: 'Từ khóa tìm kiếm' }
        },
        execute: async (params = {}) => {
            const kw = `%${params.keyword}%`;
            return await safeQuery(`
                SELECT c.id, c.full_name as ten_kh, c.phone as sdt, c.email, c.address as dia_chi,
                       COUNT(p.id) as so_du_an, COALESCE(SUM(p.total_value), 0) as tong_gia_tri
                FROM customers c
                LEFT JOIN projects p ON c.id = p.customer_id
                WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
                GROUP BY c.id, c.full_name, c.phone, c.email, c.address
                LIMIT 10
            `, [kw, kw, kw]);
        }
    },

    // ==========================================
    // 5. BÁO GIÁ (Quotations)
    // ==========================================
    getQuotationPipeline: {
        description: 'Tình hình pipeline báo giá: đang chờ, đã duyệt, bị từ chối',
        parameters: {},
        execute: async () => {
            const stats = await safeQuery(`
                SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_value
                FROM quotations
                GROUP BY status
            `);
            const recent = await safeQuery(`
                SELECT q.id, q.quotation_code as ma, c.full_name as khach_hang, 
                       q.status, q.total_amount as gia_tri, q.created_at as ngay_tao
                FROM quotations q
                LEFT JOIN customers c ON q.customer_id = c.id
                ORDER BY q.created_at DESC LIMIT 10
            `);
            return { thong_ke: stats, bao_gia_gan_day: recent };
        }
    },

    // ==========================================
    // 6. PHIẾU KHO (Stock Documents)
    // ==========================================
    getStockActivity: {
        description: 'Hoạt động nhập xuất kho trong khoảng thời gian gần đây',
        parameters: {
            days: { type: 'number', required: false, default: 7, description: 'Số ngày gần đây' },
            doc_type: { type: 'string', required: false, description: 'import hoặc export' }
        },
        execute: async (params = {}) => {
            const days = params.days || 7;
            let where = [`created_at >= DATE_SUB(CURDATE(), INTERVAL ${parseInt(days)} DAY)`];
            let values = [];
            if (params.doc_type) { where.push('doc_type = ?'); values.push(params.doc_type); }

            const summary = await safeQuery(`
                SELECT doc_type as loai, COUNT(*) as so_phieu, COALESCE(SUM(total_value), 0) as tong_gia_tri
                FROM stock_documents
                WHERE ${where.join(' AND ')}
                GROUP BY doc_type
            `, values);

            const recent = await safeQuery(`
                SELECT doc_no as so_phieu, doc_type as loai, status as trang_thai, 
                       total_value as gia_tri, note as ghi_chu, created_at as ngay
                FROM stock_documents
                WHERE ${where.join(' AND ')}
                ORDER BY created_at DESC LIMIT 5
            `, values);

            return { tong_hop: summary, phieu_gan_day: recent };
        }
    },

    // ==========================================
    // 7. TOP VẬT TƯ (Inventory Rankings)
    // ==========================================
    getTopInventoryItems: {
        description: 'Lấy TOP vật tư theo số lượng tồn kho (nhiều nhất/ít nhất) hoặc giá trị cao nhất',
        parameters: {
            sort: { type: 'string', required: false, default: 'most', description: 'most = nhiều nhất, least = ít nhất, value = giá trị cao nhất' },
            item_type: { type: 'string', required: false, description: 'accessory, aluminum, glass' },
            limit: { type: 'number', required: false, default: 10 }
        },
        execute: async (params = {}) => {
            const limit = params.limit || 10;
            const sort = params.sort || 'most';
            const queries = [];

            const orderBy = sort === 'value' ? 'gia_tri DESC' : sort === 'least' ? 'ton_kho ASC' : 'ton_kho DESC';

            if (!params.item_type || params.item_type === 'accessory') {
                queries.push(safeQuery(`SELECT 'Phụ kiện' as loai, code as ma, name as ten, stock_quantity as ton_kho, 
                    sale_price as gia, (stock_quantity * sale_price) as gia_tri, category as danh_muc
                    FROM accessories WHERE stock_quantity > 0 ORDER BY ${orderBy} LIMIT ?`, [limit]));
            }
            if (!params.item_type || params.item_type === 'aluminum') {
                queries.push(safeQuery(`SELECT 'Nhôm' as loai, code as ma, name as ten, quantity as ton_kho, 
                    unit_price as gia, (quantity * unit_price) as gia_tri, color as mau
                    FROM aluminum_systems WHERE quantity > 0 ORDER BY ${orderBy} LIMIT ?`, [limit]));
            }
            if (!params.item_type || params.item_type === 'glass') {
                queries.push(safeQuery(`SELECT 'Kính/Khác' as loai, item_code as ma, item_name as ten, quantity as ton_kho, 
                    unit_price as gia, (quantity * unit_price) as gia_tri
                    FROM inventory WHERE quantity > 0 ORDER BY ${orderBy} LIMIT ?`, [limit]));
            }

            const results = await Promise.all(queries);
            const all = results.flat();
            // Sắp xếp lại tổng hợp
            if (sort === 'value') return all.sort((a, b) => (b.gia_tri || 0) - (a.gia_tri || 0)).slice(0, limit);
            if (sort === 'least') return all.sort((a, b) => (a.ton_kho || 0) - (b.ton_kho || 0)).slice(0, limit);
            return all.sort((a, b) => (b.ton_kho || 0) - (a.ton_kho || 0)).slice(0, limit);
        }
    },

    // ==========================================
    // 8. DỰ ÁN THEO GIÁ TRỊ
    // ==========================================
    getProjectByValue: {
        description: 'Lấy dự án theo giá trị (cao nhất, thấp nhất) hoặc theo chi nhánh',
        parameters: {
            sort: { type: 'string', required: false, default: 'highest', description: 'highest hoặc lowest' },
            status: { type: 'string', required: false },
            limit: { type: 'number', required: false, default: 10 }
        },
        execute: async (params = {}) => {
            const limit = params.limit || 10;
            const order = params.sort === 'lowest' ? 'ASC' : 'DESC';
            let where = ['p.total_value > 0'];
            let values = [];
            if (params.status) { where.push('p.status = ?'); values.push(params.status); }

            return await safeQuery(`
                SELECT p.id, p.project_name, p.project_code, p.status, p.total_value,
                       p.deadline, p.workforce, c.full_name as khach_hang, p.created_at
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE ${where.join(' AND ')}
                ORDER BY p.total_value ${order} LIMIT ?
            `, [...values, limit]);
        }
    },

    // ==========================================
    // 9. CHI TIẾT BÁO GIÁ
    // ==========================================
    getQuotationDetail: {
        description: 'Tìm báo giá theo mã hoặc khách hàng, kèm chi tiết sản phẩm',
        parameters: {
            keyword: { type: 'string', required: false, description: 'Mã báo giá hoặc tên khách hàng' },
            status: { type: 'string', required: false }
        },
        execute: async (params = {}) => {
            let where = [];
            let values = [];
            if (params.keyword) {
                const kw = `%${params.keyword}%`;
                where.push('(q.quotation_code LIKE ? OR c.full_name LIKE ?)');
                values.push(kw, kw);
            }
            if (params.status) { where.push('q.status = ?'); values.push(params.status); }
            const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

            return await safeQuery(`
                SELECT q.id, q.quotation_code as ma_bao_gia, q.status, 
                       q.total_amount as tong_tien, c.full_name as khach_hang,
                       q.notes as ghi_chu, q.created_at as ngay_tao, q.valid_until as hieu_luc
                FROM quotations q
                LEFT JOIN customers c ON q.customer_id = c.id
                ${whereClause}
                ORDER BY q.created_at DESC LIMIT 10
            `, values);
        }
    },

    // ==========================================
    // 10. SO SÁNH TÀI CHÍNH
    // ==========================================
    getFinancialComparison: {
        description: 'So sánh thu chi giữa 2 khoảng thời gian (tháng này vs tháng trước, tuần này vs tuần trước)',
        parameters: {
            period: { type: 'string', required: false, default: 'month', description: 'month hoặc week' }
        },
        execute: async (params = {}) => {
            const period = params.period || 'month';
            const interval = period === 'week' ? 7 : 30;

            const [current, previous] = await Promise.all([
                safeQuery(`SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
                    FROM financial_transactions 
                    WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL ${interval} DAY)
                    GROUP BY transaction_type`),
                safeQuery(`SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
                    FROM financial_transactions 
                    WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL ${interval * 2} DAY)
                      AND transaction_date < DATE_SUB(CURDATE(), INTERVAL ${interval} DAY)
                    GROUP BY transaction_type`)
            ]);

            const getVal = (arr, type) => (arr.find(r => r.transaction_type === type) || { total: 0, count: 0 });
            const curIncome = getVal(current, 'income');
            const curExpense = getVal(current, 'expense');
            const prevIncome = getVal(previous, 'income');
            const prevExpense = getVal(previous, 'expense');

            return {
                ky_hien_tai: { doanh_thu: curIncome.total, chi_phi: curExpense.total, loi_nhuan: curIncome.total - curExpense.total, so_giao_dich: curIncome.count + curExpense.count },
                ky_truoc: { doanh_thu: prevIncome.total, chi_phi: prevExpense.total, loi_nhuan: prevIncome.total - prevExpense.total, so_giao_dich: prevIncome.count + prevExpense.count },
                tang_truong_doanh_thu: prevIncome.total > 0 ? (((curIncome.total - prevIncome.total) / prevIncome.total) * 100).toFixed(1) + '%' : 'N/A',
                loai_so_sanh: period === 'week' ? 'Tuần' : 'Tháng'
            };
        }
    },

    // ==========================================
    // 11. CHI TIẾT DỰ ÁN
    // ==========================================
    getProjectDetail: {
        description: 'Xem chi tiết 1 dự án cụ thể theo tên hoặc mã (bao gồm khách hàng, giá trị, báo giá liên quan)',
        parameters: {
            keyword: { type: 'string', required: true, description: 'Tên hoặc mã dự án' }
        },
        execute: async (params = {}) => {
            const kw = `%${params.keyword}%`;
            const project = await safeQuery(`
                SELECT p.*, c.full_name as khach_hang, c.phone as sdt_kh, c.email as email_kh
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.project_name LIKE ? OR p.project_code LIKE ?
                ORDER BY p.updated_at DESC LIMIT 3
            `, [kw, kw]);

            if (project.length > 0) {
                const pid = project[0].id;
                const quotations = await safeQuery(`
                    SELECT quotation_code as ma, status, total_amount as tong_tien, created_at
                    FROM quotations WHERE project_id = ? ORDER BY created_at DESC LIMIT 5
                `, [pid]);
                return { du_an: project, bao_gia_lien_quan: quotations };
            }
            return { du_an: project, bao_gia_lien_quan: [] };
        }
    },

    // ==========================================
    // 12. YÊU CẦU VẬT TƯ THEO DỰ ÁN
    // ==========================================
    getMaterialRequestsByProject: {
        description: 'Lấy danh sách yêu cầu vật tư theo dự án hoặc trạng thái',
        parameters: {
            project_keyword: { type: 'string', required: false },
            status: { type: 'string', required: false }
        },
        execute: async (params = {}) => {
            let where = [];
            let values = [];
            if (params.project_keyword) {
                const kw = `%${params.project_keyword}%`;
                where.push('(p.project_name LIKE ? OR p.project_code LIKE ?)');
                values.push(kw, kw);
            }
            if (params.status) { where.push('mr.status = ?'); values.push(params.status); }
            const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

            return await safeQuery(`
                SELECT mr.id, mr.request_code as ma_phieu, mr.status as trang_thai,
                       p.project_name as du_an, mr.total_items as so_vat_tu,
                       mr.notes as ghi_chu, mr.created_at as ngay_tao
                FROM material_requests mr
                LEFT JOIN projects p ON mr.project_id = p.id
                ${whereClause}
                ORDER BY mr.created_at DESC LIMIT 10
            `, values);
        }
    },

    // ==========================================
    // 13. TỒN KHO THEO DANH MỤC
    // ==========================================
    getInventoryByCategory: {
        description: 'Lấy danh sách chi tiết vật tư theo loại (phụ kiện/nhôm/kính) với sắp xếp linh hoạt',
        parameters: {
            item_type: { type: 'string', required: true, description: 'accessory, aluminum, glass' },
            sort_by: { type: 'string', required: false, default: 'quantity', description: 'quantity, price, value, name' },
            limit: { type: 'number', required: false, default: 15 }
        },
        execute: async (params = {}) => {
            const limit = params.limit || 15;
            const sortMap = { quantity: 'ton_kho DESC', price: 'gia DESC', value: '(ton_kho * gia) DESC', name: 'ten ASC' };
            const orderBy = sortMap[params.sort_by] || 'ton_kho DESC';

            if (params.item_type === 'accessory') {
                return await safeQuery(`SELECT code as ma, name as ten, stock_quantity as ton_kho, sale_price as gia, 
                    (stock_quantity * sale_price) as gia_tri, category as danh_muc
                    FROM accessories ORDER BY ${orderBy} LIMIT ?`, [limit]);
            }
            if (params.item_type === 'aluminum') {
                return await safeQuery(`SELECT code as ma, name as ten, quantity as ton_kho, unit_price as gia, 
                    (quantity * unit_price) as gia_tri, color as mau, system_type as he
                    FROM aluminum_systems ORDER BY ${orderBy} LIMIT ?`, [limit]);
            }
            return await safeQuery(`SELECT item_code as ma, item_name as ten, quantity as ton_kho, unit_price as gia, 
                (quantity * unit_price) as gia_tri, category as danh_muc
                FROM inventory ORDER BY ${orderBy} LIMIT ?`, [limit]);
        }
    },

    // ==========================================
    // 14. TIMELINE DỰ ÁN
    // ==========================================
    getProjectTimeline: {
        description: 'Thống kê dự án theo thời gian: bao nhiêu dự án tạo mới, hoàn thành trong tháng/tuần',
        parameters: {
            period: { type: 'string', required: false, default: 'month', description: 'month hoặc week' }
        },
        execute: async (params = {}) => {
            const days = params.period === 'week' ? 7 : 30;
            return await safeQuery(`
                SELECT 
                    COUNT(*) as tong,
                    SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) THEN 1 ELSE 0 END) as moi_tao,
                    SUM(CASE WHEN status IN ('completed','done') AND updated_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) THEN 1 ELSE 0 END) as hoan_thanh,
                    SUM(CASE WHEN status IN ('active','in_progress','processing') THEN 1 ELSE 0 END) as dang_lam,
                    SUM(CASE WHEN deadline IS NOT NULL AND deadline < CURDATE() AND status NOT IN ('completed','done','cancelled') THEN 1 ELSE 0 END) as qua_han
                FROM projects
            `);
        }
    }
};

// =====================================================
// TOOL EXECUTION ENGINE
// =====================================================

/**
 * Lấy danh sách tool descriptions cho AI prompt
 * @returns {string}
 */
function getToolDescriptions() {
    let desc = '🔧 CÔNG CỤ TRUY VẤN DỮ LIỆU (Data Tools):\n';
    desc += 'Bạn có thể yêu cầu sử dụng các công cụ sau để lấy dữ liệu chính xác từ database:\n\n';

    for (const [name, tool] of Object.entries(DATA_TOOLS)) {
        desc += `• ${name}: ${tool.description}\n`;
        const paramNames = Object.keys(tool.parameters);
        if (paramNames.length > 0) {
            desc += `  Tham số: ${paramNames.map(p => {
                const param = tool.parameters[p];
                return `${p} (${param.type}${param.required ? ', bắt buộc' : ', tuỳ chọn'})`;
            }).join(', ')}\n`;
        }
    }

    return desc;
}

/**
 * Tự động chọn và chạy tools phù hợp dựa trên message
 * @param {string} message - Tin nhắn người dùng
 * @returns {Object} - Kết quả data từ các tools đã chạy
 */
async function autoExecuteTools(message) {
    const msg = message.toLowerCase();
    const results = {};

    // Helper: detect ranking/comparison keywords
    const hasRanking = msg.includes('nhiều nhất') || msg.includes('cao nhất') || msg.includes('lớn nhất') || msg.includes('top') || msg.includes('thấp nhất') || msg.includes('ít nhất');
    const hasComparison = msg.includes('so sánh') || msg.includes('tăng giảm') || msg.includes('tháng trước') || msg.includes('tuần trước');
    const hasDetail = msg.includes('chi tiết') || msg.includes('cụ thể') || msg.includes('thông tin');

    try {
        // ---- Dự án ----
        if (msg.includes('dự án') || msg.includes('project') || msg.includes('tiến độ') || msg.includes('công trình')) {
            results.thong_ke_du_an = await DATA_TOOLS.getProjectStats.execute();

            // Chi tiết dự án cụ thể (detect project name/code)
            const projectCode = message.match(/[A-Z]{2,}[-\s]?\d+/gi);
            if (hasDetail && projectCode) {
                results.chi_tiet_du_an = await DATA_TOOLS.getProjectDetail.execute({ keyword: projectCode[0] });
            }
            // Dự án theo giá trị (cao nhất, lớn nhất)
            else if (hasRanking || msg.includes('giá trị') || msg.includes('báo giá')) {
                results.du_an_theo_gia_tri = await DATA_TOOLS.getProjectByValue.execute({ sort: msg.includes('thấp') || msg.includes('ít') ? 'lowest' : 'highest' });
            }
            // Dự án quá hạn
            else if (msg.includes('quá hạn') || msg.includes('trễ') || msg.includes('overdue') || msg.includes('deadline')) {
                results.du_an_qua_han = await DATA_TOOLS.getOverdueProjects.execute();
            }
            // Timeline (tháng này mấy dự án mới)
            else if (msg.includes('tháng') || msg.includes('tuần') || msg.includes('mới')) {
                results.timeline_du_an = await DATA_TOOLS.getProjectTimeline.execute({ period: msg.includes('tuần') ? 'week' : 'month' });
                results.danh_sach_du_an = await DATA_TOOLS.getProjectList.execute({ limit: 10 });
            }
            // Mặc định
            else {
                results.danh_sach_du_an = await DATA_TOOLS.getProjectList.execute({ limit: 10 });
            }
        }

        // ---- Kho vật tư ----
        if (msg.includes('tồn kho') || msg.includes('kho') || msg.includes('vật tư') || msg.includes('sắp hết') || msg.includes('cảnh báo')) {
            results.tong_quan_kho = await DATA_TOOLS.getInventoryTotals.execute();

            if (msg.includes('sắp hết') || msg.includes('cảnh báo') || msg.includes('hết hàng')) {
                results.canh_bao_het_hang = await DATA_TOOLS.getInventoryAlerts.execute({ threshold: 5 });
            }

            // TOP vật tư (nhiều nhất, ít nhất, giá trị cao nhất)
            if (hasRanking) {
                let sortType = 'most';
                if (msg.includes('ít nhất') || msg.includes('thấp nhất')) sortType = 'least';
                if (msg.includes('giá trị') || msg.includes('đắt')) sortType = 'value';

                let itemType = undefined;
                if (msg.includes('phụ kiện')) itemType = 'accessory';
                else if (msg.includes('nhôm')) itemType = 'aluminum';
                else if (msg.includes('kính')) itemType = 'glass';

                results.top_vat_tu = await DATA_TOOLS.getTopInventoryItems.execute({ sort: sortType, item_type: itemType });
            }
        }

        // Tìm vật tư cụ thể theo mã/tên
        if (msg.includes('nhôm') || msg.includes('phụ kiện') || msg.includes('kính')) {
            const codeMatch = message.match(/[A-Z]{2,}[-\s]?\d+/gi);
            if (codeMatch) {
                for (const code of codeMatch.slice(0, 3)) {
                    results[`tim_vat_tu_${code.trim()}`] = await DATA_TOOLS.searchInventoryItem.execute({ keyword: code.trim() });
                }
            }
            // Nếu hỏi ranking cho loại cụ thể mà chưa có kết quả top
            if (hasRanking && !results.top_vat_tu) {
                let itemType = 'accessory';
                if (msg.includes('nhôm')) itemType = 'aluminum';
                else if (msg.includes('kính')) itemType = 'glass';

                let sortType = 'most';
                if (msg.includes('ít nhất') || msg.includes('thấp')) sortType = 'least';
                if (msg.includes('giá trị') || msg.includes('đắt') || msg.includes('giá cao')) sortType = 'value';

                results.top_vat_tu = await DATA_TOOLS.getTopInventoryItems.execute({ sort: sortType, item_type: itemType });
            }
        }

        // ---- Tài chính ----
        if (msg.includes('tài chính') || msg.includes('doanh thu') || msg.includes('chi phí') || msg.includes('lãi') || msg.includes('lỗ') || msg.includes('thu chi') || msg.includes('tiền')) {
            results.tai_chinh_30_ngay = await DATA_TOOLS.getFinancialSummary.execute({ days: 30 });
            results.giao_dich_gan_day = await DATA_TOOLS.getRecentTransactions.execute({ limit: 8 });

            // So sánh tài chính giữa 2 kỳ
            if (hasComparison) {
                results.so_sanh_tai_chinh = await DATA_TOOLS.getFinancialComparison.execute({ period: msg.includes('tuần') ? 'week' : 'month' });
            }
        }

        // ---- Khách hàng ----
        if (msg.includes('khách hàng') || msg.includes('customer') || msg.includes('chủ đầu tư')) {
            results.top_khach_hang = await DATA_TOOLS.getCustomerRanking.execute({ limit: 10 });
        }

        // ---- Báo giá ----
        if (msg.includes('báo giá') || msg.includes('quotation') || msg.includes('quote')) {
            results.bao_gia = await DATA_TOOLS.getQuotationPipeline.execute();

            // Chi tiết báo giá cụ thể
            const bgCode = message.match(/[A-Z]{2,}[-\s]?\d+/gi);
            if (bgCode && hasDetail) {
                results.chi_tiet_bao_gia = await DATA_TOOLS.getQuotationDetail.execute({ keyword: bgCode[0] });
            }
        }

        // ---- Yêu cầu vật tư ----
        if (msg.includes('yêu cầu vật tư') || msg.includes('đề xuất vật tư') || msg.includes('material request')) {
            results.yeu_cau_vat_tu = await DATA_TOOLS.getMaterialRequestsByProject.execute({});
        }

        // ---- Nhập xuất kho ----
        if (msg.includes('phiếu kho') || msg.includes('nhập kho') || msg.includes('xuất kho') || msg.includes('phiếu nhập') || msg.includes('phiếu xuất')) {
            results.hoat_dong_kho = await DATA_TOOLS.getStockActivity.execute({ days: 30 });
        }

        // ---- Nếu không detect được gì → lấy tổng quan ----
        if (Object.keys(results).length === 0) {
            results.thong_ke_du_an = await DATA_TOOLS.getProjectStats.execute();
            results.tai_chinh_30_ngay = await DATA_TOOLS.getFinancialSummary.execute({ days: 30 });
            results.tong_quan_kho = await DATA_TOOLS.getInventoryTotals.execute();
        }

    } catch (error) {
        console.error('❌ DataTools autoExecute error:', error.message);
        results._error = error.message;
    }

    results._tools_used = Object.keys(results).filter(k => !k.startsWith('_'));
    results._generated_at = new Date().toISOString();
    return results;
}

/**
 * Chạy 1 tool cụ thể theo tên
 * @param {string} toolName - Tên tool
 * @param {Object} params - Tham số
 * @returns {any}
 */
async function executeTool(toolName, params = {}) {
    const tool = DATA_TOOLS[toolName];
    if (!tool) {
        throw new Error(`Tool "${toolName}" không tồn tại`);
    }
    return await tool.execute(params);
}

module.exports = {
    DATA_TOOLS,
    getToolDescriptions,
    autoExecuteTools,
    executeTool,
    safeQuery
};
