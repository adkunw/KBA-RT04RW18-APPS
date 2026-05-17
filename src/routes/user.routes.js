const express = require("express");
const userController = require("../controllers/user.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// GET /admin/users/import/template - Download CSV Template
router.get(
  "/import/template",
  isAuthenticated,
  requirePermission("warga.create"),
  userController.downloadImportTemplate,
);

// POST /admin/users/import/upload - Upload and parse CSV
router.post(
  "/import/upload",
  isAuthenticated,
  requirePermission("warga.create"),
  upload.single("csvFile"),
  userController.uploadAndReviewImport,
);

// GET /admin/users/import/review - Review data before final import
router.get(
  "/import/review",
  isAuthenticated,
  requirePermission("warga.create"),
  userController.showImportReview,
);

// POST /admin/users/import/process - Process bulk import
router.post(
  "/import/process",
  isAuthenticated,
  requirePermission("warga.create"),
  userController.processImport,
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
