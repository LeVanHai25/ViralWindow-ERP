-- ============================================================
-- FIX AUTO_INCREMENT - BỎ QUA BẢNG KHÔNG TỒN TẠI
-- Dùng Stored Procedure để xử lý lỗi tự động
-- Ngày: 2026-03-05
-- ============================================================

USE `viral_window_db`;

DROP PROCEDURE IF EXISTS fix_auto_increment;

DELIMITER $$

CREATE PROCEDURE fix_auto_increment()
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END; -- bỏ qua mọi lỗi, tiếp tục

    -- quotation_items (bảng gây lỗi chính)
    ALTER TABLE `quotation_items` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- accessories
    ALTER TABLE `accessories` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- accessory_applications
    ALTER TABLE `accessory_applications` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- accessory_usage_rules
    ALTER TABLE `accessory_usage_rules` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- agencies
    ALTER TABLE `agencies` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- aluminum_colors
    ALTER TABLE `aluminum_colors` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- aluminum_profiles
    ALTER TABLE `aluminum_profiles` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- aluminum_scraps
    ALTER TABLE `aluminum_scraps` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- aluminum_systems
    ALTER TABLE `aluminum_systems` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- atc_aluminum_profiles
    ALTER TABLE `atc_aluminum_profiles` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- atc_glass_types
    ALTER TABLE `atc_glass_types` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- atc_product_accessory_rules
    ALTER TABLE `atc_product_accessory_rules` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- atc_product_bom_profiles
    ALTER TABLE `atc_product_bom_profiles` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- bom_items
    ALTER TABLE `bom_items` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- customers
    ALTER TABLE `customers` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- customer_crm_logs
    ALTER TABLE `customer_crm_logs` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- customer_agency_history
    ALTER TABLE `customer_agency_history` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- customer_appointments
    ALTER TABLE `customer_appointments` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- customer_interactions
    ALTER TABLE `customer_interactions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- cutting_details
    ALTER TABLE `cutting_details` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- cutting_formulas
    ALTER TABLE `cutting_formulas` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- cutting_optimizations
    ALTER TABLE `cutting_optimizations` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- debts
    ALTER TABLE `debts` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- decals
    ALTER TABLE `decals` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- deduction_formulas
    ALTER TABLE `deduction_formulas` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- design_audit_logs
    ALTER TABLE `design_audit_logs` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- design_bom
    ALTER TABLE `design_bom` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- design_bom_lines
    ALTER TABLE `design_bom_lines` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- design_files
    ALTER TABLE `design_files` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- design_inventory_requests
    ALTER TABLE `design_inventory_requests` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- expenses
    ALTER TABLE `expenses` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- glass_items
    ALTER TABLE `glass_items` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- inventory_out
    ALTER TABLE `inventory_out` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- inventory_transactions
    ALTER TABLE `inventory_transactions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- inventory_warnings
    ALTER TABLE `inventory_warnings` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- item_bom_lines
    ALTER TABLE `item_bom_lines` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_bom_versions
    ALTER TABLE `item_bom_versions` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_config
    ALTER TABLE `item_config` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_structure_aluminum
    ALTER TABLE `item_structure_aluminum` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_structure_consumables
    ALTER TABLE `item_structure_consumables` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_structure_glass
    ALTER TABLE `item_structure_glass` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_structure_hardware
    ALTER TABLE `item_structure_hardware` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_structure_templates
    ALTER TABLE `item_structure_templates` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- item_type_rules
    ALTER TABLE `item_type_rules` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_type_system_rules
    ALTER TABLE `item_type_system_rules` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- item_versions
    ALTER TABLE `item_versions` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- login_history
    ALTER TABLE `login_history` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- materials
    ALTER TABLE `materials` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- material_requests
    ALTER TABLE `material_requests` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- material_request_items
    ALTER TABLE `material_request_items` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- notifications
    ALTER TABLE `notifications` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- notification_recipients
    ALTER TABLE `notification_recipients` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- notification_rules
    ALTER TABLE `notification_rules` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- order_events
    ALTER TABLE `order_events` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- order_issues
    ALTER TABLE `order_issues` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- order_material_status
    ALTER TABLE `order_material_status` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- password_resets
    ALTER TABLE `password_resets` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- permissions
    ALTER TABLE `permissions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- production_orders
    ALTER TABLE `production_orders` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- production_order_bom
    ALTER TABLE `production_order_bom` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- production_order_doors
    ALTER TABLE `production_order_doors` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- production_progress
    ALTER TABLE `production_progress` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- product_accessory_rules
    ALTER TABLE `product_accessory_rules` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- product_bom_profiles
    ALTER TABLE `product_bom_profiles` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- product_completion
    ALTER TABLE `product_completion` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- product_manufacturing
    ALTER TABLE `product_manufacturing` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- product_materials
    ALTER TABLE `product_materials` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- product_templates
    ALTER TABLE `product_templates` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- product_template_accessories
    ALTER TABLE `product_template_accessories` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- projects
    ALTER TABLE `projects` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- projects_material_summary
    ALTER TABLE `projects_material_summary` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_accessories_summary
    ALTER TABLE `project_accessories_summary` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_activity_logs
    ALTER TABLE `project_activity_logs` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_aluminum_summary
    ALTER TABLE `project_aluminum_summary` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_cutting_details
    ALTER TABLE `project_cutting_details` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_cutting_optimization
    ALTER TABLE `project_cutting_optimization` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_finances
    ALTER TABLE `project_finances` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_gaskets_summary
    ALTER TABLE `project_gaskets_summary` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_glass_summary
    ALTER TABLE `project_glass_summary` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_items
    ALTER TABLE `project_items` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_items_v2
    ALTER TABLE `project_items_v2` MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

    -- project_logs
    ALTER TABLE `project_logs` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_materials
    ALTER TABLE `project_materials` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_material_status
    ALTER TABLE `project_material_status` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- project_pricing
    ALTER TABLE `project_pricing` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- purchase_requests
    ALTER TABLE `purchase_requests` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- quotations
    ALTER TABLE `quotations` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- roles
    ALTER TABLE `roles` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- stock_documents
    ALTER TABLE `stock_documents` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- stock_document_lines
    ALTER TABLE `stock_document_lines` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- stock_ledger
    ALTER TABLE `stock_ledger` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- suppliers
    ALTER TABLE `suppliers` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- template_migration_map
    ALTER TABLE `template_migration_map` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- units
    ALTER TABLE `units` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- users
    ALTER TABLE `users` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- user_door_library
    ALTER TABLE `user_door_library` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- user_notification_settings
    ALTER TABLE `user_notification_settings` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- user_sessions
    ALTER TABLE `user_sessions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- vw_aluminum_system_config
    ALTER TABLE `vw_aluminum_system_config` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- warehouse_exports
    ALTER TABLE `warehouse_exports` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    -- warehouse_export_items
    ALTER TABLE `warehouse_export_items` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

    SELECT 'FIX AUTO_INCREMENT COMPLETED!' AS status;
END$$

DELIMITER ;

-- Chạy procedure
CALL fix_auto_increment();

-- Dọn dẹp
DROP PROCEDURE IF EXISTS fix_auto_increment;

-- Kiểm tra các bảng còn thiếu AUTO_INCREMENT (kết quả rỗng = đã fix xong)
SELECT TABLE_NAME, COLUMN_NAME, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'viral_window_db'
  AND COLUMN_NAME = 'id'
  AND EXTRA NOT LIKE '%auto_increment%'
ORDER BY TABLE_NAME;
