/**
 * Run Design Workflow Schema Migration
 * 
 * Usage: node sql/run_design_workflow_schema.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('Creating Design Workflow tables...\n');

    try {
        // 1. design_revisions
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_revisions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                project_id INT NOT NULL,
                revision_no INT DEFAULT 1,
                status ENUM('received', 'editing', 'locked', 'bom_created', 'pr_created') DEFAULT 'received',
                is_active BOOLEAN DEFAULT TRUE,
                parent_revision_id INT NULL,
                locked_hash VARCHAR(64) NULL,
                received_by INT,
                received_at DATETIME,
                received_channel ENUM('email', 'zalo', 'direct', 'other') DEFAULT 'direct',
                received_notes TEXT,
                input_checklist JSON,
                assigned_to INT,
                deadline_at DATETIME,
                started_editing_at DATETIME,
                locked_by INT,
                locked_at DATETIME,
                locked_checklist JSON,
                locked_file_id INT NULL,
                approved_by INT NULL,
                approved_at DATETIME NULL,
                notes TEXT,
                row_version INT DEFAULT 1,
                created_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_project_revision (project_id, revision_no),
                INDEX idx_project_status_active (project_id, status, is_active),
                INDEX idx_assigned_deadline (assigned_to, deadline_at),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_revisions');

        // 2. design_files
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_files (
                id INT PRIMARY KEY AUTO_INCREMENT,
                revision_id INT NOT NULL,
                file_type ENUM('input', 'draft', 'locked', 'reference', 'other') DEFAULT 'input',
                file_name VARCHAR(255) NOT NULL,
                file_url VARCHAR(500) NOT NULL,
                file_size INT,
                mime_type VARCHAR(100),
                description TEXT,
                is_locked_file BOOLEAN DEFAULT FALSE,
                uploaded_by INT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (revision_id) REFERENCES design_revisions(id) ON DELETE CASCADE,
                INDEX idx_revision_type (revision_id, file_type),
                INDEX idx_is_locked (revision_id, is_locked_file)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_files');

        // 3. design_units
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_units (
                id INT PRIMARY KEY AUTO_INCREMENT,
                design_revision_id INT NOT NULL,
                unit_code VARCHAR(50) NOT NULL,
                unit_type ENUM('cua', 'vach', 'o_kinh', 'cua_nhom', 'cua_kinh', 'other') DEFAULT 'cua',
                width DECIMAL(10,2),
                height DECIMAL(10,2),
                depth DECIMAL(10,2) NULL,
                qty INT DEFAULT 1,
                profile_system_id INT NULL,
                profile_system VARCHAR(100),
                profile_color VARCHAR(100),
                glass_type_id INT NULL,
                glass_type VARCHAR(100),
                glass_thickness INT,
                hardware_set_id INT NULL,
                hardware_set VARCHAR(200),
                num_panels INT DEFAULT 1,
                opening_direction ENUM('left', 'right', 'both', 'fixed', 'sliding', 'other') DEFAULT 'fixed',
                position_note TEXT,
                install_note TEXT,
                spec_json JSON NULL,
                row_version INT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by INT,
                FOREIGN KEY (design_revision_id) REFERENCES design_revisions(id) ON DELETE CASCADE,
                UNIQUE KEY unique_revision_unit_code (design_revision_id, unit_code),
                INDEX idx_revision_type (design_revision_id, unit_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_units');

        // 4. design_bom
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_bom (
                id INT PRIMARY KEY AUTO_INCREMENT,
                design_revision_id INT NOT NULL,
                bom_version INT DEFAULT 1,
                status ENUM('created', 'validated', 'frozen') DEFAULT 'created',
                generated_by INT,
                generated_at DATETIME,
                generation_method ENUM('auto', 'manual', 'hybrid') DEFAULT 'auto',
                validated_by INT,
                validated_at DATETIME,
                validation_errors JSON,
                validation_warnings JSON,
                frozen_by INT,
                frozen_at DATETIME,
                row_version INT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (design_revision_id) REFERENCES design_revisions(id) ON DELETE CASCADE,
                UNIQUE KEY unique_revision_bom_version (design_revision_id, bom_version),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_bom');

        // 5. design_bom_lines
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_bom_lines (
                id INT PRIMARY KEY AUTO_INCREMENT,
                bom_id INT NOT NULL,
                source_unit_id INT NULL,
                material_type ENUM('aluminum', 'glass', 'accessory', 'hardware', 'gasket', 'other') NOT NULL,
                material_id INT NULL,
                material_code_snapshot VARCHAR(100) NOT NULL,
                material_name_snapshot VARCHAR(255) NOT NULL,
                uom_snapshot VARCHAR(20) NOT NULL,
                qty DECIMAL(10,3) NOT NULL,
                waste_factor DECIMAL(5,2) DEFAULT 0,
                unit_price DECIMAL(15,2) DEFAULT 0,
                vendor_id INT NULL,
                is_manual_override BOOLEAN DEFAULT FALSE,
                override_reason TEXT,
                override_by INT,
                override_at DATETIME,
                original_qty DECIMAL(10,3),
                original_uom VARCHAR(20),
                original_vendor_id INT,
                original_waste_factor DECIMAL(5,2),
                row_version INT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (bom_id) REFERENCES design_bom(id) ON DELETE CASCADE,
                FOREIGN KEY (source_unit_id) REFERENCES design_units(id) ON DELETE SET NULL,
                INDEX idx_bom_material (bom_id, material_id),
                INDEX idx_source_unit (source_unit_id),
                INDEX idx_material_type (bom_id, material_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_bom_lines');

        // 6. design_purchase_requests
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_purchase_requests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                pr_code VARCHAR(50) NOT NULL,
                project_id INT NOT NULL,
                design_revision_id INT NOT NULL,
                bom_id INT NOT NULL,
                revision_no_snapshot INT,
                bom_version_snapshot INT,
                status ENUM('draft', 'submitted', 'approved', 'ordered', 'received', 'cancelled') DEFAULT 'draft',
                pr_type ENUM('full_bom', 'shortage_only', 'adjustment', 'supplement') DEFAULT 'shortage_only',
                inventory_policy ENUM('available', 'on_hand', 'net_shortage') DEFAULT 'available',
                reason TEXT,
                notes TEXT,
                created_by INT,
                submitted_by INT,
                submitted_at DATETIME,
                approved_by INT,
                approved_at DATETIME,
                rejected_by INT,
                rejected_at DATETIME,
                rejection_reason TEXT,
                row_version INT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_pr_code (pr_code),
                INDEX idx_project_status (project_id, status),
                INDEX idx_bom_type_status (bom_id, pr_type, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_purchase_requests');

        // 7. design_pr_lines
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_pr_lines (
                id INT PRIMARY KEY AUTO_INCREMENT,
                pr_id INT NOT NULL,
                bom_line_id INT NOT NULL,
                material_id INT,
                material_code VARCHAR(100) NOT NULL,
                material_name VARCHAR(255) NOT NULL,
                uom VARCHAR(20) NOT NULL,
                qty DECIMAL(10,3) NOT NULL,
                needed_by_date DATE,
                vendor_id INT,
                snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                qty_on_hand DECIMAL(10,3) DEFAULT 0,
                qty_reserved DECIMAL(10,3) DEFAULT 0,
                qty_available DECIMAL(10,3) DEFAULT 0,
                qty_on_order DECIMAL(10,3) DEFAULT 0,
                qty_shortage DECIMAL(10,3) DEFAULT 0,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pr_id) REFERENCES design_purchase_requests(id) ON DELETE CASCADE,
                FOREIGN KEY (bom_line_id) REFERENCES design_bom_lines(id) ON DELETE CASCADE,
                INDEX idx_pr_material (pr_id, material_id),
                INDEX idx_bom_line (bom_line_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_pr_lines');

        // 8. design_audit_logs
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_audit_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                request_id VARCHAR(36) NULL,
                entity_type ENUM('revision', 'unit', 'file', 'bom', 'bom_line', 'pr', 'pr_line') NOT NULL,
                entity_id INT NOT NULL,
                action VARCHAR(50) NOT NULL,
                action_detail TEXT,
                old_values JSON,
                new_values JSON,
                reason TEXT,
                user_id INT,
                user_name VARCHAR(100),
                ip_address VARCHAR(45),
                user_agent VARCHAR(500),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_entity (entity_type, entity_id),
                INDEX idx_user_action (user_id, action),
                INDEX idx_request (request_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_audit_logs');

        // 9. design_inventory_reservations
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_inventory_reservations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                project_id INT NOT NULL,
                design_revision_id INT NOT NULL,
                bom_id INT,
                material_id INT NOT NULL,
                qty_reserved DECIMAL(10,3) NOT NULL,
                status ENUM('active', 'released', 'consumed') DEFAULT 'active',
                reserved_by INT,
                reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                released_at DATETIME,
                notes TEXT,
                INDEX idx_project_material (project_id, material_id, status),
                INDEX idx_material_status (material_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ design_inventory_reservations');

        // 10. design_pr_sequence
        await conn.query(`
            CREATE TABLE IF NOT EXISTS design_pr_sequence (
                year INT PRIMARY KEY,
                last_number INT DEFAULT 0
            ) ENGINE=InnoDB
        `);
        console.log('✅ design_pr_sequence');

        console.log('\n🎉 All Design Workflow tables created successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await conn.end();
    }
}

runMigration();
