const express = require("express");
const adminController = require("../controllers/adminController");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const router = express.Router();

/**
 * Admin routes - all require authentication and dashboard.view permission
 */

// GET /admin - Admin dashboard (placeholder for now)
router.get(
  "/",
  isAuthenticated,
  requirePermission("dashboard.view"),
  adminController.getDashboard,
);

module.exports = router;
