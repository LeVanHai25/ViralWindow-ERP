const db = require("../config/db");

// GET all transactions
exports.getAllTransactions = async (req, res) => {
    try {
        const { transaction_type } = req.query;
        let query = `
            SELECT 
                it.id,
                it.inventory_id,
                it.accessory_id,
                it.project_id,
                it.transaction_type,
                it.quantity,
                it.notes,
                it.transaction_date,
                it.created_at,
                it.updated_at,
                COALESCE(i.item_name, a.name) as item_name,
                COALESCE(i.unit, a.unit) as unit,
                p.id as project_table_id,
                p.project_code,
                p.project_name
            FROM inventory_transactions it
            LEFT JOIN inventory i ON it.inventory_id = i.id
            LEFT JOIN accessories a ON it.accessory_id = a.id
            LEFT JOIN projects p ON it.project_id = p.id
            WHERE 1=1
        `;
        let params = [];

        if (transaction_type && transaction_type !== 'all') {
            query += " AND it.transaction_type = ?";
            params.push(transaction_type);
        }

        query += " ORDER BY it.transaction_date DESC";

        let [rows] = await db.query(query, params);
        
        // Luôn query lại tất cả project_id để đảm bảo có data mới nhất và đầy đủ
        const allProjectIds = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.project_id) {
                allProjectIds.push(row.project_id);
            }
        }
        
        // Query tất cả projects trong 1 lần để đảm bảo có data đầy đủ
        if (allProjectIds.length > 0) {
            const uniqueProjectIds = [...new Set(allProjectIds)];
            
            try {
                // Sử dụng placeholders cho IN clause
                const placeholders = uniqueProjectIds.map(() => '?').join(',');
                const [projectRows] = await db.query(
                    `SELECT id, project_code, project_name FROM projects WHERE id IN (${placeholders})`,
                    uniqueProjectIds
                );
                
                // Tạo map để lookup nhanh
                const projectMap = {};
                projectRows.forEach(p => {
                    // Đảm bảo project_name được trim và không null
                    const projectName = p.project_name ? p.project_name.trim() : null;
                    projectMap[p.id] = {
                        project_code: p.project_code || null,
                        project_name: projectName || null
                    };
                    // Log để debug
                    if (projectName) {
                        console.log(`📋 Project ${p.id}: code="${p.project_code}", name="${projectName}"`);
                    }
                });
                
                // Cập nhật lại rows với project data
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.project_id) {
                        if (projectMap[row.project_id]) {
                            // Cập nhật project data từ map - luôn override với data mới nhất
                            row.project_code = projectMap[row.project_id].project_code;
                            row.project_name = projectMap[row.project_id].project_name;
                            
                            // Đảm bảo project_name không null hoặc empty
                            if (!row.project_name || row.project_name.trim() === '') {
                                console.warn(`⚠️ Transaction ${row.id} has project_id=${row.project_id} but project_name is empty. Retrying...`);
                                // Thử fetch lại project_name một lần nữa
                                try {
                                    const [retryProject] = await db.query(
                                        'SELECT project_name FROM projects WHERE id = ?',
                                        [row.project_id]
                                    );
                                    if (retryProject.length > 0 && retryProject[0].project_name && retryProject[0].project_name.trim() !== '') {
                                        row.project_name = retryProject[0].project_name.trim();
                                        console.log(`✅ Retry fetch successful for transaction ${row.id}: project_name = "${row.project_name}"`);
                                    } else {
                                        console.warn(`⚠️ Retry fetch failed: project_name still empty for project_id=${row.project_id}`);
                                        row.project_name = null;
                                    }
                                } catch (retryErr) {
                                    console.error('Error retrying project fetch:', retryErr);
                                    row.project_name = null;
                                }
                            } else {
                                // Trim project_name để đảm bảo không có khoảng trắng thừa
                                row.project_name = row.project_name.trim();
                            }
                        } else {
                            // Project không tồn tại - set về null để frontend xử lý
                            console.warn(`⚠️ Transaction ${row.id} has project_id=${row.project_id} but project does not exist in database.`);
                            row.project_code = null;
                            row.project_name = null;
                        }
                    } else {
                        // Không có project_id - đảm bảo project_name và project_code là null
                        row.project_code = null;
                        row.project_name = null;
                    }
                }
            } catch (err) {
                console.error('❌ Error fetching projects:', err);
                console.error('Error details:', err.message, err.stack);
            }
        }
        
        // Log để debug
        console.log(`📊 Loaded ${rows.length} transactions`);
        if (rows.length > 0) {
            // Log 3 transactions đầu tiên để debug
            const sampleSize = Math.min(3, rows.length);
            for (let i = 0; i < sampleSize; i++) {
                const row = rows[i];
                console.log(`Transaction ${i + 1}:`, {
                    id: row.id,
                    inventory_id: row.inventory_id,
                    accessory_id: row.accessory_id,
                    project_id: row.project_id,
                    project_code: row.project_code,
                    project_name: row.project_name,
                    transaction_type: row.transaction_type,
                    has_project: !!row.project_id,
                    has_project_data: !!(row.project_code || row.project_name)
                });
            }
        }

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// POST create transaction
exports.create = async (req, res) => {
    const connection = await db.getConnection();
    try {
        console.log('Creating inventory transaction with data:', req.body);
        await connection.beginTransaction();

        const { inventory_id, project_id, transaction_type, quantity, notes } = req.body;
        
        console.log('📥 Received transaction data:', {
            inventory_id,
            project_id,
            project_id_type: typeof project_id,
            transaction_type,
            quantity,
            notes
        });
        
        // Parse và validate project_id
        let parsedProjectId = null;
        if (project_id !== undefined && project_id !== null && project_id !== '') {
            parsedProjectId = parseInt(project_id);
            if (isNaN(parsedProjectId) || parsedProjectId <= 0) {
                console.warn('⚠️ Invalid project_id:', project_id);
                parsedProjectId = null;
            } else {
                console.log('✅ Valid project_id:', parsedProjectId);
            }
        } else {
            console.warn('⚠️ No project_id provided');
        }
        
        // Validate required fields
        if (!inventory_id || !transaction_type || quantity === undefined || quantity === null) {
            await connection.rollback();
            connection.release();
            console.log('Validation failed: missing required fields');
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: inventory_id, transaction_type, quantity"
            });
        }
        
        // Validate quantity is positive number
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            await connection.rollback();
            connection.release();
            console.log('Validation failed: invalid quantity', quantity);
            return res.status(400).json({
                success: false,
                message: "Số lượng phải là số dương"
            });
        }

        console.log('Getting current stock for inventory_id:', inventory_id);
        
        // Kiểm tra xem là inventory hay accessory
        // Thử tìm trong inventory trước
        const [inventoryRows] = await connection.query(
            "SELECT id, quantity FROM inventory WHERE id = ?",
            [inventory_id]
        );
        
        let isAccessory = false;
        let currentStock = 0;
        let itemName = '';
        
        if (inventoryRows.length > 0) {
            // Tìm thấy trong inventory
            currentStock = parseFloat(inventoryRows[0].quantity) || 0;
            isAccessory = false;
            console.log('Found in inventory table, current stock:', currentStock);
        } else {
            // Không tìm thấy trong inventory, thử tìm trong accessories
            const [accessoryRows] = await connection.query(
                "SELECT id, stock_quantity, name FROM accessories WHERE id = ? AND is_active = 1",
                [inventory_id]
            );
            
            if (accessoryRows.length > 0) {
                // Tìm thấy trong accessories
                currentStock = parseFloat(accessoryRows[0].stock_quantity) || 0;
                itemName = accessoryRows[0].name || '';
                isAccessory = true;
                console.log('Found in accessories table, current stock:', currentStock);
            } else {
                await connection.rollback();
                connection.release();
                console.log('Item not found in both inventory and accessories:', inventory_id);
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy vật tư"
                });
            }
        }

        let newStock;

        if (transaction_type === 'import') {
            newStock = currentStock + qty;
            console.log('Import transaction: new stock =', newStock);
        } else if (transaction_type === 'export') {
            if (currentStock < qty) {
                await connection.rollback();
                connection.release();
                console.log('Export failed: insufficient stock', { currentStock, qty });
                return res.status(400).json({
                    success: false,
                    message: `Số lượng xuất (${qty}) vượt quá tồn kho hiện tại (${currentStock})`
                });
            }
            newStock = currentStock - qty;
            console.log('Export transaction: new stock =', newStock);
        } else {
            await connection.rollback();
            connection.release();
            console.log('Invalid transaction type:', transaction_type);
            return res.status(400).json({
                success: false,
                message: "Loại giao dịch không hợp lệ. Chỉ chấp nhận 'import' hoặc 'export'"
            });
        }

        console.log('Updating stock...');
        // Update stock - tùy thuộc vào là inventory hay accessory
        if (isAccessory) {
            // Update accessories table
            await connection.query(
                "UPDATE accessories SET stock_quantity = ? WHERE id = ?",
                [newStock, inventory_id]
            );
            console.log('Accessory stock updated to:', newStock);
        } else {
            // Update inventory table
            await connection.query(
                "UPDATE inventory SET quantity = ? WHERE id = ?",
                [newStock, inventory_id]
            );
            console.log('Inventory stock updated to:', newStock);
        }

        console.log('Creating transaction record...');
        // Create transaction - lưu inventory_id và project_id (nếu có)
        // Vì cột project_id đã tồn tại, luôn INSERT với project_id (có thể NULL)
        let result;
        try {
            // Sử dụng parsedProjectId đã được validate
            console.log('💾 Inserting transaction with:', {
                inventory_id,
                project_id: parsedProjectId,
                transaction_type,
                quantity: qty
            });
            
            // Kiểm tra project có tồn tại không (nếu có project_id)
            if (parsedProjectId) {
                const [projectCheck] = await connection.query(
                    'SELECT id, project_code, project_name FROM projects WHERE id = ?',
                    [parsedProjectId]
                );
                
                if (projectCheck.length === 0) {
                    console.warn(`⚠️ Project with id=${parsedProjectId} does not exist!`);
                    console.warn('   Transaction will be created but project data will not be available.');
                } else {
                    console.log(`✅ Project found: ${projectCheck[0].project_code} - ${projectCheck[0].project_name}`);
                }
            }
            
            // Insert transaction - nếu là accessory thì lưu vào accessory_id, nếu là inventory thì lưu vào inventory_id
            if (isAccessory) {
                // Lưu vào accessory_id, inventory_id = NULL
                [result] = await connection.query(
                    `INSERT INTO inventory_transactions 
                     (inventory_id, accessory_id, project_id, transaction_type, quantity, notes, transaction_date) 
                     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                    [null, inventory_id, parsedProjectId, transaction_type, qty, notes || null]
                );
                console.log('✅ Transaction created for accessory:', inventory_id);
            } else {
                // Lưu vào inventory_id, accessory_id = NULL
                [result] = await connection.query(
                    `INSERT INTO inventory_transactions 
                     (inventory_id, accessory_id, project_id, transaction_type, quantity, notes, transaction_date) 
                     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                    [inventory_id, null, parsedProjectId, transaction_type, qty, notes || null]
                );
                console.log('✅ Transaction created for inventory:', inventory_id);
            }
            
            const transactionId = result.insertId;
            
            if (parsedProjectId) {
                console.log('✅ Transaction created with project_id, ID:', transactionId, 'project_id:', parsedProjectId);
            } else {
                console.log('⚠️ Transaction created WITHOUT project_id, ID:', transactionId);
            }
            
            // Nếu là xuất kho cho dự án, ghi nhận vào project_materials
            if (transaction_type === 'export' && parsedProjectId) {
                try {
                    // Lấy thông tin vật tư và giá
                    let unitPrice = 0;
                    let itemName = '';
                    let itemUnit = '';
                    let inventoryIdForProject = null;
                    let accessoryIdForProject = null;
                    
                    if (isAccessory) {
                        // Lấy từ accessories
                        const [accRows] = await connection.query(
                            'SELECT id, name, unit, sale_price, purchase_price FROM accessories WHERE id = ?',
                            [inventory_id]
                        );
                        if (accRows.length > 0) {
                            unitPrice = parseFloat(accRows[0].sale_price || accRows[0].purchase_price || 0);
                            itemName = accRows[0].name || '';
                            itemUnit = accRows[0].unit || '';
                            accessoryIdForProject = accRows[0].id;
                        }
                    } else {
                        // Lấy từ inventory
                        const [invRows] = await connection.query(
                            'SELECT id, item_name, unit, unit_price FROM inventory WHERE id = ?',
                            [inventory_id]
                        );
                        if (invRows.length > 0) {
                            unitPrice = parseFloat(invRows[0].unit_price || 0);
                            itemName = invRows[0].item_name || '';
                            itemUnit = invRows[0].unit || '';
                            inventoryIdForProject = invRows[0].id;
                        }
                    }
                    
                    const totalCost = qty * unitPrice;
                    
                    console.log('📦 Recording material to project:', {
                        project_id: parsedProjectId,
                        inventory_id: inventoryIdForProject,
                        accessory_id: accessoryIdForProject,
                        item_name: itemName,
                        quantity: qty,
                        unit_price: unitPrice,
                        total_cost: totalCost
                    });
                    
                    // Insert vào project_materials
                    await connection.query(
                        `INSERT INTO project_materials 
                         (project_id, inventory_id, accessory_id, transaction_id, quantity_used, unit_price, total_cost, item_name, item_unit, notes) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            parsedProjectId,
                            inventoryIdForProject,
                            accessoryIdForProject,
                            transactionId,
                            qty,
                            unitPrice,
                            totalCost,
                            itemName,
                            itemUnit,
                            notes || null
                        ]
                    );
                    
                    console.log('✅ Material recorded to project_materials');
                    
                    // Cập nhật tổng chi phí vật tư của dự án
                    const [costRows] = await connection.query(
                        `SELECT SUM(total_cost) as total_material_cost 
                         FROM project_materials 
                         WHERE project_id = ?`,
                        [parsedProjectId]
                    );
                    
                    const totalMaterialCost = parseFloat(costRows[0]?.total_material_cost || 0);
                    
                    await connection.query(
                        `UPDATE projects 
                         SET material_cost = ? 
                         WHERE id = ?`,
                        [totalMaterialCost, parsedProjectId]
                    );
                    
                    console.log(`✅ Project ${parsedProjectId} material_cost updated to: ${totalMaterialCost}`);
                    
                } catch (materialErr) {
                    console.error('❌ Error recording material to project:', materialErr);
                    // Không throw để không làm gián đoạn việc tạo transaction
                    // Vật tư vẫn được xuất kho, chỉ không ghi vào project_materials
                }
            }
        } catch (insertErr) {
            console.error('❌ Error inserting transaction:', insertErr.code, insertErr.message);
            console.error('Full error:', insertErr);
            // Throw lại để được xử lý ở catch bên ngoài
            throw insertErr;
        }

        await connection.commit();
        connection.release();
        
        // Sau khi commit transaction, cập nhật tổng tiền dự án (nếu có project_id)
        // Làm bên ngoài transaction để tránh deadlock và đảm bảo transaction đã được commit
        if (transaction_type === 'export' && parsedProjectId) {
            try {
                const projectCtrl = require("./projectController");
                await projectCtrl.updateProjectTotalValue(parsedProjectId);
                console.log(`Project ${parsedProjectId} total value updated after transaction`);
            } catch (costErr) {
                console.error('Error updating project total value:', costErr);
                // Không throw để không làm gián đoạn việc tạo transaction
                // Lỗi này sẽ được log nhưng không ảnh hưởng đến kết quả tạo transaction
            }
        }

        res.status(201).json({
            success: true,
            message: "Thêm giao dịch thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Error during rollback:', rollbackErr);
            }
            connection.release();
        }
        console.error('Error creating inventory transaction:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({
            success: false,
            message: "Lỗi khi thêm giao dịch: " + (err.message || 'Unknown error')
        });
    }
};

// DELETE transaction
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "DELETE FROM inventory_transactions WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch"
            });
        }

        res.json({
            success: true,
            message: "Xóa giao dịch thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa giao dịch"
        });
    }
};






