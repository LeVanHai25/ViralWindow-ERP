const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const doorTemplateCtrl = require("../controllers/doorTemplateController");

// ============================================
// MULTER CONFIGURATION FOR DOOR IMAGES
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/doors');
        // Create directory if not exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'door-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép upload file ảnh (jpg, png, gif, webp)'));
        }
    }
});

// ============================================
// ROUTES - DOOR CATALOG API
// ============================================

// Lấy danh sách hệ nhôm có sẵn
router.get("/systems", doorTemplateCtrl.getAvailableSystems);

// Lấy danh sách templates (Door Catalog)
router.get("/", doorTemplateCtrl.getAllTemplates);

// Lấy template theo ID
router.get("/:id", doorTemplateCtrl.getById);

// Preview BOM cho template
router.get("/:id/bom-preview", doorTemplateCtrl.getBomPreview);

// Thêm template mới
router.post("/", doorTemplateCtrl.create);

// Import templates từ JSON
router.post("/import", doorTemplateCtrl.importTemplates);

// Upload ảnh cho template
router.post("/:id/image", upload.single('image'), doorTemplateCtrl.uploadImage);

// Cập nhật template
router.put("/:id", doorTemplateCtrl.update);

// Xóa template (soft delete)
router.delete("/:id", doorTemplateCtrl.delete);

// ============================================
// FULL TEMPLATE ROUTES (merged from door-templates-full.js)
// ============================================
let doorTemplateFullCtrl;
try {
    doorTemplateFullCtrl = require('../controllers/doorTemplateFullController');
    
    // Tạo template hoàn chỉnh
    router.post('/full', doorTemplateFullCtrl.createFullTemplate);
    
    // Lấy template hoàn chỉnh
    router.get('/full/:id', doorTemplateFullCtrl.getFullTemplate);
    
    // Cập nhật template hoàn chỉnh
    router.put('/full/:id', doorTemplateFullCtrl.updateFullTemplate);
    
    // Import template từ JSON
    router.post('/full/import', doorTemplateFullCtrl.importFullTemplate);
} catch (err) {
    console.log('⚠️ doorTemplateFullController not available, /full routes disabled');
}

module.exports = router;







