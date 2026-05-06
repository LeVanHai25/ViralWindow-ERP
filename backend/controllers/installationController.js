const db = require("../config/db");

/**
 * Lấy danh sách dự án ở giai đoạn lắp đặt
 * Thay đổi: Theo dõi tiến độ ở cấp DỰ ÁN với 3 bước (không theo sản phẩm)
 */
exports.getInstallationProjects = async (req, res) => {
    try {
        // Đảm bảo các cột mới tồn tại trong bảng projects
        try {
            await db.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS installation_step ENUM('not_started', 'started', 'in_progress', 'completed') DEFAULT 'not_started'
            `);
        } catch (alterErr) {
            // Column already exists - ignore
        }

        try {
            await db.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS installation_date DATETIME NULL
            `);
        } catch (alterErr) { }

        try {
            await db.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS installer_name VARCHAR(255) NULL
            `);
        } catch (alterErr) { }

        try {
            await db.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS installation_notes TEXT NULL
            `);
        } catch (alterErr) { }

        try {
            await db.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS installation_photos JSON NULL
            `);
        } catch (alterErr) { }

        // Auto-migrate: Dự án đã hoàn thành/bàn giao thì set installation_step = completed
        try {
            await db.query(`
                UPDATE projects 
                SET installation_step = 'completed'
                WHERE status IN ('handover', 'completed') 
                AND (installation_step IS NULL OR installation_step = 'not_started')
            `);
        } catch (migrateErr) {
            console.log('Auto-migrate completed projects:', migrateErr.message);
        }

        // ✅ FIX: Sử dụng status thay vì installation_step
        // ✅ Dự án hiển thị khi status = 'installation' trở lên (bao gồm handover, completed)
        const [projects] = await db.query(`
            SELECT 
                p.id,
                p.project_code,
                p.project_name,
                p.status,
                p.progress_percent,
                p.start_date,
                p.deadline,
                p.installation_step,
                p.installation_date,
                p.installer_name,
                p.installation_notes,
                p.installation_photos,
                p.construction_address,
                p.construction_district,
                p.construction_province,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.address AS customer_address,
                COALESCE(CAST((
                    SELECT SUM(COALESCE(qi.quantity, 1)) 
                    FROM quotation_items qi 
                    JOIN quotations q ON qi.quotation_id = q.id 
                    WHERE q.project_id = p.id
                ) AS UNSIGNED), 0) AS total_products
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.status IN ('installation', 'handover')
            ORDER BY p.created_at DESC
        `);

        // Tính tiến độ dựa trên step
        const projectsWithProgress = projects.map(project => {
            let installationProgress = 0;
            let stepLabel = 'Chưa bắt đầu';

            switch (project.installation_step) {
                case 'started':
                    installationProgress = 33;
                    stepLabel = 'Bắt đầu lắp đặt';
                    break;
                case 'in_progress':
                    installationProgress = 66;
                    stepLabel = 'Đang lắp đặt';
                    break;
                case 'completed':
                    installationProgress = 100;
                    stepLabel = 'Lắp đặt thành công';
                    break;
                default:
                    installationProgress = 0;
                    stepLabel = 'Chưa bắt đầu';
            }

            // Parse photos JSON
            let photos = [];
            try {
                if (project.installation_photos) {
                    photos = typeof project.installation_photos === 'string'
                        ? JSON.parse(project.installation_photos)
                        : project.installation_photos;
                }
            } catch (e) {
                photos = [];
            }

            return {
                ...project,
                installation_step: project.installation_step || 'not_started',
                installation_step_label: stepLabel,
                installation_progress: installationProgress,
                installation_photos: photos,
                can_move_to_handover: project.installation_step === 'completed'
            };
        });

        // Thống kê
        const stats = {
            total: projectsWithProgress.length,
            not_started: projectsWithProgress.filter(p => p.installation_step === 'not_started').length,
            started: projectsWithProgress.filter(p => p.installation_step === 'started').length,
            in_progress: projectsWithProgress.filter(p => p.installation_step === 'in_progress').length,
            completed: projectsWithProgress.filter(p => p.installation_step === 'completed').length,
            avg_progress: projectsWithProgress.length > 0
                ? Math.round(projectsWithProgress.reduce((sum, p) => sum + p.installation_progress, 0) / projectsWithProgress.length)
                : 0
        };

        res.json({
            success: true,
            data: projectsWithProgress,
            stats: stats
        });
    } catch (err) {
        console.error('Error getting installation projects:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Cập nhật bước lắp đặt cho dự án (Project-level)
 * Các bước: not_started -> started -> in_progress -> completed
 */
exports.updateInstallationStep = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { projectId } = req.params;
        const { step, installation_date, installer_name, notes, photos } = req.body;

        // Validate step
        const validSteps = ['not_started', 'started', 'in_progress', 'completed'];
        if (step && !validSteps.includes(step)) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Bước lắp đặt không hợp lệ"
            });
        }

        // Lấy thông tin dự án hiện tại
        const [projectRows] = await connection.query(`
            SELECT * FROM projects WHERE id = ?
        `, [projectId]);

        if (projectRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dự án"
            });
        }

        // Build update query dynamically
        let updateFields = [];
        let updateValues = [];

        if (step) {
            updateFields.push('installation_step = ?');
            updateValues.push(step);
        }

        if (installation_date !== undefined) {
            updateFields.push('installation_date = ?');
            updateValues.push(installation_date || null);
        }

        if (installer_name !== undefined) {
            updateFields.push('installer_name = ?');
            updateValues.push(installer_name || null);
        }

        if (notes !== undefined) {
            updateFields.push('installation_notes = ?');
            updateValues.push(notes || null);
        }

        if (photos !== undefined) {
            const photosJson = Array.isArray(photos) ? JSON.stringify(photos) : null;
            updateFields.push('installation_photos = ?');
            updateValues.push(photosJson);
        }

        if (updateFields.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Không có dữ liệu để cập nhật"
            });
        }

        updateValues.push(projectId);

        await connection.query(`
            UPDATE projects 
            SET ${updateFields.join(', ')}, updated_at = NOW()
            WHERE id = ?
        `, updateValues);

        await connection.commit();
        connection.release();

        // Map step to label
        const stepLabels = {
            'not_started': 'Chưa bắt đầu',
            'started': 'Bắt đầu lắp đặt',
            'in_progress': 'Đang lắp đặt',
            'completed': 'Lắp đặt thành công'
        };

        res.json({
            success: true,
            message: `Đã cập nhật: ${stepLabels[step] || 'Thông tin lắp đặt'}`
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error updating installation step:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Chuyển dự án sang giai đoạn Bàn giao
 * Điều kiện: installation_step phải là 'completed'
 */
exports.moveToHandover = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { projectId } = req.params;

        // Lấy thông tin dự án
        const [projectRows] = await connection.query(`
            SELECT * FROM projects WHERE id = ?
        `, [projectId]);

        if (projectRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dự án"
            });
        }

        const project = projectRows[0];

        // Kiểm tra installation_step phải là 'completed'
        if (project.installation_step !== 'completed') {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Vui lòng hoàn thành tất cả các bước lắp đặt trước khi chuyển sang Bàn giao"
            });
        }

        // Chuyển sang giai đoạn Bàn giao
        await connection.query(`
            UPDATE projects
            SET status = 'handover',
                progress_percent = 95,
                updated_at = NOW()
            WHERE id = ?
        `, [projectId]);

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: "Đã chuyển dự án sang giai đoạn Bàn giao"
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error moving to handover:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

// Legacy function - kept for backwards compatibility but no longer used
exports.updateInstallationProgress = async (req, res) => {
    res.status(410).json({
        success: false,
        message: "API này đã ngừng sử dụng. Vui lòng sử dụng /projects/:projectId/step để cập nhật tiến độ lắp đặt cấp dự án."
    });
};
