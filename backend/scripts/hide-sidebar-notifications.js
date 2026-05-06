/**
 * Script để ẩn notification trong sidebar (vì đã chuyển lên header)
 * Chạy: node backend/scripts/hide-sidebar-notifications.js
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

    // Hide sidebar notification section by adding hidden class or style
    // Pattern 1: Notification Button section
    if (content.includes('Notification Button') || content.includes('notification-button-wrapper')) {
        // Add hidden class to the notification section
        content = content.replace(
            /(<!-- Notification Button -->[\s\S]*?<\/div>\s*<\/div>)/,
            (match) => {
                // Add hidden class to the outer div
                return match.replace(
                    /(<div class="p-4 border-b border-blue-600">)/,
                    '<div class="p-4 border-b border-blue-600 hidden">'
                );
            }
        );
        console.log(`✓ Hidden sidebar notification in ${page}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('\n✅ Done! Sidebar notifications are now hidden');

