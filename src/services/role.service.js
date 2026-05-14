const prisma = require("../config/database");
const logger = require("../utils/logger");

/**
 * Get all roles with permission count and user count
 */
const listRoles = async () => {
  return await prisma.role.findMany({
    include: {
      _count: {
        select: {
          users: true,
          permissions: true,
        },
      },
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
};

/**
 * Get a single role by ID with full permissions and users
 */
const getRoleById = async (roleId) => {
  return await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      users: {
        include: {
          user: {
            select: { id: true, name: true, phone: true, status: true },
          },
        },
      },
    },
  });
};

/**
 * Create a new role
 * @param {string} name - Role name (must be unique)
 */
const createRole = async (name) => {
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`Role "${name}" already exists`);
  }

  return await prisma.role.create({ data: { name } });
};

/**
 * Delete a role by ID
 * GUARD: cannot delete super_admin
 */
const deleteRole = async (roleId) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");
  if (role.name === "super_admin") {
    throw new Error("Cannot delete the super_admin role");
  }

  await prisma.role.delete({ where: { id: roleId } });
  logger.info("Role deleted", { roleId, roleName: role.name });
};

/**
 * Assign a permission to a role
 * GUARD: prevents duplicate assignment
 */
const assignPermission = async (roleId, permissionId) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");

  const permission = await prisma.permission.findUnique({
    where: { id: permissionId },
  });
  if (!permission) throw new Error("Permission not found");

  const existing = await prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  });
  if (existing) throw new Error("Permission already assigned to this role");

  await prisma.rolePermission.create({ data: { roleId, permissionId } });
  logger.info("Permission assigned to role", {
    roleId,
    roleName: role.name,
    permissionId,
    permissionName: permission.name,
  });
};

/**
 * Revoke a permission from a role
 * GUARD: super_admin must keep at least one permission
 */
const revokePermission = async (roleId, permissionId) => {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });
  if (!role) throw new Error("Role not found");

  if (role.name === "super_admin" && role.permissions.length <= 1) {
    throw new Error("super_admin must retain at least one permission");
  }

  await prisma.rolePermission.delete({
    where: { roleId_permissionId: { roleId, permissionId } },
  });

  logger.info("Permission revoked from role", { roleId, permissionId });
};

/**
 * Get all available permissions
 */
const listPermissions = async () => {
  return await prisma.permission.findMany({ orderBy: { name: "asc" } });
};

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  deleteRole,
  assignPermission,
  revokePermission,
  listPermissions,
};
