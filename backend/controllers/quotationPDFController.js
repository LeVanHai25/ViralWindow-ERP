const db = require("../config/db");

/**
 * Xuất báo giá ra PDF
 */
exports.exportQuotationPDF = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin báo giá
        const [quotationRows] = await db.query(`
            SELECT 
                q.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                c.address AS customer_address,
                c.tax_code AS customer_tax_code,
                p.project_name,
                cc.company_name,
                cc.address AS company_address,
                cc.phone AS company_phone,
                cc.email AS company_email,
                cc.tax_code AS company_tax_code,
                cc.logo_path
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN projects p ON q.project_id = p.id
            LEFT JOIN company_config cc ON 1=1
            WHERE q.id = ?
            LIMIT 1
        `, [id]);

        if (quotationRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy báo giá"
            });
        }

        const quotation = quotationRows[0];

        // Lấy chi tiết báo giá
        const [itemRows] = await db.query(`
            SELECT * FROM quotation_items 
            WHERE quotation_id = ? 
            ORDER BY item_type, id
        `, [id]);

        quotation.items = itemRows;

        // Tính ngày hết hạn
        const validityDate = new Date(quotation.quotation_date);
        validityDate.setDate(validityDate.getDate() + (quotation.validity_days || 30));

        // Format dữ liệu cho PDF
        const pdfData = {
            quotation: {
                code: quotation.quotation_code,
                date: formatDate(quotation.quotation_date),
                validity_date: formatDate(validityDate),
                status: quotation.status
            },
            company: {
                name: quotation.company_name || 'Công ty TNHH Nhôm Kính',
                address: quotation.company_address || '',
                phone: quotation.company_phone || '',
                email: quotation.company_email || '',
                tax_code: quotation.company_tax_code || '',
                logo: quotation.logo_path || null
            },
            customer: {
                name: quotation.customer_name || '',
                phone: quotation.customer_phone || '',
                email: quotation.customer_email || '',
                address: quotation.customer_address || '',
                tax_code: quotation.customer_tax_code || ''
            },
            project: quotation.project_name || null,
            items: quotation.items.map(item => ({
                name: item.item_name,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                total_price: item.total_price,
                type: item.item_type
            })),
            summary: {
                subtotal: quotation.subtotal || 0,
                profit_margin_percent: quotation.profit_margin_percent || 0,
                profit_amount: quotation.profit_amount || 0,
                total_amount: quotation.total_amount || 0
            },
            notes: quotation.notes || ''
        };

        res.json({
            success: true,
            data: pdfData
        });
    } catch (err) {
        console.error('Error exporting quotation PDF:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xuất PDF: " + err.message
        });
    }
};

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}




























