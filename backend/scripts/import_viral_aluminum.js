const XLSX = require('xlsx');
const db = require('../config/db');
const path = require('path');

/**
 * Import Viral Aluminum Data script - Version 3 (Merge Duplicates)
 * Imports from "Tổng Kho Viral.xlsx" into aluminum_systems and aluminum_warehouse_stock (WH ID: 1)
 */
async function importData() {
    const filePath = path.join(__dirname, '../../Tài liệu/Tổng Kho Viral.xlsx');
    const warehouseId = 1; // Kho Nhôm VIRAL

    console.log(`--- STARTING MERGE IMPORT ---`);
    console.log(`File: ${filePath}`);
    console.log(`Target Warehouse: [Kho Nhôm VIRAL] (ID: ${warehouseId})`);

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

        // Map to track unique profiles by code
        const profileMap = new Map();

        for (const row of rows) {
            const code = String(row[0] || '').trim();
            if (!code) continue;

            const systemName = String(row[1] || '').trim();
            const name = String(row[2] || '').trim();
            const density = parseFloat(row[4]) || 0;
            const lengthM = parseFloat(row[5]) || 0;
            const qtyBars = parseInt(row[6]) || 0;
            const minStock = parseInt(row[7]) || 5;
            const maxStock = parseInt(row[8]) || 50;
            const qtyM = parseFloat(row[10]) || 0;
            const color = String(row[12] || 'Xám sần').trim();

            if (profileMap.has(code)) {
                // Merge quantities
                const existing = profileMap.get(code);
                existing.qtyBars += qtyBars;
                existing.qtyM += qtyM;
                console.log(`  Merging duplicate code [${code}]: +${qtyBars} bars`);
            } else {
                profileMap.set(code, {
                    code, systemName, name, density, lengthM, qtyBars, qtyM, minStock, maxStock, color
                });
            }
        }

        console.log(`Final unique profiles to insert: ${profileMap.size}`);

        let successCount = 0;
        let totalBars = 0;
        let totalWeight = 0;

        for (const profile of profileMap.values()) {
            const brand = 'viralwindow';
            const weightPerMeter = profile.density;
            const thickness = 0.0;

            // 1. Insert into aluminum_systems 
            const [sysResult] = await connection.query(`
                INSERT INTO aluminum_systems 
                (code, name, aluminum_system, brand, weight_per_meter, thickness_mm, density, length_m, quantity, quantity_m, min_stock_level, max_stock_level, color, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
                profile.code, profile.name, profile.systemName, brand, weightPerMeter, thickness, 
                profile.density, profile.lengthM, profile.qtyBars, profile.qtyM, 
                profile.minStock, profile.maxStock, profile.color
            ]);

            const newId = sysResult.insertId;

            // 2. Insert into aluminum_warehouse_stock
            if (profile.qtyBars > 0) {
                await connection.query(`
                    INSERT INTO aluminum_warehouse_stock (warehouse_id, aluminum_system_id, quantity)
                    VALUES (?, ?, ?)
                `, [warehouseId, newId, profile.qtyBars]);
            }

            successCount++;
            totalBars += profile.qtyBars;
            totalWeight += (profile.qtyBars * profile.lengthM * profile.density);
        }

        await connection.commit();
        console.log('--- IMPORT COMPLETED SUCCESSFULLY ---');
        console.log(`Unique Profiles: ${successCount}`);
        console.log(`Total Bars: ${totalBars}`);
        console.log(`Total Weight: ${totalWeight.toFixed(3)} kg`);

    } catch (error) {
        await connection.rollback();
        console.error('--- IMPORT FAILED ---');
        console.error(error);
    } finally {
        connection.release();
        process.exit();
    }
}

importData();
