const express = require("express");
const router = express.Router();
const productionManagementCtrl = require("../controllers/productionManagementController");

// Lấy danh sách dự án đang sản xuất với thông tin sản phẩm và vật tư
router.get("/projects", productionManagementCtrl.getProductionProjects);

// Cập nhật trạng thái hoàn thành của sản phẩm
router.put("/projects/:projectId/products/:productId/completion", productionManagementCtrl.updateProductCompletion);

// Lấy chi tiết sản phẩm với trạng thái vật tư
router.get("/projects/:projectId/products/:productId/detail", productionManagementCtrl.getProductDetail);

// Chuyển dự án sang giai đoạn tiếp theo
router.post("/projects/:projectId/move-to-next-stage", productionManagementCtrl.moveToNextStage);

// Lấy danh sách vật tư theo loại (từ inventory)
router.get("/materials/:type", productionManagementCtrl.getMaterialsByType);

// Thêm vật tư vào sản phẩm (INSERT vào product_materials - đã sửa)
router.post("/projects/:projectId/products/:productId/materials", productionManagementCtrl.addProductMaterial);

// Xóa vật tư khỏi BOM (cũ)
router.delete("/materials/:bomItemId", productionManagementCtrl.removeMaterialFromProduct);

// ==================== PRODUCT MATERIALS APIs (MỚI) ====================

// Lấy danh sách vật tư có sẵn từ BOM để chọn
router.get("/projects/:projectId/available-materials", productionManagementCtrl.getAvailableMaterials);

// Thêm vật tư vào sản phẩm (lưu vào product_materials)
router.post("/projects/:projectId/products/:productId/product-materials", productionManagementCtrl.addProductMaterial);

// Cập nhật vật tư của sản phẩm
router.put("/product-materials/:materialId", productionManagementCtrl.updateProductMaterial);

// Xóa vật tư khỏi sản phẩm
router.delete("/product-materials/:materialId", productionManagementCtrl.removeProductMaterial);

module.exports = router;



