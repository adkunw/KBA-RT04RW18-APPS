const { z } = require("zod");
const logger = require("../utils/logger");
const roleService = require("../services/role.service");

// Validation schema
const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(50, "Role name too long")
    .regex(
      /^[a-z0-9_]+$/,
      "Role name must be lowercase letters, numbers, or underscores only"
    ),
});

/**
 * GET /admin/roles - List all roles
 */
const listRoles = async (req, res) => {
  try {
    const roles = await roleService.listRoles();
    const messages = req.flash();

    res.render("admin/roles/index", {
      title: "Role Management",
      roles,
      user: { id: req.session.userId, name: req.session.userName },
      error: messages.error?.[0] || null,
      success: messages.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error listing roles", { error: error.message, stack: error.stack });
    req.flash("error", "Failed to load roles");
    res.redirect("/admin");
  }
};

/**
 * GET /admin/roles/create - Show create role form
 */
const showCreateForm = (req, res) => {
  const messages = req.flash();
  res.render("admin/roles/create", {
    title: "Create Role",
    user: { id: req.session.userId, name: req.session.userName },
    error: messages.error?.[0] || null,
  });
};

/**
 * POST /admin/roles - Create new role
 */
const createRole = async (req, res) => {
  try {
    const validation = createRoleSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash(
        "error",
        validation.error.errors.map((e) => e.message).join(", ")
      );
      return res.redirect("/admin/roles/create");
    }

    const { name } = validation.data;
    await roleService.createRole(name);

    logger.info("Role created", { roleName: name, adminId: req.session.userId });
    req.flash("success", `Role "${name}" created successfully`);
    res.redirect("/admin/roles");
  } catch (error) {
    logger.error("Error creating role", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Failed to create role");
    res.redirect("/admin/roles/create");
  }
};

/**
 * GET /admin/roles/:id - View role detail
 */
const viewRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await roleService.getRoleById(id);

    if (!role) {
      req.flash("error", "Role not found");
      return res.redirect("/admin/roles");
    }

    const allPermissions = await roleService.listPermissions();
    const assignedPermissionIds = role.permissions.map(
      (rp) => rp.permissionId
    );
    const unassignedPermissions = allPermissions.filter(
      (p) => !assignedPermissionIds.includes(p.id)
    );

    const messages = req.flash();

    res.render("admin/roles/view", {
      title: `Role: ${role.name}`,
      role,
      unassignedPermissions,
      isSuperAdmin: role.name === "super_admin",
      user: { id: req.session.userId, name: req.session.userName },
      error: messages.error?.[0] || null,
      success: messages.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error viewing role", { error: error.message, stack: error.stack });
    req.flash("error", "Failed to load role");
    res.redirect("/admin/roles");
  }
};

/**
 * POST /admin/roles/:id/delete - Delete a role
 */
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    await roleService.deleteRole(id);

    req.flash("success", "Role deleted successfully");
    res.redirect("/admin/roles");
  } catch (error) {
    logger.warn("Error deleting role", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Failed to delete role");
    res.redirect("/admin/roles");
  }
};

/**
 * POST /admin/roles/:id/permissions/assign - Assign permission to role
 */
const assignPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      req.flash("error", "No permission selected");
      return res.redirect(`/admin/roles/${id}`);
    }

    await roleService.assignPermission(id, permissionId);
    req.flash("success", "Permission assigned successfully");
    res.redirect(`/admin/roles/${id}`);
  } catch (error) {
    logger.error("Error assigning permission", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Failed to assign permission");
    res.redirect(`/admin/roles/${req.params.id}`);
  }
};

/**
 * POST /admin/roles/:id/permissions/revoke - Revoke permission from role
 */
const revokePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionId } = req.body;

    await roleService.revokePermission(id, permissionId);
    req.flash("success", "Permission revoked successfully");
    res.redirect(`/admin/roles/${id}`);
  } catch (error) {
    logger.warn("Error revoking permission", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Failed to revoke permission");
    res.redirect(`/admin/roles/${req.params.id}`);
  }
};

module.exports = {
  listRoles,
  showCreateForm,
  createRole,
  viewRole,
  deleteRole,
  assignPermission,
  revokePermission,
};
