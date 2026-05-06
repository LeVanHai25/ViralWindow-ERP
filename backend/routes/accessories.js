const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const accessoriesCtrl = require("../controllers/accessoriesController");
const categoryCtrl = require("../controllers/accessoryCategoryController");
const { authenticateToken } = require("../middleware/auth");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../FontEnd/uploads/accessories");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for accessory image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, "accessory-" + uniqueSuffix + ext);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)"));
    },
});

// CRUD routes - ✅ PROTECTED with authentication
router.get("/", authenticateToken, accessoriesCtrl.getAllAccessories);
router.get("/stats", authenticateToken, accessoriesCtrl.getStatistics);
router.get("/categories", authenticateToken, categoryCtrl.getCategories);
router.post("/categories", authenticateToken, categoryCtrl.createCategory);
router.put("/categories/:id", authenticateToken, categoryCtrl.updateCategory);
router.delete("/categories/:id", authenticateToken, categoryCtrl.deleteCategory);
router.get("/:id", authenticateToken, accessoriesCtrl.getById);
router.post("/", authenticateToken, upload.single("image"), accessoriesCtrl.create);
router.put("/:id", authenticateToken, upload.single("image"), accessoriesCtrl.update);
router.delete("/:id", authenticateToken, accessoriesCtrl.delete);

// Separate image upload endpoint
router.post("/:id/upload-image", upload.single("image"), accessoriesCtrl.uploadImage);

module.exports = router;
