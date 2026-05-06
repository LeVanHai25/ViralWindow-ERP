/**
 * Permission Controller - Quản lý Quyền Hạn
 * ViralWindow RBAC System
 */

const db = require("../config/db");

/**
 * Lấy tất cả permissions
 */
exports.getPermissions = async (req, res) => {
    try {
        const [permissions] = await db.query(`
            SELECT * FROM permissions 
            ORDER BY module, sort_order
        `);

        res.json({
            success: true,
            data: permissions
        });
    } catch (err) {
        console.error("Error getting permissions:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách quyền"
        });
    }
};

/**
 * Lấy permissions theo module (nhóm)
 */
exports.getPermissionsByModule = async (req, res) => {
    try {
        const [permissions] = await db.query(`
            SELECT * FROM permissions 
            ORDER BY module, sort_order
        `);

        // Nhóm permissions theo module
        const grouped = permissions.reduce((acc, perm) => {
            if (!acc[perm.module]) {
                acc[perm.module] = [];
            }
            acc[perm.module].push(perm);
            return acc;
        }, {});

        res.json({
            success: true,
            data: grouped
        });
    } catch (err) {
        console.error("Error getting permissions by module:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách quyền theo nhóm"
        });
    }
};

/**
 * Lấy permissions của user hiện tại
 * Trả về cả code và name (tiếng Việt) để hiển thị trên UI
 */
exports.getMyPermissions = async (req, res) => {
    try {
        const userId = req.user.id;

        // Lấy role_id của user
        const [users] = await db.query(
            "SELECT role_id, user_type FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        const user = users[0];

        // Nếu là admin cũ (user_type = 'admin') hoặc Super Admin, trả về tất cả permissions
        if (user.user_type === 'admin') {
            const [allPermissions] = await db.query(
                "SELECT code, name, module FROM permissions ORDER BY module, sort_order"
            );
            return res.json({
                success: true,
                data: allPermissions, // Trả về full object với code, name, module
                isAdmin: true
            });
        }

        // Nếu không có role, không có quyền gì
        if (!user.role_id) {
            return res.json({
                success: true,
                data: [],
                isAdmin: false
            });
        }

        // Lấy permissions từ role - bao gồm cả name tiếng Việt
        const [permissions] = await db.query(`
            SELECT p.code, p.name, p.module FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            ORDER BY p.module, p.sort_order
        `, [user.role_id]);

        res.json({
            success: true,
            data: permissions, // Trả về full object
            isAdmin: false
        });
    } catch (err) {
        console.error("Error getting my permissions:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy quyền của bạn"
        });
    }
};

/**
 * Kiểm tra user có quyền cụ thể không
 */
exports.checkPermission = async (req, res) => {
    try {
        const userId = req.user.id;
        const { permission } = req.params;

        const hasPermission = await checkUserPermission(userId, permission);

        res.json({
            success: true,
            data: { hasPermission }
        });
    } catch (err) {
        console.error("Error checking permission:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi kiểm tra quyền"
        });
    }
};

/**
 * Helper: Kiểm tra user có quyền không
 * @param {number} userId 
 * @param {string} permissionCode 
 * @returns {Promise<boolean>}
 */
async function checkUserPermission(userId, permissionCode) {
    // Lấy thông tin user
    const [users] = await db.query(
        "SELECT role_id, user_type FROM users WHERE id = ?",
        [userId]
    );

    if (users.length === 0) return false;

    const user = users[0];

    // Admin cũ hoặc Super Admin có full quyền
    if (user.user_type === 'admin') return true;

    // Không có role = không có quyền
    if (!user.role_id) return false;

    // Kiểm tra permission trong role
    const [result] = await db.query(`
        SELECT 1 FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.code = ?
        LIMIT 1
    `, [user.role_id, permissionCode]);

    return result.length > 0;
}

// Export helper function để sử dụng trong middleware
exports.checkUserPermission = checkUserPermission;
