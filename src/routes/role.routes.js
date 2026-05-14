const express = require("express");
const roleController = require("../controllers/role.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const router = express.Router();

// All role routes require authentication + role.manage permission
const guard = [isAuthenticated, requirePermission("role.manage")];

// GET  /admin/roles           - List all roles
router.get("/", ...guard, roleController.listRoles);

// GET  /admin/roles/create    - Show create form
router.get("/create", ...guard, roleController.showCreateForm);

// POST /admin/roles           - Submit new role
router.post("/", ...guard, roleController.createRole);

// GET  /admin/roles/:id       - View role detail
router.get("/:id", ...guard, roleController.viewRole);

// POST /admin/roles/:id/delete           - Delete role
router.post("/:id/delete", ...guard, roleController.deleteRole);

// POST /admin/roles/:id/permissions/assign  - Assign permission
router.post(
  "/:id/permissions/assign",
  ...guard,
  roleController.assignPermission
);

// POST /admin/roles/:id/permissions/revoke  - Revoke permission
router.post(
  "/:id/permissions/revoke",
  ...guard,
  roleController.revokePermission
);

module.exports = router;
