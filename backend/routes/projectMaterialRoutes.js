const express = require('express');
const router = express.Router();
const projectMaterialController = require('../controllers/projectMaterialController');

// GET danh sách dự án để xuất vật tư
router.get('/projects/bom-extraction', projectMaterialController.getProjectsForExport);

// GET vật tư kho theo loại
router.get('/inventory/:type', projectMaterialController.getInventoryByType);

// POST xác nhận xuất vật tư và chuyển trạng thái dự án
router.post('/confirm-export/:projectId', projectMaterialController.confirmExport);

// GET kiểm tra điều kiện xuất vật tư (phải đặt trước route /:projectId)
router.get('/check-export-requirement/:projectId', (req, res, next) => {
    console.log('✅ Route check-export-requirement được gọi với projectId:', req.params.projectId);
    next();
}, projectMaterialController.checkExportRequirement);

// GET danh sách vật tư đã xuất (phải đặt trước route /:projectId)
router.get('/exported', projectMaterialController.getExportedMaterials);

// GET vật tư của dự án
router.get('/:projectId', projectMaterialController.getByProject);

// POST/GET Bóc tách BOM data (Nhôm, Kính, Vật tư Phụ)
router.post('/:projectId/bom-data', projectMaterialController.saveBOMData);
router.get('/:projectId/bom-data', projectMaterialController.getBOMData);

// POST thêm vật tư vào dự án
router.post('/', projectMaterialController.create);

// PUT cập nhật vật tư
router.put('/:id', projectMaterialController.update);

// DELETE xóa vật tư
router.delete('/:id', projectMaterialController.delete);

module.exports = router;
