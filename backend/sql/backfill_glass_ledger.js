/**
 * Audit and Backfill Script for Glass/Other Ledger Entries
 * Run: node sql/backfill_glass_ledger.js
 */

const db = require('../config/db');

async function auditAndBackfill() {
    console.log('=== STOCK LEDGER AUDIT ===\n');

    try {
        // 1. Check current ledger distribution
        console.log('1. Current stock_ledger item_type distribution:');
        const [ledgerDist] = await db.query(`
            SELECT item_type, COUNT(*) as count 
            FROM stock_ledger 
            GROUP BY item_type
        `);
        console.table(ledgerDist);

        // 2. Check document lines distribution
        console.log('\n2. stock_document_lines item_type distribution:');
        const [linesDist] = await db.query(`
            SELECT item_type, COUNT(*) as count 
            FROM stock_document_lines 
            GROUP BY item_type
        `);
        console.table(linesDist);

        // 3. Check posted documents with glass/other
        console.log('\n3. Posted documents with glass/other items:');
        const [postedGlassOther] = await db.query(`
            SELECT d.id, d.doc_no, d.doc_type, d.status, dl.item_type, 
                   COUNT(*) as line_count
            FROM stock_documents d
            JOIN stock_document_lines dl ON dl.document_id = d.id
            WHERE dl.item_type IN ('glass', 'other')
            GROUP BY d.id, d.doc_no, d.doc_type, d.status, dl.item_type
        `);
        console.table(postedGlassOther);

        // 4. Find missing ledger entries (lines in posted docs without ledger)
        console.log('\n4. Missing ledger entries (lines in posted docs without ledger):');
        const [missingLedger] = await db.query(`
            SELECT dl.id as line_id, dl.document_id, dl.item_type, dl.item_id,
                   dl.item_code, dl.qty, d.doc_type, d.status
            FROM stock_document_lines dl
            JOIN stock_documents d ON d.id = dl.document_id
            LEFT JOIN stock_ledger l ON l.document_line_id = dl.id
            WHERE d.status = 'posted' AND l.id IS NULL
        `);

        if (missingLedger.length === 0) {
            console.log('   ✅ No missing ledger entries for posted documents.');
        } else {
            console.log(`   ❌ Found ${missingLedger.length} missing ledger entries:`);
            console.table(missingLedger);

            // 5. BACKFILL missing entries
            console.log('\n5. BACKFILLING missing ledger entries...');

            for (const line of missingLedger) {
                // Get current balance for this item
                const [balanceRows] = await db.query(`
                    SELECT balance_after 
                    FROM stock_ledger 
                    WHERE item_type = ? AND item_id = ?
                    ORDER BY transaction_at DESC, id DESC 
                    LIMIT 1
                `, [line.item_type, line.item_id]);

                const currentBalance = balanceRows.length > 0
                    ? parseFloat(balanceRows[0].balance_after)
                    : 0;

                // Calculate new balance based on doc_type
                let qtyIn = 0, qtyOut = 0, newBalance = currentBalance;

                if (line.doc_type === 'import') {
                    qtyIn = parseFloat(line.qty);
                    newBalance = currentBalance + qtyIn;
                } else if (line.doc_type === 'export') {
                    qtyOut = parseFloat(line.qty);
                    newBalance = currentBalance - qtyOut;
                }

                // Insert ledger entry
                await db.query(`
                    INSERT INTO stock_ledger 
                    (document_id, document_line_id, warehouse_id, item_type, item_id, 
                     qty_in, qty_out, balance_after, user_id, transaction_at)
                    VALUES (?, ?, 1, ?, ?, ?, ?, ?, 1, NOW())
                `, [line.document_id, line.line_id, line.item_type, line.item_id,
                    qtyIn, qtyOut, newBalance]);

                console.log(`   ✅ Created ledger: ${line.item_type}/${line.item_id} - qty_in:${qtyIn}, qty_out:${qtyOut}, balance:${newBalance}`);
            }

            console.log('\n   ✅ Backfill complete!');
        }

        // 6. Final verification
        console.log('\n6. Final stock_ledger distribution:');
        const [finalDist] = await db.query(`
            SELECT item_type, COUNT(*) as count 
            FROM stock_ledger 
            GROUP BY item_type
        `);
        console.table(finalDist);

        console.log('\n=== AUDIT COMPLETE ===');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

auditAndBackfill();
