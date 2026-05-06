/**
 * =====================================================
 * AI BRAIN — SCHEMA DICTIONARY (Layer 2)
 * =====================================================
 * Mô tả toàn bộ schema database cho AI đọc hiểu.
 * AI sẽ dùng file này để biết chính xác bảng nào, cột nào,
 * quan hệ ra sao → trả lời chính xác hơn.
 *
 * @author ViralWindow AI Brain
 */

const SCHEMA_DICTIONARY = {

    // ==========================================
    // CORE BUSINESS
    // ==========================================
    projects: {
        description: 'Dự án nhôm kính — Đơn vị công việc chính trong ERP (từ tư vấn → thi công → bàn giao)',
        columns: {
            id: 'INT PK',
            project_name: 'VARCHAR — Tên dự án (VD: "Nhà anh Minh - Q7")',
            project_code: 'VARCHAR — Mã dự án (VD: "DA-2025-001")',
            status: 'VARCHAR — Trạng thái: pending, active, in_progress, processing, completed, done, cancelled',
            customer_id: 'INT FK → customers.id',
            total_value: 'DECIMAL — Tổng giá trị hợp đồng (VNĐ)',
            deadline: 'DATE — Hạn hoàn thành',
            agency_id: 'INT FK → agencies.id — Chi nhánh phụ trách',
            workforce: 'VARCHAR — Nhân lực phân bổ',
            note: 'TEXT — Ghi chú',
            created_at: 'TIMESTAMP',
            updated_at: 'TIMESTAMP'
        },
        relationships: ['customers (customer_id)', 'agencies (agency_id)', 'quotations (project_id)', 'material_requests (project_id)', 'project_items (project_id)'],
        status_flow: 'pending → active → in_progress → completed/cancelled',
        business_notes: 'Mỗi dự án = 1 công trình nhôm kính. Dự án quá hạn = deadline < ngày hiện tại AND status chưa completed.'
    },

    customers: {
        description: 'Khách hàng — Chủ đầu tư / Đối tác đặt hàng',
        columns: {
            id: 'INT PK',
            full_name: 'VARCHAR — Tên đầy đủ khách hàng',
            phone: 'VARCHAR — Số điện thoại',
            email: 'VARCHAR — Email',
            address: 'TEXT — Địa chỉ',
            customer_code: 'VARCHAR — Mã khách hàng (VD: "KH-001")',
            tax_code: 'VARCHAR — Mã số thuế',
            company_name: 'VARCHAR — Tên công ty (nếu là doanh nghiệp)',
            type: 'VARCHAR — Loại: individual (cá nhân), company (doanh nghiệp)',
            created_at: 'TIMESTAMP'
        },
        relationships: ['projects (customer_id)', 'quotations (customer_id)'],
        business_notes: 'Tên khách hàng dùng field full_name (KHÔNG phải name). Mỗi khách hàng có thể có nhiều dự án và báo giá.'
    },

    quotations: {
        description: 'Báo giá — Đề xuất giá cho khách hàng trước khi thực hiện dự án',
        columns: {
            id: 'INT PK',
            quotation_code: 'VARCHAR — Mã báo giá (VD: "BG-2025-001")',
            customer_id: 'INT FK → customers.id',
            project_id: 'INT FK → projects.id (nullable)',
            status: 'VARCHAR — Trạng thái: draft, pending, approved, rejected, cancelled',
            total_amount: 'DECIMAL — Tổng giá trị báo giá (VNĐ)',
            discount: 'DECIMAL — Chiết khấu',
            tax: 'DECIMAL — Thuế',
            note: 'TEXT — Ghi chú',
            valid_until: 'DATE — Ngày hết hạn báo giá',
            created_at: 'TIMESTAMP'
        },
        relationships: ['customers (customer_id)', 'projects (project_id)', 'quotation_items (quotation_id)'],
        status_flow: 'draft → pending → approved/rejected',
        business_notes: 'Báo giá phải được duyệt (approved) mới chuyển sang sản xuất. Mỗi báo giá chứa nhiều quotation_items (hạng mục).'
    },

    // ==========================================
    // KHO VẬT TƯ (INVENTORY)
    // ==========================================
    accessories: {
        description: 'Phụ kiện nhôm kính (bản lề, tay nắm, gioăng, ke, ốc vít...)',
        columns: {
            id: 'INT PK',
            code: 'VARCHAR — Mã phụ kiện (VD: "VR001", "PK-BL01")',
            name: 'VARCHAR — Tên phụ kiện',
            category: 'VARCHAR — Danh mục (string)',
            category_id: 'INT FK → accessory_categories.id',
            stock_quantity: 'INT — Số lượng tồn kho hiện tại',
            sale_price: 'DECIMAL — Giá bán (VNĐ)',
            unit: 'VARCHAR — Đơn vị (cái, bộ, m, kg...)',
            supplier: 'VARCHAR — Nhà cung cấp'
        },
        relationships: ['accessory_categories (category_id)'],
        business_notes: 'Khi stock_quantity <= 5 → cảnh báo sắp hết hàng. Dùng sale_price để tính giá thành sản phẩm.'
    },

    aluminum_systems: {
        description: 'Hệ nhôm thanh — Các profile nhôm phân theo hệ (VRA-55, VRE-65, XingFa...)',
        columns: {
            id: 'INT PK',
            code: 'VARCHAR — Mã nhôm (VD: "VRA-55-01")',
            name: 'VARCHAR — Tên thanh nhôm',
            quantity: 'DECIMAL — Số lượng tồn kho hiện tại',
            unit_price: 'DECIMAL — Đơn giá (VNĐ/cây hoặc VNĐ/kg)',
            color: 'VARCHAR — Màu sắc',
            weight: 'DECIMAL — Khối lượng (kg/m)',
            length: 'DECIMAL — Chiều dài chuẩn (mm)',
            warehouse_id: 'INT — Mã kho (1=Kho Nhôm VIRAL, 2=Kho Nhôm YANGLY)'
        },
        relationships: [],
        business_notes: 'Có 2 kho nhôm chính: Kho Nhôm VIRAL (id=1) và Kho Nhôm YANGLY (id=2). Nhôm phân theo hệ (system) như VRA-55, VRE-65.'
    },

    inventory: {
        description: 'Kho tổng hợp — Kính và các vật tư khác (không phải nhôm/phụ kiện)',
        columns: {
            id: 'INT PK',
            item_code: 'VARCHAR — Mã vật tư',
            item_name: 'VARCHAR — Tên vật tư',
            quantity: 'DECIMAL — Số lượng tồn kho',
            unit_price: 'DECIMAL — Đơn giá',
            unit: 'VARCHAR — Đơn vị tính',
            category: 'VARCHAR — Danh mục (kính, silicon, ...)',
            warehouse_id: 'INT — Mã kho'
        },
        relationships: [],
        business_notes: 'Bảng này chủ yếu chứa kính các loại (kính cường lực, kính hộp, Low-E...) và silicon, keo...'
    },

    stock_documents: {
        description: 'Phiếu kho — Chứng từ nhập/xuất kho chính thức',
        columns: {
            id: 'INT PK',
            doc_no: 'VARCHAR — Số phiếu (VD: "NK-2025-001")',
            doc_type: 'ENUM — Loại: import (nhập kho), export (xuất kho)',
            warehouse_id: 'INT — Kho liên quan',
            status: 'VARCHAR — Trạng thái: draft, confirmed, cancelled',
            total_value: 'DECIMAL — Tổng giá trị phiếu',
            note: 'TEXT — Ghi chú',
            created_by: 'INT FK → users.id',
            created_at: 'TIMESTAMP'
        },
        relationships: ['stock_document_lines (document_id)', 'users (created_by)'],
        business_notes: 'Mỗi phiếu kho (import/export) chứa nhiều dòng hàng (stock_document_lines). Phiếu confirmed = đã thực hiện nhập/xuất.'
    },

    stock_document_lines: {
        description: 'Dòng hàng trong phiếu kho — Chi tiết từng mặt hàng nhập/xuất',
        columns: {
            id: 'INT PK',
            document_id: 'INT FK → stock_documents.id',
            item_type: 'VARCHAR — Loại: aluminum, accessory, glass, other',
            item_id: 'INT — ID vật tư trong bảng tương ứng',
            item_code: 'VARCHAR — Mã vật tư',
            item_name: 'VARCHAR — Tên vật tư',
            qty: 'DECIMAL — Số lượng',
            unit_price: 'DECIMAL — Đơn giá',
            total: 'DECIMAL — Thành tiền (qty × unit_price)'
        },
        relationships: ['stock_documents (document_id)'],
        business_notes: 'item_type quyết định vật tư thuộc bảng nào: aluminum → aluminum_systems, accessory → accessories, glass → inventory.'
    },

    // ==========================================
    // TÀI CHÍNH
    // ==========================================
    financial_transactions: {
        description: 'Giao dịch tài chính — Thu chi của công ty',
        columns: {
            id: 'INT PK',
            transaction_type: 'VARCHAR — Loại: income (thu), expense (chi)',
            amount: 'DECIMAL — Số tiền (VNĐ)',
            category: 'VARCHAR — Danh mục: material_cost, labor, transport, revenue, deposit...',
            description: 'TEXT — Mô tả giao dịch',
            project_id: 'INT FK → projects.id (nullable)',
            transaction_date: 'DATE — Ngày giao dịch',
            payment_method: 'VARCHAR — Phương thức: cash, bank_transfer, card',
            created_by: 'INT FK → users.id',
            created_at: 'TIMESTAMP'
        },
        relationships: ['projects (project_id)', 'users (created_by)'],
        business_notes: 'Doanh thu = SUM(amount) WHERE transaction_type="income". Chi phí = SUM(amount) WHERE transaction_type="expense". Lãi = Doanh thu - Chi phí.'
    },

    // ==========================================
    // SẢN XUẤT & THI CÔNG
    // ==========================================
    material_requests: {
        description: 'Yêu cầu vật tư — Phiếu đề nghị xuất vật tư cho dự án',
        columns: {
            id: 'INT PK',
            order_code: 'VARCHAR — Mã phiếu yêu cầu',
            project_id: 'INT FK → projects.id',
            project_name: 'VARCHAR — Tên dự án (denormalized)',
            category: 'VARCHAR — Loại vật tư: aluminum, accessory, glass, other',
            status: 'VARCHAR — Trạng thái: pending, approved, rejected, completed',
            requested_by: 'INT FK → users.id',
            created_at: 'TIMESTAMP'
        },
        relationships: ['projects (project_id)', 'users (requested_by)'],
        business_notes: 'Yêu cầu vật tư phải được duyệt (approved) trước khi xuất kho. Liên kết trực tiếp với dự án.'
    },

    // ==========================================
    // NGƯỜI DÙNG & HỆ THỐNG
    // ==========================================
    users: {
        description: 'Người dùng hệ thống — Nhân viên công ty',
        columns: {
            id: 'INT PK',
            username: 'VARCHAR — Tên đăng nhập',
            full_name: 'VARCHAR — Họ tên đầy đủ',
            email: 'VARCHAR — Email',
            phone: 'VARCHAR — Số điện thoại',
            role: 'VARCHAR — Vai trò: admin, manager, staff, accountant',
            department: 'VARCHAR — Phòng ban',
            avatar_url: 'TEXT — Ảnh đại diện',
            is_active: 'TINYINT — Trạng thái hoạt động (1=active, 0=disabled)',
            created_at: 'TIMESTAMP'
        },
        relationships: ['projects (created_by)', 'financial_transactions (created_by)', 'stock_documents (created_by)'],
        business_notes: 'Role "admin" có toàn quyền. "manager" quản lý dự án. "staff" nhân viên. "accountant" kế toán.'
    },

    agencies: {
        description: 'Chi nhánh / Đại lý — Các đơn vị kinh doanh',
        columns: {
            id: 'INT PK',
            name: 'VARCHAR — Tên chi nhánh',
            code: 'VARCHAR — Mã chi nhánh',
            address: 'TEXT — Địa chỉ',
            phone: 'VARCHAR — Số điện thoại',
            manager_name: 'VARCHAR — Tên quản lý',
            is_active: 'TINYINT — Hoạt động (1/0)'
        },
        relationships: ['projects (agency_id)'],
        business_notes: 'Mỗi dự án thuộc 1 chi nhánh. Dùng để lọc báo cáo theo chi nhánh.'
    },

    // ==========================================
    // CHAT & COMMUNICATION
    // ==========================================
    conversations: {
        description: 'Cuộc trò chuyện — Chat nội bộ giữa nhân viên',
        columns: {
            id: 'INT PK',
            type: 'ENUM — private (1-1), group (nhóm)',
            name: 'VARCHAR — Tên nhóm (nullable for private)',
            created_by: 'INT FK → users.id',
            last_message_at: 'TIMESTAMP'
        },
        relationships: ['conversation_members (conversation_id)', 'messages (conversation_id)'],
        business_notes: 'Hệ thống chat nội bộ dùng WebSocket realtime.'
    },

    messages: {
        description: 'Tin nhắn — Nội dung chat trong cuộc trò chuyện',
        columns: {
            id: 'INT PK',
            conversation_id: 'INT FK → conversations.id',
            sender_id: 'INT FK → users.id',
            content: 'TEXT — Nội dung tin nhắn',
            type: 'VARCHAR — text, image, file, system',
            file_url: 'TEXT — URL file đính kèm (nếu type=image/file)',
            file_name: 'VARCHAR — Tên file',
            is_pinned: 'TINYINT — Tin nhắn ghim',
            created_at: 'TIMESTAMP'
        },
        relationships: ['conversations (conversation_id)', 'users (sender_id)'],
        business_notes: 'Tin nhắn hỗ trợ text, ảnh, file. Có chức năng reply, mention (@), và pin.'
    },

    // ==========================================
    // SUPPORT TABLES
    // ==========================================
    glass_items: {
        description: 'Danh mục kính — Các loại kính cường lực, hộp, Low-E...',
        columns: {
            id: 'INT PK',
            name: 'VARCHAR — Tên kính',
            thickness: 'DECIMAL — Độ dày (mm)',
            type: 'VARCHAR — Loại: tempered, laminated, insulated, low_e',
            price_per_m2: 'DECIMAL — Giá/m²'
        },
        relationships: [],
        business_notes: 'Dùng để tính giá kính trong báo giá và BOM sản phẩm.'
    },

    accessory_categories: {
        description: 'Danh mục phụ kiện — Phân loại phụ kiện (bản lề, tay nắm, gioăng...)',
        columns: {
            id: 'INT PK',
            name: 'VARCHAR — Tên danh mục',
            description: 'TEXT — Mô tả'
        },
        relationships: ['accessories (category_id)'],
        business_notes: 'Mỗi phụ kiện thuộc 1 danh mục. Dùng để nhóm phụ kiện khi hiển thị và báo cáo.'
    },

    company_settings: {
        description: 'Cài đặt công ty — Thông tin doanh nghiệp (logo, tên, địa chỉ...)',
        columns: {
            id: 'INT PK',
            setting_key: 'VARCHAR — Khóa cài đặt',
            setting_value: 'TEXT — Giá trị'
        },
        relationships: [],
        business_notes: 'Lưu logo, tên công ty, địa chỉ, số điện thoại, ... cho hiển thị trên giao diện và báo giá.'
    }
};

/**
 * Tạo context schema cho AI prompt (chỉ lấy bảng liên quan)
 * @param {string[]} relevantTables - Danh sách bảng cần lấy
 * @returns {string} - Schema description dạng text
 */
function getSchemaContext(relevantTables = null) {
    const tables = relevantTables
        ? relevantTables.filter(t => SCHEMA_DICTIONARY[t])
        : Object.keys(SCHEMA_DICTIONARY);

    let context = '📋 CẤU TRÚC DATABASE (Schema Dictionary):\n\n';

    for (const tableName of tables) {
        const t = SCHEMA_DICTIONARY[tableName];
        context += `▸ ${tableName}: ${t.description}\n`;
        context += `  Cột chính: ${Object.entries(t.columns).map(([k, v]) => `${k} (${v})`).join(', ')}\n`;
        if (t.relationships.length > 0) {
            context += `  Quan hệ: ${t.relationships.join(', ')}\n`;
        }
        if (t.business_notes) {
            context += `  💡 ${t.business_notes}\n`;
        }
        context += '\n';
    }

    return context;
}

/**
 * Lấy tên bảng phù hợp với 1 danh mục (category) cụ thể
 * @param {string} category - overview, projects, finance, inventory, customers, hr
 * @returns {string[]}
 */
function getTablesForCategory(category) {
    const mapping = {
        overview: ['projects', 'customers', 'financial_transactions', 'stock_documents', 'accessories', 'aluminum_systems', 'inventory', 'quotations'],
        projects: ['projects', 'customers', 'material_requests', 'agencies'],
        finance: ['financial_transactions', 'projects', 'customers'],
        inventory: ['accessories', 'aluminum_systems', 'inventory', 'stock_documents', 'stock_document_lines'],
        customers: ['customers', 'projects', 'quotations'],
        hr: ['users', 'projects', 'agencies']
    };
    return mapping[category] || mapping.overview;
}

module.exports = {
    SCHEMA_DICTIONARY,
    getSchemaContext,
    getTablesForCategory
};
