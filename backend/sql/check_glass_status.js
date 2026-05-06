/**
 * Check Glass Document Status
 */
const db = require('../config/db');

async function check() {
    try {
        console.log('=== GLASS DOCUMENT STATUS ===\n');

        const [rows] = await db.query(`
            SELECT d.id, d.doc_no, d.doc_type, d.status, dl.item_type, dl.item_code, dl.qty
            FROM stock_documents d 
            JOIN stock_document_lines dl ON dl.document_id = d.id 
            WHERE dl.item_type IN ('glass', 'other')
        `);

        console.log('Glass/Other documents:');
        console.table(rows);

        if (rows.length === 0) {
            console.log('No glass/other document lines found.');
        } else {
            const draftCount = rows.filter(r => r.status === 'draft').length;
            const postedCount = rows.filter(r => r.status === 'posted').length;
            console.log(`\nSummary: ${draftCount} draft lines, ${postedCount} posted lines`);

            if (draftCount > 0) {
                console.log('\n⚠️  Some glass/other documents are in DRAFT status.');
                console.log('   → Users need to "Hạch toán" (post) these documents for ledger entries.');
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
