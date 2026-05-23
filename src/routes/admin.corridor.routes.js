const express = require("express");
const corridorController = require("../controllers/corridor.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const router = express.Router();

router.use(isAuthenticated);

// All corridor routes require role.manage for now (or a specific corridor.manage if we created one)
// We will use role.manage as it's an admin feature for master data.
router.use(requirePermission("role.manage"));

router.get("/", corridorController.listCorridors);
router.get("/create", corridorController.renderCreateCorridor);
router.post("/create", corridorController.createCorridor);
router.get("/:id/edit", corridorController.renderEditCorridor);
router.post("/:id/edit", corridorController.updateCorridor);
router.post("/:id/delete", corridorController.deleteCorridor);

module.exports = router;
