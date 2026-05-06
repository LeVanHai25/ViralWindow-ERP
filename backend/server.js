const express = require("express");
const cors = require("cors");
const http = require('http');
require("dotenv").config();

// Standardize timezone for whole app
process.env.TZ = "Asia/Ho_Chi_Minh";

const app = express();
const httpServer = http.createServer(app);

// ============================================
// DIAGNOSTICS (Render Deployment Debug)
// ============================================
const PORT = process.env.PORT || 3001;
console.log(`[${new Date().toISOString()}] 🔍 Diagnostic: Detected PORT = ${PORT}`);
console.log(`[${new Date().toISOString()}] 🔍 Diagnostic: NODE_ENV = ${process.env.NODE_ENV}`);

const fs = require('fs');
const path = require("path");
const staticPath = path.join(__dirname, '..', 'FontEnd');
const loginFile = path.join(staticPath, 'login.html');

console.log(`[${new Date().toISOString()}] 📂 Static Path: ${staticPath}`);
console.log(`[${new Date().toISOString()}] 📂 login.html exists: ${fs.existsSync(loginFile)}`);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Tăng limit để hỗ trợ base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// HEALTH CHECK (TOP PRIORITY FOR DEPLOYMENT)
// Phải đăng ký ngay lập tức để Render health check không bị timeout
// ============================================
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "ViralWindow API Server",
        version: "1.0.0",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
console.log(`[${new Date().toISOString()}] 🚀 Health Check /api/health đã sẵn sàng`);

// Auth Middlewares
const { optionalAuth } = require('./middleware/auth');

// Activity Log Middleware - Tự động ghi log mọi API request thay đổi data
const activityLogMiddleware = require('./middleware/activityLog');

// Register middlewares in corect order
app.use(optionalAuth); // Populate req.user
app.use(activityLogMiddleware); // Log activity using populated req.user

// Serve static files (uploads)
// From FontEnd/uploads (legacy)
app.use('/uploads', express.static(path.join(__dirname, '..', 'FontEnd', 'uploads')));
// From backend/uploads (project photos, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'FontEnd')));

// Import routes (Benchmarked)
const startupStart = Date.now();
const aluminumRoutes = require("./routes/aluminum");
const catalogMaterialsRoutes = require('./routes/catalog-materials');
const projectRoutes = require("./routes/projects");
const accessoriesRoutes = require("./routes/accessories");
const customerRoutes = require("./routes/customers");
const quotationRoutes = require("./routes/quotations");
const reportRoutes = require("./routes/reports");
const productionOrderRoutes = require("./routes/production-orders");
const inventoryRoutes = require("./routes/inventory");
const inventoryTransactionRoutes = require("./routes/inventory-transactions");
const inventoryInRoutes = require("./routes/inventory-in");
const inventoryOutRoutes = require("./routes/inventory-out");
const inventoryWarningRoutes = require("./routes/inventory-warnings");
const formulaRoutes = require("./routes/formulas");
const companySettingsRoutes = require("./routes/company-settings");
const authRoutes = require("./routes/auth");
const notificationRoutes = require("./routes/notifications");
const doorTemplateRoutes = require("./routes/door-templates");
// MERGED into door-templates.js - no longer needed separately
// const doorTemplateFullRoutes = require("./routes/door-templates-full");
const userDoorLibraryRoutes = require("./routes/user-door-library");
const doorDrawingRoutes = require("./routes/door-drawings");
const projectSummaryRoutes = require("./routes/project-summaries");
const productionDrawingRoutes = require("./routes/production-drawings");
const bomRoutes = require("./routes/bom");
const cuttingOptimizationRoutes = require("./routes/cutting-optimization");
const productionProgressRoutes = require("./routes/production-progress");
const labelRoutes = require("./routes/labels");
const financialRoutes = require("./routes/financial");
const debtRoutes = require("./routes/debts");
const profitReportRoutes = require("./routes/profit-reports");
const workflowRoutes = require("./routes/workflow");
const aluminumProfileRoutes = require("./routes/aluminum-profiles");
const cuttingFormulaRoutes = require("./routes/cutting-formulas");
const accessoryUsageRoutes = require("./routes/accessory-usage");
const aluminumBarSummaryRoutes = require("./routes/aluminum-bar-summary");
const projectDoorRoutes = require("./routes/project-doors");
const projectMaterialRoutes = require("./routes/projectMaterialRoutes");
const productionManagementRoutes = require("./routes/production-management");
const installationRoutes = require("./routes/installation");
// NEW: Product Templates System (thay thế door-templates)
const productTemplateRoutes = require("./routes/product-templates");
const projectItemRoutes = require("./routes/project-items");
// NEW: API V2 - ACT Style Architecture
const apiV2Routes = require("./routes/apiV2");
// NEW: Warehouse Export
const warehouseExportRoutes = require("./routes/warehouseExportRoutes");
// NEW: File Upload for quotation items
const uploadRoutes = require("./routes/uploadRoutes");
// NEW: BOM Export Excel
const bomExportRoutes = require("./routes/bom-export");
// NEW: Purchase Requests
const purchaseRequestRoutes = require("./routes/purchase-requests");
// NEW: Manufacturing - Smart Status Tracking
const manufacturingRoutes = require("./routes/manufacturing");
// NEW: Glass Items API - Sync với Bảng kính
const glassItemRoutes = require("./routes/glass-items");
// NEW: Order Tracking Dashboard
const orderTrackingRoutes = require("./routes/order-tracking");
// NEW: Production Excel View (Phase 1.5 - API Contract)
const productionExcelRoutes = require("./routes/production-excel");
const warehouseRoutes = require("./routes/warehouses");

// Use routes
app.use("/api/auth", authRoutes);
// ALIAS: /api/users để frontend có thể gọi /api/users/me
app.use("/api/users", authRoutes);
console.log('✅ Route /api/users đã được đăng ký (alias của auth - hỗ trợ /api/users/me)');

// NEW: Aluminum Catalog Systems (Moved up for priority)
const aluminumCatalogSystemRoutes = require("./routes/aluminumSystemRoutes");
app.use("/api/catalog/aluminum-systems", aluminumCatalogSystemRoutes);
console.log('✅ Route /api/catalog/aluminum-systems đã được đăng ký');
app.use("/api/notifications", notificationRoutes);
app.use("/api/door-templates", doorTemplateRoutes);
// MERGED - /full routes are now in door-templates.js
// app.use("/api/door-templates", doorTemplateFullRoutes);
app.use("/api/user-door-library", userDoorLibraryRoutes);
app.use("/api/door-drawings", doorDrawingRoutes);
app.use("/api/project-summaries", projectSummaryRoutes);
app.use("/api/production-drawings", productionDrawingRoutes);
app.use("/api/bom", bomRoutes);
app.use("/api/cutting-optimization", cuttingOptimizationRoutes);
app.use("/api/production-progress", productionProgressRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/financial", financialRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/profit-reports", profitReportRoutes);
app.use("/api/workflow", workflowRoutes);
app.use("/api/aluminum-systems", aluminumRoutes);
app.use("/api/catalog-materials", catalogMaterialsRoutes);
app.use("/api/aluminum-profiles", aluminumProfileRoutes);
app.use("/api/cutting-formulas", cuttingFormulaRoutes);
app.use("/api/accessory-usage", accessoryUsageRoutes);
app.use("/api", aluminumBarSummaryRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", projectDoorRoutes); // Project doors (Door Catalog integration) - DEPRECATED
// NEW: Product Templates System
app.use("/api/product-templates", productTemplateRoutes);
console.log('✅ Route /api/product-templates đã được đăng ký');
app.use("/api/projects", projectItemRoutes); // Project items (thay thế project-doors)
console.log('✅ Route /api/projects/:id/items đã được đăng ký');
// Đăng ký routes project-materials
app.use("/api/project-materials", projectMaterialRoutes); // Xuất vật tư cho dự án
console.log('✅ Route /api/project-materials đã được đăng ký');
// Đăng ký routes production-management
app.use("/api/production-management", productionManagementRoutes); // Quản lý sản xuất
console.log('✅ Route /api/production-management đã được đăng ký');
// Đăng ký routes installation
app.use("/api/installation", installationRoutes); // Quản lý lắp đặt
console.log('✅ Route /api/installation đã được đăng ký');
// Đăng ký routes manufacturing (NEW - Smart Status)
app.use("/api/manufacturing", manufacturingRoutes); // Sản xuất sản phẩm
console.log('✅ Route /api/manufacturing đã được đăng ký');
// NEW: Glass Items API
app.use("/api/glass-items", glassItemRoutes); // Bảng kính
console.log('✅ Route /api/glass-items đã được đăng ký');
// NEW: Order Tracking Dashboard
app.use("/api/order-tracking", orderTrackingRoutes); // Theo dõi đơn hàng
console.log('✅ Route /api/order-tracking đã được đăng ký');
// NEW: Production Excel View (Phase 1.5 - API Contract)
app.use("/api/production", productionExcelRoutes);
console.log('✅ Route /api/production/excel-orders đã được đăng ký');
// DEPRECATED: Aluminum Catalog Systems was here
// Đăng ký routes handover
const handoverRoutes = require("./routes/handover");
app.use("/api/handover", handoverRoutes); // Quản lý bàn giao
console.log('✅ Route /api/handover đã được đăng ký');
app.use("/api/accessories", accessoriesRoutes);
app.use("/api/customers", customerRoutes);
// NEW: Units (Đơn vị/Chi nhánh) - DEPRECATED: use agencies instead
const unitRoutes = require("./routes/units");
app.use("/api/units", unitRoutes);
console.log('✅ Route /api/units đã được đăng ký');
// NEW: Agencies (Đại lý/Chi nhánh)
const agencyRoutes = require("./routes/agencies");
app.use("/api/agencies", agencyRoutes);
console.log('✅ Route /api/agencies đã được đăng ký');
console.log('✅ Route /api/customers đã được đăng ký (bao gồm /api/customers/next-code)');
app.use("/api/quotations", quotationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/production-orders", productionOrderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory/transactions", inventoryTransactionRoutes);
app.use("/api/inventory/in", inventoryInRoutes);
app.use("/api/inventory/out", inventoryOutRoutes);
app.use("/api/inventory/warnings", inventoryWarningRoutes);
app.use("/api/formulas", formulaRoutes);
app.use("/api/company-settings", companySettingsRoutes);
// ALIAS: /api/settings (backwards compatibility for frontend)
app.use("/api/settings", companySettingsRoutes);
console.log('✅ Route /api/settings đã được đăng ký (alias của company-settings)');
// NEW: API V2 - ACT Style Architecture
app.use("/api/v2", apiV2Routes);
console.log('✅ Route /api/v2 (ACT Style) đã được đăng ký');
// NEW: Warehouse Export
app.use("/api/warehouse-export", warehouseExportRoutes);
console.log('✅ Route /api/warehouse-export đã được đăng ký');
// NEW: File Upload for quotation items
app.use("/api/upload", uploadRoutes);
console.log('✅ Route /api/upload đã được đăng ký');
// NEW: BOM Export Excel
app.use("/api/bom-export", bomExportRoutes);
console.log('✅ Route /api/bom-export đã được đăng ký');
// NEW: Purchase Requests
app.use("/api/purchase-requests", purchaseRequestRoutes);
console.log('✅ Route /api/purchase-requests đã được đăng ký');
// ALIAS: Material Requests (cùng routes, tên khác cho frontend material-requests.html)
app.use("/api/material-requests", purchaseRequestRoutes);
console.log('✅ Route /api/material-requests đã được đăng ký (alias của purchase-requests)');

// NEW: Material Search (Autocomplete cho trang Yêu cầu vật tư)
const materialSearchRoutes = require("./routes/material-search");
app.use("/api/materials", materialSearchRoutes);
console.log('✅ Route /api/materials/search đã được đăng ký (Autocomplete vật tư)');

// NEW: Export Slips (Phiếu xuất kho)
const exportSlipRoutes = require("./routes/exportSlipRoutes");
app.use("/api/export-slips", exportSlipRoutes);
console.log('✅ Route /api/export-slips đã được đăng ký');

// NEW: Design Workflow (State Machine based)
const designWorkflowRoutes = require("./routes/designWorkflow");
app.use("/api/design", designWorkflowRoutes);
console.log('✅ Route /api/design đã được đăng ký (Design Workflow với State Machine)');

// NEW: Stock Documents (KiotViet style - Phiếu nhập/xuất/kiểm kho)
const stockDocumentRoutes = require("./routes/stockDocument");
app.use("/api/stock-documents", stockDocumentRoutes);
console.log('✅ Route /api/stock-documents đã được đăng ký (Phiếu kho KiotViet style)');

// NEW: Suppliers (Nhà cung cấp)
const supplierRoutes = require("./routes/suppliers");
app.use("/api/suppliers", supplierRoutes);
console.log('✅ Route /api/suppliers đã được đăng ký (Quản lý NCC)');

// NEW: Items (Unified Item Master API)
const itemRoutes = require("./routes/items");
app.use("/api/items", itemRoutes);
console.log('✅ Route /api/items đã được đăng ký (Tạo vật tư mới)');

// NEW: Product Catalog (Nhóm SP + Sản phẩm cửa)
const productCatalogRoutes = require("./routes/product-catalog");
app.use("/api/product-catalog", productCatalogRoutes);
console.log('✅ Route /api/product-catalog đã được đăng ký (Nhóm SP + Sản phẩm cửa)');

app.use("/api/inventory-warehouses", warehouseRoutes);
console.log('✅ Route /api/inventory-warehouses đã được đăng ký');

// NEW: Work Plan (Kế hoạch công việc - Module Quản lý)
const workPlanRoutes = require("./routes/work-plans");
app.use("/api/work-plans", workPlanRoutes);
console.log('✅ Route /api/work-plans đã được đăng ký (Kế hoạch công việc)');

// NEW: Work Plan Types (Loại kế hoạch)
const workPlanTypeRoutes = require("./routes/work-plan-types");
app.use("/api/work-plan-types", workPlanTypeRoutes);
console.log('✅ Route /api/work-plan-types đã được đăng ký (Loại kế hoạch)');

// NEW: Attendance System
const attendanceRoutes = require("./routes/attendance");
app.use("/api/attendance", attendanceRoutes);
console.log('✅ Route /api/attendance đã được đăng ký (Chấm công)');

const leaveRequestRoutes = require("./routes/leave-requests");
app.use("/api/leave-requests", leaveRequestRoutes);
console.log('✅ Route /api/leave-requests đã được đăng ký (Xin phép/Nghỉ phép)');

const shiftRoutes = require("./routes/shifts");
app.use("/api/shifts", shiftRoutes);
console.log('✅ Route /api/shifts đã được đăng ký (Ca làm việc)');

const holidayRoutes = require("./routes/holidays");
app.use("/api/holidays", holidayRoutes);
console.log('✅ Route /api/holidays đã được đăng ký (Ngày lễ)');



// ============================================
// RBAC - Role-Based Access Control
// ============================================
const roleRoutes = require("./routes/roles");
const permissionRoutes = require("./routes/permissions");
const userManagementRoutes = require("./routes/user-management");

app.use("/api/roles", roleRoutes);
console.log('✅ Route /api/roles đã được đăng ký (Quản lý Chức vụ)');

app.use("/api/permissions", permissionRoutes);
console.log('✅ Route /api/permissions đã được đăng ký (Quản lý Quyền)');

app.use("/api/user-management", userManagementRoutes);
console.log('✅ Route /api/user-management đã được đăng ký (Quản lý Người dùng)');

// ============================================
// SECURITY - Login History, Sessions, Password Change
// ============================================
const securityRoutes = require("./routes/security");
app.use("/api/security", securityRoutes);
console.log('🔐 Route /api/security đã được đăng ký (Login History, Sessions, Password)');

// ============================================
// AI Features - Gemini Integration
// ============================================
const aiRoutes = require("./routes/ai");
app.use("/api/ai", aiRoutes);
console.log('🤖 Route /api/ai đã được đăng ký (AI Dashboard, Search, Chat, Reports)');

// ============================================
// CHAT - MessageBox Internal Communication
// ============================================
const chatRoutes = require("./routes/chat");
app.use("/api/chat", chatRoutes);
// Serve chat file uploads
app.use('/uploads/chat', express.static(require('path').join(__dirname, 'uploads', 'chat')));
console.log('💬 Route /api/chat đã được đăng ký (MessageBox Chat)');

// DEBUG Routes (Development only)
const debugRoutes = require("./routes/debug");
app.use("/api/debug", debugRoutes);
console.log('🔧 Route /api/debug đã được đăng ký (Debug APIs)');

const startupEnd = Date.now();
console.log(`[${new Date().toISOString()}] ⏱️ Thời gian load toàn bộ routes: ${startupEnd - startupStart}ms`);


// Health check - API endpoint (Moved to top)

// ============================================
// ERROR HANDLING (Centralized)
// ============================================
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler cho API routes
app.use('/api', notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// ============================================
// STARTUP DB MIGRATIONS (fix TiDB compatibility)
// ============================================
async function runStartupMigrations() {
    const db = require('./config/db');

    // 1. Create aluminum_warehouse_catalog_systems if not exists
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS aluminum_warehouse_catalog_systems (
                id INT AUTO_INCREMENT PRIMARY KEY,
                system_name VARCHAR(255) UNIQUE NOT NULL,
                display_order INT DEFAULT 0,
                is_active TINYINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Migration: aluminum_warehouse_catalog_systems table created/verified');

        // Check if table is empty to seed defaults
        const [rows] = await db.query('SELECT COUNT(*) as count FROM aluminum_warehouse_catalog_systems');
        if (rows[0].count === 0) {
            console.log('🌱 Seeding default aluminum systems...');
            const defaults = [
                'VRA-Hệ 55 Mở quay', 'VRA-Hệ 50', 'VRA-Hệ 64 Cửa sổ lùa',
                'VRE -Hệ 65 Mở quay( Mạnh Quy)', 'VRE -Hệ 65 Mở quay(Yangly)',
                'VRE- Hệ Xếp trượt 80', 'VRE- Hệ Lùa 120 & 180',
                'HỆ LÙA 94 MỚI', 'THỦY LỰC', 'MẶT DỰNG', 'HỆ LÙA 94 KOSO'
            ];
            for (const name of defaults) {
                await db.query('INSERT IGNORE INTO aluminum_warehouse_catalog_systems (system_name) VALUES (?)', [name]);
            }
            console.log('✅ Seeded default aluminum systems');
        }
    } catch (err) {
        console.error('❌ Migration Error (Aluminum Catalog):', err.message);
    }

    const migrations = [
        {
            name: 'user_sessions AUTO_INCREMENT',
            sql: "ALTER TABLE user_sessions MODIFY id int(11) NOT NULL AUTO_INCREMENT"
        },
        {
            name: 'login_history AUTO_INCREMENT',
            sql: "ALTER TABLE login_history MODIFY id int(11) NOT NULL AUTO_INCREMENT"
        },
        {
            name: 'add_approved_at_to_quotations',
            sql: "ALTER TABLE quotations ADD COLUMN approved_at DATETIME NULL COMMENT 'Thời điểm chốt báo giá (hợp đồng)'"
        },
        {
            name: 'backfill_approved_at_for_old_quotations',
            sql: "UPDATE quotations SET approved_at = updated_at WHERE status = 'approved' AND approved_at IS NULL"
        },
        {
            name: 'add_location_method_to_attendance',
            sql: "ALTER TABLE attendance_records ADD COLUMN location_method VARCHAR(20) DEFAULT 'unknown' COMMENT 'gps|ip|default|unknown'"
        },
        {
            name: 'add_office_address_to_company_config',
            sql: "ALTER TABLE company_config ADD COLUMN office_address VARCHAR(500) NULL COMMENT 'Địa chỉ văn phòng hiển thị khi dùng vị trí mặc định'"
        }
    ];

    for (const m of migrations) {
        try {
            await db.query(m.sql);
            console.log(`✅ Migration: ${m.name}`);
        } catch (err) {
            // Ignore if already applied or table doesn't exist or column exists
            const msg = err.message || '';
            if (!msg.includes('already exists') && 
                !msg.includes("doesn't exist") && 
                !msg.includes("Duplicate column name")) {
                console.log(`⚠️ Migration ${m.name} skipped/failed: ${msg}`);
            }
        }
    }
}

// ============================================
// CHAT TABLES MIGRATION
// ============================================
async function runChatMigrations() {
    const db = require('./config/db');
    const chatTables = [
        {
            name: 'conversations',
            sql: `CREATE TABLE IF NOT EXISTS conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('private','group') NOT NULL DEFAULT 'private',
                name VARCHAR(255) NULL,
                avatar_url TEXT NULL,
                description TEXT NULL,
                created_by INT NOT NULL,
                last_message_id INT NULL,
                last_message_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        },
        {
            name: 'conversation_members',
            sql: `CREATE TABLE IF NOT EXISTS conversation_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                user_id INT NOT NULL,
                role ENUM('owner','admin','member') DEFAULT 'member',
                nickname VARCHAR(100) NULL,
                is_muted TINYINT(1) DEFAULT 0,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_conv_user (conversation_id, user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        },
        {
            name: 'messages',
            sql: `CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                sender_id INT NOT NULL,
                content TEXT NULL,
                type ENUM('text','image','file','system') DEFAULT 'text',
                file_url TEXT NULL,
                file_name VARCHAR(255) NULL,
                file_size INT NULL,
                reply_to_id INT NULL,
                is_pinned TINYINT(1) DEFAULT 0,
                is_deleted TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_conv_time (conversation_id, created_at),
                INDEX idx_sender (sender_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        },
        {
            name: 'message_reads',
            sql: `CREATE TABLE IF NOT EXISTS message_reads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id INT NOT NULL,
                user_id INT NOT NULL,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_msg_user (message_id, user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        },
        {
            name: 'user_presence',
            sql: `CREATE TABLE IF NOT EXISTS user_presence (
                user_id INT PRIMARY KEY,
                status ENUM('online','offline','away') DEFAULT 'offline',
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                socket_id VARCHAR(100) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        },
        {
            name: 'message_reactions',
            sql: `CREATE TABLE IF NOT EXISTS message_reactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id INT NOT NULL,
                user_id INT NOT NULL,
                emoji VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_reaction (message_id, user_id, emoji),
                INDEX idx_msg (message_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        }
    ];
    for (const t of chatTables) {
        try {
            await db.query(t.sql);
            console.log(`💬 Migration: ${t.name} table OK`);
        } catch (err) {
            console.error(`❌ Chat Migration ${t.name}:`, err.message);
        }
    }
}

// Run migrations DELAYED 5s (so health check responds immediately during cold start)
console.log(`[${new Date().toISOString()}] 🛠️ Migrations sẽ chạy sau 5s (để health check trả lời trước)...`);
setTimeout(() => {
    console.log(`[${new Date().toISOString()}] 🛠️ Bắt đầu chạy migrations...`);
    Promise.all([
        runStartupMigrations(),
        runChatMigrations()
    ])
        .then(() => console.log(`[${new Date().toISOString()}] ✅ Hoàn tất migrations`))
        .catch(err => console.error(`[${new Date().toISOString()}] ❌ Migration error:`, err));
}, 5000);


// ============================================
// SOCKET.IO INITIALIZATION
// ============================================
const { initSocketIO } = require('./services/socketService');
const ioInstance = initSocketIO(httpServer);
app.set('io', ioInstance); // Share io with controllers

// Handle port already in use error
const server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] 🔥 API Server đang chạy tại port ${PORT} (Binding: 0.0.0.0)`);
    console.log(`[${new Date().toISOString()}] 💬 WebSocket Chat Server đã sẵn sàng`);
    console.log("📡 Các endpoints chính:");
    console.log("   GET  /api/chat/conversations");
    console.log("   POST /api/chat/conversations");
    console.log("   GET  /api/chat/conversations/:id/messages");
    console.log("   POST /api/chat/conversations/:id/messages");
    console.log("   WS   Socket.io (cùng port)");

    // ============================================
    // KEEP-ALIVE: Prevent Render Free Tier Spin Down
    // Ping /api/health every 14 minutes to keep instance alive
    // ============================================
    const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 phút
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_URL) {
        console.log(`[${new Date().toISOString()}] 🏓 Keep-Alive enabled: Ping ${RENDER_URL}/api/health mỗi 14 phút`);
        setInterval(() => {
            const url = `${RENDER_URL}/api/health`;
            fetch(url)
                .then(r => r.json())
                .then(d => console.log(`[Keep-Alive] ✅ Ping OK - Uptime: ${Math.round(d.uptime)}s`))
                .catch(e => console.log(`[Keep-Alive] ⚠️ Ping failed: ${e.message}`));
        }, KEEP_ALIVE_INTERVAL);
    } else {
        console.log(`[${new Date().toISOString()}] ℹ️ Keep-Alive disabled (set RENDER_EXTERNAL_URL to enable)`);
    }
});

// Handle port already in use
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ LỖI: Port ${PORT} đang được sử dụng!`);
        console.error(`\n💡 Giải pháp:`);
        console.error(`   1. Chạy: backend\\start-server-auto.bat`);
        console.error(`   2. Hoặc kill process: Get-Process node | Stop-Process -Force`);
        console.error(`   3. Hoặc đổi port trong file .env\n`);
        process.exit(1);
    } else {
        throw err;
    }
});

