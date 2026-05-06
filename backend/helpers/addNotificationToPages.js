/**
 * Helper script để thêm notification component vào tất cả các trang có sidebar
 * Chạy: node backend/helpers/addNotificationToPages.js
 */

const fs = require('fs');
const path = require('path');

const pagesWithSidebar = [
    'index.html',
    'sales.html',
    'projects.html',
    'quotation-new.html',
    'design-new.html',
    'production.html',
    'production-management.html',
    'inventory.html',
    'installation.html',
    'handover.html',
    'exported-materials.html',
    'finance-dashboard.html',
    'completed-projects.html'
];

const notificationHTML = `
        <!-- Notification Button -->
        <div class="p-4 border-b border-blue-600">
            <div class="notification-button-wrapper relative">
                <button onclick="toggleNotifications()" 
                    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-left">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span class="flex-1 text-sm font-medium">Thông báo</span>
                    <span id="notificationBadge" class="notification-badge hidden">0</span>
                </button>
                
                <!-- Notification Dropdown -->
                <div id="notificationsDropdown" class="hidden">
                    <div class="p-3 border-b border-gray-200 bg-gray-50">
                        <h3 class="text-sm font-semibold text-gray-900">Thông báo</h3>
                    </div>
                    <div id="notificationsList" class="bg-white">
                        <!-- Notifications will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
`;

const cssLink = '<link rel="stylesheet" href="css/notification-system.css">';
const jsScript = '<script src="js/notification-system.js"></script>';

pagesWithSidebar.forEach(page => {
    const filePath = path.join(__dirname, '../../FontEnd', page);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${page}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if already has notification component
    if (content.includes('notificationBadge')) {
        console.log(`✓ ${page} already has notification component`);
        return;
    }

    // Add CSS link
    if (!content.includes('notification-system.css')) {
        content = content.replace(
            /(<link rel="stylesheet" href="css\/sidebar-enterprise\.css">)/,
            `$1\n    ${cssLink}`
        );
    }

    // Add JS script
    if (!content.includes('notification-system.js')) {
        content = content.replace(
            /(<script src="js\/success-notification\.js"><\/script>)/,
            `$1\n    ${jsScript}`
        );
    }

    // Add notification HTML after user menu dropdown
    if (content.includes('sidebarUserMenuDropdown')) {
        const userMenuPattern = /(<\/div>\s*<\/div>\s*<!-- Navigation Menu -->)/;
        if (userMenuPattern.test(content)) {
            content = content.replace(
                userMenuPattern,
                `${notificationHTML}\n$1`
            );
            console.log(`✓ Added notification component to ${page}`);
        } else {
            // Try alternative pattern
            const altPattern = /(id="sidebarUserMenuDropdown"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/;
            if (altPattern.test(content)) {
                content = content.replace(
                    altPattern,
                    `$1${notificationHTML}`
                );
                console.log(`✓ Added notification component to ${page} (alt pattern)`);
            } else {
                console.log(`⚠️  Could not find insertion point in ${page}`);
            }
        }
    } else {
        console.log(`⚠️  ${page} does not have sidebarUserMenuDropdown`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('\n✅ Done!');

