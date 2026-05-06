const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const aluminumCtrl = require("../controllers/aluminumController");

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save to FontEnd/uploads where server.js serves static files from
        const uploadDir = path.join(__dirname, '../../FontEnd/uploads/aluminum-systems');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'aluminum-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit (tăng từ 2MB)
    },
    fileFilter: function (req, file, cb) {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh (PNG, JPG, JPEG)'));
        }
    }
});

// GET all aluminum systems
router.get("/", aluminumCtrl.getAllSystems);

// GET by ID
router.get("/:id", aluminumCtrl.getById);

// GET by ID with details (profiles, colors, formulas)
router.get("/:id/details", aluminumCtrl.getByIdWithDetails);

// POST create new (with optional image upload)
router.post("/", upload.single('image'), aluminumCtrl.create);

// PUT update (with optional image upload)
router.put("/:id", upload.single('image'), aluminumCtrl.update);

// DELETE
router.delete("/:id", aluminumCtrl.delete);

module.exports = router;






