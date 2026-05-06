const db = require("../config/db");
const { emitDataChange } = require('../services/socketService');
const SystemNotifier = require("../services/SystemNotifier");

/**
 * GET all financial transactions
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const {
            type, category, startDate, endDate, status,
            projectId, customerId, supplier, keyword, referenceNumber
        } = req.query;

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let baseQuery = `
            FROM financial_transactions ft
            LEFT JOIN projects p ON ft.project_id = p.id
            LEFT JOIN customers c ON ft.customer_id = c.id
            WHERE 1=1
        `;
        let params = [];

        if (type) {
            baseQuery += " AND ft.transaction_type = ?";
            params.push(type);
        }

        if (category) {
            baseQuery += " AND ft.category = ?";
            params.push(category);
        }

        if (startDate) {
            baseQuery += " AND ft.transaction_date >= ?";
            params.push(startDate);
        }

        if (endDate) {
            baseQuery += " AND ft.transaction_date <= ?";
            params.push(endDate);
        }

        // The original code had expense_type, but the instruction removes it from destructuring.
        // I will keep the filter logic for expense_type as it was not explicitly removed from the query building.
        const { expense_type } = req.query;
        if (expense_type && expense_type !== 'all') {
            baseQuery += " AND ft.expense_type = ?";
            params.push(expense_type);
        }

        if (status) {
            baseQuery += " AND ft.status = ?";
            params.push(status);
        }

        if (projectId) {
            baseQuery += " AND ft.project_id = ?";
            params.push(projectId);
        }

        if (customerId) {
            baseQuery += " AND ft.customer_id = ?";
            params.push(customerId);
        }

        if (supplier) {
            baseQuery += " AND ft.supplier LIKE ?";
            params.push(`%${supplier}%`);
        }

        // Smart Search Keyword
        if (keyword) {
            baseQuery += ` AND (
                ft.transaction_code LIKE ? OR
                ft.description LIKE ? OR
                ft.supplier LIKE ? OR
                ft.reference_number LIKE ? OR
                p.project_name LIKE ? OR
                p.project_code LIKE ? OR
                c.full_name LIKE ?
            )`;
            const searchPattern = `%${keyword}%`;
            params.push(
                searchPattern, searchPattern, searchPattern,
                searchPattern, searchPattern, searchPattern,
                searchPattern
            );
        }

        // Add referenceNumber filter (for checking specific receipts like deposit)
        if (referenceNumber) {
            baseQuery += " AND ft.reference_number = ?";
            params.push(referenceNumber);
        }

        const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
        const selectQuery = `
            SELECT
                ft.*,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name
            ${baseQuery}
            ORDER BY ft.transaction_date DESC, ft.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [countResult] = await db.query(countQuery, params);
        const totalCount = countResult[0].total;
        const totalPages = Math.ceil(totalCount / limit);

        const [rows] = await db.query(selectQuery, [...params, limit, offset]);

        res.json({
            success: true,
            data: rows,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                limit
            }
        });
    } catch (err) {
        console.error('Error getting transactions:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * GET transaction by ID (with items)
 */
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin phiếu chính
        const [rows] = await db.query(`
            SELECT 
                ft.*,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name,
                c.phone AS customer_phone
            FROM financial_transactions ft
            LEFT JOIN projects p ON ft.project_id = p.id
            LEFT JOIN customers c ON ft.customer_id = c.id
            WHERE ft.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch"
            });
        }

        const transaction = rows[0];

        // Lấy danh sách items nếu có
        try {
            const [items] = await db.query(`
                SELECT * FROM financial_transaction_items 
                WHERE transaction_id = ?
                ORDER BY id
            `, [id]);
            transaction.items = items;
        } catch (itemErr) {
            // Bảng items có thể chưa tồn tại
            console.log('Note: financial_transaction_items table may not exist yet');
            transaction.items = [];
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (err) {
        console.error('Error getting transaction:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * POST create transaction
 */
exports.create = async (req, res) => {
    try {
        const {
            transaction_date,
            transaction_type,
            category,
            expense_type,
            supplier,
            amount,
            description,
            project_id,
            customer_id,
            production_order_id,
            payment_method,
            reference_number,
            status
        } = req.body;

        // Validate required fields
        if (!transaction_date || !transaction_type || (amount === undefined || amount === null)) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc"
            });
        }

        // Generate unique transaction code
        const year = new Date(transaction_date).getFullYear();
        const prefix = transaction_type === 'revenue' ? 'THU' : 'CHI';

        // Tìm transaction_code lớn nhất trong năm để tránh duplicate
        let transaction_code;
        let maxAttempts = 10;
        let attempt = 0;

        while (attempt < maxAttempts) {
            const [maxCodeRows] = await db.query(`
                SELECT transaction_code 
                FROM financial_transactions 
                WHERE transaction_code LIKE ? AND transaction_type = ?
                ORDER BY CAST(SUBSTRING(transaction_code, 9) AS UNSIGNED) DESC
                LIMIT 1
            `, [`${prefix}-${year}-%`, transaction_type]);

            let nextNumber = 1;
            if (maxCodeRows.length > 0 && maxCodeRows[0].transaction_code) {
                const match = maxCodeRows[0].transaction_code.match(new RegExp(`${prefix}-\\d+-(\\d+)`));
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            transaction_code = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;

            // Kiểm tra xem code đã tồn tại chưa
            const [checkExisting] = await db.query(
                "SELECT id FROM financial_transactions WHERE transaction_code = ?",
                [transaction_code]
            );

            if (checkExisting.length === 0) {
                // Code chưa tồn tại, có thể sử dụng
                break;
            }

            // Code đã tồn tại, thử số tiếp theo
            nextNumber++;
            attempt++;
        }

        if (attempt >= maxAttempts) {
            // Fallback: sử dụng timestamp để đảm bảo unique
            const timestamp = Date.now().toString().slice(-6);
            transaction_code = `${prefix}-${year}-${timestamp}`;
        }

        // Mặc định status = 'draft' nếu không được chỉ định
        const transactionStatus = status || 'draft';

        const [result] = await db.query(`
            INSERT INTO financial_transactions
            (transaction_code, transaction_date, transaction_type, category, expense_type, supplier, 
             amount, description, project_id, customer_id, production_order_id, payment_method, reference_number, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            transaction_code,
            transaction_date,
            transaction_type,
            category || null,
            expense_type || null,
            supplier || null,
            amount,
            description || null,
            project_id || null,
            customer_id || null,
            production_order_id || null,
            payment_method || null,
            reference_number || null,
            transactionStatus
        ]);

        // Nếu status = 'posted' ngay khi tạo, tự động tạo/cập nhật công nợ
        if (transactionStatus === 'posted') {
            try {
                if (transaction_type === 'revenue' && customer_id) {
                    // Phiếu Thu: Giảm công nợ phải thu
                    const [existingDebt] = await db.query(`
                        SELECT id, total_amount, paid_amount, remaining_amount 
                        FROM debts 
                        WHERE debt_type = 'receivable' 
                        AND customer_id = ? 
                        AND project_id = ?
                        AND status != 'paid'
                        ORDER BY created_at DESC
                        LIMIT 1
                    `, [customer_id, project_id || null]);

                    if (existingDebt.length > 0) {
                        const debt = existingDebt[0];
                        const newPaidAmount = parseFloat(debt.paid_amount) + parseFloat(amount);
                        const newRemainingAmount = parseFloat(debt.remaining_amount) - parseFloat(amount);
                        const newStatus = newRemainingAmount <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');

                        await db.query(`
                            UPDATE debts 
                            SET paid_amount = ?, remaining_amount = ?, status = ?
                            WHERE id = ?
                        `, [newPaidAmount, newRemainingAmount, newStatus, debt.id]);
                    }
                } else if (transaction_type === 'expense' && !payment_method) {
                    // Phiếu Chi: Tăng công nợ phải trả (nếu chưa thanh toán)
                    // Nếu không có supplier, dùng "Chi phí dự án" hoặc "Khác"
                    const supplierName = supplier && supplier.trim() && supplier !== 'N/A'
                        ? supplier
                        : (project_id ? `Chi phí dự án` : 'Khác');

                    const [existingDebt] = await db.query(`
                        SELECT id, total_amount, paid_amount, remaining_amount 
                        FROM debts 
                        WHERE debt_type = 'payable' 
                        AND supplier = ? 
                        AND project_id = ?
                        AND status != 'paid'
                        ORDER BY created_at DESC
                        LIMIT 1
                    `, [supplierName, project_id || null]);

                    if (existingDebt.length > 0) {
                        const debt = existingDebt[0];
                        const newTotalAmount = parseFloat(debt.total_amount) + parseFloat(amount);
                        const newRemainingAmount = parseFloat(debt.remaining_amount) + parseFloat(amount);

                        await db.query(`
                            UPDATE debts 
                            SET total_amount = ?, remaining_amount = ?, status = 'pending'
                            WHERE id = ?
                        `, [newTotalAmount, newRemainingAmount, debt.id]);
                    } else {
                        await db.query(`
                            INSERT INTO debts
                            (debt_type, supplier, project_id, total_amount, paid_amount, remaining_amount, status, notes)
                            VALUES ('payable', ?, ?, ?, 0, ?, 'pending', ?)
                        `, [
                            supplierName,
                            project_id || null,
                            amount,
                            amount,
                            description || `Công nợ từ phiếu chi ${transaction_code}`
                        ]);
                    }
                }
            } catch (debtError) {
                console.error('Error creating/updating debt:', debtError);
                // Không fail việc tạo transaction nếu lỗi tạo công nợ
            }
        }

        // Lưu items nếu có
        const items = req.body.items;
        if (items && Array.isArray(items) && items.length > 0) {
            try {
                for (const item of items) {
                    const qty = parseInt(item.quantity) || 1;
                    const unitPrice = parseFloat(item.unit_price) || 0;
                    // Calculate amount if not provided or is 0
                    const itemAmount = (item.amount && parseFloat(item.amount) > 0)
                        ? parseFloat(item.amount)
                        : (qty * unitPrice);

                    await db.query(`
                        INSERT INTO financial_transaction_items
                        (transaction_id, item_type, item_name, item_code, quantity, unit_price, amount)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        result.insertId,
                        'other',
                        item.item_name || '',
                        item.item_code || null,
                        qty,
                        unitPrice,
                        itemAmount
                    ]);
                }
            } catch (itemError) {
                console.error('Error saving transaction items:', itemError);
                // Không fail việc tạo transaction nếu lỗi lưu items
            }
        }

        // Gửi thông báo tạo giao dịch
        try {
            await SystemNotifier.notify('finance.transaction_created', {
                entityName: transaction_code,
                entityId: result.insertId,
                actor: SystemNotifier.getActor(req),
                afterData: { transaction_type, amount, description },
            });
        } catch (e) { /* không block */ }

        res.status(201).json({
            success: true,
            message: "Tạo giao dịch thành công",
            data: { id: result.insertId, transaction_code }
        });
    } catch (err) {
        console.error('Error creating transaction:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo giao dịch: " + err.message
        });
    }
};

/**
 * PUT update transaction
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            transaction_date,
            transaction_type,
            category,
            expense_type,
            supplier,
            amount,
            description,
            project_id,
            customer_id,
            production_order_id,
            payment_method,
            reference_number
        } = req.body;

        // Kiểm tra trạng thái hiện tại
        const [currentRows] = await db.query(
            "SELECT status FROM financial_transactions WHERE id = ?",
            [id]
        );

        if (currentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch"
            });
        }

        const currentStatus = currentRows[0].status;

        // Nếu đã "Đã ghi sổ" hoặc "Đã hủy", chỉ cho phép sửa description (ghi chú)
        if (currentStatus === 'posted' || currentStatus === 'cancelled') {
            if (description !== undefined) {
                await db.query(
                    "UPDATE financial_transactions SET description = ? WHERE id = ?",
                    [description, id]
                );
                return res.json({
                    success: true,
                    message: "Đã cập nhật ghi chú thành công"
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Không thể sửa phiếu đã ghi sổ hoặc đã hủy. Chỉ có thể sửa ghi chú."
                });
            }
        }

        // Nếu còn "Nháp", cho phép sửa tất cả
        const [result] = await db.query(`
            UPDATE financial_transactions
            SET transaction_date = ?, transaction_type = ?, category = ?, expense_type = ?, supplier = ?,
                amount = ?, description = ?, project_id = ?, customer_id = ?, production_order_id = ?,
                payment_method = ?, reference_number = ?
            WHERE id = ? AND status = 'draft'
        `, [
            transaction_date,
            transaction_type,
            category || null,
            expense_type || null,
            supplier || null,
            amount,
            description || null,
            project_id || null,
            customer_id || null,
            production_order_id || null,
            payment_method || null,
            reference_number || null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch hoặc giao dịch không ở trạng thái 'Nháp'"
            });
        }

        // Cập nhật items nếu có
        const items = req.body.items;
        if (items && Array.isArray(items)) {
            try {
                // Xóa items cũ
                await db.query(
                    "DELETE FROM financial_transaction_items WHERE transaction_id = ?",
                    [id]
                );

                // Thêm items mới
                if (items.length > 0) {
                    for (const item of items) {
                        const qty = parseInt(item.quantity) || 1;
                        const unitPrice = parseFloat(item.unit_price) || 0;
                        // Calculate amount if not provided or is 0
                        const itemAmount = (item.amount && parseFloat(item.amount) > 0)
                            ? parseFloat(item.amount)
                            : (qty * unitPrice);

                        await db.query(`
                            INSERT INTO financial_transaction_items
                            (transaction_id, item_type, item_name, item_code, quantity, unit_price, amount)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [
                            id,
                            'other',
                            item.item_name || '',
                            item.item_code || null,
                            qty,
                            unitPrice,
                            itemAmount
                        ]);
                    }
                }
            } catch (itemError) {
                console.error('Error updating transaction items:', itemError);
                // Không fail việc cập nhật transaction nếu lỗi cập nhật items
            }
        }

        // Gửi thông báo cập nhật giao dịch
        try {
            await SystemNotifier.notify('finance.transaction_updated', {
                entityName: currentRows[0]?.transaction_code || `Giao dịch #${id}`,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
                afterData: { amount, description, status: currentStatus }
            });
        } catch (e) { }

        res.json({
            success: true,
            message: "Cập nhật giao dịch thành công"
        });
    } catch (err) {
        console.error('Error updating transaction:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật giao dịch: " + err.message
        });
    }
};

/**
 * DELETE transaction
 * CHỈ cho phép xóa khi status = 'draft'
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra trạng thái
        const [currentRows] = await db.query(
            "SELECT status FROM financial_transactions WHERE id = ?",
            [id]
        );

        if (currentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch"
            });
        }

        if (currentRows[0].status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể xóa phiếu ở trạng thái 'Nháp'. Để hủy phiếu đã ghi sổ, vui lòng sử dụng chức năng 'Hủy'."
            });
        }

        const [result] = await db.query(
            "DELETE FROM financial_transactions WHERE id = ? AND status = 'draft'",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch hoặc giao dịch không ở trạng thái 'Nháp'"
            });
        }

        // Gửi thông báo xóa giao dịch
        try {
            await SystemNotifier.notify('finance.transaction_deleted', {
                entityName: currentRows[0]?.transaction_code || `Giao dịch #${id}`,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
                beforeData: currentRows[0]
            });
        } catch (e) { }

        res.json({
            success: true,
            message: "Xóa giao dịch thành công"
        });
    } catch (err) {
        console.error('Error deleting transaction:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa giao dịch: " + err.message
        });
    }
};

/**
 * GET statistics
 */
exports.getStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = "WHERE 1=1";
        let params = [];

        if (startDate && endDate) {
            dateFilter += " AND transaction_date >= ? AND transaction_date <= ?";
            params = [startDate, endDate];
        }

        // Total revenue - CHỈ tính các transaction đã "Đã ghi sổ"
        const [revenueRows] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            ${dateFilter} AND transaction_type = 'revenue' AND status = 'posted'
        `, params);

        // Total expense - CHỈ tính các transaction đã "Đã ghi sổ"
        const [expenseRows] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            ${dateFilter} AND transaction_type = 'expense' AND status = 'posted'
        `, params);

        // Revenue by category - CHỈ tính các transaction đã "Đã ghi sổ"
        const [revenueByCategory] = await db.query(`
            SELECT category, COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            ${dateFilter} AND transaction_type = 'revenue' AND status = 'posted'
            GROUP BY category
            ORDER BY total DESC
        `, params);

        // Expense by category - CHỈ tính các transaction đã "Đã ghi sổ"
        const [expenseByCategory] = await db.query(`
            SELECT category, COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            ${dateFilter} AND transaction_type = 'expense' AND status = 'posted'
            GROUP BY category
            ORDER BY total DESC
        `, params);

        // Expense by expense_type - CHỈ tính các transaction đã "Đã ghi sổ"
        const [expenseByType] = await db.query(`
            SELECT expense_type, COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            ${dateFilter} AND transaction_type = 'expense' AND expense_type IS NOT NULL AND status = 'posted'
            GROUP BY expense_type
            ORDER BY total DESC
        `, params);

        const totalRevenue = parseFloat(revenueRows[0].total) || 0;
        const totalExpense = parseFloat(expenseRows[0].total) || 0;
        const profit = totalRevenue - totalExpense;

        res.json({
            success: true,
            data: {
                total_revenue: totalRevenue,
                total_expense: totalExpense,
                profit: profit,
                revenue_by_category: revenueByCategory,
                expense_by_category: expenseByCategory,
                expense_by_type: expenseByType
            }
        });
    } catch (err) {
        console.error('Error getting statistics:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * POST sync financial data from projects
 * Đồng bộ dữ liệu tài chính từ:
 * - Tiền cọc từ báo giá đã duyệt (revenue)
 * - Chi phí vật tư từ project_materials (expense)
 */
exports.syncFromProjects = async (req, res) => {
    try {
        let revenueCount = 0;
        let expenseCount = 0;
        const today = new Date().toISOString().split('T')[0];
        const year = new Date().getFullYear();

        // 1. Sync revenue from approved quotations (advance_amount)
        const [approvedQuotations] = await db.query(`
            SELECT q.*, c.full_name AS customer_name, p.project_name
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN projects p ON q.project_id = p.id
            WHERE q.status = 'approved' AND q.advance_amount > 0
        `);

        for (const q of approvedQuotations) {
            const refNumber = `QUO-ADV-${q.id}`;

            // Check if already synced
            const [existing] = await db.query(
                "SELECT id FROM financial_transactions WHERE reference_number = ?",
                [refNumber]
            );

            if (existing.length === 0) {
                // Generate unique transaction code
                // Tìm transaction_code lớn nhất trong năm để tránh duplicate
                let transCode;
                let maxAttempts = 10;
                let attempt = 0;

                while (attempt < maxAttempts) {
                    const [maxCodeRows] = await db.query(`
                        SELECT transaction_code 
                        FROM financial_transactions 
                        WHERE transaction_code LIKE ? AND transaction_type = 'revenue'
                        ORDER BY CAST(SUBSTRING(transaction_code, 9) AS UNSIGNED) DESC
                        LIMIT 1
                    `, [`THU-${year}-%`]);

                    let nextNumber = 1;
                    if (maxCodeRows.length > 0 && maxCodeRows[0].transaction_code) {
                        const match = maxCodeRows[0].transaction_code.match(/THU-\d+-(\d+)/);
                        if (match) {
                            nextNumber = parseInt(match[1], 10) + 1;
                        }
                    }

                    transCode = `THU-${year}-${String(nextNumber).padStart(4, '0')}`;

                    // Kiểm tra xem code đã tồn tại chưa
                    const [checkExisting] = await db.query(
                        "SELECT id FROM financial_transactions WHERE transaction_code = ?",
                        [transCode]
                    );

                    if (checkExisting.length === 0) {
                        // Code chưa tồn tại, có thể sử dụng
                        break;
                    }

                    // Code đã tồn tại, thử số tiếp theo
                    nextNumber++;
                    attempt++;
                }

                if (attempt >= maxAttempts) {
                    // Fallback: sử dụng timestamp để đảm bảo unique
                    const timestamp = Date.now().toString().slice(-6);
                    transCode = `THU-${year}-${timestamp}`;
                }

                await db.query(`
                    INSERT INTO financial_transactions
                    (transaction_code, transaction_date, transaction_type, category, amount, 
                     description, project_id, customer_id, reference_number)
                    VALUES (?, ?, 'revenue', 'Tiền đặt cọc', ?, ?, ?, ?, ?)
                `, [
                    transCode,
                    q.quotation_date || today,
                    q.advance_amount,
                    `Thu tiền cọc từ báo giá ${q.quotation_code} - ${q.customer_name || 'Khách hàng'}`,
                    q.project_id,
                    q.customer_id,
                    refNumber
                ]);
                revenueCount++;
            }
        }

        // 2. Sync expenses from project_materials (materials used)
        const [projectMaterials] = await db.query(`
            SELECT pm.*, p.project_name, p.project_code
            FROM project_materials pm
            LEFT JOIN projects p ON pm.project_id = p.id
            WHERE pm.total_cost > 0
        `);

        for (const pm of projectMaterials) {
            const refNumber = `PMAT-${pm.id}`;

            // Check if already synced
            const [existing] = await db.query(
                "SELECT id FROM financial_transactions WHERE reference_number = ?",
                [refNumber]
            );

            if (existing.length === 0) {
                // Generate unique transaction code
                // Tìm transaction_code lớn nhất trong năm để tránh duplicate
                let transCode;
                let maxAttempts = 10;
                let attempt = 0;

                while (attempt < maxAttempts) {
                    const [maxCodeRows] = await db.query(`
                        SELECT transaction_code 
                        FROM financial_transactions 
                        WHERE transaction_code LIKE ? AND transaction_type = 'expense'
                        ORDER BY CAST(SUBSTRING(transaction_code, 9) AS UNSIGNED) DESC
                        LIMIT 1
                    `, [`CHI-${year}-%`]);

                    let nextNumber = 1;
                    if (maxCodeRows.length > 0 && maxCodeRows[0].transaction_code) {
                        const match = maxCodeRows[0].transaction_code.match(/CHI-\d+-(\d+)/);
                        if (match) {
                            nextNumber = parseInt(match[1], 10) + 1;
                        }
                    }

                    transCode = `CHI-${year}-${String(nextNumber).padStart(4, '0')}`;

                    // Kiểm tra xem code đã tồn tại chưa
                    const [checkExisting] = await db.query(
                        "SELECT id FROM financial_transactions WHERE transaction_code = ?",
                        [transCode]
                    );

                    if (checkExisting.length === 0) {
                        // Code chưa tồn tại, có thể sử dụng
                        break;
                    }

                    // Code đã tồn tại, thử số tiếp theo
                    nextNumber++;
                    attempt++;
                }

                if (attempt >= maxAttempts) {
                    // Fallback: sử dụng timestamp để đảm bảo unique
                    const timestamp = Date.now().toString().slice(-6);
                    transCode = `CHI-${year}-${timestamp}`;
                }

                const materialName = pm.material_name || pm.item_name || 'Vật tư';

                await db.query(`
                    INSERT INTO financial_transactions
                    (transaction_code, transaction_date, transaction_type, category, expense_type, amount, 
                     description, project_id, reference_number)
                    VALUES (?, ?, 'expense', 'Chi phí vật tư', 'material', ?, ?, ?, ?)
                `, [
                    transCode,
                    pm.created_at ? new Date(pm.created_at).toISOString().split('T')[0] : today,
                    pm.total_cost,
                    `Chi phí ${materialName} cho dự án ${pm.project_name || pm.project_code || pm.project_id}`,
                    pm.project_id,
                    refNumber
                ]);
                expenseCount++;
            }
        }

        // 3. Sync payable debts from expense transactions
        // CHỈ sync các transaction đã "Đã ghi sổ" (status = 'posted')
        let payableDebtCount = 0;
        const [expenseTransactions] = await db.query(`
            SELECT ft.*, p.project_name
            FROM financial_transactions ft
            LEFT JOIN projects p ON ft.project_id = p.id
            WHERE ft.transaction_type = 'expense' 
            AND (ft.payment_method IS NULL OR ft.payment_method = '')
            AND ft.status = 'posted'
        `);

        for (const exp of expenseTransactions) {
            // Kiểm tra xem đã có công nợ phải trả cho transaction này chưa (dựa vào notes)
            const [existingDebt] = await db.query(`
                SELECT id FROM debts 
                WHERE notes LIKE ?
            `, [`%${exp.transaction_code}%`]);

            if (existingDebt.length === 0) {
                // Nếu không có supplier, dùng "Chi phí dự án" hoặc "Khác"
                const supplierName = exp.supplier && exp.supplier.trim() && exp.supplier !== 'N/A'
                    ? exp.supplier
                    : (exp.project_id ? `Chi phí dự án` : 'Khác');

                // Kiểm tra xem đã có công nợ phải trả cho supplier này trong project này chưa
                const [existingSupplierDebt] = await db.query(`
                    SELECT id, total_amount, paid_amount, remaining_amount 
                    FROM debts 
                    WHERE debt_type = 'payable' 
                    AND supplier = ? 
                    AND project_id = ? 
                    AND status != 'paid'
                    ORDER BY created_at DESC
                    LIMIT 1
                `, [supplierName, exp.project_id || null]);

                if (existingSupplierDebt.length > 0) {
                    // Cập nhật công nợ hiện có
                    const debt = existingSupplierDebt[0];
                    const newTotalAmount = parseFloat(debt.total_amount) + parseFloat(exp.amount);
                    const newRemainingAmount = parseFloat(debt.remaining_amount) + parseFloat(exp.amount);

                    // Cập nhật notes để bao gồm transaction_code mới
                    const updatedNotes = debt.notes
                        ? `${debt.notes}; ${exp.transaction_code}`
                        : `Công nợ từ phiếu chi ${exp.transaction_code}`;

                    await db.query(`
                        UPDATE debts 
                        SET total_amount = ?, remaining_amount = ?, status = 'pending', notes = ?
                        WHERE id = ?
                    `, [newTotalAmount, newRemainingAmount, updatedNotes, debt.id]);
                    payableDebtCount++;
                } else {
                    // Tạo công nợ mới
                    await db.query(`
                        INSERT INTO debts
                        (debt_type, supplier, project_id, total_amount, paid_amount, remaining_amount, status, notes)
                        VALUES ('payable', ?, ?, ?, 0, ?, 'pending', ?)
                    `, [
                        supplierName,
                        exp.project_id || null,
                        exp.amount,
                        exp.amount,
                        exp.description || `Công nợ từ phiếu chi ${exp.transaction_code}`
                    ]);
                    payableDebtCount++;
                }
            }
        }

        res.json({
            success: true,
            message: `Đồng bộ thành công: ${revenueCount} giao dịch thu, ${expenseCount} giao dịch chi, ${payableDebtCount} công nợ phải trả`,
            data: {
                revenue_synced: revenueCount,
                expense_synced: expenseCount,
                payable_debt_synced: payableDebtCount
            }
        });
    } catch (err) {
        console.error('Error syncing from projects:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi đồng bộ: " + err.message
        });
    }
};

/**
 * GET dashboard summary for finance
 * Lấy dữ liệu tổng hợp cho dashboard tài chính
 */
exports.getDashboardSummary = async (req, res) => {
    try {
        // Sử dụng CURDATE() của MySQL thay vì JS Date để đảm bảo timezone đồng nhất
        // JS toISOString() dùng UTC, nhưng MySQL CURDATE() dùng server timezone
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

        // Debug: log dates being used
        console.log('📊 Dashboard query dates:', { today, firstDayOfMonth, lastDayOfMonth });

        // Today's revenue - CHỈ tính các transaction đã "Đã ghi sổ"
        // Dùng DATE() để đảm bảo so sánh đúng kể cả khi transaction_date là DATETIME
        const [todayRevenue] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            WHERE DATE(transaction_date) = CURDATE() AND transaction_type = 'revenue' AND status = 'posted'
        `);

        // Today's expense - CHỈ tính các transaction đã "Đã ghi sổ"
        const [todayExpense] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            WHERE DATE(transaction_date) = CURDATE() AND transaction_type = 'expense' AND status = 'posted'
        `);

        // Month's revenue - CHỈ tính các transaction đã "Đã ghi sổ"
        const [monthRevenue] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            WHERE transaction_date >= ? AND transaction_date <= ? AND transaction_type = 'revenue' AND status = 'posted'
        `, [firstDayOfMonth, lastDayOfMonth]);

        // Month's expense - CHỈ tính các transaction đã "Đã ghi sổ"
        const [monthExpense] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM financial_transactions
            WHERE transaction_date >= ? AND transaction_date <= ? AND transaction_type = 'expense' AND status = 'posted'
        `, [firstDayOfMonth, lastDayOfMonth]);

        // Total receivable (from debts)
        const [receivable] = await db.query(`
            SELECT COALESCE(SUM(remaining_amount), 0) as total
            FROM debts
            WHERE debt_type = 'receivable' AND status != 'paid'
        `);

        // Total payable (from debts)
        const [payable] = await db.query(`
            SELECT COALESCE(SUM(remaining_amount), 0) as total
            FROM debts
            WHERE debt_type = 'payable' AND status != 'paid'
        `);

        // Overdue debts count
        const [overdueDebts] = await db.query(`
            SELECT COUNT(*) as count, COALESCE(SUM(remaining_amount), 0) as total
            FROM debts
            WHERE due_date < CURDATE() AND status != 'paid'
        `);

        // Projects with negative balance (expenses > revenue)
        const [negativeProjects] = await db.query(`
            SELECT 
                p.id, p.project_name, p.project_code,
                COALESCE(rev.total, 0) as total_revenue,
                COALESCE(exp.total, 0) as total_expense,
                (COALESCE(rev.total, 0) - COALESCE(exp.total, 0)) as balance
            FROM projects p
            LEFT JOIN (
                SELECT project_id, SUM(amount) as total
                FROM financial_transactions
                WHERE transaction_type = 'revenue' AND status = 'posted'
                GROUP BY project_id
            ) rev ON p.id = rev.project_id
            LEFT JOIN (
                SELECT project_id, SUM(amount) as total
                FROM financial_transactions
                WHERE transaction_type = 'expense' AND status = 'posted'
                GROUP BY project_id
            ) exp ON p.id = exp.project_id
            WHERE (COALESCE(rev.total, 0) - COALESCE(exp.total, 0)) < 0
        `);

        // Debug: log actual values
        console.log('📊 Dashboard results:', {
            today_revenue: parseFloat(todayRevenue[0].total) || 0,
            today_expense: parseFloat(todayExpense[0].total) || 0,
            month_revenue: parseFloat(monthRevenue[0].total) || 0,
            month_expense: parseFloat(monthExpense[0].total) || 0
        });

        res.json({
            success: true,
            data: {
                today_revenue: parseFloat(todayRevenue[0].total) || 0,
                today_expense: parseFloat(todayExpense[0].total) || 0,
                month_revenue: parseFloat(monthRevenue[0].total) || 0,
                month_expense: parseFloat(monthExpense[0].total) || 0,
                month_profit: (parseFloat(monthRevenue[0].total) || 0) - (parseFloat(monthExpense[0].total) || 0),
                total_receivable: parseFloat(receivable[0].total) || 0,
                total_payable: parseFloat(payable[0].total) || 0,
                overdue_debts_count: overdueDebts[0].count,
                overdue_debts_amount: parseFloat(overdueDebts[0].total) || 0,
                negative_balance_projects: negativeProjects
            }
        });
    } catch (err) {
        console.error('Error getting dashboard summary:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Migration: Add status column to financial_transactions table
 */
exports.migrateAddStatus = async (req, res) => {
    try {
        // Check if status column exists
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'financial_transactions' 
            AND COLUMN_NAME = 'status'
        `);

        if (columns.length > 0) {
            res.json({
                success: true,
                message: "Cột status đã tồn tại"
            });
            return;
        }

        // Add status column
        await db.query(`
            ALTER TABLE financial_transactions 
            ADD COLUMN status ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft' 
            COMMENT 'Trạng thái: nháp, đã ghi sổ, đã hủy'
        `);

        // Add index for status
        await db.query(`
            ALTER TABLE financial_transactions 
            ADD INDEX idx_status (status)
        `);

        res.json({
            success: true,
            message: "Đã thêm cột status thành công"
        });
    } catch (err) {
        console.error('Error in migration:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi migration: " + err.message
        });
    }
};

/**
 * POST post transaction (Ghi sổ)
 * Chuyển trạng thái từ "Nháp" sang "Đã ghi sổ" và tạo/cập nhật công nợ
 */
exports.postTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin transaction
        const [transactionRows] = await db.query(
            "SELECT * FROM financial_transactions WHERE id = ?",
            [id]
        );

        if (transactionRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch"
            });
        }

        const transaction = transactionRows[0];

        // Kiểm tra trạng thái hiện tại
        if (transaction.status === 'posted') {
            return res.status(400).json({
                success: false,
                message: "Giao dịch đã được ghi sổ rồi"
            });
        }

        if (transaction.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Không thể ghi sổ giao dịch đã hủy"
            });
        }

        // Cập nhật status = 'posted'
        await db.query(
            "UPDATE financial_transactions SET status = 'posted' WHERE id = ?",
            [id]
        );

        // Tạo/cập nhật công nợ nếu cần
        if (transaction.transaction_type === 'revenue' && transaction.customer_id) {
            // Phiếu Thu: Giảm công nợ phải thu
            const [existingDebt] = await db.query(`
                SELECT id, total_amount, paid_amount, remaining_amount 
                FROM debts 
                WHERE debt_type = 'receivable' 
                AND customer_id = ? 
                AND project_id = ?
                AND status != 'paid'
                ORDER BY created_at DESC
                LIMIT 1
            `, [transaction.customer_id, transaction.project_id || null]);

            if (existingDebt.length > 0) {
                // Cập nhật công nợ: tăng paid_amount, giảm remaining_amount
                const debt = existingDebt[0];
                const newPaidAmount = parseFloat(debt.paid_amount) + parseFloat(transaction.amount);
                const newRemainingAmount = parseFloat(debt.remaining_amount) - parseFloat(transaction.amount);
                const newStatus = newRemainingAmount <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');

                await db.query(`
                    UPDATE debts 
                    SET paid_amount = ?, remaining_amount = ?, status = ?
                    WHERE id = ?
                `, [newPaidAmount, newRemainingAmount, newStatus, debt.id]);
            }
        } else if (transaction.transaction_type === 'expense' && !transaction.payment_method) {
            // Phiếu Chi: Tăng công nợ phải trả (nếu chưa thanh toán)
            // Nếu không có supplier, dùng "Khác" hoặc tổng hợp theo dự án
            const supplierName = transaction.supplier && transaction.supplier.trim() && transaction.supplier !== 'N/A'
                ? transaction.supplier
                : (transaction.project_id ? `Chi phí dự án` : 'Khác');

            const [existingDebt] = await db.query(`
                SELECT id, total_amount, paid_amount, remaining_amount 
                FROM debts 
                WHERE debt_type = 'payable' 
                AND supplier = ? 
                AND project_id = ?
                AND status != 'paid'
                ORDER BY created_at DESC
                LIMIT 1
            `, [supplierName, transaction.project_id || null]);

            if (existingDebt.length > 0) {
                // Cập nhật công nợ: tăng total_amount và remaining_amount
                const debt = existingDebt[0];
                const newTotalAmount = parseFloat(debt.total_amount) + parseFloat(transaction.amount);
                const newRemainingAmount = parseFloat(debt.remaining_amount) + parseFloat(transaction.amount);

                await db.query(`
                    UPDATE debts 
                    SET total_amount = ?, remaining_amount = ?, status = 'pending'
                    WHERE id = ?
                `, [newTotalAmount, newRemainingAmount, debt.id]);
            } else {
                // Tạo công nợ mới
                await db.query(`
                    INSERT INTO debts
                    (debt_type, supplier, project_id, total_amount, paid_amount, remaining_amount, status, notes)
                    VALUES ('payable', ?, ?, ?, 0, ?, 'pending', ?)
                `, [
                    supplierName,
                    transaction.project_id || null,
                    transaction.amount,
                    transaction.amount,
                    transaction.description || `Công nợ từ phiếu chi ${transaction.transaction_code}`
                ]);
            }
        }

        // Gửi thông báo ghi sổ
        try {
            await SystemNotifier.notify('finance.transaction_posted', {
                entityName: transaction.transaction_code,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
            });
        } catch (e) { /* không block */ }

        res.json({
            success: true,
            message: "Đã ghi sổ thành công"
        });
    } catch (err) {
        console.error('Error posting transaction:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi ghi sổ: " + err.message
        });
    }
};

/**
 * POST cancel transaction (Hủy)
 * Nếu đã ghi sổ: tạo phiếu đảo (reversal)
 * Nếu còn nháp: chỉ đổi status = 'cancelled'
 */
exports.cancelTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancel_reason } = req.body;

        if (!cancel_reason) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập lý do hủy"
            });
        }

        // Lấy thông tin transaction
        const [transactionRows] = await db.query(
            "SELECT * FROM financial_transactions WHERE id = ?",
            [id]
        );

        if (transactionRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch"
            });
        }

        const transaction = transactionRows[0];

        if (transaction.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Giao dịch đã bị hủy rồi"
            });
        }

        // Nếu đã ghi sổ: tạo phiếu đảo
        if (transaction.status === 'posted') {
            const year = new Date(transaction.transaction_date).getFullYear();
            const prefix = transaction.transaction_type === 'revenue' ? 'CHI' : 'THU';

            // Generate unique transaction code cho phiếu đảo
            let reversalCode;
            let maxAttempts = 10;
            let attempt = 0;

            while (attempt < maxAttempts) {
                const [maxCodeRows] = await db.query(`
                    SELECT transaction_code 
                    FROM financial_transactions 
                    WHERE transaction_code LIKE ? AND transaction_type = ?
                    ORDER BY CAST(SUBSTRING(transaction_code, 9) AS UNSIGNED) DESC
                    LIMIT 1
                `, [`${prefix}-${year}-%`, transaction.transaction_type === 'revenue' ? 'expense' : 'revenue']);

                let nextNumber = 1;
                if (maxCodeRows.length > 0 && maxCodeRows[0].transaction_code) {
                    const match = maxCodeRows[0].transaction_code.match(new RegExp(`${prefix}-\\d+-(\\d+)`));
                    if (match) {
                        nextNumber = parseInt(match[1], 10) + 1;
                    }
                }

                reversalCode = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;

                const [checkExisting] = await db.query(
                    "SELECT id FROM financial_transactions WHERE transaction_code = ?",
                    [reversalCode]
                );

                if (checkExisting.length === 0) {
                    break;
                }

                nextNumber++;
                attempt++;
            }

            if (attempt >= maxAttempts) {
                const timestamp = Date.now().toString().slice(-6);
                reversalCode = `${prefix}-${year}-${timestamp}`;
            }

            // Tạo phiếu đảo
            const reversalType = transaction.transaction_type === 'revenue' ? 'expense' : 'revenue';
            const [reversalResult] = await db.query(`
                INSERT INTO financial_transactions
                (transaction_code, transaction_date, transaction_type, category, expense_type, supplier,
                 amount, description, project_id, customer_id, payment_method, reference_number, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
            `, [
                reversalCode,
                new Date().toISOString().split('T')[0],
                reversalType,
                transaction.category || null,
                transaction.expense_type || null,
                transaction.supplier || null,
                transaction.amount,
                `Phiếu đảo của ${transaction.transaction_code}: ${cancel_reason}`,
                transaction.project_id || null,
                transaction.customer_id || null,
                transaction.payment_method || null,
                `REVERSAL-${id}`,
            ]);

            // Cập nhật công nợ ngược lại
            if (transaction.transaction_type === 'revenue' && transaction.customer_id) {
                // Phiếu Thu bị hủy → tăng lại công nợ phải thu
                const [existingDebt] = await db.query(`
                    SELECT id, total_amount, paid_amount, remaining_amount 
                    FROM debts 
                    WHERE debt_type = 'receivable' 
                    AND customer_id = ? 
                    AND project_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                `, [transaction.customer_id, transaction.project_id || null]);

                if (existingDebt.length > 0) {
                    const debt = existingDebt[0];
                    const newPaidAmount = Math.max(0, parseFloat(debt.paid_amount) - parseFloat(transaction.amount));
                    const newRemainingAmount = parseFloat(debt.total_amount) - newPaidAmount;
                    const newStatus = newRemainingAmount <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');

                    await db.query(`
                        UPDATE debts 
                        SET paid_amount = ?, remaining_amount = ?, status = ?
                        WHERE id = ?
                    `, [newPaidAmount, newRemainingAmount, newStatus, debt.id]);
                }
            } else if (transaction.transaction_type === 'expense') {
                // Phiếu Chi bị hủy → giảm lại công nợ phải trả
                // Nếu không có supplier, dùng "Chi phí dự án" hoặc "Khác"
                const supplierName = transaction.supplier && transaction.supplier.trim() && transaction.supplier !== 'N/A'
                    ? transaction.supplier
                    : (transaction.project_id ? `Chi phí dự án` : 'Khác');

                const [existingDebt] = await db.query(`
                    SELECT id, total_amount, paid_amount, remaining_amount 
                    FROM debts 
                    WHERE debt_type = 'payable' 
                    AND supplier = ? 
                    AND project_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                `, [supplierName, transaction.project_id || null]);

                if (existingDebt.length > 0) {
                    const debt = existingDebt[0];
                    const newTotalAmount = Math.max(0, parseFloat(debt.total_amount) - parseFloat(transaction.amount));
                    const newRemainingAmount = Math.max(0, parseFloat(debt.remaining_amount) - parseFloat(transaction.amount));
                    const newStatus = newRemainingAmount <= 0 ? 'paid' : 'pending';

                    await db.query(`
                        UPDATE debts 
                        SET total_amount = ?, remaining_amount = ?, status = ?
                        WHERE id = ?
                    `, [newTotalAmount, newRemainingAmount, newStatus, debt.id]);
                }
            }
        }

        // Cập nhật status = 'cancelled' và lưu lý do
        await db.query(
            "UPDATE financial_transactions SET status = 'cancelled', description = CONCAT(COALESCE(description, ''), ' [HỦY: ', ?, ']') WHERE id = ?",
            [cancel_reason, id]
        );

        // Gửi thông báo hủy
        try {
            await SystemNotifier.notify('finance.transaction_cancelled', {
                entityName: transaction.transaction_code,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
                reason: cancel_reason,
            });
        } catch (e) { /* không block */ }

        res.json({
            success: true,
            message: transaction.status === 'posted' ? "Đã hủy và tạo phiếu đảo thành công" : "Đã hủy thành công"
        });
    } catch (err) {
        console.error('Error cancelling transaction:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi hủy: " + err.message
        });
    }
};

/**
 * POST sync payable debts from posted expense transactions
 * Đồng bộ lại công nợ phải trả từ các phiếu chi đã ghi sổ
 */
exports.syncPayableDebts = async (req, res) => {
    try {
        // Lấy tất cả các phiếu chi đã ghi sổ nhưng chưa có công nợ
        const [expenseTransactions] = await db.query(`
            SELECT ft.*, p.project_name
            FROM financial_transactions ft
            LEFT JOIN projects p ON ft.project_id = p.id
            WHERE ft.transaction_type = 'expense' 
            AND (ft.payment_method IS NULL OR ft.payment_method = '')
            AND ft.status = 'posted'
        `);

        let createdCount = 0;
        let updatedCount = 0;

        for (const exp of expenseTransactions) {
            // Kiểm tra xem đã có công nợ phải trả cho transaction này chưa (dựa vào notes)
            const [existingDebt] = await db.query(`
                SELECT id FROM debts 
                WHERE notes LIKE ?
            `, [`%${exp.transaction_code}%`]);

            if (existingDebt.length === 0) {
                // Nếu không có supplier, dùng "Chi phí dự án" hoặc "Khác"
                const supplierName = exp.supplier && exp.supplier.trim() && exp.supplier !== 'N/A'
                    ? exp.supplier
                    : (exp.project_id ? `Chi phí dự án` : 'Khác');

                // Kiểm tra xem đã có công nợ phải trả cho supplier này trong project này chưa
                const [existingSupplierDebt] = await db.query(`
                    SELECT id, total_amount, paid_amount, remaining_amount, notes
                    FROM debts 
                    WHERE debt_type = 'payable' 
                    AND supplier = ? 
                    AND project_id = ? 
                    AND status != 'paid'
                    ORDER BY created_at DESC
                    LIMIT 1
                `, [supplierName, exp.project_id || null]);

                if (existingSupplierDebt.length > 0) {
                    // Cập nhật công nợ hiện có
                    const debt = existingSupplierDebt[0];
                    const newTotalAmount = parseFloat(debt.total_amount) + parseFloat(exp.amount);
                    const newRemainingAmount = parseFloat(debt.remaining_amount) + parseFloat(exp.amount);

                    // Cập nhật notes để bao gồm transaction_code mới
                    const updatedNotes = debt.notes
                        ? `${debt.notes}; ${exp.transaction_code}`
                        : `Công nợ từ phiếu chi ${exp.transaction_code}`;

                    await db.query(`
                        UPDATE debts 
                        SET total_amount = ?, remaining_amount = ?, status = 'pending', notes = ?
                        WHERE id = ?
                    `, [newTotalAmount, newRemainingAmount, updatedNotes, debt.id]);
                    updatedCount++;
                } else {
                    // Tạo công nợ mới
                    await db.query(`
                        INSERT INTO debts
                        (debt_type, supplier, project_id, total_amount, paid_amount, remaining_amount, status, notes)
                        VALUES ('payable', ?, ?, ?, 0, ?, 'pending', ?)
                    `, [
                        supplierName,
                        exp.project_id || null,
                        exp.amount,
                        exp.amount,
                        exp.description || `Công nợ từ phiếu chi ${exp.transaction_code}`
                    ]);
                    createdCount++;
                }
            }
        }

        res.json({
            success: true,
            message: `Đồng bộ thành công: ${createdCount} công nợ mới, ${updatedCount} công nợ đã cập nhật`,
            data: {
                created: createdCount,
                updated: updatedCount,
                total: expenseTransactions.length
            }
        });
    } catch (err) {
        console.error('Error syncing payable debts:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * GET Branch Project Report
 * Báo cáo tổng hợp công trình theo chi nhánh
 */
exports.getBranchProjectReport = async (req, res) => {
    try {
        const { agency_id, startDate, endDate } = req.query;

        // Build WHERE clause
        let whereClause = 'WHERE 1=1';
        let params = [];

        if (agency_id) {
            whereClause += ' AND p.agency_id = ?';
            params.push(agency_id);
        }

        if (startDate) {
            whereClause += ' AND p.created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND p.created_at <= ?';
            params.push(endDate + ' 23:59:59');
        }

        // Query all projects with agency and customer info
        const [projects] = await db.query(`
            SELECT 
                p.id as project_id,
                p.project_code,
                p.project_name,
                p.total_value,
                p.status,
                p.created_at,
                p.agency_id,
                a.code as agency_code,
                a.name as agency_name,
                a.address as agency_address,
                a.phone as agency_phone,
                a.region as agency_region,
                a.manager_name as agency_manager,
                p.customer_id,
                c.full_name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email
            FROM projects p
            LEFT JOIN agencies a ON p.agency_id = a.id
            LEFT JOIN customers c ON p.customer_id = c.id
            ${whereClause}
            ORDER BY a.name ASC, c.full_name ASC, p.created_at DESC
        `, params);

        // Group data hierarchically: Agency → Customer → Projects
        const agencyMap = new Map();
        let grandTotalValue = 0;
        let grandTotalProjects = 0;
        const uniqueCustomers = new Set();

        for (const row of projects) {
            const agencyId = row.agency_id || 0;
            const agencyKey = agencyId;
            
            if (!agencyMap.has(agencyKey)) {
                agencyMap.set(agencyKey, {
                    id: agencyId,
                    code: row.agency_code || 'N/A',
                    name: row.agency_name || 'Chưa gán chi nhánh',
                    address: row.agency_address || '',
                    phone: row.agency_phone || '',
                    region: row.agency_region || '',
                    manager: row.agency_manager || '',
                    total_customers: 0,
                    total_projects: 0,
                    total_value: 0,
                    customers: new Map()
                });
            }

            const agency = agencyMap.get(agencyKey);
            const customerId = row.customer_id || 0;
            const customerKey = customerId;

            if (!agency.customers.has(customerKey)) {
                agency.customers.set(customerKey, {
                    id: customerId,
                    name: row.customer_name || 'Khách lẻ',
                    phone: row.customer_phone || '',
                    email: row.customer_email || '',
                    total_projects: 0,
                    total_value: 0,
                    projects: []
                });
            }

            const customer = agency.customers.get(customerKey);
            const projectValue = parseFloat(row.total_value) || 0;
            
            customer.projects.push({
                id: row.project_id,
                code: row.project_code,
                name: row.project_name,
                value: projectValue,
                status: row.status,
                created_at: row.created_at
            });

            customer.total_projects++;
            customer.total_value += projectValue;
            agency.total_projects++;
            agency.total_value += projectValue;
            grandTotalProjects++;
            grandTotalValue += projectValue;
            uniqueCustomers.add(`${agencyId}_${customerId}`);
        }

        // Convert Maps to arrays and count customers per agency
        const agencies = [];
        for (const [, agency] of agencyMap) {
            const customersList = [];
            for (const [, customer] of agency.customers) {
                customersList.push(customer);
            }
            agency.total_customers = customersList.length;
            agencies.push({
                ...agency,
                customers: customersList
            });
        }

        // Load all agencies for dropdown filter
        const [allAgencies] = await db.query('SELECT id, code, name FROM agencies WHERE status = "active" ORDER BY name');

        res.json({
            success: true,
            data: {
                agencies: agencies,
                all_agencies: allAgencies,
                grand_total: {
                    agencies: agencyMap.size,
                    customers: uniqueCustomers.size,
                    projects: grandTotalProjects,
                    value: grandTotalValue
                }
            }
        });

    } catch (err) {
        console.error('Error generating branch project report:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * GET Profit/Loss Report
 * Báo cáo Lãi/Lỗ theo dự án
 */
exports.getProfitLossReport = async (req, res) => {
    try {
        const { startDate, endDate, projectId } = req.query;

        // Build filters
        let whereClause = "WHERE p.status != 'cancelled'";
        let params = [];

        if (projectId) {
            whereClause += " AND p.id = ?";
            params.push(projectId);
        }

        if (startDate) {
            whereClause += " AND p.created_at >= ?";
            params.push(startDate);
        }

        if (endDate) {
            whereClause += " AND p.created_at <= ?";
            params.push(endDate + ' 23:59:59');
        }

        // Main query: Projects with summed revenue and expenses
        const [rows] = await db.query(`
            SELECT 
                p.id as project_id,
                p.project_code,
                p.project_name,
                c.full_name as customer_name,
                p.total_value as contract_value,
                p.status as project_status,
                p.created_at,
                (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions 
                 WHERE project_id = p.id AND transaction_type = 'revenue' AND status = 'posted') as total_revenue,
                (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions 
                 WHERE project_id = p.id AND transaction_type = 'expense' AND status = 'posted') as total_expense
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            ${whereClause}
            ORDER BY p.created_at DESC
        `, params);

        // Process results to add profit and margin
        const projects = rows.map(p => {
            const revenue = parseFloat(p.total_revenue) || 0;
            const expense = parseFloat(p.total_expense) || 0;
            const profit = revenue - expense;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
            
            return {
                ...p,
                total_revenue: revenue,
                total_expense: expense,
                profit: profit,
                margin_percent: margin.toFixed(2)
            };
        });

        // Totals
        const summary = projects.reduce((acc, p) => {
            acc.total_contract += parseFloat(p.contract_value) || 0;
            acc.total_revenue += p.total_revenue;
            acc.total_expense += p.total_expense;
            acc.total_profit += p.profit;
            return acc;
        }, { total_contract: 0, total_revenue: 0, total_expense: 0, total_profit: 0 });

        res.json({
            success: true,
            data: {
                projects,
                summary
            }
        });
    } catch (err) {
        console.error('Error getting profit loss report:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

/**
 * GET Material Cost Report
 * Báo cáo chi phí vật tư theo dự án
 */
exports.getMaterialCostReport = async (req, res) => {
    try {
        const { startDate, endDate, projectId } = req.query;

        let whereClause = "WHERE 1=1";
        let params = [];

        if (projectId) {
            whereClause += " AND p.id = ?";
            params.push(projectId);
        }

        if (startDate) {
            whereClause += " AND pm.created_at >= ?";
            params.push(startDate);
        }

        if (endDate) {
            whereClause += " AND pm.created_at <= ?";
            params.push(endDate + ' 23:59:59');
        }

        // Query material details joined with projects
        const [rows] = await db.query(`
            SELECT 
                p.id as project_id,
                p.project_code,
                p.project_name,
                c.full_name as customer_name,
                pm.material_type,
                pm.material_name,
                pm.material_code,
                pm.quantity,
                pm.unit,
                pm.unit_price,
                pm.total_cost,
                pm.created_at as export_date
            FROM project_materials pm
            INNER JOIN projects p ON pm.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            ${whereClause}
            ORDER BY p.id DESC, pm.created_at DESC
        `, params);

        // Group by project
        const projectMap = new Map();
        let grandTotal = 0;

        rows.forEach(row => {
            if (!projectMap.has(row.project_id)) {
                projectMap.set(row.project_id, {
                    project_id: row.project_id,
                    project_code: row.project_code,
                    project_name: row.project_name,
                    customer_name: row.customer_name,
                    total_material_cost: 0,
                    items: []
                });
            }

            const project = projectMap.get(row.project_id);
            const cost = parseFloat(row.total_cost) || 0;
            
            project.items.push({
                type: row.material_type,
                name: row.material_name,
                code: row.material_code,
                quantity: row.quantity,
                unit: row.unit,
                unit_price: row.unit_price,
                total_cost: cost,
                date: row.export_date
            });

            project.total_material_cost += cost;
            grandTotal += cost;
        });

        res.json({
            success: true,
            data: {
                projects: Array.from(projectMap.values()),
                grand_total_cost: grandTotal
            }
        });
    } catch (err) {
        console.error('Error getting material cost report:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

/**
 * GET Advanced Cash Flow Report
 * Báo cáo Thu Chi nâng cao (đa chiều, Dashboard)
 */
exports.getAdvancedCashFlowReport = async (req, res) => {
    try {
        const { startDate, endDate, projectId } = req.query;

        let dateFilter = "WHERE status = 'posted'";
        let params = [];

        if (startDate && endDate) {
            dateFilter += " AND transaction_date >= ? AND transaction_date <= ?";
            params = [startDate, endDate + ' 23:59:59'];
        }

        if (projectId) {
            dateFilter += " AND project_id = ?";
            params.push(projectId);
        }

        // 1. KPI Summary
        const [kpiRows] = await db.query(`
            SELECT 
                transaction_type, 
                SUM(amount) as total
            FROM financial_transactions
            ${dateFilter}
            GROUP BY transaction_type
        `, params);

        let totalIn = 0, totalOut = 0;
        kpiRows.forEach(row => {
            if (row.transaction_type === 'revenue') totalIn = parseFloat(row.total) || 0;
            else totalOut = parseFloat(row.total) || 0;
        });

        // 2. By Category (Revenue)
        const [revByCategory] = await db.query(`
            SELECT category, SUM(amount) as total
            FROM financial_transactions
            ${dateFilter} AND transaction_type = 'revenue'
            GROUP BY category
            ORDER BY total DESC
        `, params);

        // 3. By Expense Type (Expense)
        const [expByType] = await db.query(`
            SELECT expense_type, SUM(amount) as total
            FROM financial_transactions
            ${dateFilter} AND transaction_type = 'expense'
            GROUP BY expense_type
            ORDER BY total DESC
        `, params);

        // 4. By Payment Method
        const [byPaymentMethod] = await db.query(`
            SELECT payment_method, transaction_type, SUM(amount) as total
            FROM financial_transactions
            ${dateFilter}
            GROUP BY payment_method, transaction_type
        `, params);

        // 5. Daily Trend
        const [dailyTrend] = await db.query(`
            SELECT 
                DATE(transaction_date) as date,
                SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense
            FROM financial_transactions
            ${dateFilter}
            GROUP BY DATE(transaction_date)
            ORDER BY date ASC
        `, params);

        res.json({
            success: true,
            data: {
                summary: {
                    total_revenue: totalIn,
                    total_expense: totalOut,
                    net_cash_flow: totalIn - totalOut,
                    expense_ratio: totalIn > 0 ? (totalOut / totalIn * 100).toFixed(2) : 0
                },
                categories: {
                    revenue: revByCategory,
                    expense: expByType
                },
                payment_methods: byPaymentMethod,
                trend: dailyTrend
            }
        });
    } catch (err) {
        console.error('Error getting advanced cash flow report:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};
