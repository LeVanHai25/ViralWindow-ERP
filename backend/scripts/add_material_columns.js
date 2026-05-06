const db = require('../config/db');

async function addColumns() {
    try {
        console.log('Adding material_type column...');
        await db.query(`ALTER TABLE project_materials ADD COLUMN material_type ENUM('accessory', 'aluminum', 'glass', 'other') NULL AFTER project_id`);
        console.log('✅ material_type added');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠ material_type column already exists, skipping...');
        } else {
            throw e;
        }
    }

    try {
        console.log('Adding material_id column...');
        await db.query('ALTER TABLE project_materials ADD COLUMN material_id INT NULL AFTER material_type');
        console.log('✅ material_id added');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠ material_id column already exists, skipping...');
        } else {
            throw e;
        }
    }

    try {
        console.log('Adding material_name column...');
        await db.query('ALTER TABLE project_materials ADD COLUMN material_name VARCHAR(255) NULL AFTER material_id');
        console.log('✅ material_name added');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠ material_name column already exists, skipping...');
        } else {
            throw e;
        }
    }

    try {
        console.log('Adding quantity column...');
        await db.query('ALTER TABLE project_materials ADD COLUMN quantity DECIMAL(10,2) NULL AFTER material_name');
        console.log('✅ quantity added');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠ quantity column already exists, skipping...');
        } else {
            throw e;
        }
    }

    try {
        console.log('Adding unit column...');
        await db.query('ALTER TABLE project_materials ADD COLUMN unit VARCHAR(50) NULL AFTER quantity');
        console.log('✅ unit added');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠ unit column already exists, skipping...');
        } else {
            throw e;
        }
    }

    try {
        console.log('Adding indexes...');
        await db.query('ALTER TABLE project_materials ADD INDEX idx_material_type (material_type)');
        console.log('✅ idx_material_type index added');
    } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
            console.log('⚠ idx_material_type index already exists, skipping...');
        } else {
            throw e;
        }
    }

    try {
        await db.query('ALTER TABLE project_materials ADD INDEX idx_material_id (material_id)');
        console.log('✅ idx_material_id index added');
    } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
            console.log('⚠ idx_material_id index already exists, skipping...');
        } else {
            throw e;
        }
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
}

addColumns().catch(err => {
    console.error('❌ Migration error:', err.message);
    console.error(err);
    process.exit(1);
});














