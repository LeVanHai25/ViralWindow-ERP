/**
 * Script để xóa search icon và notification cũ khỏi header bar
 * Giữ lại chỉ notification mới (header-notification-container)
 * Chạy: node backend/scripts/remove-search-from-header.js
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

    // Pattern 1: Remove search button and old notification from header bar
    // Tìm pattern: <!-- Search --> ... <!-- Notifications --> ... </div></div>
    const pattern1 = /<!-- Search -->[\s\S]*?<!-- Notifications -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
    if (pattern1.test(content)) {
        content = content.replace(
            pattern1,
            '</div>'
        );
        modified = true;
        console.log(`✓ Removed search and old notification from header in ${page}`);
    }

    // Pattern 2: Remove just search button
    const pattern2 = /<!-- Search -->[\s\S]*?<\/button>\s*/;
    if (pattern2.test(content) && !modified) {
        content = content.replace(pattern2, '');
        modified = true;
        console.log(`✓ Removed search button from ${page}`);
    }

    // Pattern 3: Remove old notification button in header (not the new one)
    // Chỉ xóa nếu không phải header-notification-container
    const pattern3 = /<!-- Notifications -->[\s\S]*?<div id="notificationsDropdown" class="hidden absolute right-0 mt-2[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
    if (pattern3.test(content) && !content.includes('header-notification-container')) {
        content = content.replace(pattern3, '');
        modified = true;
        console.log(`✓ Removed old notification from header in ${page}`);
    }

    // Pattern 4: Clean up empty flex container
    const pattern4 = /<div class="flex items-center gap-4">\s*<\/div>/;
    if (pattern4.test(content)) {
        content = content.replace(pattern4, '');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
    } else {
        console.log(`- ${page} - no changes needed`);
    }
});

console.log('\n✅ Done!');

