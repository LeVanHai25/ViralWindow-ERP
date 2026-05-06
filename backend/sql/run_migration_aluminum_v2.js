/**
 * Run Aluminum Scrap Migration v2
 * Executes Phase 0 + Phase 1 migrations
 */

const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🚀 Starting Aluminum Scrap Migration v2...\n');

    const connection = await db.getConnection();

    try {
        // Phase 0: Add standard_length_cm
        console.log('📦 Phase 0: Adding standard_length_cm to aluminum_systems...');
        try {
            await connection.query(`
                ALTER TABLE aluminum_systems 
                ADD COLUMN standard_length_cm INT DEFAULT 600 
                COMMENT 'Chiều dài cây chuẩn (cm), default 600 = 6m'
            `);
            console.log('   ✅ Added standard_length_cm');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('   ⏭️  standard_length_cm already exists');
            } else {
                throw e;
            }
        }

        // Phase 1.1: Add status column
        console.log('\n📦 Phase 1.1: Adding status column to aluminum_scraps...');
        try {
            await connection.query(`
                ALTER TABLE aluminum_scraps 
                ADD COLUMN status VARCHAR(16) DEFAULT 'available' 
                COMMENT 'available|reserved|used|scrapped'
            `);
            console.log('   ✅ Added status');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('   ⏭️  status already exists');
            } else {
                throw e;
            }
        }

        // Phase 1.2: Add traceability columns
        console.log('\n📦 Phase 1.2: Adding traceability columns...');
        const traceabilityColumns = [
            { name: 'system_id', type: 'INT NULL', comment: 'FK to aluminum_systems.id' },
            { name: 'source_doc_id', type: 'INT NULL', comment: 'FK to stock_documents.id' },
            { name: 'source_project_id', type: 'INT NULL', comment: 'FK to projects.id (sinh ra)' },
            { name: 'used_project_id', type: 'INT NULL', comment: 'FK to projects.id (sử dụng)' },
            { name: 'used_doc_id', type: 'INT NULL', comment: 'FK to stock_documents.id (sử dụng)' },
            { name: 'used_at', type: 'DATETIME NULL', comment: 'Thời điểm sử dụng' },
            { name: 'used_by', type: 'INT NULL', comment: 'User ID sử dụng' },
            { name: 'note', type: 'TEXT NULL', comment: 'Ghi chú' },
            { name: 'created_by', type: 'INT NULL', comment: 'User ID tạo scrap' }
        ];

        for (const col of traceabilityColumns) {
            try {
                await connection.query(`
                    ALTER TABLE aluminum_scraps 
                    ADD COLUMN ${col.name} ${col.type} 
                    COMMENT '${col.comment}'
                `);
                console.log(`   ✅ Added ${col.name}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`   ⏭️  ${col.name} already exists`);
                } else {
                    throw e;
                }
            }
        }

        // Phase 1.3: Backfill status from is_used
        console.log('\n📦 Phase 1.3: Backfilling status from is_used...');
        const [result] = await connection.query(`
            UPDATE aluminum_scraps 
            SET status = CASE 
                WHEN is_used = 1 THEN 'used'
                ELSE 'available'
            END
            WHERE status IS NULL OR status = ''
        `);
        console.log(`   ✅ Updated ${result.affectedRows} rows`);

        // Phase 1.4: Add aluminum columns to stock_document_lines
        console.log('\n📦 Phase 1.4: Adding aluminum columns to stock_document_lines...');
        const lineColumns = [
            { name: 'system_id', type: 'INT NULL', comment: 'FK aluminum_systems.id' },
            { name: 'need_cm', type: 'INT NULL', comment: 'Aluminum: cm cần dùng' },
            { name: 'bars_deducted', type: 'INT NULL', comment: 'Aluminum: số cây đã trừ' },
            { name: 'scrap_created_cm', type: 'INT NULL', comment: 'Aluminum: cm thừa đã sinh' },
            { name: 'scrap_used_cm', type: 'INT NULL', comment: 'Aluminum: cm thừa đã sử dụng' },
            { name: 'use_scrap', type: 'TINYINT(1) DEFAULT 0', comment: 'Ưu tiên dùng nhôm thừa' }
        ];

        for (const col of lineColumns) {
            try {
                await connection.query(`
                    ALTER TABLE stock_document_lines 
                    ADD COLUMN ${col.name} ${col.type} 
                    COMMENT '${col.comment}'
                `);
                console.log(`   ✅ Added ${col.name}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`   ⏭️  ${col.name} already exists`);
                } else {
                    throw e;
                }
            }
        }

        // Phase 1.5: Add meta_json to stock_ledger
        console.log('\n📦 Phase 1.5: Adding meta_json to stock_ledger...');
        try {
            await connection.query(`
                ALTER TABLE stock_ledger 
                ADD COLUMN meta_json JSON NULL 
                COMMENT 'Metadata for special calculations'
            `);
            console.log('   ✅ Added meta_json');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('   ⏭️  meta_json already exists');
            } else {
                throw e;
            }
        }

        // Verification
        console.log('\n📊 Verification...');
        const [scraps] = await connection.query(`
            SELECT status, COUNT(*) as count 
            FROM aluminum_scraps 
            GROUP BY status
        `);
        console.log('   Scraps by status:', scraps);

        const [aluminum] = await connection.query(`
            SELECT COUNT(*) as count, 
                   MAX(standard_length_cm) as max_length,
                   MIN(standard_length_cm) as min_length
            FROM aluminum_systems
        `);
        console.log('   Aluminum systems:', aluminum[0]);

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run
runMigration()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n💥 Error:', err.message);
        process.exit(1);
    });
