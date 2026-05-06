/**
 * =====================================================
 * PHASE 3: MIGRATION SCRIPT
 * Chuyển dữ liệu từ bảng cũ sang ACT Style v2
 * =====================================================
 */

const db = require('../config/db');

async function runMigration() {
    console.log('🚀 Bắt đầu migration dữ liệu sang ACT Style v2...\n');

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // =====================================================
        // BƯỚC 1: Migration từ door_designs sang project_items_v2
        // =====================================================
        console.log('📦 Bước 1: Migration door_designs → project_items_v2');

        const [doorDesigns] = await connection.query(`
            SELECT 
                dd.*,
                p.project_name,
                als.code as aluminum_system_code,
                als.name as aluminum_system_name
            FROM door_designs dd
            LEFT JOIN projects p ON dd.project_id = p.id
            LEFT JOIN aluminum_systems als ON dd.aluminum_system_id = als.id
        `);

        console.log(`   Tìm thấy ${doorDesigns.length} door_designs`);

        for (const design of doorDesigns) {
            // Determine item_type based on template_code or door_type
            let itemType = 'door';
            if (design.template_code) {
                if (design.template_code.toLowerCase().includes('window') ||
                    design.template_code.toLowerCase().includes('win')) {
                    itemType = 'window';
                } else if (design.template_code.toLowerCase().includes('railing')) {
                    itemType = 'railing';
                } else if (design.template_code.toLowerCase().includes('glass_wall') ||
                    design.template_code.toLowerCase().includes('partition')) {
                    itemType = 'glass_partition';
                }
            }

            // 1.1 Insert vào project_items_v2
            const [itemResult] = await connection.query(`
                INSERT INTO project_items_v2 
                (project_id, item_type, item_code, item_name, quantity, 
                 source_type, notes, status, created_at)
                VALUES (?, ?, ?, ?, 1, 'catalog', ?, 'configured', ?)
            `, [
                design.project_id,
                itemType,
                design.design_code,
                design.design_code || `${itemType} ${design.width_mm}x${design.height_mm}`,
                `Migrated from door_designs.id=${design.id}`,
                design.created_at
            ]);

            const projectItemId = itemResult.insertId;

            // 1.2 Insert vào item_versions
            const [versionResult] = await connection.query(`
                INSERT INTO item_versions 
                (project_item_id, version_number, status, description, created_at)
                VALUES (?, 1, 'confirmed', 'Migration từ door_designs', ?)
            `, [projectItemId, design.created_at]);

            const versionId = versionResult.insertId;

            // 1.3 Insert vào item_config
            // Determine open_style based on door_type
            let openStyle = 'swing_out';
            if (design.door_type === 'sliding') openStyle = 'sliding';
            else if (design.door_type === 'fixed') openStyle = 'fixed';
            else if (design.door_type === 'folding') openStyle = 'swing_out';
            else if (design.door_type === 'tilt') openStyle = 'tilt_turn';

            await connection.query(`
                INSERT INTO item_config 
                (item_version_id, width_mm, height_mm, leaf_count, 
                 open_style, aluminum_system, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                versionId,
                design.width_mm,
                design.height_mm,
                design.number_of_panels || 1,
                openStyle,
                design.aluminum_system_code || 'XINGFA_55',
                design.created_at
            ]);

            // 1.4 Update current_version_id
            await connection.query(`
                UPDATE project_items_v2 SET current_version_id = ? WHERE id = ?
            `, [versionId, projectItemId]);

            console.log(`   ✅ Migrated door_design #${design.id} → project_item #${projectItemId}`);
        }

        // =====================================================
        // BƯỚC 2: Xác nhận kết quả
        // =====================================================
        console.log('\n📊 Bước 2: Kiểm tra kết quả migration');

        const [countItems] = await connection.query(
            'SELECT COUNT(*) as count FROM project_items_v2'
        );
        const [countVersions] = await connection.query(
            'SELECT COUNT(*) as count FROM item_versions'
        );
        const [countConfigs] = await connection.query(
            'SELECT COUNT(*) as count FROM item_config'
        );

        console.log(`   - project_items_v2: ${countItems[0].count} records`);
        console.log(`   - item_versions: ${countVersions[0].count} records`);
        console.log(`   - item_config: ${countConfigs[0].count} records`);

        await connection.commit();
        console.log('\n✅ Migration hoàn thành thành công!');

        // =====================================================
        // BƯỚC 3: Thống kê theo item_type
        // =====================================================
        console.log('\n📈 Thống kê theo item_type:');
        const [stats] = await db.query(`
            SELECT item_type, COUNT(*) as count 
            FROM project_items_v2 
            GROUP BY item_type
        `);
        stats.forEach(s => console.log(`   - ${s.item_type}: ${s.count}`));

    } catch (err) {
        await connection.rollback();
        console.error('\n❌ Migration thất bại:', err.message);
        throw err;
    } finally {
        connection.release();
    }
}

// Run
runMigration()
    .then(() => {
        console.log('\n🎉 Phase 3 hoàn tất!');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
