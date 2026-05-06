import os
import re
import sys

DIR = r"d:\ViralWindow_Phan_Mem_Nhom_Kinh\FontEnd"

# Mappings for FontAwesome to Lucide
ICON_MAP = {
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
}

def map_icon_name(fa_name):
    # remove 'fa-' prefix if present
    name = fa_name.replace('fa-', '')
    return ICON_MAP.get(name, name) # Default to the same name if mapping not found, Lucide has many similar ones

def replacer(match):
    full_tag = match.group(0)
    class_attr = match.group(1)
    
    # Extract all class names
    classes = class_attr.split()
    
    fa_name = None
    other_classes = []
    
    for c in classes:
        if c in ['fa-solid', 'fa-regular', 'fa-light', 'fa-thin', 'fa-brands', 'fas', 'far', 'fal', 'fab']:
            continue
        if c.startswith('fa-'):
            fa_name = c
        else:
            other_classes.append(c)
            
    if fa_name:
        lucide_name = map_icon_name(fa_name)
        class_str = ' '.join(other_classes)
        class_prop = f' class="{class_str}"' if class_str else ''
        
        # Use size=none variant=none to match inline FontAwesome behavior perfectly
        return f'<vw-icon name="{lucide_name}" variant="none" size="none"{class_prop} icon-size="16"></vw-icon>'
    
    return full_tag # fallback

def process_html_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Inject script if not present
    script_tag = '<!-- ViralWindow Unified Icon System -->\n    <script src="js/components/icon-box.js"></script>'
    if 'js/components/icon-box.js' not in content:
        # insert right before </head>
        content = re.sub(r'(</head>)', f'{script_tag}\n\\1', content, flags=re.IGNORECASE)

    # 2. Replace <i class="fa... "></i>
    content = re.sub(r'<i\s+class="([^"]*fa-[^"]*)"[^>]*>.*?</i>', replacer, content, flags=re.IGNORECASE)
    
    # 3. Handle <i class='...'></i> (single quotes)
    content = re.sub(r"<i\s+class='([^']*fa-[^']*)'[^>]*>.*?</i>", replacer, content, flags=re.IGNORECASE)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    modified_count = 0
    for root, dirs, files in os.walk(DIR):
        for file in files:
            if file.endswith('.html'):
                filepath = os.path.join(root, file)
                if process_html_file(filepath):
                    modified_count += 1
                    print(f"Updated: {os.path.basename(filepath)}")
    
    print(f"Refactor complete! Modified {modified_count} files.")

if __name__ == '__main__':
    main()
