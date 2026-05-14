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

// GET /admin/users/:id/edit - Show edit form
router.get(
  "/:id/edit",
  isAuthenticated,
  requirePermission("warga.update"),
  userController.showEditForm,
);

// POST /admin/users/:id/edit - Process update
router.post(
  "/:id/edit",
  isAuthenticated,
  requirePermission("warga.update"),
  userController.updateUser,
);

// POST /admin/users/:id/reset-password - Reset user password
router.post(
  "/:id/reset-password",
  isAuthenticated,
  requirePermission("warga.update"),
  userController.resetPassword,
);

module.exports = router;
