const express = require("express");
const router = express.Router();
const userLibraryCtrl = require("../controllers/userDoorLibraryController");
const { authenticateToken } = require("../middleware/auth");

// Tất cả routes cần authentication
router.use(authenticateToken);

router.get("/", userLibraryCtrl.getMyLibrary);
router.get("/:id", userLibraryCtrl.getById);
router.post("/", userLibraryCtrl.create);
router.put("/:id", userLibraryCtrl.update);
router.delete("/:id", userLibraryCtrl.delete);

module.exports = router;






