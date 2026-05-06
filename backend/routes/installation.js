const express = require("express");
const router = express.Router();
const installationCtrl = require("../controllers/installationController");

// Lấy danh sách dự án ở giai đoạn lắp đặt
router.get("/projects", installationCtrl.getInstallationProjects);

// Cập nhật bước lắp đặt cho DỰ ÁN (Project-level)
// Body: { step: 'started'|'in_progress'|'completed', installation_date, installer_name, notes, photos }
router.put("/projects/:projectId/step", installationCtrl.updateInstallationStep);

// Chuyển dự án sang giai đoạn Bàn giao
router.post("/projects/:projectId/move-to-handover", installationCtrl.moveToHandover);

// Legacy route - deprecated (kept for backwards compatibility)
router.put("/projects/:projectId/products/:productId/progress", installationCtrl.updateInstallationProgress);

module.exports = router;
