/**
 * =====================================================
 * AI BRAIN — AI ROUTER (Layer 5)
 * =====================================================
 * Bộ phân luồng trung tâm — "Frontal Cortex" của AI Brain.
 * 
 * Nhận input từ user → Phân loại ý định (Intent) →
 * Chọn tools + knowledge phù hợp → Xây dựng prompt tối ưu →
 * Gọi Gemini → Trả kết quả.
 *
 * @author ViralWindow AI Brain
 */

// Import directly from sub-modules to avoid circular dependency with index.js
const schemaDictionary = require('./schema-dictionary');
const knowledgeBase = require('./knowledge-base');
const dataTools = require('./data-tools');

// =====================================================
// INTENT CLASSIFICATION
// =====================================================

/**
 * Các loại ý định (intent) mà AI Router nhận diện
 */
const INTENTS = {
    QUERY_DATA: 'query_data',         // Hỏi về dữ liệu cụ thể
    REPORT: 'report',                 // Yêu cầu báo cáo
    ANALYSIS: 'analysis',             // Phân tích xu hướng / so sánh
    GUIDANCE: 'guidance',             // Hướng dẫn sử dụng hệ thống
    DOMAIN_KNOWLEDGE: 'domain_knowledge', // Hỏi về kiến thức ngành
    GREETING: 'greeting',             // Chào hỏi
    GENERAL: 'general'                // Câu hỏi chung
};

/**
 * Phân loại ý định người dùng dựa trên message
 * @param {string} message
 * @returns {{ intent: string, category: string, confidence: number, entities: Object }}
 */
function classifyIntent(message) {
    const msg = message.toLowerCase().trim();
    const result = {
        intent: INTENTS.GENERAL,
        category: 'overview',
        confidence: 0.5,
        entities: {}
    };

    // --- GREETING ---
    if (/^(xin chào|hello|hi|hey|chào|ê|alo)[\s!?]*$/i.test(msg)) {
        result.intent = INTENTS.GREETING;
        result.confidence = 0.95;
        return result;
    }

    // --- GUIDANCE (hướng dẫn) ---
    const guidanceKeywords = ['cách', 'làm sao', 'hướng dẫn', 'thao tác', 'bước', 'sử dụng', 'tạo mới', 'chỉnh sửa', 'xóa', 'thêm'];
    if (guidanceKeywords.some(kw => msg.includes(kw))) {
        result.intent = INTENTS.GUIDANCE;
        result.confidence = 0.8;
    }

    // --- DOMAIN KNOWLEDGE ---
    const domainKeywords = ['là gì', 'khác gì', 'nghĩa là', 'giải thích', 'loại nào', 'phân biệt'];
    const industryTerms = ['nhôm', 'kính', 'hệ', 'vra', 'vre', 'cường lực', 'low-e', 'gioăng', 'bóc tách', 'mặt dựng', 'bản lề', 'ke góc'];
    if (domainKeywords.some(kw => msg.includes(kw)) && industryTerms.some(t => msg.includes(t))) {
        result.intent = INTENTS.DOMAIN_KNOWLEDGE;
        result.confidence = 0.9;
    }

    // --- REPORT ---
    const reportKeywords = ['báo cáo', 'report', 'tổng kết', 'thống kê tổng', 'đánh giá'];
    if (reportKeywords.some(kw => msg.includes(kw))) {
        result.intent = INTENTS.REPORT;
        result.confidence = 0.85;
    }

    // --- ANALYSIS ---
    const analysisKeywords = ['so sánh', 'xu hướng', 'phân tích', 'tăng giảm', 'dự báo', 'trend', 'tại sao', 'nguyên nhân', 'rủi ro'];
    if (analysisKeywords.some(kw => msg.includes(kw))) {
        result.intent = INTENTS.ANALYSIS;
        result.confidence = 0.85;
    }

    // --- QUERY_DATA ---
    const queryKeywords = ['bao nhiêu', 'còn lại', 'tồn kho', 'danh sách', 'liệt kê', 'cho tôi', 'xem', 'tìm', 
                          'mấy', 'top', 'cao nhất', 'thấp nhất', 'gần đây', 'quá hạn', 'sắp hết',
                          'doanh thu', 'chi phí', 'lãi', 'lỗ', 'thu chi'];
    if (queryKeywords.some(kw => msg.includes(kw))) {
        result.intent = INTENTS.QUERY_DATA;
        result.confidence = 0.85;
    }

    // --- Category Detection ---
    const categoryMap = {
        finance: ['tài chính', 'doanh thu', 'chi phí', 'lãi', 'lỗ', 'thu chi', 'tiền', 'thanh toán', 'công nợ'],
        inventory: ['kho', 'tồn kho', 'vật tư', 'nhôm', 'kính', 'phụ kiện', 'nhập kho', 'xuất kho', 'sắp hết'],
        projects: ['dự án', 'project', 'tiến độ', 'deadline', 'công trình', 'thi công', 'quá hạn'],
        customers: ['khách hàng', 'customer', 'chủ đầu tư', 'đối tác'],
        hr: ['nhân sự', 'nhân viên', 'năng suất', 'nhân lực']
    };

    for (const [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => msg.includes(kw))) {
            result.category = cat;
            break;
        }
    }

    // --- Entity Extraction ---
    // Detect item codes (VR001, VRA-55...)
    const codeMatch = message.match(/[A-Z]{2,}[-\s]?\d+/gi);
    if (codeMatch) {
        result.entities.item_codes = codeMatch.map(c => c.trim());
    }

    // Detect numbers (quantity, days...)
    const numMatch = msg.match(/(\d+)\s*(ngày|tuần|tháng|quý|năm)/);
    if (numMatch) {
        result.entities.time_period = { value: parseInt(numMatch[1]), unit: numMatch[2] };
    }

    return result;
}

// =====================================================
// SMART PROMPT BUILDER (Replaces static prompt)
// =====================================================

/**
 * Xây dựng System Prompt động dựa trên intent + category
 */
function buildContextualPrompt(intent, category) {
    const relevantTables = schemaDictionary.getTablesForCategory(category);

    let prompt = `Bạn là AI Brain của phần mềm ViralWindow — hệ thống ERP quản lý sản xuất nhôm kính chuyên nghiệp.
Bạn HIỂU SÂU về ngành nhôm kính, cấu trúc dữ liệu, và quy tắc nghiệp vụ của doanh nghiệp.

1. Trả lời Tiếng Việt, ngắn gọn, súc tích (<150 từ nếu có thể)
2. Thêm 1-2 emoji. Dùng định dạng số: 1.000.000đ
3. KHÔNG BỊA số liệu, chỉ dựa vào DATA CUNG CẤP
4. Gợi ý hành động thực tế. Dùng định dạng HTML cơ bản (b, br, table)

`;

    // Inject knowledge based on intent
    switch (intent) {
        case INTENTS.DOMAIN_KNOWLEDGE:
            // Full knowledge for domain questions
            prompt += knowledgeBase.getKnowledgeContext() + '\n\n';
            break;
        case INTENTS.QUERY_DATA:
        case INTENTS.REPORT:
        case INTENTS.ANALYSIS:
            // Schema + rules for data questions
            prompt += schemaDictionary.getSchemaContext(relevantTables) + '\n';
            prompt += knowledgeBase.getBusinessRulesContext(category) + '\n\n';
            break;
        case INTENTS.GUIDANCE:
            // System knowledge for how-to questions
            prompt += knowledgeBase.getKnowledgeContext() + '\n\n';
            break;
        default:
            // Compact context for general
            prompt += knowledgeBase.getBusinessRulesContext(category) + '\n\n';
            break;
    }

    return prompt;
}

// =====================================================
// MAIN ROUTER: processMessage
// =====================================================

/**
 * Router chính: Xử lý tin nhắn người dùng end-to-end
 * @param {string} message - Tin nhắn người dùng
 * @param {Object} options - { history, existingContext }
 * @returns {{ reply: string, intent: Object, toolsUsed: string[], dataCollected: Object }}
 */
async function processMessage(message, options = {}) {
    const { history = [], existingContext = null } = options;
    const startTime = Date.now();

    // Step 1: Classify intent
    const intent = classifyIntent(message);
    console.log(`🧠 AI Router: Intent="${intent.intent}" Category="${intent.category}" Confidence=${intent.confidence}`);

    // Step 2: Execute data tools (if needed)
    let toolData = {};
    let toolsUsed = [];

    if ([INTENTS.QUERY_DATA, INTENTS.REPORT, INTENTS.ANALYSIS].includes(intent.intent)) {
        try {
            toolData = await dataTools.autoExecuteTools(message);
            toolsUsed = toolData._tools_used || [];
            console.log(`🔧 AI Router: Executed ${toolsUsed.length} data tools: [${toolsUsed.join(', ')}]`);
        } catch (err) {
            console.warn('⚠️ AI Router: Data tools failed:', err.message);
        }
    }

    // Step 3: Build contextual prompt
    const systemPrompt = buildContextualPrompt(intent.intent, intent.category);

    // Step 4: Merge all data
    const mergedData = { ...existingContext, ...toolData };

    // Step 5: Build final prompt
    let contextBlock = '';
    if (Object.keys(mergedData).length > 0) {
        // Remove internal metadata
        const cleanData = { ...mergedData };
        delete cleanData._tools_used;
        delete cleanData._generated_at;
        delete cleanData._error;
        contextBlock = `\n\nDỮ LIỆU THỰC TẾ TỪ DATABASE (truy vấn tự động bởi AI Brain — ${toolsUsed.length} tools):\n${JSON.stringify(cleanData, null, 2)}`;
    }

    const historyText = history.map(h =>
        `${h.role === 'user' ? 'Người dùng' : 'AI'}: ${h.content}`
    ).join('\n');

    // Intent-specific instructions
    let intentInstruction = '';
    switch (intent.intent) {
        case INTENTS.GREETING:
            intentInstruction = 'Chào đón thân thiện, giới thiệu ngắn gọn rằng bạn là AI Brain của ViralWindow, có thể giúp: tra cứu kho, phân tích tài chính, theo dõi dự án, tư vấn nghiệp vụ nhôm kính.';
            break;
        case INTENTS.QUERY_DATA:
            intentInstruction = 'Trả lời CỤ THỂ với SỐ LIỆU từ dữ liệu database ở trên. Nếu có bảng/danh sách, hiển thị dạng <table> HTML. Đừng nói chung chung.';
            break;
        case INTENTS.REPORT:
            intentInstruction = 'Tạo báo cáo có cấu trúc: Tổng quan → Chi tiết → Nhận xét → Gợi ý hành động. Dùng dữ liệu thực.';
            break;
        case INTENTS.ANALYSIS:
            intentInstruction = 'Phân tích chuyên sâu: So sánh, phát hiện xu hướng, đánh giá rủi ro, gợi ý chiến lược từ dữ liệu.';
            break;
        case INTENTS.GUIDANCE:
            intentInstruction = 'Hướng dẫn từng bước cụ thể, rõ ràng. Đề cập đúng tên menu, nút bấm trong hệ thống ViralWindow.';
            break;
        case INTENTS.DOMAIN_KNOWLEDGE:
            intentInstruction = 'Giải thích thuật ngữ/kiến thức ngành nhôm kính bằng ngôn ngữ dễ hiểu. Cho ví dụ cụ thể nếu được.';
            break;
        default:
            intentInstruction = 'Trả lời hữu ích, ngắn gọn.';
    }

    const finalPrompt = `${systemPrompt}${contextBlock}

${historyText ? `LỊCH SỬ HỘI THOẠI:\n${historyText}\n` : ''}
Người dùng: ${message}

CHỈ DẪN: ${intentInstruction}
Format: HTML. Tối đa 200 từ. Cắt gọn bảng nếu quá dài.`;

    const elapsed = Date.now() - startTime;
    console.log(`🧠 AI Router: Prompt ready in ${elapsed}ms (${intent.intent}/${intent.category}) → Sending to AI Provider`);

    return {
        prompt: finalPrompt,
        intent,
        toolsUsed,
        dataCollected: mergedData,
        promptLength: finalPrompt.length
    };
}

module.exports = {
    INTENTS,
    classifyIntent,
    buildContextualPrompt,
    processMessage
};
