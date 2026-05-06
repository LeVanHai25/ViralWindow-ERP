const db = require("../config/db");

/**
 * Tính toán kích thước cắt nhôm cho cửa
 */
exports.calculateAluminumCutting = async (req, res) => {
    try {
        const { doorId } = req.params;
        const { projectId } = req.params;

        // Get door info
        const [doorRows] = await db.query(`
            SELECT dd.*, dt.structure_json, a.cutting_formula, a.weight_per_meter
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.id = ? AND dd.project_id = ?
        `, [doorId, projectId]);

        if (doorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = doorRows[0];
        const width = door.width_mm || 0;
        const height = door.height_mm || 0;
        
        // Parse structure
        let structure = null;
        if (door.structure_json) {
            structure = typeof door.structure_json === 'string' 
                ? JSON.parse(door.structure_json) 
                : door.structure_json;
        }

        // Parse cutting formula (e.g., "W - 50", "H - 30")
        const cuttingFormula = door.cutting_formula || "W - 50, H - 30";
        const wMatch = cuttingFormula.match(/W\s*-\s*(\d+)/i);
        const hMatch = cuttingFormula.match(/H\s*-\s*(\d+)/i);
        const deductionW = wMatch ? parseInt(wMatch[1]) : 50;
        const deductionH = hMatch ? parseInt(hMatch[1]) : 30;

        // Calculate aluminum bars
        const aluminumBars = [];
        
        // Frame bars
        aluminumBars.push({
            name: "Thanh ngang trên",
            position: "Ngang trên",
            symbol: "N1",
            cut_angle: 0,
            quantity: 1,
            size_mm: width - deductionW * 2,
            weight_kg: ((width - deductionW * 2) / 1000) * (door.weight_per_meter || 1.2)
        });
        
        aluminumBars.push({
            name: "Thanh ngang dưới",
            position: "Ngang dưới",
            symbol: "N2",
            cut_angle: 0,
            quantity: 1,
            size_mm: width - deductionW * 2,
            weight_kg: ((width - deductionW * 2) / 1000) * (door.weight_per_meter || 1.2)
        });
        
        aluminumBars.push({
            name: "Thanh dọc trái",
            position: "Dọc trái",
            symbol: "D1",
            cut_angle: 90,
            quantity: 1,
            size_mm: height - deductionH * 2,
            weight_kg: ((height - deductionH * 2) / 1000) * (door.weight_per_meter || 1.5)
        });
        
        aluminumBars.push({
            name: "Thanh dọc phải",
            position: "Dọc phải",
            symbol: "D2",
            cut_angle: 90,
            quantity: 1,
            size_mm: height - deductionH * 2,
            weight_kg: ((height - deductionH * 2) / 1000) * (door.weight_per_meter || 1.5)
        });

        // Calculate mullions if structure has cells
        if (structure && structure.cells) {
            const rows = structure.rows || 1;
            const cols = structure.cols || 1;
            
            // Vertical mullions
            if (cols > 1) {
                for (let i = 1; i < cols; i++) {
                    aluminumBars.push({
                        name: `Thanh đố dọc ${i}`,
                        position: "Đố dọc",
                        symbol: `ĐD${i}`,
                        cut_angle: 90,
                        quantity: 1,
                        size_mm: height - deductionH * 2,
                        weight_kg: ((height - deductionH * 2) / 1000) * (door.weight_per_meter || 1.5)
                    });
                }
            }
            
            // Horizontal mullions
            if (rows > 1) {
                for (let i = 1; i < rows; i++) {
                    aluminumBars.push({
                        name: `Thanh đố ngang ${i}`,
                        position: "Đố ngang",
                        symbol: `ĐN${i}`,
                        cut_angle: 0,
                        quantity: 1,
                        size_mm: width - deductionW * 2,
                        weight_kg: ((width - deductionW * 2) / 1000) * (door.weight_per_meter || 1.2)
                    });
                }
            }
        }

        res.json({
            success: true,
            data: aluminumBars
        });
    } catch (err) {
        console.error('Error calculating aluminum cutting:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

/**
 * Tính toán kích thước kính cho cửa
 */
exports.calculateGlassDimensions = async (req, res) => {
    try {
        const { doorId } = req.params;
        const { projectId } = req.params;

        // Get door info
        const [doorRows] = await db.query(`
            SELECT dd.*, dt.structure_json
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            WHERE dd.id = ? AND dd.project_id = ?
        `, [doorId, projectId]);

        if (doorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = doorRows[0];
        const width = door.width_mm || 0;
        const height = door.height_mm || 0;
        
        // Parse structure
        let structure = null;
        if (door.structure_json) {
            structure = typeof door.structure_json === 'string' 
                ? JSON.parse(door.structure_json) 
                : door.structure_json;
        }

        // Glass deduction (default)
        const glassDeductionW = 40;
        const glassDeductionH = 40;

        const glassPanels = [];
        
        if (structure && structure.cells) {
            const rows = structure.rows || 1;
            const cols = structure.cols || 1;
            const cellWidth = (width - 100) / cols; // 100mm for frame
            const cellHeight = (height - 60) / rows; // 60mm for frame
            
            structure.cells.forEach((cell, index) => {
                const glassW = Math.max(0, cellWidth - glassDeductionW);
                const glassH = Math.max(0, cellHeight - glassDeductionH);
                const area = (glassW * glassH) / 1000000; // m²
                
                glassPanels.push({
                    name: "12", // Glass type
                    width_mm: Math.round(glassW),
                    height_mm: Math.round(glassH),
                    quantity: 1,
                    area_m2: parseFloat(area.toFixed(6)),
                    position: cell.label || `K${index + 1}`
                });
            });
        } else {
            // Single panel
            const glassW = Math.max(0, width - glassDeductionW * 2);
            const glassH = Math.max(0, height - glassDeductionH * 2);
            const area = (glassW * glassH) / 1000000;
            
            glassPanels.push({
                name: "12",
                width_mm: Math.round(glassW),
                height_mm: Math.round(glassH),
                quantity: 1,
                area_m2: parseFloat(area.toFixed(6)),
                position: "Cánh"
            });
        }

        res.json({
            success: true,
            data: glassPanels
        });
    } catch (err) {
        console.error('Error calculating glass dimensions:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

/**
 * Lấy danh sách phụ kiện cho cửa
 */
exports.getDoorAccessories = async (req, res) => {
    try {
        const { doorId } = req.params;
        const { projectId } = req.params;

        // Get door info
        const [doorRows] = await db.query(`
            SELECT dd.*, dt.family, a.brand
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.id = ? AND dd.project_id = ?
        `, [doorId, projectId]);

        if (doorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = doorRows[0];
        const doorType = door.door_type || 'swing';
        const brand = door.brand || 'ViralWindow';

        // Get accessories based on door type and brand
        const [accessories] = await db.query(`
            SELECT * FROM accessories 
            WHERE is_active = 1 
            AND (category LIKE ? OR category = ?)
            ORDER BY category, code
        `, [`%${doorType}%`, 'general']);

        // Default accessories for swing door
        const defaultAccessories = [
            { name: "Bản lề sàn", code: "CL-BLS", unit: "Bộ", quantity: door.number_of_panels || 1, price: 0, calculate_to_m2: false },
            { name: "Kẹp kính trên", code: "CL-KKT", unit: "Chiếc", quantity: door.number_of_panels || 1, price: 0, calculate_to_m2: false },
            { name: "Kẹp kính dưới", code: "CL-KKD", unit: "Chiếc", quantity: door.number_of_panels || 1, price: 0, calculate_to_m2: false },
            { name: "Ngõng liên kết", code: "CL-NLK", unit: "Chiếc", quantity: door.number_of_panels || 1, price: 0, calculate_to_m2: false },
            { name: "Khóa sàn", code: "CL-KS", unit: "Chiếc", quantity: door.number_of_panels || 1, price: 0, calculate_to_m2: false },
            { name: "Tay nắm", code: "CL-TN", unit: "Vòng", quantity: door.number_of_panels || 1, price: 0, calculate_to_m2: false }
        ];

        // Map database accessories to default format
        const mappedAccessories = defaultAccessories.map(def => {
            const dbAcc = accessories.find(a => a.code === def.code);
            return {
                name: def.name,
                code: def.code,
                unit: def.unit,
                quantity: def.quantity,
                price: dbAcc ? (dbAcc.sale_price || 0) : 0,
                calculate_to_m2: def.calculate_to_m2,
                accessory_id: dbAcc ? dbAcc.id : null
            };
        });

        res.json({
            success: true,
            data: mappedAccessories
        });
    } catch (err) {
        console.error('Error getting door accessories:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

/**
 * Lấy danh sách gioăng và keo cho cửa
 */
exports.getDoorGaskets = async (req, res) => {
    try {
        const { doorId } = req.params;
        const { projectId } = req.params;

        // Get door info
        const [doorRows] = await db.query(`
            SELECT dd.*
            FROM door_designs dd
            WHERE dd.id = ? AND dd.project_id = ?
        `, [doorId, projectId]);

        if (doorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = doorRows[0];
        const width = door.width_mm || 0;
        const height = door.height_mm || 0;
        const perimeter = (width + height) * 2 / 1000; // meters

        // Calculate gaskets and glue
        const gaskets = [
            {
                name: "Gioăng kính mặt trong",
                code: "GKMT",
                unit: "m dài",
                quantity: parseFloat((perimeter * 1.0).toFixed(3)),
                price: 0
            },
            {
                name: "Keo kính mặt ngoài",
                code: "KKMN",
                unit: "m dài",
                quantity: parseFloat((perimeter * 1.0).toFixed(3)),
                price: 0
            },
            {
                name: "Keo tường - 2 mặt",
                code: "KT2M",
                unit: "m dài",
                quantity: parseFloat((perimeter * 2.0).toFixed(1)),
                price: 0
            },
            {
                name: "Vít nở lắp đặt",
                code: "VNLD",
                unit: "Chiếc",
                quantity: Math.ceil(perimeter * 0.5), // 0.5 screws per meter
                price: 0
            }
        ];

        res.json({
            success: true,
            data: gaskets
        });
    } catch (err) {
        console.error('Error getting door gaskets:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

/**
 * Tính toán giá thành cho cửa
 */
exports.calculateDoorPrice = async (req, res) => {
    try {
        const { doorId } = req.params;
        const { projectId } = req.params;

        // Get door info
        const [doorRows] = await db.query(`
            SELECT dd.*, a.weight_per_meter
            FROM door_designs dd
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.id = ? AND dd.project_id = ?
        `, [doorId, projectId]);

        if (doorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = doorRows[0];
        const width = door.width_mm || 0;
        const height = door.height_mm || 0;
        const area = (width * height) / 1000000; // m²

        // Get prices from project settings or defaults
        const [projectRows] = await db.query(`
            SELECT * FROM projects WHERE id = ?
        `, [projectId]);
        
        const project = projectRows[0];
        
        // Default prices
        const aluminumPricePerKg = 0; // Will be set from project settings
        const glassPricePerM2 = 245000;
        const accessoriesPrice = 0;
        const gasketsPrice = 0;
        const auxiliaryMaterialsPrice = 0;
        const productionInstallationPrice = 0;

        // Calculate aluminum weight
        const perimeter = (width + height) * 2 / 1000; // meters
        const aluminumWeight = perimeter * (door.weight_per_meter || 1.2); // kg
        const aluminumPrice = aluminumWeight * aluminumPricePerKg;

        // Calculate glass price
        const glassArea = area * 0.9; // 90% of door area is glass
        const glassPrice = glassArea * glassPricePerM2;

        // Total
        const total = aluminumPrice + glassPrice + accessoriesPrice + gasketsPrice + 
                     auxiliaryMaterialsPrice + productionInstallationPrice;
        const unitPrice = area > 0 ? total / area : 0;

        const priceBreakdown = {
            aluminum: {
                unit: "Kg",
                quantity: parseFloat(aluminumWeight.toFixed(2)),
                unit_price: aluminumPricePerKg,
                amount: aluminumPrice
            },
            glass: {
                unit: "m²",
                quantity: parseFloat(glassArea.toFixed(4)),
                unit_price: glassPricePerM2,
                amount: glassPrice
            },
            accessories: {
                amount: accessoriesPrice
            },
            glue: {
                amount: 0
            },
            gaskets: {
                amount: gasketsPrice
            },
            auxiliary_materials: {
                amount: auxiliaryMaterialsPrice
            },
            production_installation: {
                amount: productionInstallationPrice
            },
            total: total,
            total_selling: total,
            unit_price_per_m2: unitPrice
        };

        res.json({
            success: true,
            data: priceBreakdown
        });
    } catch (err) {
        console.error('Error calculating door price:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};




