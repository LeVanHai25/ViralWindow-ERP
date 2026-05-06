const db = require('../config/db');

/**
 * Script để sửa progress_percent cho các dự án dựa trên status
 * Chạy: node scripts/fix-project-progress.js
 */
async function fixProjectProgress() {
    try {
        console.log('🔧 Bắt đầu sửa progress_percent cho các dự án...\n');

        // Lấy tất cả dự án có progress_percent = 0 hoặc NULL
        const [projects] = await db.query(`
            SELECT id, project_code, project_name, status, progress_percent
            FROM projects
            WHERE (progress_percent IS NULL OR progress_percent = 0)
              AND status IS NOT NULL
              AND status != ''
            ORDER BY id
        `);

        console.log(`📊 Tìm thấy ${projects.length} dự án cần sửa:\n`);

        if (projects.length === 0) {
            console.log('✅ Không có dự án nào cần sửa!');
            process.exit(0);
        }

        let updatedCount = 0;

        for (const project of projects) {
            // Tính progress_percent dựa trên status
            let newProgress = 0;
            const status = (project.status || '').toLowerCase();

            if (status === 'quotation_pending' || status === 'waiting_quotation') {
                newProgress = 10;
            } else if (status === 'designing') {
                newProgress = 25;
            } else if (status === 'bom_extraction' || status.includes('bom')) {
                newProgress = 40;
            } else if (status === 'in_production' || 
                      ['cutting', 'welding', 'gluing', 'accessories', 'finishing', 'packaging'].includes(status)) {
                newProgress = 60;
            } else if (status === 'installation') {
                newProgress = 85;
            } else if (status === 'handover') {
                newProgress = 95;
            } else if (status === 'completed') {
                newProgress = 100;
            }

            // Cập nhật progress_percent
            await db.query(`
                UPDATE projects 
                SET progress_percent = ?
                WHERE id = ?
            `, [newProgress, project.id]);

            console.log(`✅ [${project.project_code}] ${project.project_name}`);
            console.log(`   Status: ${project.status} → Progress: ${newProgress}%`);
            console.log('');

            updatedCount++;
        }

        console.log(`\n✅ Đã cập nhật ${updatedCount} dự án!`);

        // Kiểm tra lại
        const [remaining] = await db.query(`
            SELECT COUNT(*) as count
            FROM projects
            WHERE (progress_percent IS NULL OR progress_percent = 0)
              AND status IS NOT NULL
              AND status != ''
        `);

        if (remaining[0].count > 0) {
            console.log(`⚠️  Còn ${remaining[0].count} dự án chưa được cập nhật (có thể có status không hợp lệ)`);
        } else {
            console.log('✅ Tất cả dự án đã được cập nhật!');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
}

// Chạy script
fixProjectProgress();




