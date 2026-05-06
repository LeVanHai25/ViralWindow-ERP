const XLSX = require('xlsx');
const db = require('../config/db');
const path = require('path');

/**
 * Import Yangly Aluminum Data script
 * Imports from "Tồn kho Yangly.xlsx" into aluminum_systems and aluminum_warehouse_stock (WH ID: 2)
 * Reuses existing profiles from aluminum_systems where codes match.
 */
async function importData() {
    const filePath = path.join(__dirname, '../../Tài liệu/Tồn kho Yangly.xlsx');
    const warehouseId = 2; // Kho Nhôm YANGLY

    console.log(`--- STARTING YANGLY IMPORT ---`);
    console.log(`File: ${filePath}`);
    console.log(`Target Warehouse: [Kho Nhôm YANGLY] (ID: ${warehouseId})`);

    const connection = await db.getConnection();
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header row
        const rows = data.slice(1);
        console.log(`Found ${rows.length} rows in Excel.`);

        await connection.beginTransaction();

        // 1. Pre-process Excel data to merge internal duplicates (same code in the same file)
        const excelProfileMap = new Map();
        for (const row of rows) {
            const code = String(row[0] || '').trim();
            if (!code) continue;

            const systemName = String(row[1] || '').trim();
            const name = String(row[2] || '').trim();
            const density = parseFloat(row[4]) || 0;
            const lengthM = parseFloat(row[5]) || 0;
            const qtyBars = parseInt(row[6]) || 0;
            const minStock = parseInt(row[7]) || 5;
            const maxStock = parseInt(row[8]) || 20;
            const qtyM = parseFloat(row[10]) || 0;
            const color = String(row[12] || 'Xám đá').trim();

            if (excelProfileMap.has(code)) {
                const existing = excelProfileMap.get(code);
                existing.qtyBars += qtyBars;
                existing.qtyM += qtyM;
                console.log(`  Merging internal duplicate code [${code}]: +${qtyBars} bars`);
            } else {
                excelProfileMap.set(code, {
                    code, systemName, name, density, lengthM, qtyBars, qtyM, minStock, maxStock, color
                });
            }
        }

        console.log(`Unique profiles in file to process: ${excelProfileMap.size}`);

        let newProfilesCount = 0;
        let linkedProfilesCount = 0;
        let totalBars = 0;
        let totalWeight = 0;

        for (const profile of excelProfileMap.values()) {
            // 2. Check if profile already exists in aluminum_systems (from VIRAL import or previous entry)
            const [existingRows] = await connection.query(
                "SELECT id FROM aluminum_systems WHERE code = ?",
                [profile.code]
            );

            let systemId;
            if (existingRows.length > 0) {
                systemId = existingRows[0].id;
                linkedProfilesCount++;
                console.log(`  Linking existing profile [${profile.code}] (ID: ${systemId})`);
                
                // Optional: Update quantity cache in aluminum_systems (sum of all warehouses)
                // This will be done properly in the sync step at the end.
            } else {
                // 3. Create new profile in aluminum_systems if not exists
                const brand = 'yangly'; // Or maintain 'viralwindow' if it's the same brand but different warehouse
                const weightPerMeter = profile.density;
                const thickness = 0.0;

                const [insResult] = await connection.query(`
                    INSERT INTO aluminum_systems 
                    (code, name, aluminum_system, brand, weight_per_meter, thickness_mm, density, length_m, quantity, quantity_m, min_stock_level, max_stock_level, color, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `, [
                    profile.code, profile.name, profile.systemName, brand, weightPerMeter, thickness, 
                    profile.density, profile.lengthM, 0, 0, // Initial cached qty 0, will be updated
                    profile.minStock, profile.maxStock, profile.color
                ]);
                systemId = insResult.insertId;
                newProfilesCount++;
                console.log(`  Created new profile [${profile.code}] (ID: ${systemId})`);
            }

            // 4. Insert into aluminum_warehouse_stock for YANGLY (Warehouse ID: 2)
            if (profile.qtyBars > 0) {
                await connection.query(`
                    INSERT INTO aluminum_warehouse_stock (warehouse_id, aluminum_system_id, quantity)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
                `, [warehouseId, systemId, profile.qtyBars]);
            }

            totalBars += profile.qtyBars;
            totalWeight += (profile.qtyBars * profile.lengthM * profile.density);
        }

        // 5. Final sync: Update quantity field in aluminum_systems for all processed items
        console.log('Syncing total quantities in aluminum_systems...');
        for (const code of excelProfileMap.keys()) {
            await connection.query(`
                UPDATE aluminum_systems s
                SET quantity = (
                    SELECT SUM(quantity) 
                    FROM aluminum_warehouse_stock 
                    WHERE aluminum_system_id = s.id
                )
                WHERE code = ?
            `, [code]);
        }

        await connection.commit();
        console.log('--- YANGLY IMPORT COMPLETED SUCCESSFULLY ---');
        console.log(`New Profiles Created: ${newProfilesCount}`);
        console.log(`Existing Profiles Linked: ${linkedProfilesCount}`);
        console.log(`Total Bars added to YANGLY: ${totalBars}`);
        console.log(`Total Weight added: ${totalWeight.toFixed(3)} kg`);

    } catch (error) {
        await connection.rollback();
        console.error('--- YANGLY IMPORT FAILED ---');
        console.error(error);
    } finally {
        connection.release();
        process.exit();
    }
}

importData();
