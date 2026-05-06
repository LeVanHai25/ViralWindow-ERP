/**
 * =====================================================
 * AI BRAIN — Entry Point
 * =====================================================
 * Module trung tâm export tất cả layers của AI Brain.
 *
 * Usage:
 *   const aiBrain = require('./ai-brain');
 *   const schemaCtx = aiBrain.getSchemaContext(['projects', 'customers']);
 *   const knowledgeCtx = aiBrain.getKnowledgeContext();
 *   const rulesCtx = aiBrain.getBusinessRulesContext('finance');
 *   const fullPrompt = aiBrain.buildSmartPrompt('finance', userMessage);
 */

const { SCHEMA_DICTIONARY, getSchemaContext, getTablesForCategory } = require('./schema-dictionary');
const { DOMAIN_KNOWLEDGE, BUSINESS_RULES, TERMINOLOGY, getKnowledgeContext, getBusinessRulesContext } = require('./knowledge-base');
const { DATA_TOOLS, getToolDescriptions, autoExecuteTools, executeTool } = require('./data-tools');
const aiRouter = require('./ai-router');
const memory = require('./memory');

/**
 * Xây dựng System Prompt thông minh dựa trên context
 * @param {string} category - Danh mục: overview, projects, finance, inventory, customers, hr
 * @param {string} userMessage - Tin nhắn người dùng (dùng để detect thêm context)
 * @returns {string} - Prompt đầy đủ với Knowledge + Schema + Rules
 */
function buildSmartPrompt(category = 'overview', userMessage = '') {
    const relevantTables = getTablesForCategory(category);

    // Base identity
    let prompt = `Bạn là AI Brain của phần mềm ViralWindow — hệ thống ERP quản lý sản xuất nhôm kính chuyên nghiệp.
Bạn HIỂU SÂU về ngành nhôm kính, cấu trúc dữ liệu, và quy tắc nghiệp vụ của doanh nghiệp.

QUY TẮC TRẢ LỜI:
1. Trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp
2. TUYỆT ĐỐI KHÔNG SỬ DỤNG EMOJI. Hãy dùng thẻ HTML Lucide Icon nội tuyến (ví dụ: <i data-lucide="bar-chart-2" style="display:inline-block;width:18px;height:18px;margin-right:4px;"></i>) kết hợp class w-4 h-4 để trang trí các tiêu đề hoặc dòng nhấn mạnh (icon phổ biến: pie-chart, activity, users, box, dollar-sign, lightbulb, pin, trending-up, alert-circle).
3. Format tiền VNĐ: 1.000.000đ
4. Chỉ phân tích dữ liệu thực được cung cấp, KHÔNG BỊA số liệu
5. Đưa ra gợi ý hành động cụ thể, khả thi
6. Format output bằng HTML (bold, list, color) để hiển thị trên web
7. Khi trả lời về vấn đề kỹ thuật ngành nhôm kính, dùng đúng thuật ngữ chuyên ngành

`;

    // Inject knowledge (compact)
    prompt += getKnowledgeContext() + '\n\n';

    // Inject relevant schema
    prompt += getSchemaContext(relevantTables) + '\n';

    // Inject business rules (category-filtered)
    prompt += getBusinessRulesContext(category) + '\n';

    return prompt;
}

/**
 * Detect các bảng liên quan từ nội dung tin nhắn
 * @param {string} message
 * @returns {string[]}
 */
function detectRelevantTables(message) {
    const msg = message.toLowerCase();
    const tables = new Set();

    const keywords = {
        projects: ['dự án', 'project', 'tiến độ', 'deadline', 'công trình', 'thi công'],
        customers: ['khách hàng', 'customer', 'chủ đầu tư', 'đối tác'],
        quotations: ['báo giá', 'quotation', 'quote', 'bảng giá'],
        accessories: ['phụ kiện', 'bản lề', 'tay nắm', 'gioăng', 'ke góc', 'ốc vít'],
        aluminum_systems: ['nhôm', 'aluminum', 'profile', 'hệ nhôm', 'VRA', 'VRE', 'thanh nhôm'],
        inventory: ['kính', 'tồn kho', 'vật tư', 'silicon', 'kho'],
        stock_documents: ['phiếu kho', 'nhập kho', 'xuất kho', 'phiếu nhập', 'phiếu xuất'],
        financial_transactions: ['tài chính', 'doanh thu', 'chi phí', 'thu chi', 'lãi lỗ', 'tiền', 'thanh toán'],
        material_requests: ['yêu cầu vật tư', 'đề nghị xuất', 'material request'],
        users: ['nhân viên', 'người dùng', 'user', 'nhân sự', 'phân quyền'],
        agencies: ['chi nhánh', 'đại lý', 'agency']
    };

    for (const [table, kws] of Object.entries(keywords)) {
        if (kws.some(kw => msg.includes(kw))) {
            tables.add(table);
        }
    }

    // Nếu không detect được gì, trả về bảng mặc định
    if (tables.size === 0) {
        return ['projects', 'financial_transactions', 'inventory'];
    }

    return Array.from(tables);
}

module.exports = {
    // Layer 1+3: Knowledge
    DOMAIN_KNOWLEDGE,
    BUSINESS_RULES,
    TERMINOLOGY,
    getKnowledgeContext,
    getBusinessRulesContext,

    // Layer 2: Schema
    SCHEMA_DICTIONARY,
    getSchemaContext,
    getTablesForCategory,

    // Layer 4: Data Tools
    DATA_TOOLS,
    getToolDescriptions,
    autoExecuteTools,
    executeTool,

    // Layer 5: AI Router
    classifyIntent: aiRouter.classifyIntent,
    processMessage: aiRouter.processMessage,
    INTENTS: aiRouter.INTENTS,

    // Layer 6: Memory & Analytics
    memory,

    // Smart functions
    buildSmartPrompt,
    detectRelevantTables
};
