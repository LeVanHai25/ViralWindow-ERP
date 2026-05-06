/**
 * =====================================================
 * STOCK DOCUMENT CONTROLLER
 * =====================================================
 * 
 * Quản lý phiếu kho theo mô hình KiotViet
 * - Phiếu nhập (import)
 * - Phiếu xuất (export)
 * - Phiếu kiểm kho (stocktake)
 * - Phiếu điều chỉnh (adjust)
 * 
 * MVP Workflow: Draft → Posted → Cancelled
 * 
 * @author ViralWindow Development Team
 */

const db = require('../config/db');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

// =====================================================
// HELPER: Lấy tên bảng vật tư theo item_type
// =====================================================
function getItemTable(itemType) {
    const tables = {
        'accessory': 'accessories',
        'aluminum': 'aluminum_systems',
        'glass': 'inventory',         // Kính hiện tại dùng bảng inventory
        'other': 'inventory',         // Vật tư phụ cũng chuyển dần sang inventory
        'scrap': 'aluminum_scraps'    // Nhôm Đề C
    };
    // Default to inventory if not specified
    return tables[itemType] || 'inventory';
}

// =====================================================
// HELPER: Lấy tồn kho hiện tại của 1 item
// =====================================================
async function getCurrentStock(itemType, itemId, warehouseId = 1, connection = null) {
    const conn = connection || db;

    // Thử lấy từ ledger trước
    const [ledger] = await conn.query(`
        SELECT balance_after 
        FROM stock_ledger 
        WHERE item_type = ? AND item_id = ? AND warehouse_id = ?
        ORDER BY transaction_at DESC, id DESC
        LIMIT 1
    `, [itemType, itemId, warehouseId]);

    if (ledger.length > 0) {
        return parseFloat(ledger[0].balance_after);
    }

    // Fallback: lấy từ bảng gốc
    const table = getItemTable(itemType);
    let qtyColumn = 'quantity';

    // Các bảng khác nhau dùng tên cột khác nhau
    if (itemType === 'aluminum') {
        qtyColumn = 'quantity';
    } else if (table === 'inventory') {
        qtyColumn = 'quantity'; // Bảng inventory dùng quantity cho tất cả (kính, vật tư phụ)
    } else if (itemType === 'accessory' || itemType === 'other') {
        qtyColumn = 'stock_quantity'; // Bảng accessories cũ dùng stock_quantity
    }

    const [rows] = await conn.query(`SELECT ${qtyColumn} as qty FROM ${table} WHERE id = ?`, [itemId]);
    return rows.length > 0 ? parseFloat(rows[0].qty || 0) : 0;
}

// =====================================================
// HELPER: Cập nhật tồn kho trong bảng gốc
// =====================================================
async function updateItemStock(itemType, itemId, newQty, connection) {
    const table = getItemTable(itemType);
    let qtyColumn = 'quantity';

    // Các bảng khác nhau dùng tên cột khác nhau
    if (itemType === 'aluminum') {
        qtyColumn = 'quantity';
    } else if (table === 'inventory') {
        qtyColumn = 'quantity';
    } else if (itemType === 'accessory' || itemType === 'other') {
        qtyColumn = 'stock_quantity';
    }

    await connection.query(`UPDATE ${table} SET ${qtyColumn} = ? WHERE id = ?`, [newQty, itemId]);
}

// =====================================================
// HELPER: Update Order Material Status (Phase 3 Integration)
// Auto-update order_material_status when stock docs posted
// =====================================================
async function updateOrderMaterialStatus(doc, lines, connection, userId) {
    // Only update if document has project_id
    if (!doc.project_id) return;

    try {
        // Map item_type to material_type (MUST match MATERIAL_GROUPS in productionExcelController)
        const materialTypeMap = {
            'glass': 'GLASS',
            'aluminum': 'ALUMINUM',
            'accessory': 'HARDWARE',
            'other': 'ACCESSORY'
        };

        // Get unique material types from lines
        const materialTypes = [...new Set(lines.map(l => materialTypeMap[l.item_type]).filter(Boolean))];

        for (const matType of materialTypes) {
            let newStatus = 'MISSING';
            let actualDate = null;

            if (doc.doc_type === 'import') {
                // Nhập kho → ARRIVED
                newStatus = 'ARRIVED';
                actualDate = new Date().toISOString().split('T')[0];
            } else if (doc.doc_type === 'export') {
                // Xuất kho → ISSUED
                newStatus = 'ISSUED';
                actualDate = new Date().toISOString().split('T')[0];
            }

            // Upsert material status
            await connection.query(`
                INSERT INTO order_material_status 
                    (order_id, material_type, status, actual_date, source_type, source_id, updated_by)
                VALUES (?, ?, ?, ?, 'stock_document', ?, ?)
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status),
                    actual_date = VALUES(actual_date),
                    source_type = 'stock_document',
                    source_id = VALUES(source_id),
                    updated_by = VALUES(updated_by)
            `, [doc.project_id, matType, newStatus, actualDate, doc.id, userId]);

            // Log event
            await connection.query(`
                INSERT INTO order_events 
                    (order_id, event_type, event_title, payload_json, created_by)
                VALUES (?, 'MATERIAL_AUTO_UPDATE', ?, ?, ?)
            `, [
                doc.project_id,
                `Tự động cập nhật ${matType} → ${newStatus}`,
                JSON.stringify({ doc_no: doc.doc_no, doc_type: doc.doc_type, material_type: matType, status: newStatus }),
                userId
            ]);
        }

        console.log(`✅ Auto-updated material status for project ${doc.project_id}: ${materialTypes.join(', ')}`);
    } catch (error) {
        // Log but don't fail the main transaction
        console.error('Warning: Failed to update order material status:', error.message);
    }
}

// =====================================================
// HELPER: Process Aluminum Export (Phase 2 - Bar-based)
// NEW MODEL: qty = số cây xuất, meters_used = mét sử dụng thực tế
// Kho chỉ trừ theo SL cây, không auto tạo Đề C
// =====================================================
async function processAluminumExport(line, doc, connection, userId) {
    const result = {
        bars_deducted: 0,
        meters_used: 0,
        meters_leftover: 0,
        length_per_bar_m: 0,
        balance_before: 0,
        balance_after: 0,
        meta_json: {}
    };

    // Get system info for length_m (default 6m)
    const [systems] = await connection.query(
        'SELECT id, code, name, length_m, standard_length_cm, quantity FROM aluminum_systems WHERE id = ?',
        [line.system_id || line.item_id]
    );

    if (systems.length === 0) {
        throw new Error(`Không tìm thấy hệ nhôm ID ${line.system_id || line.item_id}`);
    }

    const system = systems[0];

    // Determine length per bar: prioritize length_m, fallback to standard_length_cm/100
    let lengthPerBarM = parseFloat(system.length_m) || 0;
    if (lengthPerBarM === 0 && system.standard_length_cm) {
        lengthPerBarM = parseInt(system.standard_length_cm) / 100;
    }
    if (lengthPerBarM === 0) {
        lengthPerBarM = 6; // Default 6m
    }

    // Current stock: use quantity column
    const currentBars = parseInt(system.quantity) || 0;

    // =====================================================
    // NEW MODEL: qty = số cây xuất, meters_used = mét sử dụng
    // =====================================================
    const qtyBars = parseInt(line.qty) || 0;
    let metersUsed = parseFloat(line.meters_used) || 0;

    // BACKWARD COMPATIBILITY: If meters_used not provided but need_cm is, convert
    if (metersUsed === 0 && line.need_cm) {
        metersUsed = parseInt(line.need_cm) / 100;
    }

    // =====================================================
    // VALIDATION
    // =====================================================
    if (qtyBars <= 0) {
        throw new Error('Số lượng cây xuất phải >= 1');
    }

    if (qtyBars > currentBars) {
        throw new Error(
            `Không đủ tồn kho nhôm ${system.code || system.name}. ` +
            `Tồn: ${currentBars} cây, Yêu cầu: ${qtyBars} cây`
        );
    }

    const maxMeters = qtyBars * lengthPerBarM;
    if (metersUsed > maxMeters) {
        throw new Error(
            `Mét sử dụng (${metersUsed}m) vượt quá tổng mét của ${qtyBars} cây (${maxMeters}m). ` +
            `Dài/cây: ${lengthPerBarM}m`
        );
    }

    if (metersUsed > 0 && metersUsed < 0.01) {
        throw new Error('Mét sử dụng phải > 0');
    }

    // Calculate leftover (for display only, user manually creates Nhôm Đề C)
    const metersLeftover = maxMeters - (metersUsed || maxMeters);

    // ATOMIC UPDATE: Deduct bars from specific warehouse stock
    // =====================================================
    const warehouseId = doc.warehouse_id || 1;

    // Get BEFORE balance for record keeping
    const [wsBeforeRows] = await connection.query(
        'SELECT quantity FROM aluminum_warehouse_stock WHERE warehouse_id = ? AND aluminum_system_id = ?',
        [warehouseId, system.id]
    );
    const balanceBefore = wsBeforeRows.length > 0 ? Number(wsBeforeRows[0].quantity) : 0;
    result.balance_before = balanceBefore;

    // First, update the warehouse-specific stock
    // We use INSERT ... ON DUPLICATE KEY UPDATE to ensure a record exists
    await connection.query(`
        INSERT INTO aluminum_warehouse_stock (warehouse_id, aluminum_system_id, quantity)
        VALUES (?, ?, 0)
        ON DUPLICATE KEY UPDATE quantity = quantity
    `, [warehouseId, system.id]);

    const [updateResult] = await connection.query(`
        UPDATE aluminum_warehouse_stock
        SET quantity = GREATEST(0, quantity - ?)
        WHERE warehouse_id = ? AND aluminum_system_id = ? AND quantity >= ?
    `, [qtyBars, warehouseId, system.id, qtyBars]);

    if (updateResult.affectedRows === 0) {
        // Check if there's any stock at all in this warehouse
        const [wsRows] = await connection.query(
            'SELECT quantity FROM aluminum_warehouse_stock WHERE warehouse_id = ? AND aluminum_system_id = ?',
            [warehouseId, system.id]
        );
        const wsQty = wsRows.length > 0 ? wsRows[0].quantity : 0;

        throw new Error(
            `Không đủ tồn kho nhôm tại kho được chọn. ${system.code || system.name}: ` +
            `cần ${qtyBars} cây nhưng kho chỉ còn ${wsQty} cây`
        );
    }

    // sync legacy quantity in aluminum_systems
    await connection.query(`
        UPDATE aluminum_systems
        SET quantity = (SELECT SUM(quantity) FROM aluminum_warehouse_stock WHERE aluminum_system_id = ?)
        WHERE id = ?
    `, [system.id, system.id]);

    result.bars_deducted = qtyBars;
    result.meters_used = metersUsed;
    result.meters_leftover = metersLeftover;
    result.length_per_bar_m = lengthPerBarM;
    result.balance_after = balanceBefore - qtyBars;

    // Build meta_json for ledger
    result.meta_json = {
        type: 'aluminum_export',
        qty_bars: qtyBars,
        length_per_bar_m: lengthPerBarM,
        meters_used: metersUsed,
        meters_leftover: metersLeftover,
        note: metersLeftover > 0 ? `Thừa ${metersLeftover.toFixed(2)}m, nhập thủ công vào Nhôm Đề C nếu cần` : null
    };

    // Update line with calculation results AND balances
    await connection.query(`
        UPDATE stock_document_lines
        SET meters_used = ?, length_per_bar_m = ?, meters_leftover = ?, system_id = ?,
            balance_before = ?, balance_after = ?
        WHERE id = ?
    `, [metersUsed, lengthPerBarM, metersLeftover, system.id, result.balance_before, result.balance_after, line.id]);

    console.log(`[Aluminum Export] ${system.code || system.name}: ${qtyBars} bars × ${lengthPerBarM}m = ${maxMeters}m total, used ${metersUsed}m, leftover ${metersLeftover}m`);

    return result;
}

// =====================================================
// HELPER: Process Aluminum Import (Phase 2 - Bar-based)
// Nhập kho theo số cây
// =====================================================
async function processAluminumImport(line, doc, connection, userId) {
    const systemId = line.system_id || line.item_id;

    // Get qty (number of bars)
    const barsToAdd = parseInt(line.qty) || 0;

    if (barsToAdd <= 0) {
        throw new Error('Số lượng nhôm nhập phải > 0');
    }

    const warehouseId = doc.warehouse_id || 1;

    // Get BEFORE balance
    const [wsBeforeRows] = await connection.query(
        'SELECT quantity FROM aluminum_warehouse_stock WHERE warehouse_id = ? AND aluminum_system_id = ?',
        [warehouseId, systemId]
    );
    const balanceBefore = wsBeforeRows.length > 0 ? Number(wsBeforeRows[0].quantity) : 0;

    // ATOMIC UPDATE: Add bars to specific warehouse stock
    await connection.query(`
        INSERT INTO aluminum_warehouse_stock (warehouse_id, aluminum_system_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `, [warehouseId, systemId, barsToAdd]);

    // sync legacy quantity in aluminum_systems
    await connection.query(`
        UPDATE aluminum_systems 
        SET quantity = (SELECT SUM(quantity) FROM aluminum_warehouse_stock WHERE aluminum_system_id = ?) 
        WHERE id = ?
    `, [systemId, systemId]);

    const balanceAfter = balanceBefore + barsToAdd;

    // Update line balances
    await connection.query(`
        UPDATE stock_document_lines
        SET balance_before = ?, balance_after = ?
        WHERE id = ?
    `, [balanceBefore, balanceAfter, line.id]);

    return {
        bars_added: barsToAdd,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        meta_json: {
            type: 'aluminum_import',
            bars_added: barsToAdd
        }
    };
}

// =====================================================
// CREATE DOCUMENT (Draft)
// =====================================================
exports.create = async (req, res) => {
    let connection;

    try {
        const { doc_type, warehouse_id = 1, project_id, supplier_id, note, lines = [], doc_no: requestDocNo } = req.body;
        const user = req.user;

        if (!doc_type || !['import', 'export', 'stocktake', 'adjust'].includes(doc_type)) {
            return res.status(400).json({
                success: false,
                message: 'doc_type phải là: import, export, stocktake, adjust'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Export phải có project_id
        if (doc_type === 'export' && !project_id) {
            throw new Error('Phiếu xuất kho phải gắn dự án');
        }

        // Use custom doc_no if provided, otherwise generate unique doc_no
        let docNo;
        if (requestDocNo && requestDocNo.trim()) {
            docNo = requestDocNo.trim();
        } else {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const uniqueSuffix = Date.now().toString().slice(-6);
            const prefixes = { 'import': 'NK', 'export': 'XK', 'stocktake': 'KK', 'adjust': 'DC' };
            docNo = `${prefixes[doc_type] || 'PK'}${dateStr}-${uniqueSuffix}`;
        }

        // Create document with generated doc_no
        const [docResult] = await connection.query(`
            INSERT INTO stock_documents 
            (doc_no, doc_type, warehouse_id, project_id, supplier_id, note, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [docNo, doc_type, warehouse_id, project_id || null, supplier_id || null, note, user.id]);

        const docId = docResult.insertId;

        // Add lines if provided
        let totalQty = 0;
        let totalValue = 0;


        for (const line of lines) {
            let { item_type, item_id, qty, unit_price = 0, note: lineNote, meters_used, qty_actual, qty_diff, item_code: lineItemCode, item_name: lineItemName } = line;

            // =====================================================
            // AUTO-RESOLVE: item_code/item_name → item_id
            // Khi tạo phiếu từ YCVT, chỉ có item_code/item_name, không có item_id
            // =====================================================
            if (!item_id && (lineItemCode || lineItemName) && item_type) {
                try {
                    const table = getItemTable(item_type);
                    let resolvedId = null;

                    if (item_type === 'accessory') {
                        // accessories: code, name
                        if (lineItemCode) {
                            const [rows] = await connection.query('SELECT id FROM accessories WHERE code = ? LIMIT 1', [lineItemCode]);
                            if (rows.length > 0) resolvedId = rows[0].id;
                        }
                        if (!resolvedId && lineItemName) {
                            const [rows] = await connection.query('SELECT id FROM accessories WHERE name = ? LIMIT 1', [lineItemName]);
                            if (rows.length > 0) resolvedId = rows[0].id;
                        }
                    } else if (item_type === 'aluminum') {
                        // aluminum_systems: code, name
                        if (lineItemCode) {
                            const [rows] = await connection.query('SELECT id FROM aluminum_systems WHERE code = ? LIMIT 1', [lineItemCode]);
                            if (rows.length > 0) resolvedId = rows[0].id;
                        }
                        if (!resolvedId && lineItemName) {
                            const [rows] = await connection.query('SELECT id FROM aluminum_systems WHERE name = ? LIMIT 1', [lineItemName]);
                            if (rows.length > 0) resolvedId = rows[0].id;
                        }
                    } else {
                        // inventory (glass, other): item_code, item_name
                        if (lineItemCode) {
                            const [rows] = await connection.query('SELECT id FROM inventory WHERE item_code = ? LIMIT 1', [lineItemCode]);
                            if (rows.length > 0) resolvedId = rows[0].id;
                        }
                        if (!resolvedId && lineItemName) {
                            const [rows] = await connection.query('SELECT id FROM inventory WHERE item_name = ? LIMIT 1', [lineItemName]);
                            if (rows.length > 0) resolvedId = rows[0].id;
                        }
                    }

                    if (resolvedId) {
                        item_id = resolvedId;
                        console.log(`✅ Auto-resolved ${item_type} "${lineItemCode || lineItemName}" → ID ${item_id}`);
                    } else {
                        console.warn(`⚠️ Could not resolve ${item_type} "${lineItemCode || lineItemName}" to item_id, skipping line`);
                    }
                } catch (resolveErr) {
                    console.warn('⚠️ Error resolving item_id:', resolveErr.message);
                }
            }

            if (!item_type || !item_id || !qty || qty <= 0) {
                continue; // Skip invalid lines
            }

            // =====================================================
            // FETCH ACTUAL ITEM PRICE (if not provided by frontend)
            // =====================================================
            let finalUnitPrice = parseFloat(unit_price) || 0;

            // Get item info for snapshot
            const table = getItemTable(item_type);
            let itemCode = '';
            let itemName = '';
            let lengthPerBarM = null;
            let metersUsed = null;
            let metersLeftover = null;

            if (table === 'inventory') {
                // Bảng inventory (Kính, Vật tư phụ sau khi di chuyển)
                const [items] = await connection.query(
                    `SELECT id, item_code, item_name, unit_price, quantity, notes FROM inventory WHERE id = ? LIMIT 1`,
                    [item_id]
                );
                const item = items[0];
                itemCode = item?.item_code || (item_type === 'glass' ? 'K-' : 'VT-') + item_id;
                itemName = item?.item_name || '';
                
                if (finalUnitPrice === 0 && item) {
                    finalUnitPrice = parseFloat(item.unit_price) || 0;
                }
            } else if (item_type === 'aluminum' && doc_type === 'export') {
                // =====================================================
                // ALUMINUM EXPORT: Handle meters_used
                // =====================================================
                const [items] = await connection.query(
                    `SELECT * FROM aluminum_systems WHERE id = ? LIMIT 1`,
                    [item_id]
                );
                if (items.length === 0) {
                    throw new Error(`Không tìm thấy hệ nhôm ID ${item_id}`);
                }
                const system = items[0];
                itemCode = system.code || '';
                itemName = system.name || '';

                // ✅ Fetch price from DB if not provided
                if (finalUnitPrice === 0) {
                    finalUnitPrice = parseFloat(system.unit_price || system.price) || 0;
                }

                // Length per bar
                lengthPerBarM = parseFloat(system.length_m) || 6;

                // Meters used (from frontend)
                metersUsed = parseFloat(meters_used) || 0;

                // Validate meters_used
                const maxMeters = qty * lengthPerBarM;
                if (metersUsed > maxMeters) {
                    throw new Error(`Mét sử dụng (${metersUsed}m) vượt quá tổng mét của ${qty} cây (${maxMeters}m)`);
                }

                // Calculate leftover
                metersLeftover = maxMeters - metersUsed;
            } else if (item_type === 'accessory' || item_type === 'other') {
                // ✅ Accessories: Fetch sale_price
                // Use SELECT * for safety to handle different column names
                const [items] = await connection.query(
                    `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
                    [item_id]
                );
                itemCode = items[0]?.code || '';
                itemName = items[0]?.name || '';

                // ✅ Fetch price from DB if not provided (prioritize sale_price)
                if (finalUnitPrice === 0 && items.length > 0) {
                    finalUnitPrice = parseFloat(items[0].sale_price || items[0].purchase_price) || 0;
                }
            } else {
                // Các loại khác: dùng code hoặc tên tương đương
                // Use SELECT * for safety
                const [items] = await connection.query(
                    `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
                    [item_id]
                );
                itemCode = items[0]?.code || '';
                itemName = items[0]?.name || '';

                // ✅ Fetch price from DB if not provided
                if (finalUnitPrice === 0 && items.length > 0) {
                    finalUnitPrice = parseFloat(items[0].unit_price || items[0].price) || 0;
                }
            }

            // Line total
            const lineTotal = qty * finalUnitPrice;

            // For stocktake, calculate system qty if not provided, or prioritize provided actual/diff
            let finalQtyActual = qty_actual !== undefined ? parseFloat(qty_actual) : null;
            let finalQtyDiff = qty_diff !== undefined ? parseFloat(qty_diff) : null;
            let qtySystem = null;
            let balanceBefore = null;
            let balanceAfter = null;

            if (doc_type === 'stocktake') {
                qtySystem = await getCurrentStock(item_type, item_id, warehouse_id, connection);
                
                // If Frontend sends qty as actual stock (per new plan), align it
                if (finalQtyActual === null && qty !== undefined) {
                    finalQtyActual = parseFloat(qty);
                }
                
                // Calculate diff if not provided
                if (finalQtyDiff === null && finalQtyActual !== null) {
                    finalQtyDiff = finalQtyActual - qtySystem;
                }
            } else {
                balanceBefore = await getCurrentStock(item_type, item_id, warehouse_id, connection);
                if (doc_type === 'import' || doc_type === 'adjust') {
                    balanceAfter = balanceBefore + qty;
                } else if (doc_type === 'export') {
                    balanceAfter = balanceBefore - qty;
                }
            }

            // Get project_id from document for export lines
            const lineProjectId = doc_type === 'export' ? project_id : null;

            // Insert line with meters columns for aluminum and stocktake columns
            await connection.query(`
                INSERT INTO stock_document_lines 
                (document_id, item_type, item_id, item_code, item_name, qty, unit_price, line_total, qty_system, qty_actual, qty_diff, note, project_id, meters_used, length_per_bar_m, meters_leftover, balance_before, balance_after)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [docId, item_type, item_id, itemCode, itemName, qty, finalUnitPrice, lineTotal, qtySystem, finalQtyActual, finalQtyDiff, lineNote, lineProjectId, metersUsed, lengthPerBarM, metersLeftover, balanceBefore, balanceAfter]);

            totalQty += qty;
            totalValue += lineTotal;
        }

        // Update totals
        await connection.query(
            'UPDATE stock_documents SET total_qty = ?, total_value = ? WHERE id = ?',
            [totalQty, totalValue, docId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: `Đã tạo phiếu ${docNo}`,
            data: {
                id: docId,
                doc_no: docNo,
                doc_type,
                status: 'draft',
                lines_count: lines.length
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creating stock document:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// ADD/UPDATE LINES
// =====================================================
exports.addLines = async (req, res) => {
    let connection;

    try {
        const { id } = req.params;
        const { lines } = req.body;

        if (!lines || !Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ success: false, message: 'Thiếu danh sách lines' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get document
        const [docs] = await connection.query('SELECT * FROM stock_documents WHERE id = ?', [id]);

        if (docs.length === 0) {
            throw new Error('Không tìm thấy phiếu');
        }

        const doc = docs[0];

        if (doc.status !== 'draft') {
            throw new Error('Chỉ có thể sửa phiếu ở trạng thái nháp');
        }

        let totalQty = doc.total_qty || 0;
        let totalValue = doc.total_value || 0;

        for (const line of lines) {
            const { item_type, item_id, qty, unit_price = 0, note: lineNote, qty_actual, qty_diff } = line;

            if (!item_type || !item_id || !qty || qty <= 0) {
                continue;
            }

            // Get item info - handle different column names for each table
            const table = getItemTable(item_type);
            let itemCode = '';
            let itemName = '';

            if (item_type === 'scrap') {
                // aluminum_scraps has scrap_code and profile_name
                const [items] = await connection.query(`SELECT scrap_code, profile_name FROM ${table} WHERE id = ?`, [item_id]);
                itemCode = items[0]?.scrap_code || `DC-${item_id}`;
                itemName = items[0]?.profile_name || 'Nhôm Đề C';
            } else {
                const [items] = await connection.query(`SELECT code, name FROM ${table} WHERE id = ?`, [item_id]);
                itemCode = items[0]?.code || '';
                itemName = items[0]?.name || '';
            }

            const lineTotal = qty * unit_price;

            // Check if line exists
            const [existing] = await connection.query(
                'SELECT id FROM stock_document_lines WHERE document_id = ? AND item_type = ? AND item_id = ?',
                [id, item_type, item_id]
            );

            if (existing.length > 0) {
                // Determine balance snapshot for draft import/export/adjust
                let balanceBefore = null;
                let balanceAfter = null;
                
                if (doc.doc_type !== 'stocktake') {
                    balanceBefore = await getCurrentStock(item_type, item_id, doc.warehouse_id, connection);
                    if (doc.doc_type === 'import' || doc.doc_type === 'adjust') {
                        balanceAfter = balanceBefore + qty;
                    } else if (doc.doc_type === 'export') {
                        balanceAfter = balanceBefore - qty;
                    }
                }

                // Update existing
                await connection.query(`
                    UPDATE stock_document_lines 
                    SET qty = ?, unit_price = ?, line_total = ?, note = ?, qty_actual = ?, qty_diff = ?, balance_before = ?, balance_after = ?
                    WHERE id = ?
                `, [qty, unit_price, lineTotal, lineNote, qty_actual || null, qty_diff || null, balanceBefore, balanceAfter, existing[0].id]);
            } else {
                // Insert new
                let qtySystem = null;
                let finalQtyActual = qty_actual !== undefined ? parseFloat(qty_actual) : null;
                let finalQtyDiff = qty_diff !== undefined ? parseFloat(qty_diff) : null;
                let balanceBefore = null;
                let balanceAfter = null;

                if (doc.doc_type === 'stocktake') {
                    qtySystem = await getCurrentStock(item_type, item_id, doc.warehouse_id, connection);
                    if (finalQtyActual === null) finalQtyActual = qty;
                    if (finalQtyDiff === null && finalQtyActual !== null) finalQtyDiff = finalQtyActual - qtySystem;
                } else {
                    balanceBefore = await getCurrentStock(item_type, item_id, doc.warehouse_id, connection);
                    if (doc.doc_type === 'import' || doc.doc_type === 'adjust') {
                        balanceAfter = balanceBefore + qty;
                    } else if (doc.doc_type === 'export') {
                        balanceAfter = balanceBefore - qty;
                    }
                }

                // Get project_id from document for export lines
                const lineProjectId = doc.doc_type === 'export' ? doc.project_id : null;

                await connection.query(`
                    INSERT INTO stock_document_lines 
                    (document_id, item_type, item_id, item_code, item_name, qty, unit_price, line_total, qty_system, qty_actual, qty_diff, note, project_id, balance_before, balance_after)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [id, item_type, item_id, itemCode, itemName, qty, unit_price, lineTotal, qtySystem, finalQtyActual, finalQtyDiff, lineNote, lineProjectId, balanceBefore, balanceAfter]);
            }

            totalQty += qty;
            totalValue += lineTotal;
        }

        // Recalculate totals
        const [totals] = await connection.query(`
            SELECT SUM(qty) as total_qty, SUM(line_total) as total_value 
            FROM stock_document_lines WHERE document_id = ?
        `, [id]);

        await connection.query(
            'UPDATE stock_documents SET total_qty = ?, total_value = ?, row_version = row_version + 1 WHERE id = ?',
            [totals[0].total_qty || 0, totals[0].total_value || 0, id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã cập nhật lines',
            data: { lines_added: lines.length }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error adding lines:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// UPDATE DOCUMENT (Sửa phiếu nháp)
// =====================================================
exports.update = async (req, res) => {
    let connection;

    try {
        const { id } = req.params;
        const { doc_no, supplier_id, project_id, note, lines = [] } = req.body;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get document
        const [docs] = await connection.query('SELECT * FROM stock_documents WHERE id = ?', [id]);

        if (docs.length === 0) {
            throw new Error('Không tìm thấy phiếu');
        }

        const doc = docs[0];

        if (doc.status !== 'draft') {
            throw new Error('Chỉ có thể sửa phiếu ở trạng thái nháp');
        }

        // Update header fields
        const updateFields = [];
        const updateValues = [];

        if (doc_no !== undefined) {
            updateFields.push('doc_no = ?');
            updateValues.push(doc_no || doc.doc_no);
        }
        if (supplier_id !== undefined) {
            updateFields.push('supplier_id = ?');
            updateValues.push(supplier_id || null);
        }
        if (project_id !== undefined) {
            updateFields.push('project_id = ?');
            updateValues.push(project_id || null);
        }
        if (note !== undefined) {
            updateFields.push('note = ?');
            updateValues.push(note || '');
        }

        if (updateFields.length > 0) {
            updateValues.push(id);
            await connection.query(
                `UPDATE stock_documents SET ${updateFields.join(', ')}, row_version = row_version + 1 WHERE id = ?`,
                updateValues
            );
        }

        // Replace lines: delete old → insert new
        if (lines.length > 0) {
            // Delete existing lines
            await connection.query('DELETE FROM stock_document_lines WHERE document_id = ?', [id]);

            let totalQty = 0;
            let totalValue = 0;

            for (const line of lines) {
                const { item_type, item_id, qty, unit_price = 0, note: lineNote, qty_actual, qty_diff, meters_used } = line;

                if (!item_type || !item_id || !qty || qty <= 0) {
                    continue;
                }

                // Fetch actual item price if not provided
                let finalUnitPrice = parseFloat(unit_price) || 0;
                const table = getItemTable(item_type);
                let itemCode = '';
                let itemName = '';

                if (table === 'inventory') {
                    const [items] = await connection.query(
                        `SELECT item_code, item_name, unit_price FROM inventory WHERE id = ? LIMIT 1`, [item_id]
                    );
                    itemCode = items[0]?.item_code || '';
                    itemName = items[0]?.item_name || '';
                    if (finalUnitPrice === 0 && items.length > 0) {
                        finalUnitPrice = parseFloat(items[0].unit_price) || 0;
                    }
                } else if (item_type === 'accessory' || item_type === 'other') {
                    const [items] = await connection.query(
                        `SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [item_id]
                    );
                    itemCode = items[0]?.code || '';
                    itemName = items[0]?.name || '';
                    if (finalUnitPrice === 0 && items.length > 0) {
                        finalUnitPrice = parseFloat(items[0].sale_price || items[0].purchase_price) || 0;
                    }
                } else if (item_type === 'aluminum') {
                    const [items] = await connection.query(
                        `SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [item_id]
                    );
                    itemCode = items[0]?.code || '';
                    itemName = items[0]?.name || '';
                    if (finalUnitPrice === 0 && items.length > 0) {
                        finalUnitPrice = parseFloat(items[0].unit_price || items[0].price) || 0;
                    }
                }

                const lineTotal = qty * finalUnitPrice;

                // For stocktake, get current system qty
                let qtySystem = null;
                let finalQtyActual = qty_actual !== undefined ? parseFloat(qty_actual) : null;
                let finalQtyDiff = qty_diff !== undefined ? parseFloat(qty_diff) : null;
                let balanceBefore = null;
                let balanceAfter = null;

                if (doc.doc_type === 'stocktake') {
                    qtySystem = await getCurrentStock(item_type, item_id, doc.warehouse_id, connection);
                    if (finalQtyActual === null) finalQtyActual = qty;
                    if (finalQtyDiff === null && finalQtyActual !== null) finalQtyDiff = finalQtyActual - qtySystem;
                } else {
                    balanceBefore = await getCurrentStock(item_type, item_id, doc.warehouse_id, connection);
                    if (doc.doc_type === 'import' || doc.doc_type === 'adjust') {
                        balanceAfter = balanceBefore + qty;
                    } else if (doc.doc_type === 'export') {
                        balanceAfter = balanceBefore - qty;
                    }
                }

                await connection.query(`
                    INSERT INTO stock_document_lines 
                    (document_id, item_type, item_id, item_code, item_name, qty, unit_price, line_total, qty_system, qty_actual, qty_diff, note, balance_before, balance_after)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [id, item_type, item_id, itemCode, itemName, qty, finalUnitPrice, lineTotal, qtySystem, finalQtyActual, finalQtyDiff, lineNote || '', balanceBefore, balanceAfter]);

                totalQty += qty;
                totalValue += lineTotal;
            }

            // Update totals
            await connection.query(
                'UPDATE stock_documents SET total_qty = ?, total_value = ?, row_version = row_version + 1 WHERE id = ?',
                [totalQty, totalValue, id]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: `Đã cập nhật phiếu ${doc.doc_no}`,
            data: { id: parseInt(id), doc_no: doc.doc_no }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error updating stock document:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// POST (Hạch toán) - Cập nhật tồn kho
// =====================================================
exports.post = async (req, res) => {
    let connection;

    try {
        const { id } = req.params;
        const user = req.user;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get document with lock
        const [docs] = await connection.query(
            'SELECT * FROM stock_documents WHERE id = ? FOR UPDATE',
            [id]
        );

        if (docs.length === 0) {
            throw new Error('Không tìm thấy phiếu');
        }

        const doc = docs[0];

        if (doc.status === 'posted') {
            throw new Error('Phiếu đã được hạch toán');
        }

        if (doc.status === 'cancelled') {
            throw new Error('Phiếu đã bị hủy');
        }

        console.log(`[DEBUG] POSTing document ID: ${id}, type: ${doc.doc_type}`);

        // Get lines
        const [lines] = await connection.query(
            'SELECT * FROM stock_document_lines WHERE document_id = ?',
            [id]
        );

        if (lines.length === 0) {
            throw new Error('Phiếu không có dòng vật tư nào');
        }

        console.log(`[DEBUG] Found ${lines.length} lines to process`);

        // Process each line
        for (const line of lines) {
            let qtyIn = 0;
            let qtyOut = 0;
            let newBalance = 0;
            let metaJson = null;

            const itemIdForQuery = line.system_id || line.item_id;

            // =====================================================
            // ALUMINUM SPECIAL HANDLING (Phase 2: Bar-based)
            // =====================================================
            if (line.item_type === 'aluminum') {
                if (doc.doc_type === 'export') {
                    // Xuất nhôm: tính cây, trừ kho, sinh scrap
                    const aluResult = await processAluminumExport(line, doc, connection, user.id);
                    qtyOut = aluResult.bars_deducted;
                    metaJson = aluResult.meta_json;

                    // Get new balance after atomic update
                    const [sysRows] = await connection.query(
                        'SELECT quantity FROM aluminum_systems WHERE id = ?',
                        [itemIdForQuery]
                    );
                    newBalance = sysRows.length > 0 ? Number(sysRows[0].quantity) : 0;

                } else if (doc.doc_type === 'import' || doc.doc_type === 'adjust') {
                    // Nhập nhôm: cộng cây
                    const aluResult = await processAluminumImport(line, doc, connection, user.id);
                    qtyIn = aluResult.bars_added;
                    metaJson = aluResult.meta_json;

                    // Get new balance after update
                    const [sysRows] = await connection.query(
                        'SELECT quantity FROM aluminum_systems WHERE id = ?',
                        [itemIdForQuery]
                    );
                    newBalance = sysRows.length > 0 ? Number(sysRows[0].quantity) : 0;

                } else if (doc.doc_type === 'stocktake') {
                    // Kiểm kho nhôm: set tồn = thực tế (theo cây) cho kho cụ thể
                    const qtyActual = (line.qty_actual !== null && line.qty_actual !== undefined) ? Number(line.qty_actual) : Number(line.qty);
                    const warehouseId = doc.warehouse_id || 1;

                    // Get current stock in this warehouse for diff calculation
                    const [wsRows] = await connection.query(
                        'SELECT quantity FROM aluminum_warehouse_stock WHERE warehouse_id = ? AND aluminum_system_id = ?',
                        [warehouseId, itemIdForQuery]
                    );
                    const currentBars = wsRows.length > 0 ? Number(wsRows[0].quantity) : 0;
                    const diff = qtyActual - currentBars;

                    if (diff > 0) {
                        qtyIn = diff;
                    } else if (diff < 0) {
                        qtyOut = Math.abs(diff);
                    }

                    // Update specific warehouse stock
                    await connection.query(`
                        INSERT INTO aluminum_warehouse_stock (warehouse_id, aluminum_system_id, quantity)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
                    `, [warehouseId, itemIdForQuery, qtyActual]);

                    // NEW: Calculate total balance across ALL warehouses for aluminum_systems.quantity
                    const [totalRows] = await connection.query(`
                        SELECT COALESCE(SUM(quantity), 0) as total_qty 
                        FROM aluminum_warehouse_stock 
                        WHERE aluminum_system_id = ?
                    `, [itemIdForQuery]);
                    newBalance = Number(totalRows[0].total_qty);

                    // Sync legacy quantity
                    await connection.query(`
                        UPDATE aluminum_systems 
                        SET quantity = ?
                        WHERE id = ?
                    `, [newBalance, itemIdForQuery]);

                    metaJson = { type: 'aluminum_stocktake', actual: qtyActual, diff };

                    // Update line
                    await connection.query(`
                        UPDATE stock_document_lines 
                        SET qty_actual = ?, qty_diff = ? 
                        WHERE id = ?
                    `, [qtyActual, diff, line.id]);
                }

                // Ghi ledger với meta_json
                await connection.query(`
                    INSERT INTO stock_ledger 
                    (document_id, document_line_id, warehouse_id, item_type, item_id, 
                     qty_in, qty_out, balance_after, user_id, meta_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [id, line.id, doc.warehouse_id, line.item_type, line.item_id,
                    qtyIn, qtyOut, newBalance, user.id, metaJson ? JSON.stringify(metaJson) : null]);

                // Skip normal processing - aluminum already handled
                continue;
            }

            // =====================================================
            // SCRAP SPECIAL HANDLING (Phase 3: Nhôm Đề C)
            // =====================================================
            if (line.item_type === 'scrap') {
                if (doc.doc_type === 'export') {
                    // Xuất Nhôm Đề C: trừ length hoặc mark used
                    const scrapId = line.item_id;
                    const metersUsed = parseFloat(line.meters_used) || 0;
                    const metersUsedMm = Math.round(metersUsed * 1000); // Convert m to mm

                    // Get current scrap info
                    const [scraps] = await connection.query(
                        'SELECT id, profile_name, length_mm, status FROM aluminum_scraps WHERE id = ? FOR UPDATE',
                        [scrapId]
                    );

                    if (scraps.length === 0) {
                        throw new Error(`Không tìm thấy Nhôm Đề C ID: ${scrapId}`);
                    }

                    const scrap = scraps[0];
                    const currentLengthMm = parseInt(scrap.length_mm) || 0;
                    const remainingMm = currentLengthMm - metersUsedMm;

                    if (metersUsedMm > currentLengthMm) {
                        throw new Error(
                            `Không đủ chiều dài Nhôm Đề C "${scrap.profile_name}". ` +
                            `Còn: ${currentLengthMm}mm, Cần: ${metersUsedMm}mm`
                        );
                    }

                    if (remainingMm <= 0) {
                        // Dùng hết → mark as used
                        await connection.query(`
                            UPDATE aluminum_scraps 
                            SET status = 'used', is_used = 1, 
                                used_project_id = ?, used_at = NOW(), used_by = ?,
                                note = CONCAT(IFNULL(note, ''), '\nXuất hết theo phiếu ', ?)
                            WHERE id = ?
                        `, [doc.project_id, user.id, doc.doc_no, scrapId]);
                        newBalance = 0;
                    } else {
                        // Dùng một phần → giảm length_mm, vẫn available
                        await connection.query(`
                            UPDATE aluminum_scraps 
                            SET length_mm = ?,
                                note = CONCAT(IFNULL(note, ''), '\nXuất ${metersUsed}m (${metersUsedMm}mm) theo phiếu ', ?)
                            WHERE id = ?
                        `, [remainingMm, doc.doc_no, scrapId]);
                        newBalance = remainingMm;
                    }

                    qtyOut = metersUsed; // Xuất theo mét
                    metaJson = {
                        type: 'scrap_export',
                        scrap_id: scrapId,
                        profile_name: scrap.profile_name,
                        meters_used: metersUsed,
                        length_before_mm: currentLengthMm,
                        length_after_mm: remainingMm,
                        fully_used: remainingMm <= 0
                    };

                    console.log(`[Scrap Export] ${scrap.profile_name}: ${metersUsed}m used, remaining ${remainingMm}mm`);
                }

                // Ghi ledger cho scrap
                await connection.query(`
                    INSERT INTO stock_ledger 
                    (document_id, document_line_id, warehouse_id, item_type, item_id, 
                     qty_in, qty_out, balance_after, user_id, meta_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [id, line.id, doc.warehouse_id, line.item_type, line.item_id,
                    qtyIn, qtyOut, newBalance, user.id, metaJson ? JSON.stringify(metaJson) : null]);

                // Skip normal processing - scrap already handled
                continue;
            }

            // =====================================================
            // NORMAL PROCESSING (Non-aluminum items)
            // =====================================================
            const currentStock = parseFloat(await getCurrentStock(line.item_type, line.item_id, doc.warehouse_id, connection)) || 0;
            const lineQty = parseFloat(line.qty) || 0;
            newBalance = currentStock;

            if (doc.doc_type === 'import' || doc.doc_type === 'adjust') {
                // Nhập kho: cộng tồn
                qtyIn = lineQty;
                newBalance = currentStock + qtyIn;

            } else if (doc.doc_type === 'export') {
                // Xuất kho: trừ tồn
                qtyOut = lineQty;

                // ✅ BACKEND ENFORCE: Chặn xuất vượt tồn
                if (qtyOut > currentStock) {
                    throw new Error(
                        `Không đủ tồn kho cho ${line.item_name} (${line.item_code}). ` +
                        `Tồn: ${currentStock}, Cần xuất: ${qtyOut}`
                    );
                }

                newBalance = currentStock - qtyOut;

            } else if (doc.doc_type === 'stocktake') {
                // Kiểm kho: set tồn = thực tế
                // Prioritize qty_actual if saved in draft, OR treat line.qty as actual (aligned with Frontend change)
                const qtyActual = (line.qty_actual !== null && line.qty_actual !== undefined) ? Number(line.qty_actual) : Number(line.qty);
                const diff = qtyActual - currentStock;

                if (diff > 0) {
                    qtyIn = diff;
                } else if (diff < 0) {
                    qtyOut = Math.abs(diff);
                }

                newBalance = qtyActual;

                // Update qty_actual và qty_diff
                await connection.query(`
                    UPDATE stock_document_lines 
                    SET qty_actual = ?, qty_diff = ? 
                    WHERE id = ?
                `, [qtyActual, diff, line.id]);
            }

            // Update line with balances
            await connection.query(`
                UPDATE stock_document_lines 
                SET balance_before = ?, balance_after = ?
                WHERE id = ?
            `, [currentStock, newBalance, line.id]);

            // Ghi ledger
            await connection.query(`
                INSERT INTO stock_ledger 
                (document_id, document_line_id, warehouse_id, item_type, item_id, 
                 qty_in, qty_out, balance_after, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, line.id, doc.warehouse_id, line.item_type, line.item_id,
                qtyIn, qtyOut, newBalance, user.id]);

            // Cập nhật bảng vật tư gốc
            await updateItemStock(line.item_type, line.item_id, newBalance, connection);
        }

        // Update document status
        const updateFields = doc.doc_type === 'stocktake'
            ? 'status = "posted", posted_by = ?, posted_at = NOW(), balanced_at = NOW()'
            : 'status = "posted", posted_by = ?, posted_at = NOW()';

        await connection.query(
            `UPDATE stock_documents SET ${updateFields}, row_version = row_version + 1 WHERE id = ?`,
            [user.id, id]
        );

        // Phase 3: Auto-update order_material_status for Production Excel View
        await updateOrderMaterialStatus(doc, lines, connection, user.id);

        // ============================================================
        // TỰ ĐỘNG TẠO PHIẾU CHI KHI HẠCH TOÁN PHIẾU NHẬP/XUẤT KHO
        // Sử dụng module helper để tạo phiếu với items chi tiết
        // ============================================================
        let transactionCreated = false;
        let transactionCode = null;
        let expenseResult = null;

        try {
            console.log(`🔍 [stockDoc.post] Kiểm tra tạo phiếu chi: doc_type=${doc.doc_type}, total_value=${doc.total_value}, doc_no=${doc.doc_no}`);

            const totalValue = parseFloat(doc.total_value) || 0;

            if ((doc.doc_type === 'import' || doc.doc_type === 'export') && totalValue > 0) {
                const { createExpenseFromStockDocument } = require('../helpers/financialHelper');

                // Lấy thêm thông tin supplier và project
                let supplierName = null;
                let projectName = null;

                if (doc.supplier_id) {
                    const [supplierRows] = await connection.query(
                        'SELECT name FROM suppliers WHERE id = ?',
                        [doc.supplier_id]
                    );
                    if (supplierRows.length > 0) supplierName = supplierRows[0].name;
                }

                if (doc.project_id) {
                    const [projectRows] = await connection.query(
                        'SELECT project_name FROM projects WHERE id = ?',
                        [doc.project_id]
                    );
                    if (projectRows.length > 0) projectName = projectRows[0].project_name;
                }

                // Tạo enriched doc object
                const enrichedDoc = {
                    ...doc,
                    supplier_name: supplierName,
                    project_name: projectName
                };

                console.log(`🔍 [stockDoc.post] Calling helper to create expense, lines: ${lines.length}`);

                expenseResult = await createExpenseFromStockDocument(enrichedDoc, lines, connection);

                if (expenseResult.success) {
                    transactionCreated = true;
                    transactionCode = expenseResult.transactionCode;
                    console.log(`✅ [stockDoc.post] Đã tạo phiếu chi ${transactionCode} với ${expenseResult.itemsCount} items`);
                } else if (expenseResult.alreadyExists) {
                    transactionCode = expenseResult.transactionCode;
                    console.log(`ℹ️ [stockDoc.post] Phiếu chi đã tồn tại: ${transactionCode}`);
                } else if (expenseResult.skipped) {
                    console.log(`ℹ️ [stockDoc.post] Bỏ qua tạo phiếu chi: ${expenseResult.message}`);
                }
            } else {
                console.log(`ℹ️ [stockDoc.post] Không tạo phiếu chi: doc_type=${doc.doc_type}, totalValue=${totalValue}`);
            }
        } catch (transError) {
            console.error('❌ Lỗi khi tạo phiếu chi từ phiếu kho:', transError.message, transError.stack);
            // Không fail hạch toán nếu lỗi tạo phiếu chi
        }

        await connection.commit();

        const actionLabel = doc.doc_type === 'stocktake' ? 'cân bằng kho' : 'hạch toán';
        let responseMessage = `Đã ${actionLabel} phiếu ${doc.doc_no}`;
        if (transactionCreated) {
            responseMessage += ` và tạo phiếu chi ${transactionCode}`;
        }

        res.json({
            success: true,
            message: responseMessage,
            data: {
                id: doc.id,
                doc_no: doc.doc_no,
                status: 'posted',
                lines_processed: lines.length,
                transaction_code: transactionCode,
                transaction_created: transactionCreated
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error posting stock document:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// CANCEL (Hủy phiếu)
// =====================================================
exports.cancel = async (req, res) => {
    let connection;

    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do hủy' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get document
        const [docs] = await connection.query(
            'SELECT * FROM stock_documents WHERE id = ? FOR UPDATE',
            [id]
        );

        if (docs.length === 0) {
            throw new Error('Không tìm thấy phiếu');
        }

        const doc = docs[0];

        if (doc.status === 'cancelled') {
            throw new Error('Phiếu đã bị hủy');
        }

        // Nếu đã Posted, cần tạo bút toán đảo
        if (doc.status === 'posted') {
            const [lines] = await connection.query(
                'SELECT * FROM stock_document_lines WHERE document_id = ?',
                [id]
            );

            for (const line of lines) {
                const currentStock = await getCurrentStock(line.item_type, line.item_id, doc.warehouse_id, connection);
                let qtyIn = 0;
                let qtyOut = 0;
                let newBalance = currentStock;

                // Đảo ngược
                if (doc.doc_type === 'import') {
                    qtyOut = line.qty; // Đảo: trừ lại
                    newBalance = currentStock - qtyOut;
                } else if (doc.doc_type === 'export') {
                    qtyIn = line.qty; // Đảo: cộng lại
                    newBalance = currentStock + qtyIn;
                } else if (doc.doc_type === 'stocktake') {
                    // Lấy từ ledger trước đó
                    const [prevLedger] = await connection.query(`
                        SELECT balance_after 
                        FROM stock_ledger 
                        WHERE item_type = ? AND item_id = ? AND warehouse_id = ?
                          AND document_id != ?
                        ORDER BY transaction_at DESC, id DESC
                        LIMIT 1
                    `, [line.item_type, line.item_id, doc.warehouse_id, id]);

                    const prevBalance = prevLedger.length > 0 ? prevLedger[0].balance_after : 0;
                    const diff = prevBalance - currentStock;

                    if (diff > 0) {
                        qtyIn = diff;
                    } else if (diff < 0) {
                        qtyOut = Math.abs(diff);
                    }

                    newBalance = prevBalance;
                }

                // Ghi ledger đảo
                await connection.query(`
                    INSERT INTO stock_ledger 
                    (document_id, document_line_id, warehouse_id, item_type, item_id, 
                     qty_in, qty_out, balance_after, user_id, note)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [id, line.id, doc.warehouse_id, line.item_type, line.item_id,
                    qtyIn, qtyOut, newBalance, user.id, `Đảo do hủy phiếu: ${reason}`]);

                // Cập nhật bảng gốc
                await updateItemStock(line.item_type, line.item_id, newBalance, connection);
            }
        }

        // Update status
        await connection.query(`
            UPDATE stock_documents 
            SET status = 'cancelled', cancelled_by = ?, cancelled_at = NOW(), 
                cancel_reason = ?, row_version = row_version + 1
            WHERE id = ?
        `, [user.id, reason, id]);

        await connection.commit();

        res.json({
            success: true,
            message: `Đã hủy phiếu ${doc.doc_no}` + (doc.status === 'posted' ? ' (đã đảo tồn kho)' : ''),
            data: { id: doc.id, doc_no: doc.doc_no, status: 'cancelled' }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error cancelling stock document:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// GET BY ID
// =====================================================
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const [docs] = await db.query(`
            SELECT d.*, 
                   p.project_code, p.project_name,
                   s.name AS supplier_name,
                   u1.full_name AS created_by_name,
                   u2.full_name AS posted_by_name,
                   u3.full_name AS cancelled_by_name
            FROM stock_documents d
            LEFT JOIN projects p ON d.project_id = p.id
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN users u1 ON d.created_by = u1.id
            LEFT JOIN users u2 ON d.posted_by = u2.id
            LEFT JOIN users u3 ON d.cancelled_by = u3.id
            WHERE d.id = ?
        `, [id]);

        if (docs.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu' });
        }

        const doc = docs[0];

        // Get lines with prices from material tables
        // For export slips, unit_price might be 0 in lines, so we fetch from original tables
        // Note: accessories uses purchase_price/sale_price, aluminum_systems uses unit_price, glass_items uses price
        const [lines] = await db.query(`
            SELECT l.*,
                   COALESCE(NULLIF(l.unit_price, 0), acc.purchase_price, acc.sale_price, alu.unit_price, gi.price, 0) AS unit_price,
                   COALESCE(acc.name, alu.name, gi.name) AS material_name_lookup
            FROM stock_document_lines l
            LEFT JOIN accessories acc ON l.item_type = 'accessory' AND l.item_id = acc.id
            LEFT JOIN aluminum_systems alu ON l.item_type = 'aluminum' AND l.item_id = alu.id
            LEFT JOIN glass_items gi ON l.item_type = 'glass' AND l.item_id = gi.id
            WHERE l.document_id = ? 
            ORDER BY l.id
        `, [id]);

        // Calculate line_total for each line
        const enrichedLines = lines.map(line => {
            const qty = parseInt(line.qty) || 0;
            const unitPrice = parseFloat(line.unit_price) || 0;
            return {
                ...line,
                qty: qty,
                unit_price: unitPrice,
                line_total: qty * unitPrice
            };
        });

        res.json({
            success: true,
            data: { ...doc, lines: enrichedLines }
        });

    } catch (error) {
        console.error('Error getting stock document:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// LIST DOCUMENTS
// =====================================================
exports.list = async (req, res) => {
    try {
        const { doc_type, status, project_id, supplier_id, date_from, date_to, page = 1, limit = 20 } = req.query;

        let sql = `
            SELECT d.*, 
                   p.project_code, p.project_name,
                   s.name AS supplier_name,
                   u.full_name AS created_by_name,
                   (SELECT COUNT(*) FROM stock_document_lines WHERE document_id = d.id) AS lines_count
            FROM stock_documents d
            LEFT JOIN projects p ON d.project_id = p.id
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN users u ON d.created_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (doc_type) {
            sql += ' AND d.doc_type = ?';
            params.push(doc_type);
        }
        if (status) {
            sql += ' AND d.status = ?';
            params.push(status);
        }
        if (project_id) {
            sql += ' AND d.project_id = ?';
            params.push(project_id);
        }
        if (supplier_id) {
            sql += ' AND d.supplier_id = ?';
            params.push(supplier_id);
        }
        if (date_from) {
            sql += ' AND DATE(d.created_at) >= ?';
            params.push(date_from);
        }
        if (date_to) {
            sql += ' AND DATE(d.created_at) <= ?';
            params.push(date_to);
        }

        // Count total
        const countSql = sql.replace(/SELECT d\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await db.query(countSql, params);
        const total = countResult[0].total;

        // Pagination
        const offset = (page - 1) * limit;
        sql += ` ORDER BY d.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await db.query(sql, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error listing stock documents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// GET STOCK LEDGER (Thẻ kho) - Grouped by document
// =====================================================
exports.getLedger = async (req, res) => {
    try {
        const { item_type, doc_type, warehouse_id = 1, date_from, date_to, limit = 100 } = req.query;

        // Build WHERE clause for filtering
        let whereClause = 'd.status = "posted"';
        const params = [];

        if (doc_type) {
            whereClause += ' AND d.doc_type = ?';
            params.push(doc_type);
        }
        if (item_type) {
            whereClause += ' AND l.item_type = ?';
            params.push(item_type);
        }
        if (date_from) {
            whereClause += ' AND DATE(d.created_at) >= ?';
            params.push(date_from);
        }
        if (date_to) {
            whereClause += ' AND DATE(d.created_at) <= ?';
            params.push(date_to);
        }

        // GROUP BY document_id to show each document once
        const sql = `
            SELECT 
                l.document_id,
                d.doc_no,
                d.doc_type,
                d.created_at AS transaction_at,
                SUM(l.qty_in) AS qty_in,
                SUM(l.qty_out) AS qty_out,
                COUNT(DISTINCT l.id) AS line_count,
                GROUP_CONCAT(DISTINCT l.item_type) AS item_types,
                u.full_name AS user_name
            FROM stock_ledger l
            JOIN stock_documents d ON l.document_id = d.id
            LEFT JOIN users u ON d.created_by = u.id
            WHERE ${whereClause}
            GROUP BY l.document_id, d.doc_no, d.doc_type, d.created_at, u.full_name
            ORDER BY d.created_at DESC, l.document_id DESC
            LIMIT ${parseInt(limit)}
        `;

        const [rows] = await db.query(sql, params);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error getting ledger:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// GET STOCK ON HAND (Tồn kho)
// =====================================================
exports.getOnHand = async (req, res) => {
    try {
        const { item_type, item_id, warehouse_id = 1 } = req.query;

        if (item_type && item_id) {
            // Get single item
            const qty = await getCurrentStock(item_type, parseInt(item_id), parseInt(warehouse_id));

            return res.json({
                success: true,
                data: {
                    item_type,
                    item_id: parseInt(item_id),
                    warehouse_id: parseInt(warehouse_id),
                    qty_on_hand: qty,
                    qty_reserved: 0, // Phase 2
                    qty_available: qty
                }
            });
        }

        // Get all items (từ view hoặc query)
        const [rows] = await db.query(`
            SELECT * FROM v_stock_onhand 
            WHERE warehouse_id = ?
            ${item_type ? 'AND item_type = ?' : ''}
        `, item_type ? [warehouse_id, item_type] : [warehouse_id]);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error getting stock on hand:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// GET BY PROJECT - Truy vết vật tư đã xuất cho dự án
// =====================================================
exports.getByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status = 'posted' } = req.query; // Mặc định chỉ lấy Posted (đã xuất thật)

        // Lấy tất cả dòng phiếu xuất cho dự án này
        let sql = `
            SELECT 
                l.id AS line_id,
                l.item_type,
                l.item_id,
                l.item_code,
                l.item_name,
                l.qty,
                l.unit,
                l.unit_price,
                l.line_total,
                l.note AS line_note,
                d.id AS doc_id,
                d.doc_no,
                d.status,
                d.created_at,
                d.posted_at,
                u.full_name AS created_by_name
            FROM stock_document_lines l
            JOIN stock_documents d ON l.document_id = d.id
            LEFT JOIN users u ON d.created_by = u.id
            WHERE d.doc_type = 'export'
              AND (l.project_id = ? OR d.project_id = ?)
        `;

        const params = [projectId, projectId];

        if (status === 'posted') {
            sql += ` AND d.status = 'posted'`;
        } else if (status === 'all') {
            sql += ` AND d.status != 'cancelled'`;
        }

        sql += ` ORDER BY d.posted_at DESC, l.id`;

        const [lines] = await db.query(sql, params);

        // Tổng hợp theo loại vật tư
        const summary = {
            total_lines: lines.length,
            total_qty: lines.reduce((sum, l) => sum + parseFloat(l.qty || 0), 0),
            total_value: lines.reduce((sum, l) => sum + parseFloat(l.line_total || 0), 0),
            by_type: {}
        };

        for (const line of lines) {
            if (!summary.by_type[line.item_type]) {
                summary.by_type[line.item_type] = { count: 0, qty: 0, value: 0 };
            }
            summary.by_type[line.item_type].count++;
            summary.by_type[line.item_type].qty += parseFloat(line.qty || 0);
            summary.by_type[line.item_type].value += parseFloat(line.line_total || 0);
        }

        res.json({
            success: true,
            data: {
                project_id: parseInt(projectId),
                lines,
                summary
            }
        });

    } catch (error) {
        console.error('Error getting materials by project:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
