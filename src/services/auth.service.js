const bcrypt = require("bcrypt");
const prisma = require("../config/database");
const logger = require("../utils/logger");

/**
 * Validate and authenticate user credentials
 * @param {string} phone - User phone number
 * @param {string} password - User password (plain text)
 * @returns {Promise<Object>} User object with roles and permissions, or null if invalid
 */
const authenticateUser = async (phone, password) => {
  // Find user with roles and permissions
  const user = await prisma.user.findUnique({
    where: { phone },
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

  // User not found
  if (!user) {
    logger.warn("Authentication failed: user not found", { phone });
    return null;
  }

  // User not active
  if (user.status !== "active") {
    logger.warn("Authentication failed: user not active", {
      userId: user.id,
      status: user.status,
    });
    return null;
  }

  // Validate password
  const validPassword = await bcrypt.compare(password, user.password || "");
  if (!validPassword) {
    logger.warn("Authentication failed: invalid password", { userId: user.id });
    return null;
  }

  // Extract permissions from roles
  const permissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.name),
  );

  // Return user data with credentials
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    language: user.language || "id",
    roles: user.roles.map((ur) => ur.role.name),
    permissions: [...new Set(permissions)], // Remove duplicates
    corridorId: user.corridorId,
  };
};

/**
 * Create user session after successful authentication
 * @param {Object} req - Express request object
 * @param {Object} userData - User data from authenticateUser
 */
const createSession = (req, userData) => {
  req.session.userId = userData.id;
  req.session.userName = userData.name;
  req.session.userPhone = userData.phone;
  req.session.userLanguage = userData.language;
  req.session.userRoles = userData.roles;
  req.session.userPermissions = userData.permissions;
  req.session.userCorridorId = userData.corridorId;
};

/**
 * Update user last login timestamp
 * @param {string} userId - User ID
 */
const updateLastLogin = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLogin: new Date() },
  });
};

/**
 * Determine redirect URL after login
 * @returns {string} Redirect URL
 */
const getRedirectUrl = (roles) => {
  // Always redirect to portal first for all roles
  return "/portal";
};

/**
 * Handle user logout - destroy session
 * @param {Object} req - Express request object
 * @returns {Promise<boolean>} Success status
 */
const destroySession = (req) => {
  return new Promise((resolve) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error("Session destruction error", { error: err.message });
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

module.exports = {
  authenticateUser,
  createSession,
  updateLastLogin,
  getRedirectUrl,
  destroySession,
};
