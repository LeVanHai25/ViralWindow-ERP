-- ====================================================================
-- SCRIPT DỌN DẸP DỮ LIỆU RÁC VÀ THÊM CASCADE DELETE CONSTRAINTS
-- Chạy script này để:
-- 1. Xóa tất cả dữ liệu mồ côi (orphan) - dữ liệu của các dự án đã bị xóa
-- 2. Thêm foreign key constraints với ON DELETE CASCADE
-- ====================================================================

-- BƯỚC 1: XÓA DỮ LIỆU MỒ CÔI (ORPHAN DATA)
-- ===================================================

-- 1.1 Xóa quotation_items của quotations không có project hoặc project đã bị xóa
DELETE qi FROM quotation_items qi
LEFT JOIN quotations q ON qi.quotation_id = q.id
WHERE q.id IS NULL;

DELETE qi FROM quotation_items qi
INNER JOIN quotations q ON qi.quotation_id = q.id
LEFT JOIN projects p ON q.project_id = p.id
WHERE q.project_id IS NOT NULL AND p.id IS NULL;

-- 1.2 Xóa quotations không có project hoặc project đã bị xóa
DELETE q FROM quotations q
LEFT JOIN projects p ON q.project_id = p.id
WHERE q.project_id IS NOT NULL AND p.id IS NULL;

-- 1.3 Xóa quotations không có customer hoặc customer đã bị xóa
DELETE q FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
WHERE q.customer_id IS NOT NULL AND c.id IS NULL;

SELECT CONCAT('✓ Deleted orphan quotations: ', ROW_COUNT()) AS result;

-- 1.4 Xóa BOM items của door_designs đã bị xóa
DELETE bi FROM bom_items bi
LEFT JOIN door_designs dd ON bi.design_id = dd.id
WHERE dd.id IS NULL;

-- 1.5 Xóa BOM items của door_designs có project đã bị xóa
DELETE bi FROM bom_items bi
INNER JOIN door_designs dd ON bi.design_id = dd.id
LEFT JOIN projects p ON dd.project_id = p.id
WHERE p.id IS NULL;

SELECT CONCAT('✓ Deleted orphan BOM items: ', ROW_COUNT()) AS result;

-- 1.6 Xóa door_drawings của door_designs đã bị xóa
DELETE dr FROM door_drawings dr
LEFT JOIN door_designs dd ON dr.door_design_id = dd.id
WHERE dd.id IS NULL;

-- 1.7 Xóa door_drawings của door_designs có project đã bị xóa
DELETE dr FROM door_drawings dr
INNER JOIN door_designs dd ON dr.door_design_id = dd.id
LEFT JOIN projects p ON dd.project_id = p.id
WHERE p.id IS NULL;

SELECT CONCAT('✓ Deleted orphan door drawings: ', ROW_COUNT()) AS result;

-- 1.8 Xóa door_designs của project đã bị xóa
DELETE dd FROM door_designs dd
LEFT JOIN projects p ON dd.project_id = p.id
WHERE p.id IS NULL;

SELECT CONCAT('✓ Deleted orphan door designs: ', ROW_COUNT()) AS result;

-- 1.9 Xóa production_orders của project đã bị xóa
DELETE po FROM production_orders po
LEFT JOIN projects p ON po.project_id = p.id
WHERE po.project_id IS NOT NULL AND p.id IS NULL;

SELECT CONCAT('✓ Deleted orphan production orders: ', ROW_COUNT()) AS result;

-- 1.10 Xóa debts của project đã bị xóa
DELETE d FROM debts d
LEFT JOIN projects p ON d.project_id = p.id
WHERE d.project_id IS NOT NULL AND p.id IS NULL;

-- 1.11 Xóa commissions của project đã bị xóa
DELETE c FROM commissions c
LEFT JOIN projects p ON c.project_id = p.id
WHERE c.project_id IS NOT NULL AND p.id IS NULL;

-- 1.12 Xóa inventory_out của project đã bị xóa
DELETE io FROM inventory_out io
LEFT JOIN projects p ON io.project_id = p.id
WHERE io.project_id IS NOT NULL AND p.id IS NULL;

-- 1.13 Xóa project_logs của project đã bị xóa
DELETE pl FROM project_logs pl
LEFT JOIN projects p ON pl.project_id = p.id
WHERE p.id IS NULL;

-- 1.14 Xóa projects_material_summary của project đã bị xóa
DELETE pms FROM projects_material_summary pms
LEFT JOIN projects p ON pms.project_id = p.id
WHERE p.id IS NULL;

-- 1.15 Xóa design_files của project đã bị xóa
DELETE df FROM design_files df
LEFT JOIN projects p ON df.project_id = p.id
WHERE df.project_id IS NOT NULL AND p.id IS NULL;

SELECT '✅ All orphan data cleaned up!' AS status;

-- BƯỚC 2: THÊM FOREIGN KEY CONSTRAINTS VỚI CASCADE DELETE
-- ===================================================
-- Lưu ý: Trước khi thêm FK, cần xóa FK cũ nếu có

-- 2.1 quotations -> projects (CASCADE DELETE)
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'quotations' 
    AND CONSTRAINT_NAME = 'fk_quotations_project'
);
SET @sql = IF(@constraint_exists > 0, 'ALTER TABLE quotations DROP FOREIGN KEY fk_quotations_project', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if project_id column allows NULL and foreign key can be added
-- Only add FK if there's no orphan data
ALTER TABLE quotations 
ADD CONSTRAINT fk_quotations_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2.2 quotation_items -> quotations (CASCADE DELETE)
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'quotation_items' 
    AND CONSTRAINT_NAME = 'fk_quotation_items_quotation'
);
SET @sql = IF(@constraint_exists > 0, 'ALTER TABLE quotation_items DROP FOREIGN KEY fk_quotation_items_quotation', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE quotation_items 
ADD CONSTRAINT fk_quotation_items_quotation 
FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2.3 door_designs -> projects (CASCADE DELETE)
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'door_designs' 
    AND CONSTRAINT_NAME = 'fk_door_designs_project'
);
SET @sql = IF(@constraint_exists > 0, 'ALTER TABLE door_designs DROP FOREIGN KEY fk_door_designs_project', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE door_designs 
ADD CONSTRAINT fk_door_designs_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2.4 door_drawings -> door_designs (CASCADE DELETE)
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'door_drawings' 
    AND CONSTRAINT_NAME = 'fk_door_drawings_design'
);
SET @sql = IF(@constraint_exists > 0, 'ALTER TABLE door_drawings DROP FOREIGN KEY fk_door_drawings_design', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE door_drawings 
ADD CONSTRAINT fk_door_drawings_design 
FOREIGN KEY (door_design_id) REFERENCES door_designs(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2.5 bom_items -> door_designs (CASCADE DELETE)
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'bom_items' 
    AND CONSTRAINT_NAME = 'fk_bom_items_design'
);
SET @sql = IF(@constraint_exists > 0, 'ALTER TABLE bom_items DROP FOREIGN KEY fk_bom_items_design', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE bom_items 
ADD CONSTRAINT fk_bom_items_design 
FOREIGN KEY (design_id) REFERENCES door_designs(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2.6 production_orders -> projects (CASCADE DELETE)
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'production_orders' 
    AND CONSTRAINT_NAME = 'fk_production_orders_project'
);
SET @sql = IF(@constraint_exists > 0, 'ALTER TABLE production_orders DROP FOREIGN KEY fk_production_orders_project', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE production_orders 
ADD CONSTRAINT fk_production_orders_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2.7 projects -> customers (SET NULL khi xóa customer)
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'projects' 
    AND CONSTRAINT_NAME = 'fk_projects_customer'
);
SET @sql = IF(@constraint_exists > 0, 'ALTER TABLE projects DROP FOREIGN KEY fk_projects_customer', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE projects 
ADD CONSTRAINT fk_projects_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE;

SELECT '✅ All foreign key constraints added with CASCADE DELETE!' AS status;

-- BƯỚC 3: KIỂM TRA KẾT QUẢ
-- ===================================================

-- Hiển thị số lượng dữ liệu còn lại
SELECT 'SUMMARY' AS section;
SELECT 
    (SELECT COUNT(*) FROM projects) AS total_projects,
    (SELECT COUNT(*) FROM customers) AS total_customers,
    (SELECT COUNT(*) FROM quotations) AS total_quotations,
    (SELECT COUNT(*) FROM door_designs) AS total_doors,
    (SELECT COUNT(*) FROM production_orders) AS total_orders;

-- Kiểm tra orphan data còn lại
SELECT 'ORPHAN CHECK' AS section;
SELECT 
    (SELECT COUNT(*) FROM quotations q LEFT JOIN projects p ON q.project_id = p.id WHERE q.project_id IS NOT NULL AND p.id IS NULL) AS orphan_quotations,
    (SELECT COUNT(*) FROM door_designs dd LEFT JOIN projects p ON dd.project_id = p.id WHERE p.id IS NULL) AS orphan_doors,
    (SELECT COUNT(*) FROM bom_items bi LEFT JOIN door_designs dd ON bi.design_id = dd.id WHERE dd.id IS NULL) AS orphan_bom_items;

SELECT '🎉 CLEANUP COMPLETED!' AS final_status;
