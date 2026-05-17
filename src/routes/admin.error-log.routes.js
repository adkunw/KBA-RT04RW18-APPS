const express = require("express");
const adminErrorLogController = require("../controllers/admin.error-log.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const router = express.Router();

/**
 * Route protection: all routes require being authenticated and having 'error_log.read' permission
 */
router.get(
  "/",
  isAuthenticated,
  requirePermission("error_log.read"),
  adminErrorLogController.getErrorLogsPage
);

router.post(
  "/clear",
  isAuthenticated,
  requirePermission("error_log.read"),
  adminErrorLogController.clearErrorLogs
);

module.exports = router;
