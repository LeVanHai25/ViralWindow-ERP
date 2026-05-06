const db = require("../config/db");
const bomEngineV3 = require("./bomEngineV3");

function layoutPanelTree(node, width, height) {
    if (!node || typeof node !== 'object') return null;

    const cloned = { ...node };
    cloned.width = width;
    cloned.height = height;

    const children = Array.isArray(cloned.children) ? cloned.children : null;
    if (!children || children.length === 0) {
        if (!cloned.type) cloned.type = 'leaf';
        return cloned;
    }

    if (!cloned.type) cloned.type = 'split';

    const direction = cloned.direction || cloned.splitDirection || 'vertical';
    // Normalize split direction fields so bomEngineV3 can calculate mullions consistently
    if (!cloned.splitDirection) cloned.splitDirection = direction;
    if (!cloned.split) cloned.split = direction;
    const ratios = Array.isArray(cloned.ratio) && cloned.ratio.length === children.length
        ? cloned.ratio
        : new Array(children.length).fill(1);

    const sum = ratios.reduce((s, r) => s + (Number(r) || 0), 0) || children.length;

    cloned.children = children.map((child, idx) => {
        const r = Number(ratios[idx]) || 0;
        if (direction === 'horizontal') {
            const childH = height * (r / sum);
            return layoutPanelTree(child, width, childH);
        }
        const childW = width * (r / sum);
        return layoutPanelTree(child, childW, height);
    });

    return cloned;
}

async function resolveAluminumSystemId(systemCodeOrId) {
    if (!systemCodeOrId) return null;
    if (typeof systemCodeOrId === 'number') return systemCodeOrId;

    const systemCode = String(systemCodeOrId).trim();
    if (!systemCode) return null;

    const [rows] = await db.query(
        "SELECT id FROM aluminum_systems WHERE code = ? AND is_active = 1 LIMIT 1",
        [systemCode]
    );

    return rows.length > 0 ? rows[0].id : null;
}

function groupDoorBomItems(rawItems) {
    const result = {
        profiles: new Map(),
        glass: new Map(),
        accessories: new Map()
    };

    for (const it of rawItems || []) {
        if (!it) continue;
        const t = it.item_type;

        if (t === 'profile') {
            const code = it.item_code;
            const name = it.description;
            const qty = Number(it.qty) || 0;
            const lengthMm = Number(it.length_mm) || 0;
            const key = `${code}__${lengthMm}`;

            if (!result.profiles.has(key)) {
                result.profiles.set(key, {
                    code,
                    name,
                    qty: 0,
                    length_mm: lengthMm,
                    total_length_m: 0
                });
            }
            const row = result.profiles.get(key);
            row.qty += qty;
            row.total_length_m += (qty * lengthMm) / 1000;
            continue;
        }

        if (t === 'glass') {
            const code = it.item_code;
            const name = it.description;
            const qty = Number(it.qty) || 0;
            const w = Number(it.width_mm) || 0;
            const h = Number(it.height_mm) || 0;
            const areaM2 = ((w / 1000) * (h / 1000)) * qty;
            const key = `${code}__${w}x${h}`;

            if (!result.glass.has(key)) {
                result.glass.set(key, {
                    code,
                    name,
                    qty: 0,
                    width_mm: w,
                    height_mm: h,
                    area_m2: 0
                });
            }
            const row = result.glass.get(key);
            row.qty += qty;
            row.area_m2 += areaM2;
            continue;
        }

        if (t === 'accessory' || t === 'gasket') {
            const code = it.item_code;
            const name = it.description;
            const qty = Number(it.qty) || 0;

            if (!result.accessories.has(code)) {
                result.accessories.set(code, {
                    code,
                    name,
                    qty: 0,
                    unit: t === 'gasket' ? 'm' : (it.unit || 'bộ')
                });
            }
            const row = result.accessories.get(code);
            row.qty += qty;
            continue;
        }
    }

    return {
        profiles: Array.from(result.profiles.values()).map(p => ({
            ...p,
            total_length_m: Math.round(p.total_length_m * 1000) / 1000
        })),
        glass: Array.from(result.glass.values()).map(g => ({
            ...g,
            area_m2: Math.round(g.area_m2 * 1000) / 1000
        })),
        accessories: Array.from(result.accessories.values())
    };
}

async function generateDoorBomFromTemplate({
    templateJson,
    structureJson,
    widthMm,
    heightMm,
    aluminumSystemIdOrCode
}) {
    const width = Number(widthMm) || 0;
    const height = Number(heightMm) || 0;

    if (width <= 0 || height <= 0) {
        return { profiles: [], glass: [], accessories: [] };
    }

    const systemId = await resolveAluminumSystemId(aluminumSystemIdOrCode);
    if (!systemId) {
        return { profiles: [], glass: [], accessories: [] };
    }

    const panelTree = templateJson?.panel_tree || structureJson || null;
    const rootPanel = layoutPanelTree(panelTree, width, height);

    const rawItems = await bomEngineV3.generateBOMFromPanelTree(
        null,
        { width, height, rootPanel },
        systemId
    );

    return groupDoorBomItems(rawItems);
}

module.exports = {
    generateDoorBomFromTemplate
};
