const express = require("express");
const userController = require("../controllers/user.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const router = express.Router();

/**
 * All user routes require authentication and warga.create permission
 */

// GET /admin/users - List users
router.get(
  "/",
  isAuthenticated,
  requirePermission("warga.read"),
  userController.listUsers,
);

// GET /admin/users/create - Show create form
router.get(
  "/create",
  isAuthenticated,
  requirePermission("warga.create"),
  userController.showCreateForm,
);

// POST /admin/users - Create user
router.post(
  "/",
  isAuthenticated,
  requirePermission("warga.create"),
  userController.createUser,
);

// GET /admin/users/:id - View user
router.get(
  "/:id",
  isAuthenticated,
  requirePermission("warga.read"),
  userController.viewUser,
);

module.exports = router;
