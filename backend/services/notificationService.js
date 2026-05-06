const db = require('../config/db');

/**
 * Service để tự động tạo thông báo cho các sự kiện trong hệ thống
 */

class NotificationService {

    /**
     * Tạo thông báo chung
     */
    static async create(data) {
        try {
            const {
                user_id = null,
                type,
                title,
                message,
                link = null,
                icon = '📢',
                color = 'blue',
                priority = 'normal'
            } = data;

            const [result] = await db.query(
                `INSERT INTO notifications 
                 (user_id, type, title, message, link, icon, color, priority, is_read, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
                [user_id, type, title, message, link, icon, color, priority]
            );

            console.log(`✅ Notification created: ${title}`);
            return result.insertId;
        } catch (err) {
            console.error('Error creating notification:', err);
            return null;
        }
    }

    /**
     * DỰ ÁN: Dự án mới được tạo
     */
    static async projectCreated(project) {
        return await this.create({
            type: 'project',
            title: '🏗️ Dự án mới được tạo',
            message: `Dự án "${project.project_name || project.name}" vừa được tạo cho khách hàng "${project.customer_name || 'N/A'}"`,
            link: `projects.html?projectId=${project.id}`,
            icon: '🏗️',
            color: 'blue',
            priority: 'normal'
        });
    }

    /**
     * KHÁCH HÀNG: Khách hàng mới
     */
    static async customerCreated(customer) {
        return await this.create({
            type: 'customer',
            title: '👤 Khách hàng mới',
            message: `Khách hàng "${customer.customer_name}" (${customer.customer_code}) vừa được thêm`,
            link: 'sales.html',
            icon: '👤',
            color: 'blue',
            priority: 'normal'
        });
    }

    /**
     * DỰ ÁN: Cập nhật trạng thái/giai đoạn
     */
    static async projectStatusUpdated(project, oldStatus, newStatus) {
        const statusLabels = {
            'quotation': 'Báo giá',
            'design': 'Thiết kế',
            'bom': 'Bóc tách',
            'production': 'Sản xuất',
            'installation': 'Lắp đặt',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy'
        };
        return await this.create({
            type: 'project',
            title: '🔄 Cập nhật giai đoạn dự án',
            message: `Dự án "${project.project_name || project.name}" chuyển từ "${statusLabels[oldStatus] || oldStatus}" sang "${statusLabels[newStatus] || newStatus}"`,
            link: `projects.html?projectId=${project.id}`,
            icon: '🔄',
            color: newStatus === 'completed' ? 'green' : 'purple',
            priority: newStatus === 'completed' ? 'high' : 'normal'
        });
    }

    /**
     * KHO: Nhập kho
     */
    static async inventoryImported(item, quantity) {
        return await this.create({
            type: 'inventory',
            title: '📥 Nhập kho',
            message: `Đã nhập ${quantity} ${item.unit || 'cái'} ${item.name} (${item.code})`,
            link: 'inventory.html',
            icon: '📥',
            color: 'green',
            priority: 'normal'
        });
    }

    /**
     * DỰ ÁN: Thiết kế hoàn thành
     */
    static async designCompleted(project) {
        return await this.create({
            type: 'project',
            title: '✅ Thiết kế hoàn thành',
            message: `Dự án "${project.name}" đã hoàn thành thiết kế và bóc tách vật tư`,
            link: `design-new.html?projectId=${project.id}`,
            icon: '✅',
            color: 'green',
            priority: 'normal'
        });
    }

    /**
     * DỰ ÁN: Gần deadline
     */
    static async projectDeadlineApproaching(project, daysLeft) {
        return await this.create({
            type: 'project',
            title: '⏰ Dự án gần deadline',
            message: `Dự án "${project.name}" cần hoàn thành trong ${daysLeft} ngày`,
            link: `projects.html?projectId=${project.id}`,
            icon: '⏰',
            color: 'red',
            priority: 'urgent'
        });
    }

    /**
     * BÁO GIÁ: Báo giá mới tạo
     */
    static async quotationCreated(quotation) {
        return await this.create({
            type: 'quotation',
            title: '📄 Báo giá mới được tạo',
            message: `Báo giá "${quotation.code}" cho khách hàng "${quotation.customer_name}" đang chờ gửi`,
            link: `quotation-new.html?id=${quotation.id}`,
            icon: '📄',
            color: 'blue',
            priority: 'normal'
        });
    }

    /**
     * BÁO GIÁ: Báo giá đã gửi
     */
    static async quotationSent(quotation) {
        return await this.create({
            type: 'quotation',
            title: '📧 Báo giá đã gửi',
            message: `Báo giá "${quotation.code}" đã được gửi cho khách hàng "${quotation.customer_name}"`,
            link: `quotation-new.html?id=${quotation.id}`,
            icon: '📧',
            color: 'green',
            priority: 'normal'
        });
    }

    /**
     * BÁO GIÁ: Báo giá được chốt
     */
    static async quotationApproved(quotation) {
        return await this.create({
            type: 'quotation',
            title: '✅ Báo giá được chốt',
            message: `Báo giá "${quotation.code}" đã được khách hàng "${quotation.customer_name}" chấp nhận`,
            link: `quotation-new.html?id=${quotation.id}`,
            icon: '🎉',
            color: 'green',
            priority: 'high'
        });
    }

    /**
     * SẢN XUẤT: Lệnh sản xuất mới
     */
    static async productionOrderCreated(order) {
        return await this.create({
            type: 'production',
            title: '🏭 Lệnh sản xuất mới',
            message: `LSX "${order.code}" cho dự án "${order.project_name}" vừa được tạo`,
            link: `production.html?orderId=${order.id}`,
            icon: '🏭',
            color: 'purple',
            priority: 'normal'
        });
    }

    /**
     * SẢN XUẤT: Hoàn thành sản xuất
     */
    static async productionCompleted(order) {
        return await this.create({
            type: 'production',
            title: '✅ Sản xuất hoàn thành',
            message: `LSX "${order.code}" đã hoàn thành 100%, sẵn sàng lắp đặt`,
            link: `production.html?orderId=${order.id}`,
            icon: '✅',
            color: 'green',
            priority: 'high'
        });
    }

    /**
     * KHO: Vật tư sắp hết
     */
    static async inventoryLowStock(item, currentStock, minStock) {
        return await this.create({
            type: 'inventory',
            title: '⚠️ Vật tư sắp hết',
            message: `${item.name} (${item.code}) còn ${currentStock} ${item.unit}, dưới mức tối thiểu (${minStock})`,
            link: 'inventory.html',
            icon: '📦',
            color: 'orange',
            priority: 'high'
        });
    }

    /**
     * KHO: Vật tư hết hàng
     */
    static async inventoryOutOfStock(item) {
        return await this.create({
            type: 'inventory',
            title: '🚨 Vật tư hết hàng',
            message: `${item.name} (${item.code}) đã hết hàng, cần nhập kho ngay`,
            link: 'inventory.html',
            icon: '🚨',
            color: 'red',
            priority: 'urgent'
        });
    }

    /**
     * KHO: Phiếu xuất kho mới
     */
    static async warehouseExportCreated(exportData) {
        return await this.create({
            type: 'inventory',
            title: '📤 Phiếu xuất kho mới',
            message: `Phiếu xuất "${exportData.code}" cho dự án "${exportData.project_name}" đã được tạo`,
            link: `warehouse-export.html?id=${exportData.id}`,
            icon: '📤',
            color: 'blue',
            priority: 'normal'
        });
    }

    /**
     * TÀI CHÍNH: Phiếu thu mới
     */
    static async paymentReceived(payment) {
        return await this.create({
            type: 'finance',
            title: '💵 Phiếu thu mới',
            message: `Đã thu ${this.formatCurrency(payment.amount)} từ "${payment.customer_name}"`,
            link: 'finance-receipts.html',
            icon: '💵',
            color: 'green',
            priority: 'normal'
        });
    }

    /**
     * TÀI CHÍNH: Công nợ quá hạn
     */
    static async debtOverdue(debt, daysOverdue) {
        return await this.create({
            type: 'finance',
            title: '⚠️ Công nợ quá hạn',
            message: `Khách hàng "${debt.customer_name}" có khoản nợ ${this.formatCurrency(debt.amount)} quá hạn ${daysOverdue} ngày`,
            link: 'finance-debt.html',
            icon: '💰',
            color: 'red',
            priority: 'urgent'
        });
    }

    /**
     * HỆ THỐNG: Người dùng mới đăng ký
     */
    static async userRegistered(user) {
        return await this.create({
            type: 'system',
            title: '👤 Người dùng mới',
            message: `${user.fullname} (${user.username}) vừa đăng ký tài khoản`,
            link: null,
            icon: '👤',
            color: 'purple',
            priority: 'normal'
        });
    }

    /**
     * BOM: BOM được tính toán
     */
    static async bomCalculated(project) {
        return await this.create({
            type: 'project',
            title: '🔢 BOM được tính toán',
            message: `Đã hoàn thành bóc tách vật tư cho dự án "${project.name}"`,
            link: `design-new.html?projectId=${project.id}`,
            icon: '🔢',
            color: 'blue',
            priority: 'normal'
        });
    }

    /**
     * Utility: Format currency
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
    }
}

module.exports = NotificationService;





