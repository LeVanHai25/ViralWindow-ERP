/**
 * =====================================================
 * AI BRAIN — KNOWLEDGE BASE (Layer 1 + Layer 3)
 * =====================================================
 * Tri thức ngành nhôm kính + Quy tắc nghiệp vụ doanh nghiệp.
 * AI Brain dùng file này để hiểu context chuyên ngành mà
 * model AI tổng quát (Gemini) không biết.
 *
 * @author ViralWindow AI Brain
 */

// =====================================================
// LAYER 1: KNOWLEDGE BASE — Tri thức ngành & Hệ thống
// =====================================================
const DOMAIN_KNOWLEDGE = [
    // --- Về hệ thống ---
    'ViralWindow là phần mềm ERP chuyên quản lý sản xuất cửa nhôm kính cho doanh nghiệp Việt Nam.',
    'Hệ thống quản lý toàn bộ vòng đời dự án: Tư vấn → Thiết kế → Bóc tách vật tư → Báo giá → Duyệt → Sản xuất → Lắp đặt → Bàn giao → Bảo hành.',
    'Có 3 loại kho vật tư chính: Kho Nhôm (aluminum_systems), Kho Phụ kiện (accessories), Kho Kính & Vật tư khác (inventory).',
    'Có 2 kho nhôm vật lý: Kho Nhôm VIRAL (warehouse_id=1) và Kho Nhôm YANGLY (warehouse_id=2).',
    'Đơn vị tiền tệ mặc định: VNĐ (Việt Nam Đồng). Format: 1.000.000đ.',
    'Hệ thống hỗ trợ nhiều chi nhánh (agencies). Mỗi dự án thuộc 1 chi nhánh.',
    'Chat nội bộ sử dụng WebSocket (Socket.IO) cho realtime messaging giữa nhân viên.',

    // --- Về ngành nhôm kính ---
    'Nhôm kính là ngành sản xuất cửa sổ, cửa đi, vách kính, mặt dựng... từ thanh nhôm định hình và kính.',
    'Nhôm được phân loại theo "hệ" (system): VRA-55 (cửa mở quay), VRE-65 (cửa mở quay), VRA-50, Lùa 94, Xếp trượt 80...',
    'Mỗi "hệ nhôm" có bộ profile (thanh) riêng với thông số kỹ thuật khác nhau (weight, length, color).',
    'Kính được phân loại: Kính cường lực, Kính hộp (insulated), Kính dán an toàn (laminated), Kính Low-E (tiết kiệm năng lượng).',
    'Phụ kiện gồm: Bản lề, tay nắm, khóa, gioăng cao su, ke góc, ốc vít, con lăn, thanh chắn nước...',
    'Bóc tách vật tư (BOM - Bill of Materials): Phân tích bản vẽ để tính chính xác lượng nhôm, kính, phụ kiện cần dùng cho 1 sản phẩm.',
    'Mặt dựng (Curtain Wall): Hệ thống vách kính ngoài trời cho tòa nhà cao tầng, yêu cầu kỹ thuật cao nhất.',
    'Hao hụt vật tư: Khi cắt nhôm luôn có hao hụt (thường 5-10%), cần tính vào khi lên đơn đặt hàng.',
];

// =====================================================
// LAYER 3: BUSINESS RULES — Quy tắc nghiệp vụ
// =====================================================
const BUSINESS_RULES = [
    // --- Quy tắc tài chính ---
    'Giá thành dự án = (Khối lượng Nhôm × Đơn giá nhôm) + (Diện tích Kính × Đơn giá kính/m²) + Tổng phụ kiện + Chi phí nhân công + Chi phí vận chuyển.',
    'Doanh thu = SUM(financial_transactions.amount) WHERE transaction_type = "income".',
    'Chi phí = SUM(financial_transactions.amount) WHERE transaction_type = "expense".',
    'Lợi nhuận = Doanh thu - Chi phí.',
    'Công nợ khách hàng = Giá trị hợp đồng - Số tiền đã thanh toán.',

    // --- Quy tắc kho ---
    'Không được xuất kho nếu tồn kho hiện tại < số lượng yêu cầu xuất.',
    'Khi tồn kho phụ kiện (stock_quantity) <= 5 đơn vị → Cảnh báo "sắp hết hàng".',
    'Khi tồn kho nhôm (quantity) <= 5 cây → Cảnh báo "sắp hết hàng".',
    'Phiếu nhập kho (stock_documents.doc_type = "import") → Tăng tồn kho.',
    'Phiếu xuất kho (stock_documents.doc_type = "export") → Giảm tồn kho.',
    'Phiếu kho phải ở trạng thái "confirmed" mới thực sự ảnh hưởng tồn kho.',

    // --- Quy tắc dự án ---
    'Dự án quá hạn (overdue) = deadline < ngày hiện tại AND status KHÔNG thuộc (completed, done, cancelled).',
    'Dự án phải có khách hàng (customer_id) liên kết.',
    'Luồng trạng thái dự án: pending → active → in_progress → completed hoặc cancelled.',
    'Mỗi dự án có thể có nhiều yêu cầu vật tư (material_requests) và nhiều hạng mục sản phẩm (project_items).',

    // --- Quy tắc báo giá ---
    'Báo giá (quotation) phải được duyệt (status = "approved") trước khi chuyển sang sản xuất.',
    'Luồng trạng thái báo giá: draft → pending → approved / rejected.',
    'Báo giá có thời hạn hiệu lực (valid_until). Quá hạn → cần làm lại.',
    'Tổng giá trị báo giá = SUM(quotation_items.amount) - discount + tax.',

    // --- Quy tắc vật tư ---
    'Yêu cầu vật tư phải được duyệt (approved) trước khi cho phép xuất kho.',
    'Luồng trạng thái yêu cầu vật tư: pending → approved → completed hoặc rejected.',
];

// =====================================================
// THUẬT NGỮ CHUYÊN NGÀNH
// =====================================================
const TERMINOLOGY = {
    'Hệ nhôm': 'Loại profile nhôm theo tiêu chuẩn kỹ thuật. VD: VRA-55 (cửa mở quay hệ 55mm), VRE-65 (cửa mở quay hệ 65mm), Hệ Lùa 94 (cửa trượt)',
    'Bóc tách vật tư': 'Phân tích bản vẽ thiết kế để tính toán chính xác các loại nhôm, kính, phụ kiện cần dùng (BOM - Bill of Materials)',
    'BOM': 'Bill of Materials — Danh sách vật tư cần dùng cho 1 sản phẩm hoặc 1 dự án',
    'Phiếu nhập kho': 'Chứng từ ghi nhận việc nhập hàng vào kho (stock_documents, doc_type=import)',
    'Phiếu xuất kho': 'Chứng từ ghi nhận việc xuất hàng ra khỏi kho (stock_documents, doc_type=export)',
    'Mặt dựng': 'Curtain Wall — Hệ thống vách kính ngoài cho tòa nhà cao tầng',
    'Cửa mở quay': 'Cửa bản lề mở ra/vào (casement window/door)',
    'Cửa lùa': 'Cửa trượt ngang trên ray (sliding window/door)',
    'Cửa xếp trượt': 'Cửa gập xếp có thể mở toàn bộ (folding door)',
    'Kính cường lực': 'Kính được tôi nhiệt để tăng độ bền, vỡ thành hạt nhỏ không sắc (tempered glass)',
    'Kính hộp': 'Hai tấm kính cách nhau bởi thanh spacer, chứa khí trơ ở giữa (insulated glass)',
    'Kính Low-E': 'Kính phủ lớp oxit kim loại phản xạ nhiệt, tiết kiệm năng lượng',
    'Gioăng': 'Thanh cao su / EPDM chèn giữa nhôm và kính để chống thấm nước và gió',
    'Ke góc': 'Chi tiết liên kết 2 thanh nhôm tại góc 90 độ',
    'Thanh chắn nước': 'Thanh nhôm nhỏ lắp ở đáy cửa sổ để chống nước mưa tràn vào',
    'Thi công': 'Quá trình lắp đặt sản phẩm nhôm kính tại công trình',
    'Nghiệm thu': 'Kiểm tra và xác nhận sản phẩm đạt yêu cầu chất lượng trước khi bàn giao',
    'Bàn giao': 'Chuyển giao sản phẩm hoàn thiện cho khách hàng kèm biên bản',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Tạo knowledge context cho AI prompt
 * @param {string} topic - Chủ đề liên quan (optional)
 * @returns {string}
 */
function getKnowledgeContext(topic = null) {
    let context = '📚 TRI THỨC NGÀNH NHÔM KÍNH:\n';

    // Domain knowledge
    context += DOMAIN_KNOWLEDGE.map(k => `• ${k}`).join('\n');
    context += '\n\n';

    // Terminology (lọc theo topic nếu có)
    context += '📖 THUẬT NGỮ CHUYÊN NGÀNH:\n';
    for (const [term, def] of Object.entries(TERMINOLOGY)) {
        context += `• ${term}: ${def}\n`;
    }

    return context;
}

/**
 * Tạo business rules context cho AI prompt
 * @param {string} category - overview, projects, finance, inventory...
 * @returns {string}
 */
function getBusinessRulesContext(category = null) {
    let rules = BUSINESS_RULES;

    // Lọc rules theo category nếu cần
    if (category) {
        const filterMap = {
            finance: ['Doanh thu', 'Chi phí', 'Lợi nhuận', 'Công nợ', 'Giá thành'],
            inventory: ['kho', 'tồn kho', 'xuất kho', 'nhập kho', 'Phiếu', 'confirmed'],
            projects: ['Dự án', 'deadline', 'overdue', 'customer_id'],
            customers: ['khách hàng', 'Công nợ'],
            hr: ['nhân công', 'Dự án']
        };
        const keywords = filterMap[category];
        if (keywords) {
            rules = BUSINESS_RULES.filter(r =>
                keywords.some(kw => r.toLowerCase().includes(kw.toLowerCase()))
            );
        }
    }

    let context = '⚖️ QUY TẮC NGHIỆP VỤ DOANH NGHIỆP:\n';
    context += rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
    return context;
}

module.exports = {
    DOMAIN_KNOWLEDGE,
    BUSINESS_RULES,
    TERMINOLOGY,
    getKnowledgeContext,
    getBusinessRulesContext
};
