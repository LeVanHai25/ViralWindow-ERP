const db = require("../config/db");

/**
 * Controller quản lý phiếu yêu cầu vật tư
 */

// Mapping category -> material group
const CATEGORY_TO_GROUP = {
    'nhom': 'ALUMINUM',
    'kinh': 'GLASS',
    'phukien': 'HARDWARE',
    'vattu': 'ACCESSORY'
};

/**
 * Tra cứu đơn giá từ bảng kho dựa trên mã vật tư
 * Hỗ trợ: aluminum_systems, accessories, inventory
 * @param {string} code - Mã vật tư
 * @param {string} category - Loại vật tư (nhom, kinh, phukien, vattu)
 * @returns {number} - Đơn giá (VNĐ) hoặc 0 nếu không tìm thấy
 */
async function lookupMaterialPrice(code, category) {
    if (!code) return 0;

    try {
        let price = 0;

        // Tra cứu theo loại vật tư
        if (category === 'nhom') {
            // Tra cứu từ bảng aluminum_systems
            const [rows] = await db.query(
                `SELECT unit_price FROM aluminum_systems WHERE code = ? LIMIT 1`,
                [code]
            );
            if (rows.length > 0 && rows[0].unit_price) {
                price = parseFloat(rows[0].unit_price) || 0;
            }
        } else if (category === 'phukien' || category === 'vattu') {
            // Tra cứu từ bảng accessories
            const [rows] = await db.query(
                `SELECT purchase_price FROM accessories WHERE code = ? LIMIT 1`,
                [code]
            );
            if (rows.length > 0 && rows[0].purchase_price) {
                price = parseFloat(rows[0].purchase_price) || 0;
            }
        } else if (category === 'kinh') {
            // Tra cứu từ bảng inventory (kính thường lưu ở inventory)
            const [rows] = await db.query(
                `SELECT price FROM inventory WHERE code = ? LIMIT 1`,
                [code]
            );
            if (rows.length > 0 && rows[0].price) {
                price = parseFloat(rows[0].price) || 0;
            }
        }

        // Fallback: tra cứu từ bảng inventory nếu không tìm thấy
        if (price === 0) {
            const [rows] = await db.query(
                `SELECT price FROM inventory WHERE code = ? LIMIT 1`,
                [code]
            );
            if (rows.length > 0 && rows[0].price) {
                price = parseFloat(rows[0].price) || 0;
            }
        }

        return price;
    } catch (err) {
        console.error('Error looking up material price:', err.message);
        return 0;
    }
}

/**
 * Tính tổng chi phí vật tư từ danh sách vật tư
 * Ưu tiên sử dụng unit_price từ frontend, nếu không có thì tra cứu từ kho
 * @param {Object} materials - Object chứa {nhom, kinh, phukien, vattu}
 * @returns {Object} - { totalCost, itemsWithPrice }
 */
async function calculateTotalMaterialCost(materials) {
    let totalCost = 0;
    const itemsWithPrice = {
        nhom: [],
        kinh: [],
        phukien: [],
        vattu: []
    };

    const categories = ['nhom', 'kinh', 'phukien', 'vattu'];

    for (const category of categories) {
        const items = materials[category];
        if (!items || !Array.isArray(items)) continue;

        for (const item of items) {
            const quantity = parseFloat(item.quantity || item.panels || 0);

            // 1. Ưu tiên sử dụng unit_price từ frontend (nếu có)
            let unitPrice = parseFloat(item.unit_price || 0);

            // 2. Nếu không có, tra cứu từ bảng kho
            if (unitPrice === 0 && item.code) {
                unitPrice = await lookupMaterialPrice(item.code, category);
            }

            const lineCost = quantity * unitPrice;
            totalCost += lineCost;

            // Lưu lại thông tin đã tính giá
            itemsWithPrice[category].push({
                ...item,
                unit_price_resolved: unitPrice,
                line_cost: lineCost
            });
        }
    }

    return { totalCost, itemsWithPrice };
}

/**
 * Tạo mã giao dịch tài chính unique
 * @param {string} prefix - Tiền tố (THU/CHI)
 * @returns {string} - Mã giao dịch unique
 */
async function generateFinancialTransactionCode(prefix) {
    const year = new Date().getFullYear();
    let maxAttempts = 10;
    let attempt = 0;
    let transactionCode = null;

    while (attempt < maxAttempts) {
        const [maxCodeRows] = await db.query(`
            SELECT transaction_code 
            FROM financial_transactions 
            WHERE transaction_code LIKE ? AND transaction_type = ?
            ORDER BY CAST(SUBSTRING(transaction_code, 9) AS UNSIGNED) DESC
            LIMIT 1
        `, [`${prefix}-${year}-%`, prefix === 'THU' ? 'revenue' : 'expense']);

        let nextNumber = 1;
        if (maxCodeRows.length > 0 && maxCodeRows[0].transaction_code) {
            const match = maxCodeRows[0].transaction_code.match(new RegExp(`${prefix}-\\d+-(\\d+)`));
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }

        transactionCode = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;

        // Kiểm tra xem code đã tồn tại chưa
        const [checkExisting] = await db.query(
            "SELECT id FROM financial_transactions WHERE transaction_code = ?",
            [transactionCode]
        );

        if (checkExisting.length === 0) {
            break;
        }

        nextNumber++;
        attempt++;
    }

    if (attempt >= maxAttempts) {
        const timestamp = Date.now().toString().slice(-6);
        transactionCode = `${prefix}-${year}-${timestamp}`;
    }

    return transactionCode;
}


/**
 * Sync material status to order_material_status table
 * This ensures "Theo dõi dự án" view shows correct status when purchase requests are created/updated
 */
async function syncMaterialStatusForProject(projectId, requiredDate, materials, userId) {
    if (!projectId) return;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Process each material category
        const categories = ['nhom', 'kinh', 'phukien', 'vattu'];

        for (const category of categories) {
            const group = CATEGORY_TO_GROUP[category];
            const items = materials[category];

            // Only update if there are items for this category
            if (items && Array.isArray(items) && items.length > 0) {
                // Upsert into order_material_status
                // Set status to ORDERED since a purchase request has been created
                await connection.query(`
                    INSERT INTO order_material_status 
                        (order_id, material_type, status, plan_date, updated_by, updated_at)
                    VALUES (?, ?, 'ORDERED', ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE
                        plan_date = COALESCE(VALUES(plan_date), plan_date),
                        status = CASE 
                            WHEN status IN ('DELIVERED', 'READY') THEN status 
                            ELSE 'ORDERED' 
                        END,
                        updated_by = VALUES(updated_by),
                        updated_at = NOW()
                `, [projectId, group, requiredDate || null, userId || 1]);

                console.log(`✅ Synced ${group} status for project ${projectId}: ORDERED, date: ${requiredDate}`);
            }
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        console.error('Error syncing material status:', err.message);
        // Don't throw - this is a non-critical operation
    } finally {
        connection.release();
    }
}

// Auto-migrate: Tạo bảng purchase_requests nếu chưa tồn tại
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Mã phiếu yêu cầu',
                project_id INT NULL COMMENT 'ID dự án',
                project_name VARCHAR(255) NULL COMMENT 'Tên dự án',
                order_code VARCHAR(100) NULL COMMENT 'Mã đơn hàng',
                product_type VARCHAR(100) NULL COMMENT 'Chủng loại',
                color VARCHAR(100) NULL COMMENT 'Màu sắc',
                delivery_address TEXT NULL COMMENT 'Địa chỉ giao hàng',
                created_date DATE NULL COMMENT 'Ngày tạo',
                required_date DATE NULL COMMENT 'Ngày cần vật tư về',
                nhom_data JSON NULL COMMENT 'Dữ liệu nhôm',
                vattu_data JSON NULL COMMENT 'Dữ liệu vật tư phụ',
                phukien_data JSON NULL COMMENT 'Dữ liệu phụ kiện',
                kinh_data JSON NULL COMMENT 'Dữ liệu kính',
                status ENUM('draft', 'submitted', 'approved', 'rejected', 'completed') DEFAULT 'draft',
                notes TEXT NULL,
                created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_request_code (request_code),
                INDEX idx_project_id (project_id),
                INDEX idx_status (status),
                INDEX idx_created_date (created_date),
                INDEX idx_required_date (required_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng purchase_requests đã sẵn sàng');
    } catch (err) {
        console.error('❌ Lỗi tạo bảng purchase_requests:', err.message);
    }
})();

// Tạo mã phiếu tự động
async function generateRequestCode() {
    const date = new Date();
    const dateStr = date.getFullYear().toString().substring(2) +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0');

    // Tìm số thứ tự cuối cùng trong ngày
    const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM purchase_requests 
         WHERE request_code LIKE ?`,
        [`YC-${dateStr}-%`]
    );

    const sequence = (rows[0].count || 0) + 1;
    return `YC-${dateStr}-${sequence.toString().padStart(3, '0')}`;
}

// GET /api/purchase-requests - Lấy danh sách phiếu yêu cầu
exports.getAll = async (req, res) => {
    try {
        const { status, project_id, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let params = [];

        if (status) {
            whereConditions.push('pr.status = ?');
            params.push(status);
        }

        if (project_id) {
            whereConditions.push('pr.project_id = ?');
            params.push(project_id);
        }

        if (search) {
            whereConditions.push('(pr.request_code LIKE ? OR pr.project_name LIKE ? OR pr.order_code LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Lấy tổng số
        const [countRows] = await db.query(
            `SELECT COUNT(*) as total FROM purchase_requests pr ${whereClause}`,
            params
        );
        const total = countRows[0].total;

        // Lấy dữ liệu
        const [rows] = await db.query(
            `SELECT pr.*, 
                    u.full_name as created_by_name,
                    p.project_code, p.project_name as project_name_full
             FROM purchase_requests pr
             LEFT JOIN users u ON pr.created_by = u.id
             LEFT JOIN projects p ON pr.project_id = p.id
             ${whereClause}
             ORDER BY pr.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        // Calculate item_count for each request
        const requestsWithCount = rows.map(request => {
            let itemCount = 0;
            try {
                if (request.nhom_data) {
                    const nhom = typeof request.nhom_data === 'string' ? JSON.parse(request.nhom_data) : request.nhom_data;
                    if (Array.isArray(nhom)) itemCount += nhom.length;
                }
                if (request.kinh_data) {
                    const kinh = typeof request.kinh_data === 'string' ? JSON.parse(request.kinh_data) : request.kinh_data;
                    if (Array.isArray(kinh)) itemCount += kinh.length;
                }
                if (request.phukien_data) {
                    const phukien = typeof request.phukien_data === 'string' ? JSON.parse(request.phukien_data) : request.phukien_data;
                    if (Array.isArray(phukien)) itemCount += phukien.length;
                }
                if (request.vattu_data) {
                    const vattu = typeof request.vattu_data === 'string' ? JSON.parse(request.vattu_data) : request.vattu_data;
                    if (Array.isArray(vattu)) itemCount += vattu.length;
                }
            } catch (e) {
                console.error('Error counting items:', e);
            }
            return { ...request, item_count: itemCount };
        });

        res.json({
            success: true,
            data: requestsWithCount,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error getting purchase requests:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

// GET /api/purchase-requests/pending-count - Đếm số phiếu đang chờ duyệt
exports.getPendingCount = async (req, res) => {
    try {
        // Đếm các phiếu (draft, submitted) chưa được duyệt VÀ chưa đọc (is_read = FALSE hoặc NULL)
        const [rows] = await db.query(
            `SELECT COUNT(*) as count FROM purchase_requests WHERE status IN ('draft', 'submitted') AND (is_read = FALSE OR is_read IS NULL)`
        );
        res.json({ success: true, count: rows[0].count });
    } catch (err) {
        console.error('Error counting pending purchase requests:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message, count: 0 });
    }
};

// PUT /api/purchase-requests/:id/read - Đánh dấu là đã đọc
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`UPDATE purchase_requests SET is_read = TRUE WHERE id = ?`, [id]);
        res.json({ success: true, message: "Đã đánh dấu là đã đọc" });
    } catch (err) {
        console.error('Error marking as read:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

// GET /api/purchase-requests/:id - Lấy chi tiết phiếu yêu cầu
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT pr.*, 
                    u.full_name as created_by_name,
                    p.project_code, p.project_name as project_name_full
             FROM purchase_requests pr
             LEFT JOIN users u ON pr.created_by = u.id
             LEFT JOIN projects p ON pr.project_id = p.id
             WHERE pr.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy phiếu yêu cầu" });
        }

        // Parse JSON data
        const request = rows[0];
        try {
            if (request.nhom_data && typeof request.nhom_data === 'string') {
                request.nhom_data = JSON.parse(request.nhom_data);
            }
            if (request.vattu_data && typeof request.vattu_data === 'string') {
                request.vattu_data = JSON.parse(request.vattu_data);
            }
            if (request.phukien_data && typeof request.phukien_data === 'string') {
                request.phukien_data = JSON.parse(request.phukien_data);
            }
            if (request.kinh_data && typeof request.kinh_data === 'string') {
                request.kinh_data = JSON.parse(request.kinh_data);
            }
        } catch (parseErr) {
            console.error('Error parsing JSON data:', parseErr);
            // Set to empty arrays if parse fails
            request.nhom_data = [];
            request.vattu_data = [];
            request.phukien_data = [];
            request.kinh_data = [];
        }

        // Convert JSON data to items array for frontend
        const items = [];

        // Add nhom items
        if (request.nhom_data && Array.isArray(request.nhom_data)) {
            request.nhom_data.forEach(item => {
                const density = parseFloat(item.density) || parseFloat(item.tỷ_trọng) || 0;
                const lengthM = parseFloat(item.length_m) || parseFloat(item.met) || parseFloat(item.length) || 6;
                const quantity = parseInt(item.quantity) || 0;
                // ✅ Auto-calculate weight: density (kg/m) × length (m) × quantity
                // If density or quantity is 0, fall back to stored weight
                const calculatedWeight = (density > 0 && quantity > 0)
                    ? (density * lengthM * quantity).toFixed(2)
                    : (item.weight || item.khối_lượng || '');

                items.push({
                    material_type: 'nhom',
                    material_code: item.code || item.material_code || '',
                    material_name: item.name || item.material_name || '',
                    unit: item.unit || 'cây',
                    quantity: quantity,
                    density: density || '',
                    length_m: lengthM,
                    weight: calculatedWeight,
                    notes: item.notes || item.note || item.ghi_chú || ''
                });
            });
        }

        // Add kinh items
        if (request.kinh_data && Array.isArray(request.kinh_data)) {
            request.kinh_data.forEach(item => {
                const width = parseFloat(item.width) || parseFloat(item.rộng) || parseFloat(item.width_mm) || 0;
                const height = parseFloat(item.height) || parseFloat(item.cao) || parseFloat(item.height_mm) || 0;
                const panels = parseInt(item.panels) || parseInt(item.số_tấm) || parseInt(item.quantity) || 0;
                // Calculate area if not provided: (width * height * panels) / 1,000,000 (mm² to m²)
                const area = parseFloat(item.area) || parseFloat(item.diện_tích) || parseFloat(item.area_m2) ||
                    (width > 0 && height > 0 && panels > 0 ? ((width * height * panels) / 1000000).toFixed(2) : '');

                items.push({
                    material_type: 'kinh',
                    material_code: item.code || item.material_code || '',
                    // ✅ FIX: Map name/type to both material_name and glass_type for frontend compatibility
                    material_name: item.name || item.type || item.material_name || item.loại_kính || '',
                    glass_type: item.name || item.type || item.material_name || item.loại_kính || '',
                    unit: item.unit || 'tấm',
                    quantity: panels,
                    width: width,
                    height: height,
                    panels: panels,
                    area: area,
                    notes: item.notes || item.note || item.ghi_chú || ''
                });
            });
        }

        // Add phukien items
        if (request.phukien_data && Array.isArray(request.phukien_data)) {
            request.phukien_data.forEach(item => {
                items.push({
                    material_type: 'phukien',
                    material_code: item.code || item.material_code || '',
                    material_name: item.name || item.material_name || '',
                    unit: item.unit || '',
                    quantity: item.quantity || 0,
                    notes: item.notes || item.note || item.ghi_chú || ''
                });
            });
        }

        // Add vattu items
        if (request.vattu_data && Array.isArray(request.vattu_data)) {
            request.vattu_data.forEach(item => {
                items.push({
                    material_type: 'vattu',
                    material_code: item.code || item.material_code || '',
                    material_name: item.name || item.material_name || '',
                    unit: item.unit || '',
                    quantity: item.quantity || 0,
                    notes: item.notes || item.note || item.ghi_chú || ''
                });
            });
        }

        // Add items array to request
        request.items = items;
        request.item_count = items.length;

        // Determine category
        if (!request.category) {
            if (items.length > 0) {
                const types = [...new Set(items.map(i => i.material_type))];
                if (types.length === 1) {
                    request.category = types[0];
                } else {
                    request.category = 'all';
                }
            } else {
                request.category = 'all';
            }
        }

        res.json({ success: true, data: request });
    } catch (err) {
        console.error('Error getting purchase request:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

// POST /api/purchase-requests - Tạo phiếu yêu cầu mới
exports.create = async (req, res) => {
    try {
        const {
            project_id,
            project_name,
            order_code,
            product_type,
            color,
            delivery_address,
            created_date,
            required_date,
            nhom,
            vattu,
            phukien,
            kinh,
            notes,
            status = 'draft'
        } = req.body;

        const userId = req.user?.id || null;
        const request_code = await generateRequestCode();

        // Ensure created_date is set
        const finalCreatedDate = created_date || new Date().toISOString().split('T')[0];

        // DETAILED LOGGING for debugging
        console.log('📥 RECEIVED req.body:', JSON.stringify(req.body, null, 2));
        console.log('📋 nhom from body:', nhom);
        console.log('📋 nhom type:', typeof nhom);
        console.log('📋 nhom is array:', Array.isArray(nhom));
        console.log('📋 nhom stringified:', nhom ? JSON.stringify(nhom) : 'NULL');

        console.log('Creating purchase request with data:', {
            request_code,
            project_name,
            order_code,
            created_date: finalCreatedDate,
            nhom_count: nhom ? nhom.length : 0,
            vattu_count: vattu ? vattu.length : 0,
            phukien_count: phukien ? phukien.length : 0,
            kinh_count: kinh ? kinh.length : 0
        });

        // Values for insert
        const nhomDataValue = nhom ? JSON.stringify(nhom) : null;
        const vattuDataValue = vattu ? JSON.stringify(vattu) : null;
        const phukienDataValue = phukien ? JSON.stringify(phukien) : null;
        const kinhDataValue = kinh ? JSON.stringify(kinh) : null;

        console.log('📤 Storing values:');
        console.log('   nhom_data:', nhomDataValue);
        console.log('   vattu_data:', vattuDataValue);
        console.log('   phukien_data:', phukienDataValue);
        console.log('   kinh_data:', kinhDataValue);

        const [result] = await db.query(
            `INSERT INTO purchase_requests 
             (request_code, project_id, project_name, order_code, product_type, color, 
              delivery_address, created_date, required_date, 
              nhom_data, vattu_data, phukien_data, kinh_data, 
              status, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                request_code,
                project_id || null,
                project_name || null,
                order_code || null,
                product_type || null,
                color || null,
                delivery_address || null,
                finalCreatedDate,
                required_date || null,
                nhomDataValue,
                vattuDataValue,
                phukienDataValue,
                kinhDataValue,
                status,
                notes || null,
                userId
            ]
        );

        console.log('✅ Insert successful, ID:', result.insertId);

        // SYNC: Update order_material_status to reflect the new purchase request
        // This ensures the "Theo dõi dự án" view shows the correct material status
        if (project_id) {
            await syncMaterialStatusForProject(project_id, required_date, {
                nhom: nhom,
                kinh: kinh,
                phukien: phukien,
                vattu: vattu
            }, userId);
        }

        // ============================================================
        // TỰ ĐỘNG TẠO PHIẾU CHI (EXPENSE TRANSACTION) KHI LƯU YÊU CẦU VẬT TƯ
        // ============================================================
        let transactionCreated = false;
        let transactionCode = null;
        let totalCost = 0;

        try {
            const refNumber = `PURCHASE-${result.insertId}`;

            // Kiểm tra xem đã có phiếu chi cho yêu cầu vật tư này chưa
            const [existingTrans] = await db.query(
                "SELECT id FROM financial_transactions WHERE reference_number = ?",
                [refNumber]
            );

            if (existingTrans.length === 0) {
                // Tính tổng chi phí vật tư (tra cứu giá từ kho + giá từ frontend)
                const costResult = await calculateTotalMaterialCost({
                    nhom: nhom || [],
                    kinh: kinh || [],
                    phukien: phukien || [],
                    vattu: vattu || []
                });
                totalCost = costResult.totalCost;

                // Chỉ tạo phiếu chi nếu có chi phí > 0
                if (totalCost > 0) {
                    // Generate unique transaction code
                    transactionCode = await generateFinancialTransactionCode('CHI');

                    // Tạo mô tả chi tiết
                    let description = `Chi phí yêu cầu vật tư ${request_code}`;
                    if (project_name) description += ` - Dự án: ${project_name}`;

                    // Đếm số lượng vật tư theo từng loại
                    const materialCounts = [];
                    if (nhom && nhom.length > 0) materialCounts.push(`${nhom.length} nhôm`);
                    if (kinh && kinh.length > 0) materialCounts.push(`${kinh.length} kính`);
                    if (phukien && phukien.length > 0) materialCounts.push(`${phukien.length} phụ kiện`);
                    if (vattu && vattu.length > 0) materialCounts.push(`${vattu.length} vật tư phụ`);
                    if (materialCounts.length > 0) {
                        description += ` (${materialCounts.join(', ')})`;
                    }

                    // Tạo phiếu chi với status = 'draft' để người dùng có thể kiểm tra và duyệt
                    await db.query(`
                        INSERT INTO financial_transactions
                        (transaction_code, transaction_date, transaction_type, category, expense_type,
                         amount, description, project_id, reference_number, status)
                        VALUES (?, ?, 'expense', 'Chi phí vật tư', 'material', ?, ?, ?, ?, 'draft')
                    `, [
                        transactionCode,
                        finalCreatedDate,
                        totalCost,
                        description,
                        project_id || null,
                        refNumber
                    ]);

                    transactionCreated = true;
                    console.log(`✅ Đã tạo phiếu chi ${transactionCode} cho yêu cầu vật tư ${request_code}, tổng: ${totalCost.toLocaleString('vi-VN')} VNĐ`);
                } else {
                    console.log(`ℹ️ Không tạo phiếu chi vì tổng chi phí = 0 (chưa có thông tin giá vật tư)`);
                }
            }
        } catch (transError) {
            console.error('Lỗi khi tạo phiếu chi tự động:', transError);
            // Không fail việc tạo yêu cầu vật tư nếu lỗi tạo phiếu chi
        }

        res.status(201).json({
            success: true,
            message: "Tạo phiếu yêu cầu thành công" + (transactionCreated ? ` và tạo phiếu chi ${transactionCode}` : ''),
            data: {
                id: result.insertId,
                request_code,
                transaction_code: transactionCode,
                transaction_created: transactionCreated,
                total_cost: totalCost
            }
        });
    } catch (err) {
        console.error('Error creating purchase request:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

// PUT /api/purchase-requests/:id - Cập nhật phiếu yêu cầu
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            project_id,
            project_name,
            order_code,
            product_type,
            color,
            delivery_address,
            created_date,
            required_date,
            nhom,
            vattu,
            phukien,
            kinh,
            notes,
            status
        } = req.body;

        const updateFields = [];
        const updateValues = [];

        if (project_id !== undefined) { updateFields.push('project_id = ?'); updateValues.push(project_id); }
        if (project_name !== undefined) { updateFields.push('project_name = ?'); updateValues.push(project_name); }
        if (order_code !== undefined) { updateFields.push('order_code = ?'); updateValues.push(order_code); }
        if (product_type !== undefined) { updateFields.push('product_type = ?'); updateValues.push(product_type); }
        if (color !== undefined) { updateFields.push('color = ?'); updateValues.push(color); }
        if (delivery_address !== undefined) { updateFields.push('delivery_address = ?'); updateValues.push(delivery_address); }
        if (created_date !== undefined) { updateFields.push('created_date = ?'); updateValues.push(created_date); }
        if (required_date !== undefined) { updateFields.push('required_date = ?'); updateValues.push(required_date); }
        if (nhom !== undefined) { updateFields.push('nhom_data = ?'); updateValues.push(JSON.stringify(nhom)); }
        if (vattu !== undefined) { updateFields.push('vattu_data = ?'); updateValues.push(JSON.stringify(vattu)); }
        if (phukien !== undefined) { updateFields.push('phukien_data = ?'); updateValues.push(JSON.stringify(phukien)); }
        if (kinh !== undefined) { updateFields.push('kinh_data = ?'); updateValues.push(JSON.stringify(kinh)); }
        if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }
        if (notes !== undefined) { updateFields.push('notes = ?'); updateValues.push(notes); }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: "Không có dữ liệu để cập nhật" });
        }

        updateValues.push(id);

        await db.query(
            `UPDATE purchase_requests 
             SET ${updateFields.join(', ')}
             WHERE id = ?`,
            updateValues
        );

        // SYNC: Update order_material_status if required_date or materials changed
        // First, get the project_id from the existing record
        const [existingRows] = await db.query(
            'SELECT project_id FROM purchase_requests WHERE id = ?',
            [id]
        );

        if (existingRows.length > 0 && existingRows[0].project_id) {
            const projectId = existingRows[0].project_id;
            const userId = req.user?.id || null;

            await syncMaterialStatusForProject(projectId, required_date, {
                nhom: nhom,
                kinh: kinh,
                phukien: phukien,
                vattu: vattu
            }, userId);
        }

        res.json({ success: true, message: "Cập nhật phiếu yêu cầu thành công" });
    } catch (err) {
        console.error('Error updating purchase request:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

// DELETE /api/purchase-requests/:id - Xóa phiếu yêu cầu
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM purchase_requests WHERE id = ?', [id]);

        res.json({ success: true, message: "Xóa phiếu yêu cầu thành công" });
    } catch (err) {
        console.error('Error deleting purchase request:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

// PUT /api/purchase-requests/:id/status - Cập nhật trạng thái
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['draft', 'submitted', 'approved', 'rejected', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
        }

        await db.query(
            'UPDATE purchase_requests SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ success: true, message: "Cập nhật trạng thái thành công" });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
};

