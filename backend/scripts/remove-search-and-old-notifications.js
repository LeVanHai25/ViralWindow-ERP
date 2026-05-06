/**
 * Script để xóa search icon và notification cũ khỏi header bar
 * Giữ lại chỉ notification mới (header-notification-container)
 * Chạy: node backend/scripts/remove-search-and-old-notifications.js
 */

const fs = require('fs');
const path = require('path');

const pages = [
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

pages.forEach(page => {
    const filePath = path.join(__dirname, '../../FontEnd', page);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${page}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern 1: Remove search button (<!-- Search --> ... </button>)
    const searchPattern = /<!-- Search -->[\s\S]*?<\/button>\s*/g;
    if (searchPattern.test(content)) {
        content = content.replace(searchPattern, '');
        modified = true;
        console.log(`✓ Removed search button from ${page}`);
    }

    // Pattern 2: Remove old notification button and dropdown (not the new header-notification-container)
    // Tìm pattern: <!-- Notifications --> ... <div id="notificationsDropdown" ... (nhưng không phải headerNotificationsDropdown)
    const oldNotificationPattern = /<!-- Notifications -->[\s\S]*?<div class="relative">[\s\S]*?<button onclick="toggleNotifications\(\)"[\s\S]*?<\/button>[\s\S]*?<div id="notificationsDropdown"[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/g;
    if (oldNotificationPattern.test(content) && !content.includes('headerNotificationsDropdown')) {
        content = content.replace(oldNotificationPattern, '');
        modified = true;
        console.log(`✓ Removed old notification from ${page}`);
    }

    // Pattern 3: Remove old notification button only (if dropdown is separate)
    const oldNotificationButtonPattern = /<!-- Notifications -->[\s\S]*?<div class="relative">[\s\S]*?<button onclick="toggleNotifications\(\)"[\s\S]*?<\/button>[\s\S]*?<\/div>/g;
    if (oldNotificationButtonPattern.test(content) && !content.includes('headerNotificationsDropdown')) {
        content = content.replace(oldNotificationButtonPattern, '');
        modified = true;
        console.log(`✓ Removed old notification button from ${page}`);
    }

    // Pattern 4: Clean up empty flex containers
    const emptyFlexPattern = /<div class="flex items-center gap-4">\s*<\/div>/g;
    if (emptyFlexPattern.test(content)) {
        content = content.replace(emptyFlexPattern, '');
        modified = true;
    }

    // Pattern 5: Clean up header bar if it only has title now
    const headerBarPattern = /<div class="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">\s*<h1[^>]*>.*?<\/h1>\s*<\/div>/g;
    if (headerBarPattern.test(content)) {
        // Replace with simpler version without flex justify-between
        content = content.replace(
            /<div class="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">/g,
            '<div class="bg-white border-b border-gray-200 px-6 py-4">'
        );
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
    } else {
        console.log(`- ${page} - no changes needed`);
    }
});

console.log('\n✅ Done! Search icons and old notifications removed from header bars');

