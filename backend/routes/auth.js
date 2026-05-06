const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);
router.post("/forgot-password", authCtrl.forgotPassword);
router.post("/verify-reset-code", authCtrl.verifyResetCode);
router.post("/reset-password", authCtrl.resetPassword);
router.get("/me", authenticateToken, authCtrl.getMe);
router.put("/update-profile", authenticateToken, authCtrl.updateProfile);
router.post("/logout", authenticateToken, authCtrl.logout);

module.exports = router;

