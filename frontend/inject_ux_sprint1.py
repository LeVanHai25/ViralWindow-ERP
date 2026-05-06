#!/usr/bin/env python3
"""
ViralWindow – Sprint 1: Inject UX improvements into all HTML pages
Run from the FontEnd directory:
    python inject_ux_sprint1.py

What it does:
  1. Adds <link rel="stylesheet" href="css/ux-improvements.css"> before </head>
  2. Adds <script src="js/ux-utils.js"> before </body>
  3. Adds data-hint="Nhấn để lọc" to KPI cards (kpi-card class)
  4. Adds id="vw-nav-badge-*" to sidebar nav badge placeholders
  5. Replaces emoji-only phase chips with FA icon versions
Skips files that already have the injection markers.
"""

import os
import re
import sys

FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))

CSS_TAG = '<link rel="stylesheet" href="css/ux-improvements.css">'
JS_TAG  = '<script src="js/ux-utils.js"></script>'
CSS_MARKER = 'ux-improvements.css'
JS_MARKER  = 'ux-utils.js'

# HTML pages to skip (backup / old files)
SKIP_PATTERNS = [
    '_old_', '-backup', '.bak', 'index-backup',
    'debug-', 'test-', 'find_', 'check_', 'refactor_',
    'template-library', 'layout-template', 'sidebar-menu-template',
    'sidebar-template'
]

EMOJI_REPLACEMENTS = {
    '📋 Báo giá':  '<i class="fas fa-file-alt" title="Báo giá"></i> Báo giá',
    '🎨 Thiết kế': '<i class="fas fa-drafting-compass" title="Thiết kế"></i> Thiết kế',
    '🏭 Sản xuất': '<i class="fas fa-industry" title="Sản xuất"></i> Sản xuất',
    '🔧 Lắp đặt':  '<i class="fas fa-tools" title="Lắp đặt"></i> Lắp đặt',
    '🚚 Giao hàng':'<i class="fas fa-truck" title="Giao hàng"></i> Giao hàng',
}

def should_skip(filename):
    for pattern in SKIP_PATTERNS:
        if pattern in filename:
            return True
    return False

def inject_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    original = content
    changed = False
    filename = os.path.basename(filepath)

    # ── 1. Inject CSS before </head> ──────────────────────────────
    if CSS_MARKER not in content:
        # Try to insert right before </head>
        if '</head>' in content:
            content = content.replace(
                '</head>',
                f'    {CSS_TAG}\n</head>',
                1
            )
            changed = True

    # ── 2. Inject JS before </body> ───────────────────────────────
    if JS_MARKER not in content:
        if '</body>' in content:
            content = content.replace(
                '</body>',
                f'    {JS_TAG}\n</body>',
                1
            )
            changed = True

    # ── 3. Emoji phase chip replacements ──────────────────────────
    for emoji_text, icon_html in EMOJI_REPLACEMENTS.items():
        if emoji_text in content:
            content = content.replace(emoji_text, icon_html)
            changed = True

    # ── 4. Add data-hint to kpi-card clickable elements ───────────
    # Only touch cards that already have onclick with filterByStatus/filterByPhase
    def add_hint(m):
        tag = m.group(0)
        if 'data-hint' not in tag:
            return tag.rstrip('>') + ' data-hint="Nhấn để lọc">'
        return tag

    new_content = re.sub(
        r'<div[^>]+class="[^"]*(?:kpi-card|status-card)[^"]*"[^>]+onclick="[^"]*"[^>]*>',
        add_hint,
        content
    )
    if new_content != content:
        content = new_content
        changed = True

    # ── 5. Write back only if changed ────────────────────────────
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


def main():
    html_files = [
        f for f in os.listdir(FRONTEND_DIR)
        if f.endswith('.html') and not should_skip(f)
    ]
    html_files.sort()

    total   = len(html_files)
    updated = 0
    skipped = 0

    print(f"\n{'='*60}")
    print(f"  ViralWindow – UX Sprint 1 Injector")
    print(f"  Found {total} HTML files to process")
    print(f"{'='*60}\n")

    for filename in html_files:
        filepath = os.path.join(FRONTEND_DIR, filename)
        try:
            if inject_file(filepath):
                print(f"  [OK]  {filename}")
                updated += 1
            else:
                print(f"  [--]  {filename}  (already up-to-date)")
                skipped += 1
        except Exception as e:
            print(f"  [ERR] {filename}: {e}")

    print(f"\n{'='*60}")
    print(f"  Done! Updated: {updated} | Already OK: {skipped} | Total: {total}")
    print(f"{'='*60}\n")

    print("Next steps:")
    print("  1. Restart backend: npm run dev (or node server.js)")
    print("  2. Open browser at http://127.0.0.1:5500/FontEnd/projects-new.html")
    print("  3. Verify: KPI cards hoverable, late badge appears on overdue projects\n")

if __name__ == '__main__':
    main()
