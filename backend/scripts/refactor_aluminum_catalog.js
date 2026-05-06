const db = require('../config/db');

/**
 * Refactor Aluminum Systems Catalog script - Version 2 (Safer Merge)
 * Standardizes the catalog to the 11 target systems.
 */
async function refactorCatalog() {
    const standardSystems = [
        { name: 'VRA-Hệ 55 Mở quay', order: 1 },
        { name: 'VRA-Hệ 50', order: 2 },
        { name: 'VRA-Hệ 64 Cửa sổ lùa', order: 3 },
        { name: 'VRE -Hệ 65 Mở quay( Mạnh Quy)', order: 4 },
        { name: 'VRE -Hệ 65 Mở quay(Yangly)', order: 5 },
        { name: 'VRE- Hệ Xếp trượt 80', order: 6 },
        { name: 'VRE- Hệ Lùa 120 & 180', order: 7 },
        { name: 'HỆ LÙA 94 MỚI', order: 8 },
        { name: 'THỦY LỰC', order: 9 },
        { name: 'MẶT DỰNG', order: 10 },
        { name: 'HỆ LÙA 94 KOSO', order: 11 }
    ];

    const mapping = {
        'VRA – Hệ 55 mở quay': 'VRA-Hệ 55 Mở quay',
        'VRA-Hệ 55 Mở quay': 'VRA-Hệ 55 Mở quay',
        'VRA – Hệ 50': 'VRA-Hệ 50',
        'VRA - Hệ 50': 'VRA-Hệ 50',
        'VRA-Hệ 50': 'VRA-Hệ 50',
        'VRA-Hệ 51': 'VRA-Hệ 50',
        'VRA-Hệ 52': 'VRA-Hệ 50',
        'VRA – Hệ 64 (cửa sổ lùa)': 'VRA-Hệ 64 Cửa sổ lùa',
        'VRA-Hệ 64 (cửa sổ lùa)': 'VRA-Hệ 64 Cửa sổ lùa',
        'VRA - Hệ 64 (cửa sổ lùa)': 'VRA-Hệ 64 Cửa sổ lùa',
        'VRA-Hệ 64 Cửa sổ lùa': 'VRA-Hệ 64 Cửa sổ lùa',
        'VRE – Hệ 65 mở quay (Mạnh Quy)': 'VRE -Hệ 65 Mở quay( Mạnh Quy)',
        'VRE – Hệ 65 mở quay (Yangly)': 'VRE -Hệ 65 Mở quay(Yangly)',
        'VRE – Hệ xếp trượt 80': 'VRE- Hệ Xếp trượt 80',
        'VRE – Hệ lùa 120 & 180': 'VRE- Hệ Lùa 120 & 180',
        'Hệ lùa 94 mới': 'HỆ LÙA 94 MỚI',
        'HỆ LÙA 94 MỚI': 'HỆ LÙA 94 MỚI',
        'Thủy lực': 'THỦY LỰC',
        'THỦY LỰC': 'THỦY LỰC',
        'Mặt dựng': 'MẶT DỰNG',
        'MẶT DỰNG': 'MẶT DỰNG',
        'Mặt dùng': 'MẶT DỰNG',
        'HỆ LÙA 94 KOSO': 'HỆ LÙA 94 KOSO'
    };

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('--- STARTING SAFER REFACTOR ---');

        // 1. Update all existing items in aluminum_systems to standardized names
        console.log('Step 1: Standardizing aluminum_systems table...');
        for (const [oldName, newName] of Object.entries(mapping)) {
            if (oldName !== newName) {
                const [res] = await connection.query(
                    'UPDATE aluminum_systems SET aluminum_system = ? WHERE aluminum_system = ?',
                    [newName, oldName]
                );
                if (res.affectedRows > 0) {
                    console.log(`  Updated ${res.affectedRows} items from [${oldName}] -> [${newName}]`);
                }
            }
        }

        // 2. Deactivate all catalog entries
        console.log('Step 2: Resetting catalog...');
        await connection.query('UPDATE aluminum_warehouse_catalog_systems SET is_active = 0');

        // 3. Rebuild catalog from 11 standard entries
        console.log('Step 3: Rebuilding catalog from standard list...');
        for (const sys of standardSystems) {
            // Check if record exists (even if inactive)
            const [rows] = await connection.query(
                'SELECT id FROM aluminum_warehouse_catalog_systems WHERE system_name = ?',
                [sys.name]
            );

            if (rows.length > 0) {
                console.log(`  Activating and ordering: [${sys.name}] (STT: ${sys.order})`);
                await connection.query(
                    'UPDATE aluminum_warehouse_catalog_systems SET is_active = 1, display_order = ? WHERE system_name = ?',
                    [sys.order, sys.name]
                );
            } else {
                console.log(`  Inserting new: [${sys.name}] (STT: ${sys.order})`);
                await connection.query(
                    'INSERT INTO aluminum_warehouse_catalog_systems (system_name, display_order, is_active) VALUES (?, ?, 1)',
                    [sys.name, sys.order]
                );
            }
        }

        // 4. Cleanup inactive records
        console.log('Step 4: Cleaning up inactive records...');
        await connection.query('DELETE FROM aluminum_warehouse_catalog_systems WHERE is_active = 0');

        await connection.commit();
        console.log('--- REFACTOR COMPLETED SUCCESSFULLY ---');
    } catch (error) {
        await connection.rollback();
        console.error('--- REFACTOR FAILED ---');
        console.error(error);
    } finally {
        connection.release();
        process.exit();
    }
}

refactorCatalog();
