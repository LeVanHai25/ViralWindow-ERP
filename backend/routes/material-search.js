/**
 * =====================================================
 * MATERIAL SEARCH ROUTES
 * API tìm kiếm vật tư thống nhất cho autocomplete
 * =====================================================
 */

const express = require("express");
const router = express.Router();
const materialSearchCtrl = require("../controllers/materialSearchController");

// GET /api/materials/search - Tìm kiếm vật tư
// Query: type (nhom|kinh|phukien|vattu|all), q (keyword), limit
router.get("/search", materialSearchCtrl.searchMaterials);

// GET /api/materials/:source/:id - Lấy chi tiết vật tư
// source: inventory|aluminum_systems|aluminum_profiles|glass_items|accessories
router.get("/:source/:id", materialSearchCtrl.getMaterialDetail);

module.exports = router;
