const db = require("../config/db");
const productionDrawingCtrl = require("./productionDrawingController");

/**
 * Xuất PDF bản vẽ sản xuất cho một cửa
 * GET /api/production-drawings/projects/:projectId/doors/:doorId/pdf
 */
exports.exportDoorPDF = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;

        // Lấy dữ liệu bản vẽ sản xuất
        const reqMock = {
            params: { projectId, doorId }
        };
        
        let drawingData = null;
        const resMock = {
            json: (data) => {
                if (data.success) {
                    drawingData = data.data;
                }
            },
            status: (code) => ({
                json: (data) => {
                    // Handle error
                }
            })
        };

        await productionDrawingCtrl.getDoorProductionDrawing(reqMock, resMock);

        if (!drawingData) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dữ liệu bản vẽ"
            });
        }

        // Tạo HTML cho PDF
        const htmlContent = generatePDFHTML(drawingData);

        // Trả về HTML (frontend sẽ dùng jsPDF hoặc window.print)
        res.json({
            success: true,
            data: {
                html: htmlContent,
                door_code: drawingData.door_code,
                customer_name: drawingData.customer_name
            }
        });
    } catch (err) {
        console.error('Error exporting door PDF:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xuất PDF: " + err.message
        });
    }
};

/**
 * Tạo HTML cho PDF bản vẽ sản xuất
 */
function generatePDFHTML(drawingData) {
    const { customer_name, door_code, door_width, door_height, h1, clearance, glass_type, quantity, aluminum_cutting, glass_cutting } = drawingData;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bản vẽ sản xuất - ${door_code}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 15px;
        }
        .header h1 {
            font-size: 18pt;
            margin: 0;
            font-weight: bold;
        }
        .info-section {
            display: flex;
            margin-bottom: 15px;
        }
        .info-left {
            flex: 1;
            border: 1px solid #000;
            padding: 10px;
        }
        .info-right {
            flex: 1;
            border: 1px solid #000;
            border-left: none;
            padding: 10px;
        }
        .info-row {
            display: flex;
            margin-bottom: 5px;
        }
        .info-label {
            font-weight: bold;
            width: 150px;
        }
        .info-value {
            flex: 1;
        }
        .drawing-section {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 15px;
            min-height: 200px;
            text-align: center;
        }
        .drawing-placeholder {
            color: #999;
            font-style: italic;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 9pt;
        }
        table th, table td {
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
        }
        table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        table td {
            text-align: center;
        }
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            margin: 15px 0 10px 0;
            text-align: center;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8pt;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>BẢN VẼ SẢN XUẤT</h1>
    </div>

    <div class="info-section">
        <div class="info-left">
            <div class="info-row">
                <div class="info-label">Tên khách hàng:</div>
                <div class="info-value">${escapeHtml(customer_name || '')}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Ký hiệu cửa:</div>
                <div class="info-value">${escapeHtml(door_code || '')}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Rộng Cửa (B) (mm):</div>
                <div class="info-value">${door_width || 0}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Cao Cửa (H) (mm):</div>
                <div class="info-value">${door_height || 0}</div>
            </div>
            <div class="info-row">
                <div class="info-label">H1 (mm):</div>
                <div class="info-value">${h1 || 0}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Hở chân cánh (mm):</div>
                <div class="info-value">${clearance || 7}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Loại kính:</div>
                <div class="info-value">${glass_type || '6'}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Số bộ:</div>
                <div class="info-value">${quantity || 1}</div>
            </div>
        </div>
        <div class="info-right">
            <div class="drawing-section">
                <div class="drawing-placeholder">
                    [Bản vẽ cửa sẽ được render tại đây]
                </div>
            </div>
        </div>
    </div>

    <div class="section-title">KÍCH THƯỚC CẮT NHÔM</div>
    <table>
        <thead>
            <tr>
                <th>Tên thanh nhôm</th>
                <th>Vị trí thanh</th>
                <th>Ký hiệu</th>
                <th>Góc cắt</th>
                <th>Số lượng</th>
                <th>Kích thước (mm)</th>
            </tr>
        </thead>
        <tbody>
            ${aluminum_cutting && aluminum_cutting.length > 0 
                ? aluminum_cutting.map(item => `
                    <tr>
                        <td>${escapeHtml(item.profile_name || '')}</td>
                        <td>${escapeHtml(item.position || '')}</td>
                        <td>${escapeHtml(item.code || '')}</td>
                        <td>${escapeHtml(item.cutting_angle || '90-90')}</td>
                        <td>${item.quantity || 0}</td>
                        <td>${item.length_mm || 0}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="6" style="text-align: center;">Chưa có dữ liệu</td></tr>'
            }
        </tbody>
    </table>

    <div class="section-title">KÍCH THƯỚC CẮT KÍNH</div>
    <table>
        <thead>
            <tr>
                <th>Tên kính</th>
                <th>Rộng (mm)</th>
                <th>Cao (mm)</th>
                <th>Số lượng</th>
                <th>Diện tích kính (m²)</th>
                <th>Vị trí</th>
            </tr>
        </thead>
        <tbody>
            ${glass_cutting && glass_cutting.length > 0 
                ? glass_cutting.map(item => `
                    <tr>
                        <td>${item.glass_type || '6'}</td>
                        <td>${item.width_mm || 0}</td>
                        <td>${item.height_mm || 0}</td>
                        <td>${item.quantity || 0}</td>
                        <td>${(item.area_m2 || 0).toFixed(6)}</td>
                        <td>${escapeHtml(item.position || '')}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="6" style="text-align: center;">Chưa có dữ liệu</td></tr>'
            }
        </tbody>
    </table>

    <div class="footer">
        <p>Bản vẽ được tạo tự động từ hệ thống ViralWindow - ${new Date().toLocaleDateString('vi-VN')}</p>
    </div>
</body>
</html>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}














































































