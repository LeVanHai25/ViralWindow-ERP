const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const inventoryCtrl = require("../controllers/inventoryController");
const inventoryExportCtrl = require("../controllers/inventoryExportController");
const otherCategoryCtrl = require("../controllers/otherItemCategoryController");
const { authenticateToken: auth } = require("../middleware/auth");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../FontEnd/uploads/inventory");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for inventory image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, "inventory-" + uniqueSuffix + ext);
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

// Excel export route - MUST be before /:id
router.get("/export-excel", auth, inventoryExportCtrl.exportInventory);

// Dashboard routes - chỉ xem, không CRUD
router.get("/stats", inventoryCtrl.getStatistics);
router.get("/aggregated", inventoryCtrl.getAggregatedItems);
router.get("/low-stock", inventoryCtrl.getLowStockItems);
router.get("/ai-restock-suggestion", auth, inventoryCtrl.getAIRestockSuggestion);
router.get("/alerts-summary", inventoryCtrl.getDashboardAlertsSummary);

// Other Item Category management - MUST be before any generic :id routes
router.get("/other-categories", auth, otherCategoryCtrl.getCategories);
router.post("/other-categories", auth, otherCategoryCtrl.createCategory);
router.put("/other-categories/:id", auth, otherCategoryCtrl.updateCategory);
router.delete("/other-categories/:id", auth, otherCategoryCtrl.deleteCategory);

// VRPK code generation - MUST be before /:id
router.get("/next-vrpk-code", inventoryCtrl.getNextVRPKCode);

// Legacy routes
router.get("/", inventoryCtrl.getAllItems);
router.get("/transactions", inventoryCtrl.getTransactions);
router.get("/scraps", inventoryCtrl.getScraps);

// Scraps routes - MUST be before /:id
router.post("/scraps", auth, inventoryCtrl.createScrap); // Create new scrap
router.put("/scraps/:id", auth, inventoryCtrl.updateScrap); // Update scrap
router.put("/scraps/:id/mark-used", inventoryCtrl.markScrapUsed);
router.delete("/scraps/:id", inventoryCtrl.deleteScrap);
router.post("/scraps/:id/issue", auth, inventoryCtrl.issueScrap); // Phase 3: Issue scrap to project

// Smart source slip selection - Get export slips that contain a specific aluminum
router.get("/scraps/export-slips/:aluminum_system_id", auth, inventoryCtrl.getExportSlipsForAluminum);

// Delete all inventory data (use with caution!)
router.delete("/delete-all", inventoryCtrl.deleteAllInventory);

// CRUD routes - /:id routes MUST be at the END (with image upload support)
router.post("/", upload.single("image"), inventoryCtrl.create);
router.get("/:id", inventoryCtrl.getById);
router.put("/:id", upload.single("image"), inventoryCtrl.update);
router.delete("/:id", inventoryCtrl.delete);

// Separate image upload endpoint
router.post("/:id/upload-image", upload.single("image"), inventoryCtrl.uploadImage);

module.exports = router;
