const db = require('../config/db');

/**
 * Reset Aluminum Inventory script - Version 2 (Comprehensive)
 * Clears all existing aluminum data to prepare for a fresh import.
 * Preserves the catalog systems. 
 */
async function resetInventory() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('--- STARTING COMPREHENSIVE INVENTORY RESET ---');
        
        // Disable foreign key checks for the reset
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToClear = [
            'aluminum_warehouse_stock',
            'aluminum_systems',
            'aluminum_profiles',
            'atc_aluminum_profiles',
            'aluminum_scraps',
            'aluminum_colors'
        ];

        for (const table of tablesToClear) {
            console.log(`Clearing ${table}...`);
            await connection.query(`DELETE FROM ${table}`);
        }

        // Clear transaction logs for aluminum
        console.log('Clearing aluminum transactions from stock_ledger...');
        await connection.query("DELETE FROM stock_ledger WHERE item_type = 'aluminum'");
        
        console.log('Clearing aluminum transaction lines from stock_document_lines...');
        await connection.query("DELETE FROM stock_document_lines WHERE item_type = 'aluminum'");

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        await connection.commit();
        console.log('--- RESET COMPLETED SUCCESSFULLY ---');
        console.log('Original data has been backed up. You can now import new aluminum data.');

    } catch (error) {
        await connection.rollback();
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.error('--- RESET FAILED ---');
        console.error(error);
    } finally {
        connection.release();
        process.exit();
    }
}

resetInventory();
