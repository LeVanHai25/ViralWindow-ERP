const db = require('../config/db');

async function migrate() {
    console.log('🚀 Starting migration: Relaxing aluminum_systems constraints...');
    try {
        // 1. thickness_mm
        console.log('--- Modifying thickness_mm...');
        await db.query('ALTER TABLE aluminum_systems MODIFY thickness_mm decimal(4,2) NULL');
        
        // 2. density
        console.log('--- Modifying density...');
        await db.query('ALTER TABLE aluminum_systems MODIFY density decimal(10,3) NULL');
        
        // 3. weight_per_meter
        console.log('--- Modifying weight_per_meter...');
        await db.query('ALTER TABLE aluminum_systems MODIFY weight_per_meter decimal(10,3) NULL');
        
        // 4. length_m
        console.log('--- Modifying length_m...');
        await db.query('ALTER TABLE aluminum_systems MODIFY length_m decimal(10,2) NULL');

        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
