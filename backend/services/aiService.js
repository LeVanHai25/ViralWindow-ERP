// Polyfill fetch for Node.js < 18
if (!globalThis.fetch) {
    const nodeFetch = require('node-fetch');
    globalThis.fetch = nodeFetch;
    globalThis.Headers = nodeFetch.Headers;
    globalThis.Request = nodeFetch.Request;
    globalThis.Response = nodeFetch.Response;
}

/**
 * =====================================================
 * AI SERVICE - Multi-Provider Engine (Gemini + Groq)
 * =====================================================
 * Kết nối Google Gemini + Groq API cho ViralWindow
 * - Ưu tiên Groq (Llama 3.3 70B - miễn phí, siêu nhanh)
 * - Tự động Fallback sang Gemini nếu Groq lỗi
 * - generateInsights(): Tạo insights cho dashboard
 * - parseSearchQuery(): NLP → SQL params
 * - chat(): Chatbot conversation
 * - generateReport(): Tạo báo cáo AI
 * 
 * @author ViralWindow AI Team
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const aiBrain = require('../ai-brain');

// Helper để tìm biến môi trường bất chấp người dùng gõ dư khoảng trắng (ví dụ: 'GROQ_API_KEYS ')
function findEnvKey(prefix) {
    const keys = Object.keys(process.env);
    const matchedKey = keys.find(k => k.trim().toUpperCase().includes(prefix));
    if (matchedKey) return process.env[matchedKey] || '';
    return '';
}

// =====================================================
// INIT GEMINI (API KEY ROTATION) - Backup Provider
// =====================================================
const rawKeys = findEnvKey('GEMINI_API_KEY');
const API_KEYS = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

if (API_KEYS.length === 0) {
    console.warn('⚠️ GEMINI_API_KEYS chưa được cấu hình (Gemini sẽ không khả dụng)');
}

let currentKeyIndex = 0;

function getModelForKey(keyIndex) {
    if (API_KEYS.length === 0) throw new Error('GEMINI_API_KEYS chưa cấu hình');
    const key = API_KEYS[keyIndex % API_KEYS.length];
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// =====================================================
// INIT GROQ (Primary Provider - Miễn phí, Siêu nhanh)
// =====================================================
const rawGroqKeys = findEnvKey('GROQ_API_KEY');
const GROQ_API_KEYS = rawGroqKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Danh sách model dự phòng — nếu model đầu bị Groq xoá, tự nhảy sang model tiếp
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
let currentGroqModel = GROQ_MODELS[0];

let currentGroqIndex = 0;

if (GROQ_API_KEYS.length > 0) {
    console.log(`🚀 [AI Provider] GROQ đã sẵn sàng với ${GROQ_API_KEYS.length} keys → Ưu tiên sử dụng Groq (Llama 3 70B)`);
} else {
    console.warn(`⚠️ GROQ_API_KEYS chưa cấu hình trong .env (Hiện có ${Object.keys(process.env).length} biến) → Sẽ chỉ dùng Gemini hoặc Local Fallback`);
}

/**
 * Gọi Groq API (OpenAI-compatible REST API) bằng fetch thuần túy
 * Có hỗ trợ Key Rotation tương tự Gemini
 */
async function callGroq(prompt, options = {}) {
    if (GROQ_API_KEYS.length === 0) {
        throw new Error('GROQ_API_KEYS chưa được cấu hình');
    }

    // Thử tối đa qua tất cả keys VÀ tất cả models
    for (let modelAttempt = 0; modelAttempt < GROQ_MODELS.length; modelAttempt++) {
        const modelName = GROQ_MODELS[modelAttempt] || currentGroqModel;

        for (let keyAttempt = 0; keyAttempt < GROQ_API_KEYS.length; keyAttempt++) {
            const key = GROQ_API_KEYS[currentGroqIndex % GROQ_API_KEYS.length];

            try {
                const response = await fetch(GROQ_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: options.temperature || 0.7,
                        max_tokens: options.maxTokens || 2048,
                        stream: false
                    })
                });

                // Lỗi 429 = Key hết lượt → đổi key
                if (response.status === 429) {
                    console.warn(`[Groq] ⚠️ Key #${currentGroqIndex} hết lượt (429). Đổi key...`);
                    currentGroqIndex = (currentGroqIndex + 1) % GROQ_API_KEYS.length;
                    continue;
                }

                // Lỗi 400 = Model bị xoá → nhảy sang model tiếp theo
                if (response.status === 400) {
                    const errBody = await response.text();
                    if (errBody.includes('decommissioned') || errBody.includes('not found')) {
                        console.warn(`[Groq] ⚠️ Model "${modelName}" đã bị Groq xoá. Tự động thử model tiếp theo...`);
                        currentGroqModel = GROQ_MODELS[modelAttempt + 1] || GROQ_MODELS[0];
                        break; // Thoát vòng key, nhảy sang model tiếp
                    }
                    throw new Error(`Groq 400: ${errBody.substring(0, 150)}`);
                }

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Groq ${response.status}: ${errorBody.substring(0, 100)}`);
                }

                const data = await response.json();
                // Ghi nhận model thành công
                if (currentGroqModel !== modelName) {
                    currentGroqModel = modelName;
                    console.log(`[Groq] ✅ Đã chuyển sang model: ${modelName}`);
                }
                return data.choices[0]?.message?.content || '';

            } catch (err) {
                console.error(`❌ Groq Error (Key #${currentGroqIndex}, Model: ${modelName}):`, err.message?.substring(0, 100));
                currentGroqIndex = (currentGroqIndex + 1) % GROQ_API_KEYS.length;
            }
        }
    }

    throw new Error('Tất cả Groq models và keys đều thất bại');
}

// =====================================================
// CORE: Call Gemini API (với Key Rotation & Retry cho 429)
// =====================================================
async function callGeminiDirect(prompt, options = {}) {
    if (API_KEYS.length === 0) {
        throw new Error('GEMINI_API_KEYS chưa cấu hình');
    }

    const generationConfig = {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2048,
    };

    const MAX_RETRIES = 3;
    const BASE_DELAY = 3000;
    let attempt = 1;

    while (attempt <= MAX_RETRIES) {
        try {
            const m = getModelForKey(currentKeyIndex);
            const result = await m.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig
            });
            return result.response.text();
        } catch (error) {
            const isQuota = error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('limit'));

            if (isQuota && attempt < API_KEYS.length) {
                currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
                console.warn(`[AI Rotate] 🔄 Key #${currentKeyIndex} → tiếp...`);
                attempt++;
                continue;
            }

            console.error(`❌ Gemini Error (Key #${currentKeyIndex}, lần ${attempt}):`, error.message?.substring(0, 150));
            throw error;
        }
    }
}

// =====================================================
// SMART PROVIDER: Tự động chọn Groq → Gemini → Fallback
// =====================================================
async function callGemini(prompt, options = {}) {
    // 1. THỬ GROQ TRƯỚC (Nhanh, miễn phí, không bị khoá)
    if (GROQ_API_KEYS.length > 0) {
        try {
            console.log('🚀 [AI] Đang gọi Groq (Llama 3 70B)...');
            const result = await callGroq(prompt, options);
            console.log('✅ [AI] Groq trả lời thành công!');
            return result;
        } catch (groqErr) {
            console.warn(`⚠️ [AI] Groq thất bại: ${groqErr.message?.substring(0, 100)}. Chuyển sang Gemini...`);
        }
    }

    // 2. THỬ GEMINI (Backup)
    if (API_KEYS.length > 0) {
        try {
            console.log('🔄 [AI] Đang thử Gemini (Backup)...');
            const result = await callGeminiDirect(prompt, options);
            console.log('✅ [AI] Gemini trả lời thành công!');
            return result;
        } catch (geminiErr) {
            console.warn(`⚠️ [AI] Gemini cũng thất bại: ${geminiErr.message?.substring(0, 100)}`);
        }
    }

    // 3. TẤT CẢ ĐỀU CHẾT → Ném lỗi cho ai-cache.js bắt và Fallback cục bộ
    console.error('❌ [AI] CẢ GROQ VÀ GEMINI ĐỀU KHÔNG KHẢ DỤNG!');
    const err = new Error('AI_QUOTA_EXHAUSTED');
    err.code = 'QUOTA_EXHAUSTED';
    throw err;
}

// =====================================================
// 1. DASHBOARD INSIGHTS (Powered by AI Brain)
// =====================================================
async function generateInsights(dataContext) {
    const smartPrompt = aiBrain.buildSmartPrompt('overview');

    const prompt = `${smartPrompt}

DỮ LIỆU HỆ THỐNG HIỆN TẠI:
${JSON.stringify(dataContext, null, 2)}

HÃY PHÂN TÍCH và tạo 5-7 INSIGHTS ngắn gọn về tình hình kinh doanh.

FORMAT OUTPUT (HTML):
<div class="ai-insight-item">
<span class="ai-icon">emoji</span>
<span class="ai-text"><b>Tiêu đề ngắn:</b> Nội dung chi tiết 1-2 câu</span>
</div>

Mỗi insight là 1 div riêng. Bao gồm:
- Tình hình dự án (active, overdue, completed gần đây)
- Tình hình kho (vật tư sắp hết, nhập/xuất gần đây)
- Tài chính (doanh thu, chi phí, xu hướng)
- Cảnh báo quan trọng (nếu có)
- Gợi ý hành động cụ thể

KHÔNG bao giờ nói "dữ liệu không có" - hãy phân tích với những gì có.`;

    const result = await callGemini(prompt, { temperature: 0.6 });
    return result;
}

// =====================================================
// 2. SMART SEARCH - NLP → Structured Query (Powered by AI Brain)
// =====================================================
async function parseSearchQuery(query) {
    // Detect relevant tables from user query
    const detectedTables = aiBrain.detectRelevantTables(query);
    const schemaContext = aiBrain.getSchemaContext(detectedTables);

    const prompt = `${aiBrain.buildSmartPrompt('overview', query)}

Người dùng tìm kiếm: "${query}"

Hãy phân tích câu hỏi và trả về JSON với format:
{
  "intent": "search|count|compare|list|detail",
  "tables": ["tên_bảng_liên_quan"],
  "filters": { "field": "value" },
  "keywords": ["từ khóa tìm kiếm"],
  "summary": "Mô tả ngắn gọn ý định người dùng",
  "suggested_sql_where": "Điều kiện WHERE gợi ý (KHÔNG có SELECT/FROM)"
}

Dùng đúng tên bảng và cột theo Schema Dictionary ở trên.
CHỈ trả về JSON, KHÔNG giải thích thêm.`;

    const result = await callGemini(prompt, { temperature: 0.1 });
    
    // Parse JSON from response
    try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.warn('⚠️ Failed to parse AI search response:', e.message);
    }
    
    return {
        intent: 'search',
        tables: ['projects'],
        filters: {},
        keywords: query.split(' '),
        summary: query,
        suggested_sql_where: `1=1`
    };
}

// =====================================================
// 3. CHATBOT (Powered by AI Brain)
// =====================================================
async function chat(message, history = [], dataContext = null) {
    // Detect category from message for smart prompt
    const detectedTables = aiBrain.detectRelevantTables(message);
    const category = detectedTables.includes('financial_transactions') ? 'finance'
        : detectedTables.includes('accessories') || detectedTables.includes('aluminum_systems') || detectedTables.includes('inventory') ? 'inventory'
        : detectedTables.includes('projects') ? 'projects'
        : detectedTables.includes('customers') ? 'customers'
        : 'overview';

    const smartPrompt = aiBrain.buildSmartPrompt(category, message);

    // Phase 2: Auto-execute data tools to get real data from DB
    let toolData = null;
    try {
        toolData = await aiBrain.autoExecuteTools(message);
        console.log(`🧠 AI Brain: Auto-executed ${toolData._tools_used?.length || 0} data tools for chat`);
    } catch (err) {
        console.warn('⚠️ AI Brain autoExecuteTools failed:', err.message);
    }

    let contextBlock = '';
    // Combine existing dataContext with tool data
    const mergedData = { ...dataContext, ...toolData };
    if (Object.keys(mergedData).length > 0) {
        contextBlock = `\n\nDỮ LIỆU THỰC TẾ TỪ DATABASE (được truy vấn tự động bởi AI Brain):\n${JSON.stringify(mergedData, null, 2)}`;
    }

    const historyText = history.map(h => 
        `${h.role === 'user' ? 'Người dùng' : 'AI'}: ${h.content}`
    ).join('\n');

    const prompt = `${smartPrompt}
${contextBlock}

${historyText ? `LỊCH SỬ HỘI THOẠI:\n${historyText}\n` : ''}
Người dùng: ${message}

Hãy trả lời bằng HTML đẹp. Dùng <b>, <ul><li>, <span style="color:...">, <br> để format.
Nếu người dùng hỏi về dữ liệu hệ thống, hãy phân tích DỮ LIỆU THỰC TẾ ở trên (đã lấy trực tiếp từ database).
Nếu người dùng hỏi về thuật ngữ ngành nhôm kính, sử dụng tri thức chuyên ngành.
Nếu hỏi hướng dẫn thao tác, hãy mô tả từng bước chi tiết.
Giữ câu trả lời ngắn gọn, dưới 300 từ.`;

    return await callGemini(prompt, { temperature: 0.7, maxTokens: 1500 });
}

// =====================================================
// 4. AUTO REPORTS (Category-aware)
// =====================================================
async function generateReport(reportType, dataContext, filters = {}) {
    const category = filters.category || 'overview';
    const CATEGORY_NAMES = {
        overview: 'Tổng Quan Hệ Thống', projects: 'Dự Án & Tiến Độ',
        finance: 'Tài Chính & Doanh Thu', inventory: 'Kho & Vật Tư',
        customers: 'Khách Hàng', hr: 'Nhân Sự & Năng Suất'
    };
    const TIME_NAMES = {
        today: 'hôm nay', week: '7 ngày qua', month: '30 ngày qua', quarter: 'quý này', custom: 'theo tuỳ chọn'
    };

    const categoryName = CATEGORY_NAMES[category] || 'Tổng Quan';
    const timeName = TIME_NAMES[filters.timeRange] || '7 ngày qua';

    // Build category-specific instructions
    const categoryInstructions = {
        overview: 'Phân tích TỔNG QUAN toàn bộ hệ thống: dự án, kho vật tư, tài chính, khách hàng. Đưa ra cái nhìn toàn diện.',
        projects: 'Tập trung phân tích DỰ ÁN: tiến độ, trạng thái, giá trị, quá hạn, rủi ro. Không phân tích kho hay tài chính.',
        finance: 'Tập trung phân tích TÀI CHÍNH: doanh thu, chi phí, lãi lỗ, xu hướng, cảnh báo. Không phân tích dự án hay kho.',
        inventory: 'Tập trung phân tích KHO VẬT TƯ: nhập xuất, tồn kho, vật tư sắp hết, cảnh báo bổ sung. Không phân tích tài chính hay dự án.',
        customers: 'Tập trung phân tích KHÁCH HÀNG: top khách hàng, giá trị dự án, tần suất, tiềm năng.',
        hr: 'Tập trung phân tích NHÂN SỰ & NĂNG SUẤT: phân bổ nhân lực, hiệu suất dự án, gợi ý tối ưu hoá.'
    };

    // Build filter description
    let filterDesc = '';
    if (filters.project_id) filterDesc += '\n- Đang LỌC theo 1 dự án cụ thể.';
    if (filters.customer_id) filterDesc += '\n- Đang LỌC theo 1 khách hàng cụ thể.';
    if (filters.branch_id) filterDesc += '\n- Đang LỌC theo 1 chi nhánh cụ thể.';
    if (filters.status) filterDesc += `\n- Đang LỌC trạng thái: ${filters.status}`;

    const smartPrompt = aiBrain.buildSmartPrompt(category);

    const prompt = `${smartPrompt}

NGƯỜI DÙNG YÊU CẦU BÁO CÁO:
- Danh mục: ${categoryName}
- Khoảng thời gian: ${timeName}
- Định dạng: ${filters.format === 'summary' ? 'Tóm tắt ngắn gọn' : filters.format === 'executive' ? 'Dành cho lãnh đạo (tổng hợp, gợi ý chiến lược)' : 'Chi tiết đầy đủ'}${filterDesc}

CHỈ DẪN:
${categoryInstructions[category] || categoryInstructions.overview}

DỮ LIỆU TỪ DATABASE (DỮ LIỆU THỰC TẾ - KHÔNG BỊA):
${JSON.stringify(dataContext, null, 2)}

FORMAT BÁO CÁO (HTML):
<div class="ai-report">
  <h2>📊 Báo Cáo ${categoryName}</h2>
  <p class="ai-report-date">Khoảng thời gian: ${timeName}</p>
  
  <div class="ai-report-section">
    <h3>📌 [Tên mục phù hợp với ${categoryName}]</h3>
    <ul>
      <li>[Phân tích cụ thể dựa trên dữ liệu thực tế]</li>
    </ul>
  </div>
  
  <div class="ai-report-summary">
    <h3>💡 Nhận xét & Gợi ý</h3>
    <ul>
      <li>[Gợi ý hành động cụ thể, khả thi]</li>
    </ul>
  </div>
</div>

QUY TẮC QUAN TRỌNG:
1. CHỈ phân tích dữ liệu được cung cấp, KHÔNG bịa số liệu
2. Chỉ tập trung vào danh mục "${categoryName}", KHÔNG lan man sang danh mục khác
3. Format tiền VNĐ đúng: 1.000.000đ
4. Nếu dữ liệu rỗng, nói rõ "Không có dữ liệu trong khoảng thời gian này" thay vì bịa
5. Dùng số liệu cụ thể từ data, đừng nói chung chung
6. Sử dụng đúng thuật ngữ ngành nhôm kính
7. Đưa ra ít nhất 3 gợi ý hành động cụ thể và khả thi`;

    return await callGemini(prompt, { temperature: 0.5, maxTokens: 3000 });
}

// =====================================================
// TEST CONNECTION
// =====================================================
async function testConnection() {
    try {
        const result = await callGemini('Xin chào, hãy trả lời ngắn gọn: "AI ViralWindow sẵn sàng!" bằng tiếng Việt.', { maxTokens: 50 });
        return { success: true, message: result };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

module.exports = {
    generateInsights,
    parseSearchQuery,
    chat,
    generateReport,
    testConnection,
    callGemini
};
