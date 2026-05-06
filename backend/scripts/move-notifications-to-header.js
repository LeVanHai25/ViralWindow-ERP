/**
 * Script để di chuyển notification từ sidebar sang header (góc trên bên phải)
 * Chạy: node backend/scripts/move-notifications-to-header.js
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

const headerNotificationHTML = `
    <!-- Header Notification (Top Right) -->
    <div class="header-notification-container">
        <button id="headerNotificationButton" class="header-notification-button" onclick="toggleHeaderNotifications()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span id="headerNotificationBadge" class="header-notification-badge hidden">0</span>
        </button>
        
        <div id="headerNotificationsDropdown" class="header-notifications-dropdown">
            <div class="header-notifications-header">
                <h3>Thông báo</h3>
            </div>
            <div id="headerNotificationsList" class="header-notifications-list">
                <!-- Notifications will be loaded here -->
            </div>
        </div>
    </div>
`;

pages.forEach(page => {
    const filePath = path.join(__dirname, '../../FontEnd', page);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${page}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if already has header notification
    if (content.includes('headerNotificationContainer') || content.includes('header-notification-container')) {
        console.log(`✓ ${page} already has header notification`);
        return;
    }

    // Add CSS link
    if (!content.includes('notification-header.css')) {
        // Try to add after notification-system.css
        if (content.includes('notification-system.css')) {
            content = content.replace(
                /(<link rel="stylesheet" href="css\/notification-system\.css">)/,
                `$1\n    <link rel="stylesheet" href="css/notification-header.css">`
            );
        } else {
            // Add before </head>
            content = content.replace(
                /(<\/head>)/,
                `    <link rel="stylesheet" href="css/notification-header.css">\n$1`
            );
        }
    }

    // Add JS script
    if (!content.includes('notification-header.js')) {
        // Try to add after notification-system.js
        if (content.includes('notification-system.js')) {
            content = content.replace(
                /(<script src="js\/notification-system\.js"><\/script>)/,
                `$1\n    <script src="js/notification-header.js"></script>`
            );
        } else if (content.includes('sidebar-enterprise.js')) {
            content = content.replace(
                /(<script src="js\/sidebar-enterprise\.js"><\/script>)/,
                `$1\n    <script src="js/notification-header.js"></script>`
            );
        } else {
            // Add before </body>
            content = content.replace(
                /(<\/body>)/,
                `    <script src="js/notification-header.js"></script>\n$1`
            );
        }
    }

    // Add header notification HTML - right after <body> or in main-content
    if (content.includes('<body')) {
        // Add right after <body> tag
        content = content.replace(
            /(<body[^>]*>)/,
            `$1\n${headerNotificationHTML}`
        );
        console.log(`✓ Added header notification to ${page}`);
    } else {
        console.log(`⚠️  Could not find <body> tag in ${page}`);
    }

    // Remove notification from sidebar (optional - keep for backward compatibility)
    // We'll keep sidebar notification but prioritize header notification

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('\n✅ Done! Notification moved to header (top right corner)');

