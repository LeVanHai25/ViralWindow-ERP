const db = require('../config/db');
const SystemNotifier = require('../services/SystemNotifier');

/**
 * Manufacturing Controller - Smart Status Tracking
 * Option D: Materials determine readiness, User confirms completion
 */

/**
 * Calculate product status based on materials and timestamps
 * Priority: completed > manufacturing > ready/missing/not_assigned
 */
function calculateProductStatus(product) {
    // Priority order: completed first
    if (product.completed_at) return 'completed';
    if (product.started_at) return 'manufacturing';

    // Check materials
    if (product.materials_required_count === 0) {
        return 'not_assigned';
    }

    // Safe division
    const percent = Math.round(
        (product.materials_exported_count / product.materials_required_count) * 100
    );

    if (percent < 100) return 'missing_materials';

    return 'ready';
}

/**
 * Update product status with audit trail
 */
async function updateProductStatus(connection, productId, newStatus) {
    const now = new Date();
    await connection.query(`
        UPDATE product_manufacturing 
        SET last_status = status,
            status = ?,
            status_updated_at = ?
        WHERE product_id = ?
    `, [newStatus, now, productId]);
}

/**
 * Calculate overall progress for a product (3 stages)
 * - 40% for materials ready (materials_percent)
 * - 30% for manufacturing started (started_at exists)
 * - 30% for completed (completed_at exists)
 */
function calculateOverallProgress(mfgData) {
    let progress = 0;

    // Stage 1: Materials ready (40%)
    const materialsPercent = mfgData.materials_percent || 0;
    progress += Math.round((materialsPercent / 100) * 40);

    // Stage 2: Manufacturing started (30%)
    if (mfgData.started_at) {
        progress += 30;
    }

    // Stage 3: Completed (30%)
    if (mfgData.completed_at) {
        progress += 30;
    }

    return Math.min(progress, 100);
}

/**
 * GET /api/manufacturing/projects
 * Get all manufacturing projects with smart status
 */
exports.getManufacturingProjects = async (req, res) => {
    try {
        // ✅ Đảm bảo columns production_step tồn tại
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_step ENUM('preparing', 'manufacturing', 'completed') DEFAULT 'preparing'`);
        } catch (e) { /* Column already exists */ }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_started_at DATETIME NULL`);
        } catch (e) { /* Column already exists */ }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_progress INT DEFAULT 0`);
        } catch (e) { /* Column already exists */ }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_notes TEXT NULL`);
        } catch (e) { /* Column already exists */ }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_photos JSON NULL`);
        } catch (e) { /* Column already exists */ }

        // Get projects that have reached production stage
        // ✅ Thêm production_step, production_started_at, production_progress, production_notes
        // ✅ Thêm construction_address (địa chỉ công trình) và customer_address (địa chỉ khách hàng)
        // ✅ FIX: Sử dụng status thay vì production_step vì production_step có DEFAULT 'preparing'
        // ✅ Dự án hiển thị khi status = 'in_production' trở lên (bao gồm installation, handover, completed)
        const [projects] = await db.query(`
            SELECT DISTINCT
                p.id,
                p.project_code,
                p.project_name,
                p.status as project_status,
                p.start_date,
                p.deadline,
                p.production_step,
                p.production_started_at,
                p.production_progress,
                p.production_notes,
                p.production_photos,
                p.construction_address,
                p.construction_district,
                p.construction_province,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.address AS customer_address,
                p.created_at
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.status NOT IN ('cancelled', 'closed')
            AND p.status IN ('in_production', 'installation', 'handover')
            ORDER BY p.created_at DESC
        `);

        // Get products for each project
        const projectsWithProducts = await Promise.all(
            projects.map(async (project) => {
                // Get quotation items
                const [quotationRows] = await db.query(`
                    SELECT q.id as quotation_id 
                    FROM quotations q 
                    WHERE q.project_id = ?
                    ORDER BY q.created_at DESC 
                    LIMIT 1
                `, [project.id]);

                let products = [];

                if (quotationRows.length > 0) {
                    const quotationId = quotationRows[0].quotation_id;

                    // Get items and split by quantity
                    const [quotationItems] = await db.query(`
                        SELECT * FROM quotation_items 
                        WHERE quotation_id = ?
                        ORDER BY id
                    `, [quotationId]);

                    for (const item of quotationItems) {
                        const qty = parseInt(item.quantity) || 1;
                        const baseCode = item.code || `SP-${item.id}`;

                        for (let i = 1; i <= qty; i++) {
                            const productId = `${item.id}_${i}`;
                            const productCode = qty > 1
                                ? `${baseCode}_C${String(i).padStart(3, '0')}`
                                : baseCode;

                            // Get or create manufacturing record
                            let mfgData;
                            try {
                                const [mfgRecords] = await db.query(`
                                    SELECT * FROM product_manufacturing
                                    WHERE project_id = ? AND product_id = ?
                                `, [project.id, productId]);

                                if (mfgRecords.length === 0) {
                                    // Create new record
                                    try {
                                        await db.query(`
                                            INSERT INTO product_manufacturing 
                                            (project_id, product_id, status, materials_required_count)
                                            VALUES (?, ?, 'not_assigned', 0)
                                        `, [project.id, productId]);
                                    } catch (insertErr) {
                                        // Ignore duplicate key errors
                                        if (!insertErr.message.includes('Duplicate')) {
                                            console.warn('Insert mfg record warning:', insertErr.message);
                                        }
                                    }

                                    mfgData = {
                                        status: 'not_assigned',
                                        materials_required_count: 0,
                                        materials_exported_count: 0,
                                        materials_percent: 0,
                                        started_at: null,
                                        completed_at: null
                                    };
                                } else {
                                    mfgData = mfgRecords[0];
                                }
                            } catch (mfgErr) {
                                console.warn('MFG record error for product', productId, ':', mfgErr.message);
                                mfgData = {
                                    status: 'not_assigned',
                                    materials_required_count: 0,
                                    materials_exported_count: 0,
                                    materials_percent: 0,
                                    started_at: null,
                                    completed_at: null
                                };
                            }

                            // Calculate current status
                            const calculatedStatus = calculateProductStatus(mfgData);

                            // Auto-update if status changed
                            if (calculatedStatus !== mfgData.status) {
                                await updateProductStatus(db, productId, calculatedStatus);
                                mfgData.status = calculatedStatus;
                            }

                            products.push({
                                id: productId,
                                design_code: productCode,
                                name: item.item_name || item.spec || 'Sản phẩm',
                                item_type: item.item_type,
                                width: item.width,
                                height: item.height,

                                // Manufacturing status
                                status: mfgData.status,
                                materials_required: mfgData.materials_required_count,
                                materials_exported: mfgData.materials_exported_count,
                                materials_percent: mfgData.materials_percent || 0,

                                // Overall progress: 40% materials + 30% manufacturing + 30% completed
                                overall_progress: calculateOverallProgress(mfgData),

                                // Timestamps
                                started_at: mfgData.started_at,
                                completed_at: mfgData.completed_at,

                                // Action flags
                                can_start: mfgData.status === 'ready',
                                can_complete: mfgData.status === 'manufacturing',
                                can_edit_materials: !['manufacturing', 'completed'].includes(mfgData.status)
                            });
                        }
                    }
                }

                return {
                    ...project,
                    status: project.project_status, // Map project_status to status for frontend
                    products,
                    total_products: products.length,
                    completed_products: products.filter(p => p.status === 'completed').length
                };
            })
        );

        res.json({
            success: true,
            data: projectsWithProducts
        });
    } catch (err) {
        console.error('Error getting manufacturing projects:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * POST /api/manufacturing/products/:productId/start
 * Start manufacturing - STRICT VALIDATION
 */
exports.startManufacturing = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { productId } = req.params;
        const { projectId } = req.body;

        const [result] = await connection.query(`
            UPDATE product_manufacturing 
            SET started_at = NOW(),
                last_status = status,
                status = 'manufacturing',
                status_updated_at = NOW()
            WHERE product_id = ? 
              AND project_id = ?
              AND status = 'ready'
              AND materials_percent = 100
              AND started_at IS NULL
              AND completed_at IS NULL
        `, [productId, projectId]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Không thể bắt đầu gia công. Kiểm tra vật tư đã đủ 100% chưa.'
            });
        }

        await connection.commit();
        connection.release();

        // Thông báo Bắt đầu sản xuất
        try {
            await SystemNotifier.notify('production.started', {
                entityName: `Sản phẩm ${productId}`,
                entityId: parseInt(projectId),
                actor: SystemNotifier.getActor(req),
                afterData: { product_id: productId, project_id: projectId },
                link: `production.html?id=${projectId}`
            });
        } catch (e) { }

        res.json({
            success: true,
            message: 'Đã bắt đầu gia công sản phẩm'
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error starting manufacturing:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * POST /api/manufacturing/products/:productId/complete
 * Complete manufacturing - STRICT VALIDATION
 */
exports.completeManufacturing = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { productId } = req.params;
        const { projectId } = req.body;

        const [result] = await connection.query(`
            UPDATE product_manufacturing 
            SET completed_at = NOW(),
                last_status = status,
                status = 'completed',
                status_updated_at = NOW()
            WHERE product_id = ? 
              AND project_id = ?
              AND status = 'manufacturing'
              AND started_at IS NOT NULL
              AND completed_at IS NULL
        `, [productId, projectId]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Không thể hoàn thành. Sản phẩm chưa được bắt đầu gia công.'
            });
        }

        await connection.commit();
        connection.release();

        // Thông báo Hoàn thành sản xuất
        try {
            await SystemNotifier.notify('production.completed', {
                entityName: `Sản phẩm ${productId}`,
                entityId: parseInt(projectId),
                actor: SystemNotifier.getActor(req),
                afterData: { product_id: productId, project_id: projectId },
                link: `production.html?id=${projectId}`
            });
        } catch (e) { }

        res.json({
            success: true,
            message: 'Đã hoàn thành sản phẩm!'
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error completing manufacturing:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * POST /api/manufacturing/products/:productId/quick-complete
 * Quick complete - Skip manufacturing stage (for flexibility)
 */
exports.quickComplete = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { productId } = req.params;
        const { projectId } = req.body;

        // Update or create manufacturing record and mark complete
        const [existing] = await connection.query(`
            SELECT id FROM product_manufacturing 
            WHERE product_id = ? AND project_id = ?
        `, [productId, projectId]);

        if (existing.length > 0) {
            await connection.query(`
                UPDATE product_manufacturing 
                SET completed_at = NOW(),
                    started_at = COALESCE(started_at, NOW()),
                    last_status = status,
                    status = 'completed',
                    status_updated_at = NOW(),
                    materials_percent = 100
                WHERE product_id = ? AND project_id = ?
            `, [productId, projectId]);
        } else {
            await connection.query(`
                INSERT INTO product_manufacturing 
                (project_id, product_id, status, materials_percent, started_at, completed_at)
                VALUES (?, ?, 'completed', 100, NOW(), NOW())
            `, [projectId, productId]);
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'Đã đánh dấu hoàn thành sản phẩm!'
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error quick completing:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * GET /api/manufacturing/products/:productId/materials
 * Get materials (BOM) for a product
 */
exports.getProductMaterials = async (req, res) => {
    try {
        const { productId } = req.params;
        const { projectId } = req.query;

        // Extract original quotation_item ID
        let originalId = productId;
        if (String(productId).includes('_')) {
            originalId = String(productId).split('_')[0];
        }

        // Get BOM items for this quotation_item
        const [bomItems] = await db.query(`
            SELECT bi.*, 
                   COALESCE(pm.exported_qty, 0) as exported_qty,
                   CASE WHEN pm.exported_qty >= bi.quantity THEN 1 ELSE 0 END as is_exported
            FROM bom_items bi
            LEFT JOIN project_materials pm ON pm.bom_item_id = bi.id AND pm.project_id = ?
            WHERE bi.quotation_item_id = ?
            ORDER BY bi.item_type, bi.material_code
        `, [projectId, originalId]);

        // Calculate totals
        const totalItems = bomItems.length;
        const exportedItems = bomItems.filter(b => b.is_exported).length;

        res.json({
            success: true,
            data: {
                materials: bomItems,
                total: totalItems,
                exported: exportedItems,
                percent: totalItems > 0 ? Math.round((exportedItems / totalItems) * 100) : 0
            }
        });
    } catch (err) {
        console.error('Error getting product materials:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * POST /api/manufacturing/products/:productId/materials
 * Add/Update materials for a product
 */
exports.addProductMaterial = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { productId } = req.params;
        const { projectId, materialType, materialCode, materialName, quantity, unit } = req.body;

        // Check if manufacturing record exists
        const [mfgRecord] = await connection.query(`
            SELECT id, status FROM product_manufacturing 
            WHERE product_id = ? AND project_id = ?
        `, [productId, projectId]);

        if (mfgRecord.length > 0 && ['manufacturing', 'completed'].includes(mfgRecord[0].status)) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Không thể thêm vật tư. Sản phẩm đang gia công hoặc đã hoàn thành.'
            });
        }

        // Add to project_materials
        await connection.query(`
            INSERT INTO project_materials 
            (project_id, product_id, material_type, material_code, material_name, required_qty, unit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE required_qty = required_qty + VALUES(required_qty)
        `, [projectId, productId, materialType, materialCode, materialName, quantity, unit]);

        // Update manufacturing record material counts
        const [materialCounts] = await connection.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
            FROM project_materials 
            WHERE project_id = ? AND product_id = ?
        `, [projectId, productId]);

        const total = materialCounts[0].total || 0;
        const completed = materialCounts[0].completed || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (mfgRecord.length > 0) {
            await connection.query(`
                UPDATE product_manufacturing 
                SET materials_required_count = ?,
                    materials_exported_count = ?,
                    materials_percent = ?
                WHERE product_id = ? AND project_id = ?
            `, [total, completed, percent, productId, projectId]);
        } else {
            await connection.query(`
                INSERT INTO product_manufacturing 
                (project_id, product_id, status, materials_required_count, materials_exported_count, materials_percent)
                VALUES (?, ?, 'missing_materials', ?, ?, ?)
            `, [projectId, productId, total, completed, percent]);
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'Đã thêm vật tư!'
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error adding material:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * POST /api/manufacturing/products/:productId/mark-materials-ready
 * Mark all materials as ready/exported (simulate 100%)
 */
exports.markMaterialsReady = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { productId } = req.params;
        const { projectId } = req.body;

        // Check if can edit
        const [mfgRecord] = await connection.query(`
            SELECT id, status FROM product_manufacturing 
            WHERE product_id = ? AND project_id = ?
        `, [productId, projectId]);

        if (mfgRecord.length > 0 && ['manufacturing', 'completed'].includes(mfgRecord[0].status)) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Không thể cập nhật vật tư. Sản phẩm đang gia công hoặc đã hoàn thành.'
            });
        }

        // Update product_manufacturing to 100%
        if (mfgRecord.length > 0) {
            await connection.query(`
                UPDATE product_manufacturing 
                SET materials_required_count = 1,
                    materials_exported_count = 1,
                    materials_percent = 100,
                    status = 'ready',
                    last_status = status,
                    status_updated_at = NOW()
                WHERE product_id = ? AND project_id = ?
            `, [productId, projectId]);
        } else {
            await connection.query(`
                INSERT INTO product_manufacturing 
                (project_id, product_id, status, materials_required_count, materials_exported_count, materials_percent)
                VALUES (?, ?, 'ready', 1, 1, 100)
            `, [projectId, productId]);
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'Đã đánh dấu đủ vật tư - Sẵn sàng gia công!'
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error marking materials ready:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * PUT /api/manufacturing/projects/:projectId/production-info
 * Update production info for a project (date, notes, progress, step, photos)
 */
exports.updateProductionInfo = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            production_started_at,
            production_notes,
            production_progress,
            production_step,
            production_photos
        } = req.body;

        // Ensure columns exist
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_started_at DATETIME NULL`);
        } catch (e) { }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_notes TEXT NULL`);
        } catch (e) { }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_progress INT DEFAULT 0`);
        } catch (e) { }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_step ENUM('preparing', 'manufacturing', 'completed') DEFAULT 'preparing'`);
        } catch (e) { }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_photos JSON NULL`);
        } catch (e) { }

        // Update project
        const photosJson = production_photos && Array.isArray(production_photos)
            ? JSON.stringify(production_photos)
            : null;

        await db.query(`
            UPDATE projects 
            SET 
                production_started_at = ?,
                production_notes = ?,
                production_progress = ?,
                production_step = ?,
                production_photos = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            production_started_at || null,
            production_notes || null,
            production_progress || 0,
            production_step || 'preparing',
            photosJson,
            projectId
        ]);

        res.json({
            success: true,
            message: 'Đã cập nhật thông tin sản xuất!'
        });
    } catch (err) {
        console.error('Error updating production info:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

/**
 * PUT /api/manufacturing/projects/:projectId/production-step
 * Quick update production step only
 */
exports.updateProductionStep = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { step } = req.body;

        const validSteps = ['preparing', 'manufacturing', 'completed'];
        if (!validSteps.includes(step)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            });
        }

        // Ensure columns exist
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_step ENUM('preparing', 'manufacturing', 'completed') DEFAULT 'preparing'`);
        } catch (e) { }
        try {
            await db.query(`ALTER TABLE projects ADD COLUMN production_started_at DATETIME NULL`);
        } catch (e) { }

        // Update step and set started_at if moving to manufacturing
        // ✅ Cập nhật tiến độ tương ứng với từng trạng thái:
        // - preparing: 0%
        // - manufacturing: 50% (đang sản xuất)
        // - completed: 100%
        let updateQuery = `
            UPDATE projects 
            SET production_step = ?, 
                production_progress = 0,
                updated_at = NOW()
            WHERE id = ?
        `;
        let params = [step, projectId];

        if (step === 'manufacturing') {
            updateQuery = `
                UPDATE projects 
                SET production_step = ?, 
                    production_started_at = COALESCE(production_started_at, NOW()),
                    production_progress = 50,
                    updated_at = NOW()
                WHERE id = ?
            `;
        } else if (step === 'completed') {
            updateQuery = `
                UPDATE projects 
                SET production_step = ?, 
                    production_progress = 100,
                    updated_at = NOW()
                WHERE id = ?
            `;
        }

        await db.query(updateQuery, params);

        // Thông báo Cập nhật tiến độ sản xuất dự án
        try {
            const VN_STATUS = { 'preparing': 'Chuẩn bị SX', 'manufacturing': 'Đang sản xuất', 'completed': 'Hoàn thành SX' };
            await SystemNotifier.notify('project.status_changed', {
                entityName: `Dự án nội bộ #${projectId}`,
                entityId: parseInt(projectId),
                actor: SystemNotifier.getActor(req),
                afterData: {
                    production_step: step,
                    status_vi: VN_STATUS[step]
                },
                link: `production.html?id=${projectId}`
            });
        } catch (e) { }

        res.json({
            success: true,
            message: `Đã chuyển sang: ${step === 'manufacturing' ? 'Đang sản xuất' : step === 'completed' ? 'Hoàn thành' : 'Chuẩn bị SX'}`
        });
    } catch (err) {
        console.error('Error updating production step:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + err.message
        });
    }
};

module.exports = exports;
