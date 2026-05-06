/**
 * =============================================================
 * FINANCIAL TRANSACTION HELPER
 * =============================================================
 * 
 * Module helper để tạo phiếu thu/chi tự động một cách an toàn
 * Sử dụng transaction và retry logic để tránh duplicate
 * 
 * @author ViralWindow Development Team (Senior Developer)
 * @version 2.0
 * =============================================================
 */

const db = require("../config/db");

/**
 * Tạo mã giao dịch unique với retry logic
 * Format: THU-2026-0001, CHI-2026-0001
 * 
 * @param {Object} connection - MySQL connection (trong transaction)
 * @param {string} type - 'revenue' hoặc 'expense'
 * @param {number} maxRetries - Số lần thử tối đa (default: 10)
 * @returns {string} - Mã giao dịch unique
 */
async function generateUniqueTransactionCode(connection, type, maxRetries = 10) {
    const prefix = type === 'revenue' ? 'THU' : 'CHI';
    const year = new Date().getFullYear();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Lấy số thứ tự lớn nhất hiện tại
        const [rows] = await connection.query(`
            SELECT MAX(CAST(SUBSTRING_INDEX(transaction_code, '-', -1) AS UNSIGNED)) as max_num
            FROM financial_transactions 
            WHERE transaction_code LIKE ? AND transaction_code REGEXP ?
        `, [`${prefix}-${year}-%`, `^${prefix}-${year}-[0-9]+$`]);

        const nextNum = (rows[0]?.max_num || 0) + 1 + attempt;
        const code = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;

        // Kiểm tra trùng
        const [check] = await connection.query(
            'SELECT id FROM financial_transactions WHERE transaction_code = ?',
            [code]
        );

        if (check.length === 0) {
            console.log(`✅ [FinancialHelper] Generated code: ${code} (attempt ${attempt + 1})`);
            return code;
        }

        console.log(`⚠️ [FinancialHelper] Code ${code} exists, retrying...`);
    }

    // Fallback với timestamp để đảm bảo unique
    const timestamp = Date.now().toString().slice(-8);
    const fallbackCode = `${prefix}-${year}-T${timestamp}`;
    console.log(`⚠️ [FinancialHelper] Using fallback code: ${fallbackCode}`);
    return fallbackCode;
}

/**
 * Tạo phiếu thu/chi hoàn chỉnh với items
 * 
 * @param {Object} options - Thông tin phiếu
 * @param {string} options.type - 'revenue' hoặc 'expense'
 * @param {string} options.category - Danh mục (Tiền đặt cọc, Chi phí vật tư...)
 * @param {string} options.expenseType - Loại chi phí (material, labor, purchase...)
 * @param {number} options.amount - Tổng số tiền
 * @param {string} options.description - Mô tả
 * @param {number} options.projectId - ID dự án (optional)
 * @param {number} options.customerId - ID khách hàng (optional)
 * @param {string} options.referenceNumber - Số tham chiếu để tránh duplicate
 * @param {string} options.status - 'draft', 'posted' (default: 'draft')
 * @param {Array} options.items - Danh sách items [{name, code, quantity, unit, unitPrice, amount, sourceType, sourceId}]
 * @param {Object} connection - MySQL connection (optional, sẽ tạo mới nếu không có)
 * @returns {Object} - {success, transactionId, transactionCode, message}
 */
async function createFinancialTransaction(options) {
    const {
        type,
        category,
        expenseType = null,
        supplier = null,
        amount,
        description,
        projectId = null,
        customerId = null,
        referenceNumber = null,
        status = 'draft',
        items = [],
        connection: externalConnection = null
    } = options;

    let connection = externalConnection;
    let shouldReleaseConnection = false;

    try {
        // Tạo connection mới nếu không có
        if (!connection) {
            connection = await db.getConnection();
            shouldReleaseConnection = true;
            await connection.beginTransaction();
        }

        // Kiểm tra reference_number đã tồn tại chưa
        if (referenceNumber) {
            const [existing] = await connection.query(
                'SELECT id, transaction_code FROM financial_transactions WHERE reference_number = ?',
                [referenceNumber]
            );

            if (existing.length > 0) {
                console.log(`ℹ️ [FinancialHelper] Transaction already exists for ${referenceNumber}: ${existing[0].transaction_code}`);
                return {
                    success: false,
                    alreadyExists: true,
                    transactionId: existing[0].id,
                    transactionCode: existing[0].transaction_code,
                    message: `Phiếu ${type === 'revenue' ? 'thu' : 'chi'} đã tồn tại`
                };
            }
        }

        // Tạo mã giao dịch unique
        const transactionCode = await generateUniqueTransactionCode(connection, type);
        const today = new Date().toISOString().split('T')[0];

        // INSERT phiếu chính
        const [result] = await connection.query(`
            INSERT INTO financial_transactions
            (transaction_code, transaction_date, transaction_type, category, expense_type, supplier,
             amount, description, project_id, customer_id, reference_number, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            transactionCode,
            today,
            type,
            category,
            expenseType,
            supplier,
            parseFloat(amount) || 0,
            description,
            projectId,
            customerId,
            referenceNumber,
            status
        ]);

        const transactionId = result.insertId;
        console.log(`✅ [FinancialHelper] Created transaction ${transactionCode} (ID: ${transactionId})`);

        // INSERT items nếu có
        if (items && items.length > 0) {
            for (const item of items) {
                const itemAmount = item.amount || (item.quantity || 1) * (item.unitPrice || 0);

                await connection.query(`
                    INSERT INTO financial_transaction_items
                    (transaction_id, item_type, item_name, item_code, specification, quantity, unit, unit_price, amount, source_type, source_id, note)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    transactionId,
                    item.itemType || 'other',
                    item.name || 'N/A',
                    item.code || null,
                    item.specification || null,
                    item.quantity || 1,
                    item.unit || 'cái',
                    item.unitPrice || 0,
                    itemAmount,
                    item.sourceType || null,
                    item.sourceId || null,
                    item.note || null
                ]);
            }
            console.log(`✅ [FinancialHelper] Created ${items.length} items for transaction ${transactionCode}`);
        }

        // Commit nếu là connection riêng
        if (shouldReleaseConnection) {
            await connection.commit();
        }

        return {
            success: true,
            transactionId,
            transactionCode,
            itemsCount: items.length,
            message: `Đã tạo phiếu ${type === 'revenue' ? 'thu' : 'chi'} ${transactionCode}`
        };

    } catch (error) {
        console.error('❌ [FinancialHelper] Error creating transaction:', error.message);

        if (shouldReleaseConnection && connection) {
            await connection.rollback();
        }

        throw error;
    } finally {
        if (shouldReleaseConnection && connection) {
            connection.release();
        }
    }
}

/**
 * Tạo Phiếu Thu Đặt Cọc từ Báo Giá
 * 
 * @param {Object} quotation - Thông tin báo giá
 * @param {Array} quotationItems - Danh sách sản phẩm
 * @param {Object} connection - MySQL connection (optional)
 * @returns {Object} - Kết quả tạo phiếu
 */
async function createDepositReceiptFromQuotation(quotation, quotationItems = [], connection = null) {
    // ✅ FIX: Dùng total_amount (giá cuối cùng) làm căn cứ tính đặt cọc
    // Nếu không có total_amount mới dùng subtotal
    const baseAmount = parseFloat(quotation.total_amount) || parseFloat(quotation.subtotal) || 0;
    const depositPercent = quotation.deposit_percent || 40;
    const depositAmount = quotation.deposit_amount || Math.round(baseAmount * depositPercent / 100);

    console.log(`📊 [FinancialHelper] Deposit calculation:`, {
        subtotal: quotation.subtotal,
        total_amount: quotation.total_amount,
        baseAmount,
        depositPercent,
        depositAmount
    });

    // Chuẩn bị items
    const items = quotationItems.map(item => ({
        itemType: 'product',
        name: item.name || item.product_name || 'Sản phẩm',
        code: item.code || item.product_code || null,
        specification: `${item.width || 0}x${item.height || 0}mm${item.color ? ' - ' + item.color : ''}`,
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || 'bộ',
        unitPrice: parseFloat(item.unit_price) || parseFloat(item.total_price) / (parseFloat(item.quantity) || 1) || 0,
        amount: (parseFloat(item.total_price) || 0) * depositPercent / 100,
        sourceType: 'quotation_item',
        sourceId: item.id
    }));

    const description = `Tiền đặt cọc ${depositPercent}% từ báo giá ${quotation.quotation_code}` +
        (quotation.customer_name ? ` - KH: ${quotation.customer_name}` : '') +
        (quotation.project_name ? ` - DA: ${quotation.project_name}` : '');

    return await createFinancialTransaction({
        type: 'revenue',
        category: 'Tiền đặt cọc',
        amount: depositAmount,
        description,
        projectId: quotation.project_id,
        customerId: quotation.customer_id,
        referenceNumber: `DEPOSIT-${quotation.id}`,
        status: 'draft',
        items,
        connection
    });
}

/**
 * Tạo Phiếu Chi từ Phiếu Kho (Nhập/Xuất)
 * 
 * @param {Object} stockDoc - Thông tin phiếu kho
 * @param {Array} stockLines - Danh sách vật tư
 * @param {Object} connection - MySQL connection
 * @returns {Object} - Kết quả tạo phiếu
 */
async function createExpenseFromStockDocument(stockDoc, stockLines = [], connection) {
    const totalValue = parseFloat(stockDoc.total_value) || 0;

    if (totalValue <= 0) {
        console.log(`ℹ️ [FinancialHelper] Skipping expense creation - total_value is 0`);
        return { success: false, skipped: true, message: 'Tổng giá trị = 0, không tạo phiếu chi' };
    }

    // Chuẩn bị items
    const items = stockLines.map(line => ({
        itemType: 'material',
        name: line.item_name || 'Vật tư',
        code: line.item_code || null,
        specification: null,
        quantity: parseFloat(line.qty) || 0,
        unit: line.unit || 'cái',
        unitPrice: parseFloat(line.unit_price) || 0,
        amount: parseFloat(line.line_total) || 0,
        sourceType: 'stock_document_line',
        sourceId: line.id
    }));

    const docTypeLabel = stockDoc.doc_type === 'import' ? 'Nhập kho' : 'Xuất kho';
    const category = stockDoc.doc_type === 'import' ? 'Chi phí nhập kho' : 'Chi phí xuất kho';
    const expenseType = stockDoc.doc_type === 'import' ? 'purchase' : 'material';

    let description = `${docTypeLabel} theo phiếu ${stockDoc.doc_no}`;
    if (stockDoc.project_name) description += ` - DA: ${stockDoc.project_name}`;
    if (stockDoc.supplier_name) description += ` - NCC: ${stockDoc.supplier_name}`;

    return await createFinancialTransaction({
        type: 'expense',
        category,
        expenseType,
        supplier: stockDoc.supplier_name || null,
        amount: totalValue,
        description,
        projectId: stockDoc.project_id,
        referenceNumber: `STOCK-${stockDoc.doc_no}`,
        status: 'draft',
        items,
        connection
    });
}

/**
 * Tạo Phiếu Chi từ Phiếu Yêu Cầu Vật Tư
 * 
 * @param {Object} purchaseRequest - Thông tin phiếu yêu cầu
 * @param {Array} materials - Danh sách vật tư ({name, code, quantity, unit, unitPrice})
 * @param {number} totalCost - Tổng chi phí
 * @param {Object} connection - MySQL connection
 * @returns {Object} - Kết quả tạo phiếu
 */
async function createExpenseFromPurchaseRequest(purchaseRequest, materials = [], totalCost, connection) {
    if (totalCost <= 0) {
        console.log(`ℹ️ [FinancialHelper] Skipping expense creation - totalCost is 0`);
        return { success: false, skipped: true, message: 'Tổng chi phí = 0, không tạo phiếu chi' };
    }

    const items = materials.map((mat, index) => ({
        itemType: 'material',
        name: mat.name || mat.item_name || `Vật tư ${index + 1}`,
        code: mat.code || mat.item_code || null,
        specification: mat.specification || null,
        quantity: parseFloat(mat.quantity) || parseFloat(mat.qty) || 0,
        unit: mat.unit || 'cái',
        unitPrice: parseFloat(mat.unit_price) || parseFloat(mat.unitPrice) || 0,
        amount: parseFloat(mat.amount) || parseFloat(mat.total) || (parseFloat(mat.quantity || mat.qty || 0) * parseFloat(mat.unit_price || mat.unitPrice || 0)),
        sourceType: 'purchase_request_item',
        sourceId: mat.id || null
    }));

    let description = `Yêu cầu vật tư theo phiếu ${purchaseRequest.request_code || purchaseRequest.id}`;
    if (purchaseRequest.project_name) description += ` - DA: ${purchaseRequest.project_name}`;

    return await createFinancialTransaction({
        type: 'expense',
        category: 'Chi phí yêu cầu vật tư',
        expenseType: 'material',
        amount: totalCost,
        description,
        projectId: purchaseRequest.project_id,
        referenceNumber: `PURCHASE-${purchaseRequest.id}`,
        status: 'draft',
        items,
        connection
    });
}

// Export các functions
module.exports = {
    generateUniqueTransactionCode,
    createFinancialTransaction,
    createDepositReceiptFromQuotation,
    createExpenseFromStockDocument,
    createExpenseFromPurchaseRequest
};
