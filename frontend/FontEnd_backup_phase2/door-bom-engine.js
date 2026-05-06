// ============================================
// DOOR BOM ENGINE - Tính BOM từ LayoutNode
// ============================================

// Cấu hình hệ nhôm
const SYSTEM_XINGFA_55 = {
    frameWidth: 70,      // bề rộng khung (mm)
    frameThickness: 1.4, // độ dày nhôm
    sashWidth: 60,       // bề rộng cánh
    mullionWidth: 45,    // bề rộng đố
    glassClearance: 8,   // hở kính so với cánh mỗi bên
};

const SYSTEM_PMI = {
    frameWidth: 75,
    frameThickness: 1.4,
    sashWidth: 65,
    mullionWidth: 50,
    glassClearance: 10,
};

class DoorBomEngine {
    constructor(systemConfig) {
        this.sys = systemConfig || SYSTEM_XINGFA_55;
    }

    /**
     * @param {DoorDesign} door
     * @param {number} widthMm
     * @param {number} heightMm
     * @returns {BomItem[]}
     */
    computeBom(door, widthMm, heightMm) {
        const items = [];

        // 1. Khung bao
        const f = this.sys.frameWidth;
        // 2 đứng
        items.push({
            code: "KHUNG_DUNG",
            name: "Khung bao đứng",
            type: "profile",
            qty: 2,
            length: heightMm
        });
        // 2 ngang
        items.push({
            code: "KHUNG_NGANG",
            name: "Khung bao ngang",
            type: "profile",
            qty: 2,
            length: widthMm - 2 * f
        });

        // 2. Đệ quy layout để tính cánh + đố + kính
        const innerX = 0;
        const innerY = 0;
        const innerW = widthMm - 2 * f;
        const innerH = heightMm - 2 * f;

        this._walkLayout(
            door.layout,
            innerX,
            innerY,
            innerW,
            innerH,
            items
        );

        return this._mergeSameItems(items);
    }

    _walkLayout(node, x, y, w, h, items) {
        const s = this.sys;

        if (node.kind === "panel") {
            // cánh hoặc fix
            if (node.role === "sash") {
                // 2 đứng cánh
                items.push({
                    code: "CANH_DUNG",
                    name: "Cánh đứng",
                    type: "profile",
                    qty: 2,
                    length: h
                });
                // 2 ngang cánh
                items.push({
                    code: "CANH_NGANG",
                    name: "Cánh ngang",
                    type: "profile",
                    qty: 2,
                    length: w - 2 * s.sashWidth
                });
            }

            // kính
            const glassW = w - 2 * (s.sashWidth + s.glassClearance);
            const glassH = h - 2 * (s.sashWidth + s.glassClearance);
            items.push({
                code: "Kinh_8ly",
                name: "Kính 8mm",
                type: "glass",
                qty: 1,
                width: glassW,
                height: glassH
            });

            return;
        }

        // group
        if (node.split === "vertical") {
            const totalRatio = node.children.reduce((sum, c) => sum + (c.widthRatio || 1), 0);
            let curX = x;

            node.children.forEach((child, idx) => {
                const r = child.widthRatio || 1;
                const cw = (r / totalRatio) * w;

                this._walkLayout(child, curX, y, cw, h, items);

                // giữa child và child+1 là 1 đố dọc
                if (idx < node.children.length - 1) {
                    items.push({
                        code: "DO_DUNG",
                        name: "Đố đứng",
                        type: "profile",
                        qty: 1,
                        length: h
                    });
                }

                curX += cw;
            });
        } else if (node.split === "horizontal") {
            const totalRatio = node.children.reduce((sum, c) => sum + (c.heightRatio || 1), 0);
            let curY = y;

            node.children.forEach((child, idx) => {
                const r = child.heightRatio || 1;
                const ch = (r / totalRatio) * h;

                this._walkLayout(child, x, curY, w, ch, items);

                // giữa là đố ngang
                if (idx < node.children.length - 1) {
                    items.push({
                        code: "DO_NGANG",
                        name: "Đố ngang",
                        type: "profile",
                        qty: 1,
                        length: w
                    });
                }

                curY += ch;
            });
        }
    }

    _mergeSameItems(items) {
        const map = new Map();
        for (const it of items) {
            const key = [it.code, it.length || "-", it.width || "-", it.height || "-"].join("|");
            if (!map.has(key)) {
                map.set(key, { ...it });
            } else {
                map.get(key).qty += it.qty;
            }
        }
        return Array.from(map.values());
    }
}

// Export để sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DoorBomEngine, SYSTEM_XINGFA_55, SYSTEM_PMI };
}

























