const fs = require('fs');
const path = require('path');

const DIR = __dirname;

const ICON_MAP = {
    'users': 'users', 'handshake': 'handshake', 'ruler-combined': 'ruler', 'helmet-safety': 'hard-hat',
    'list-check': 'list-todo', 'briefcase': 'briefcase', 'folder-open': 'folder-open', 'file-lines': 'file-text',
    'calendar-check': 'calendar-check', 'comments': 'message-square', 'star': 'star', 'bullhorn': 'megaphone',
    'truck': 'truck', 'hammer': 'hammer', 'wrench': 'wrench', 'laptop-code': 'laptop', 'phone': 'phone', 'video': 'video',
    'layer-group': 'layers', 'check': 'check', 'xmark': 'x', 'plus': 'plus', 'magnifying-glass': 'search',
    'chart-pie': 'pie-chart', 'chart-simple': 'bar-chart-3', 'users-gear': 'users-cog', 'clock': 'clock',
    'rotate': 'rotate-cw', 'circle-check': 'check-circle', 'folder': 'folder', 'calendar': 'calendar',
    'list-ul': 'list-todo', 'border-all': 'layout-dashboard', 'building': 'building-2', 'filter': 'filter',
    'download': 'download', 'upload': 'upload', 'trash': 'trash-2', 'pen-to-square': 'edit', 'eye': 'eye',
    'ellipsis-vertical': 'more-vertical', 'chevron-down': 'chevron-down', 'chevron-up': 'chevron-up',
    'chevron-right': 'chevron-right', 'chevron-left': 'chevron-left', 'arrow-right': 'arrow-right',
    'arrow-left': 'arrow-left', 'times': 'x', 'bars': 'menu', 'search': 'search', 'user': 'user', 'bell': 'bell',
    'cog': 'settings', 'cogs': 'settings', 'sign-out-alt': 'log-out', 'envelope': 'mail', 'link': 'link',
    'paperclip': 'paperclip', 'lock': 'lock', 'unlock': 'unlock', 'key': 'key', 'file-pdf': 'file-type-pdf',
    'file-excel': 'file-spreadsheet', 'file-word': 'file-type-word', 'image': 'image', 'camera': 'camera',
    'print': 'printer', 'copy': 'copy', 'reply': 'reply', 'share': 'share-2', 'heart': 'heart',
    'thumbs-up': 'thumbs-up', 'thumbs-down': 'thumbs-down', 'bookmark': 'bookmark', 'tag': 'tag',
    'tags': 'tags', 'map-marker-alt': 'map-pin', 'globe': 'globe', 'home': 'home', 'info-circle': 'info',
    'question-circle': 'help-circle', 'exclamation-circle': 'alert-circle', 'exclamation-triangle': 'alert-triangle',
    'check-square': 'check-square', 'square': 'square', 'circle': 'circle', 'dot-circle': 'circle-dot',
    'spinner': 'loader', 'file-invoice-dollar': 'receipt', 'money-bill-wave': 'banknote', 'chart-line': 'line-chart',
    'file-export': 'file-output', 'gear': 'settings', 'boxes-stacked': 'boxes', 'cart-shopping': 'shopping-cart',
    'clipboard-list': 'clipboard-list'
};

function mapIconName(faName) {
    const name = faName.replace('fa-', '');
    return ICON_MAP[name] || name;
}

function replacer(match, classAttr) {
    const classes = classAttr.split(/\s+/);
    let faName = null;
    const otherClasses = [];
    
    for (const c of classes) {
        if (['fa-solid', 'fa-regular', 'fa-light', 'fa-thin', 'fa-brands', 'fas', 'far', 'fal', 'fab'].includes(c)) {
            continue;
        }
        if (c.startsWith('fa-')) {
            faName = c;
        } else if (c) {
            otherClasses.push(c);
        }
    }
    
    if (faName) {
        const lucideName = mapIconName(faName);
        const classStr = otherClasses.join(' ');
        const classProp = classStr ? ` class="${classStr}"` : '';
        return `<vw-icon name="${lucideName}" variant="none" size="none"${classProp} icon-size="16"></vw-icon>`;
    }
    
    return match;
}

function processHtmlFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    const originalContent = content;

    const scriptTag = '<!-- ViralWindow Unified Icon System -->\n    <script src="js/components/icon-box.js"></script>';
    if (!content.includes('js/components/icon-box.js')) {
        content = content.replace(/(<\/head>)/i, `${scriptTag}\n$1`);
    }

    // Double quotes
    const regexDouble = /<i\s+class="([^"]*fa-[^"]*)"[^>]*>.*?<\/i>/gi;
    content = content.replace(regexDouble, replacer);
    
    // Single quotes
    const regexSingle = /<i\s+class='([^']*fa-[^']*)'[^>]*>.*?<\/i>/gi;
    content = content.replace(regexSingle, replacer);

    if (content !== originalContent) {
        fs.writeFileSync(filepath, content, 'utf8');
        return true;
    }
    return false;
}

function walkDir(dir) {
    let modifiedCount = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            if (file === 'node_modules' || file.startsWith('.')) continue; // skip irrelevant dirs
            modifiedCount += walkDir(filepath);
        } else if (file.endsWith('.html')) {
            if (processHtmlFile(filepath)) {
                modifiedCount++;
                console.log(`Updated: ${file}`);
            }
        }
    }
    return modifiedCount;
}

const total = walkDir(DIR);
console.log(`Refactor complete! Modified ${total} files.`);
