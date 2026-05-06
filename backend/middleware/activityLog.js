/**
 * Activity Log Middleware
 * Tự động ghi log cho mọi API request có thay đổi dữ liệu
 * (POST, PUT, PATCH, DELETE)
 */

const db = require('../config/db');

// Danh sách URL patterns không cần log
const SKIP_PATTERNS = [
    '/api/notifications',    // Không log chính thông báo
    '/api/audit-logs',       // Không log chính audit log
    '/api/activity-logs',    // Không log chính activity log
    '/api/health',           // Health check
    '/favicon',
];

// Danh sách field nhạy cảm cần lọc
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'jwt', 'authorization', 'cookie', 'oldPassword', 'newPassword'];

/**
 * Lọc bỏ fields nhạy cảm khỏi body
 */
function sanitizeBody(body) {
    if (!body || typeof body !== 'object') return null;
    const sanitized = {};
    for (const [key, value] of Object.entries(body)) {
        if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
            sanitized[key] = '***HIDDEN***';
        } else if (typeof value === 'string' && value.length > 500) {
            sanitized[key] = value.substring(0, 500) + '...[truncated]';
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Chuyển đổi endpoint và method sang mô tả Tiếng Việt mẫu mực
 */
function getVietnameseAction(method, url) {
    const path = url.split('?')[0];

    // Mapping Resource
    const MAPPING = [
        { prefix: '/api/auth/login', name: 'Đăng nhập hệ thống' },
        { prefix: '/api/auth/logout', name: 'Đăng xuất hệ thống' },
        { prefix: '/api/quotations', name: 'báo giá' },
        { prefix: '/api/projects', name: 'dự án' },
        { prefix: '/api/customers', name: 'khách hàng' },
        { prefix: '/api/inventory', name: 'kho vật tư' },
        { prefix: '/api/production-orders', name: 'lệnh sản xuất' },
        { prefix: '/api/production', name: 'quy trình sản xuất' },
        { prefix: '/api/user-management', name: 'người dùng' },
        { prefix: '/api/roles', name: 'phân quyền' },
        { prefix: '/api/financial', name: 'phiếu tài chính' },
        { prefix: '/api/debts', name: 'công nợ' },
        { prefix: '/api/materials', name: 'vật tư' },
        { prefix: '/api/items', name: 'danh mục sản phẩm' },
        { prefix: '/api/product-templates', name: 'mẫu sản phẩm' },
        { prefix: '/api/installation', name: 'lắp đặt' },
        { prefix: '/api/handover', name: 'bàn giao' },
        { prefix: '/api/design', name: 'thiết kế' }
    ];

    let resourceName = 'hệ thống';
    let isSpecial = false;

    for (const item of MAPPING) {
        if (path.startsWith(item.prefix)) {
            resourceName = item.name;
            if (item.prefix.includes('login') || item.prefix.includes('logout')) {
                isSpecial = true;
            }
            break;
        }
    }

    if (isSpecial) return resourceName;

    const ACTIONS = {
        'POST': 'Tạo mới',
        'PUT': 'Cập nhật',
        'PATCH': 'Cập nhật',
        'DELETE': 'Xóa',
    };

    const actionName = ACTIONS[method] || 'Thao tác';
    return `${actionName} ${resourceName}`;
}

/**
 * Middleware function
 */
function activityLogMiddleware(req, res, next) {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return next();
    }

    if (SKIP_PATTERNS.some(p => req.originalUrl.startsWith(p))) {
        return next();
    }

    const startTime = Date.now();

    // Capture original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const logAfterResponse = () => {
        const duration = Date.now() - startTime;

        // Cố gắng lấy thông tin user từ session/token (populdated bởi optionalAuth)
        const user = req.user || {};
        const userId = user.id || null;
        const userName = user.fullname || user.name || user.username || null;

        const logData = {
            user_id: userId,
            user_name: userName,
            method: method,
            url: req.originalUrl.substring(0, 500),
            action_description: getVietnameseAction(method, req.originalUrl),
            status_code: res.statusCode,
            duration_ms: duration,
            ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || null,
            user_agent: req.headers['user-agent']?.substring(0, 500) || null,
            request_body: JSON.stringify(sanitizeBody(req.body))?.substring(0, 2000),
        };

        // Ghi log (Async)
        db.query(
            `INSERT INTO activity_logs 
             (user_id, user_name, method, url, action_description, status_code, duration_ms, ip_address, user_agent, request_body)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                logData.user_id,
                logData.user_name,
                logData.method,
                logData.url,
                logData.action_description,
                logData.status_code,
                logData.duration_ms,
                logData.ip_address,
                logData.user_agent,
                logData.request_body
            ]
        ).catch(err => {
            if (!err.message?.includes("doesn't exist")) {
                console.error('[ActivityLog] Error saving log:', err.message);
            }
        });
    };

    res.json = function (data) {
        logAfterResponse();
        return originalJson(data);
    };

    res.send = function (data) {
        logAfterResponse();
        return originalSend(data);
    };

    next();
}

module.exports = activityLogMiddleware;
