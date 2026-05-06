// Run migration: node run_project_status_migration.js
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aluminium_window',
    multipleStatements: true
};

async function runMigration() {
    console.log('🚀 Starting migration...');

    const connection = await mysql.createConnection(config);

    try {
        // 1. Add operation_status columns
        console.log('📋 Adding operation_status columns to projects...');
        await connection.query(`
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS operation_status TINYINT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS operation_notes TEXT,
            ADD COLUMN IF NOT EXISTS operation_updated_at DATETIME
        `).catch(e => console.log('  (columns may already exist)'));

        // 2. Create project_material_status table
        console.log('📦 Creating project_material_status table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS project_material_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                material_type ENUM('glass', 'aluminum', 'accessory', 'auxiliary') NOT NULL,
                status ENUM('ok', 'waiting', 'missing', 'ordered', 'arrived') DEFAULT 'missing',
                order_date DATE,
                expected_date DATE,
                actual_date DATE,
                quantity DECIMAL(10,2),
                quantity_arrived DECIMAL(10,2),
                supplier VARCHAR(255),
                notes TEXT,
                confirmed_by INT,
                confirmed_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_project_material (project_id, material_type)
            )
        `);

        // 3. Create project_activity_logs table
        console.log('📝 Creating project_activity_logs table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS project_activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                old_value TEXT,
                new_value TEXT,
                description TEXT,
                user_id INT,
                user_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Initialize material status for existing projects
        console.log('🔄 Initializing material status for existing projects...');
        const [projects] = await connection.query('SELECT id FROM projects');
        const types = ['glass', 'aluminum', 'accessory', 'auxiliary'];

        for (const project of projects) {
            for (const type of types) {
                await connection.query(`
                    INSERT IGNORE INTO project_material_status (project_id, material_type, status) 
                    VALUES (?, ?, 'missing')
                `, [project.id, type]);
            }
        }
        console.log(`  Initialized for ${projects.length} projects`);

        // 5. Update operation_status based on current status
        console.log('⚙️ Setting default operation_status based on project status...');
        await connection.query(`
            UPDATE projects 
            SET operation_status = CASE 
                WHEN status IN ('completed', 'handover') THEN 2
                WHEN status IN ('designing', 'bom') THEN 4
                ELSE 1
            END
            WHERE operation_status IS NULL OR operation_status = 0
        `);

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration error:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
