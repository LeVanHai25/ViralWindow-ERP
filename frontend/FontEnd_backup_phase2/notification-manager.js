/**
 * NOTIFICATION MANAGER
 * Quản lý việc tạo và hiển thị thông báo tự động trong hệ thống
 */

const NOTIFICATION_API = (window.API_BASE || '/api') + '/notifications';

class NotificationManager {
    
    /**
     * Tạo thông báo mới
     */
    static async create(data) {
        try {
            const response = await fetch(NOTIFICATION_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Notification created:', data.title);
                this.updateBadge(); // Cập nhật badge số lượng
            }
            return result.success;
        } catch (error) {
            console.error('Error creating notification:', error);
            return false;
        }
    }

    /**
     * Lấy số lượng thông báo chưa đọc và cập nhật badge
     */
    static async updateBadge() {
        try {
            const response = await fetch(`${NOTIFICATION_API}/unread`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const count = result.data.count;
                const badges = document.querySelectorAll('[id$="notificationBadge"]');
                
                badges.forEach(badge => {
                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : count;
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                });
            }
        } catch (error) {
            console.error('Error updating notification badge:', error);
        }
    }

    /**
     * DỰ ÁN
     */
    static async projectCreated(project) {
        return await this.create({
            type: 'project',
            title: '🏗️ Dự án mới được tạo',
            message: `Dự án "${project.name}" vừa được tạo cho khách hàng "${project.customer_name || 'N/A'}"`,
            link: `projects.html?projectId=${project.id}`,
            icon: '🏗️',
            color: 'blue',
            priority: 'normal'
        });
    }

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
     * BÁO GIÁ
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

    static async quotationSent(quotation) {
        return await this.create({
            type: 'quotation',
            title: '📧 Báo giá đã gửi',
            message: `Báo giá "${quotation.code}" đã được gửi cho khách hàng`,
            link: `quotation-new.html?id=${quotation.id}`,
            icon: '📧',
            color: 'green',
            priority: 'normal'
        });
    }

    static async quotationApproved(quotation) {
        return await this.create({
            type: 'quotation',
            title: '🎉 Báo giá được chốt',
            message: `Báo giá "${quotation.code}" đã được khách hàng chấp nhận`,
            link: `quotation-new.html?id=${quotation.id}`,
            icon: '🎉',
            color: 'green',
            priority: 'high'
        });
    }

    /**
     * SẢN XUẤT
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
     * KHO HÀNG
     */
    static async inventoryLowStock(item, currentStock, minStock) {
        return await this.create({
            type: 'inventory',
            title: '⚠️ Vật tư sắp hết',
            message: `${item.name} (${item.code}) còn ${currentStock} ${item.unit}, dưới mức tối thiểu (${minStock})`,
            link: 'inventory.html',
            icon: '⚠️',
            color: 'orange',
            priority: 'high'
        });
    }

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

    static async warehouseExported(exportData) {
        return await this.create({
            type: 'inventory',
            title: '📤 Xuất kho thành công',
            message: `Đã xuất kho cho dự án "${exportData.project_name}" - Phiếu ${exportData.code}`,
            link: `warehouse-export.html?id=${exportData.id}`,
            icon: '📤',
            color: 'blue',
            priority: 'normal'
        });
    }

    /**
     * TÀI CHÍNH
     */
    static async paymentReceived(payment) {
        const amount = new Intl.NumberFormat('vi-VN').format(payment.amount) + ' ₫';
        return await this.create({
            type: 'finance',
            title: '💵 Phiếu thu mới',
            message: `Đã thu ${amount} từ "${payment.customer_name}"`,
            link: 'finance-receipts.html',
            icon: '💵',
            color: 'green',
            priority: 'normal'
        });
    }

    static async paymentMade(payment) {
        const amount = new Intl.NumberFormat('vi-VN').format(payment.amount) + ' ₫';
        return await this.create({
            type: 'finance',
            title: '💸 Phiếu chi mới',
            message: `Đã chi ${amount} cho "${payment.supplier_name || payment.reason}"`,
            link: 'finance-payments.html',
            icon: '💸',
            color: 'red',
            priority: 'normal'
        });
    }

    static async debtOverdue(debt, daysOverdue) {
        const amount = new Intl.NumberFormat('vi-VN').format(debt.amount) + ' ₫';
        return await this.create({
            type: 'finance',
            title: '⚠️ Công nợ quá hạn',
            message: `Khách hàng "${debt.customer_name}" có khoản nợ ${amount} quá hạn ${daysOverdue} ngày`,
            link: 'finance-debt.html',
            icon: '💰',
            color: 'red',
            priority: 'urgent'
        });
    }

    /**
     * HỆ THỐNG
     */
    static async fileUploaded(fileName, projectName) {
        return await this.create({
            type: 'system',
            title: '📁 File được tải lên',
            message: `File "${fileName}" đã được tải lên cho dự án "${projectName}"`,
            link: null,
            icon: '📁',
            color: 'blue',
            priority: 'normal'
        });
    }

    static async userLogin(userName) {
        return await this.create({
            type: 'system',
            title: '👤 Đăng nhập',
            message: `${userName} vừa đăng nhập vào hệ thống`,
            link: null,
            icon: '👤',
            color: 'purple',
            priority: 'normal'
        });
    }
}

// Export để dùng trong HTML
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}

// Export cho Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}





