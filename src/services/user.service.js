const prisma = require("../config/database");
const logger = require("../utils/logger");
const activationService = require("./activation.service");

/**
 * Create new user with role
 * @param {Object} userData - User data {name, phone}
 * @param {string} roleId - Role ID to assign
 * @returns {Promise<Object>} Created user with role
 */
const createUser = async (userData, roleId) => {
  const { name, phone } = userData;

  // Validate inputs
  if (!name || !phone || !roleId) {
    throw new Error("Name, phone, and role ID are required");
  }

  // Check if phone already exists
  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    throw new Error("Phone number already exists");
  }

  // Create user with status 'created' and no password
  const user = await prisma.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        name,
        phone,
        status: "created",
        password: null,
      },
    });

    // Assign role
    await tx.userRole.create({
      data: {
        userId: newUser.id,
        roleId,
      },
    });

    return newUser;
  });

  // Generate activation token
  const activationToken = await activationService.createActivationToken(
    user.id,
  );

  logger.info("User created", {
    userId: user.id,
    phone: user.phone,
    roleId,
    tokenId: activationToken.id,
  });

  return {
    user,
    activationToken,
  };
};

/**
 * Get user by ID with roles and permissions
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User with roles and permissions
 */
const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return user;
};

/**
 * Get user by phone
 * @param {string} phone - User phone
 * @returns {Promise<Object>} User object
 */
const getUserByPhone = async (phone) => {
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  return user;
};

/**
 * List all users with pagination
 * @param {number} skip - Skip records
 * @param {number} take - Take records
 * @returns {Promise<Array>} Users array
 */
const listUsers = async (skip = 0, take = 10) => {
  const users = await prisma.user.findMany({
    skip,
    take,
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users;
};

/**
 * Count total users
 * @returns {Promise<number>} Total user count
 */
const countUsers = async () => {
  const count = await prisma.user.count();
  return count;
};

/**
 * Update user details
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user
 */
const updateUser = async (userId, updateData) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  logger.info("User updated", { userId, updates: Object.keys(updateData) });

  return user;
};

/**
 * Assign role to user
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} UserRole record
 */
const assignRole = async (userId, roleId) => {
  // Check if user already has this role
  const existingRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });

  if (existingRole) {
    throw new Error("User already has this role");
  }

  const userRole = await prisma.userRole.create({
    data: {
      userId,
      roleId,
    },
  });

  logger.info("Role assigned to user", { userId, roleId });

  return userRole;
};

/**
 * Remove role from user
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 * @returns {Promise<void>}
 */
const removeRole = async (userId, roleId) => {
  await prisma.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });

  logger.info("Role removed from user", { userId, roleId });
};

module.exports = {
  createUser,
  getUserById,
  getUserByPhone,
  listUsers,
  countUsers,
  updateUser,
  assignRole,
  removeRole,
};
