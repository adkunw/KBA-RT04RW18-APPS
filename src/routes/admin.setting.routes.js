const express = require("express");
const settingController = require("../controllers/admin.setting.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const router = express.Router();

router.use(isAuthenticated);
router.use(requirePermission("setting.manage"));

router.get("/", settingController.getSettings);
router.post("/", settingController.postUpdateSettings);

module.exports = router;
