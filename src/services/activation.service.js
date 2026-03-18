const crypto = require("crypto");
const prisma = require("../config/database");
const logger = require("../utils/logger");

/**
 * Generate secure activation token
 * @returns {string} Random token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Create activation token for user
 * @param {string} userId - User ID
 * @param {number} expiryHours - Token expiry in hours (default 24)
 * @returns {Promise<Object>} Token record
 */
const createActivationToken = async (userId, expiryHours = 24) => {
  const token = generateToken();
  const expiredAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  const activationToken = await prisma.activationToken.create({
    data: {
      userId,
      token,
      expiredAt,
    },
  });

  logger.info("Activation token created", {
    userId,
    tokenId: activationToken.id,
    expiresIn: expiryHours + " hours",
  });

  return activationToken;
};

/**
 * Validate activation token
 * @param {string} token - Token to validate
 * @returns {Promise<Object|null>} Token record if valid, null otherwise
 */
const validateToken = async (token) => {
  const activationToken = await prisma.activationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  // Token not found
  if (!activationToken) {
    logger.warn("Activation token not found", {
      token: token.substring(0, 8) + "...",
    });
    return null;
  }

  // Token already used
  if (activationToken.usedAt) {
    logger.warn("Activation token already used", {
      tokenId: activationToken.id,
    });
    return null;
  }

  // Token expired
  if (new Date() > new Date(activationToken.expiredAt)) {
    logger.warn("Activation token expired", { tokenId: activationToken.id });
    return null;
  }

  return activationToken;
};

/**
 * Activate user account
 * @param {string} token - Activation token
 * @param {string} password - New password (plain text)
 * @returns {Promise<Object>} Activated user
 */
const activateUser = async (token, password) => {
  const bcrypt = require("bcrypt");

  // Validate token
  const activationToken = await validateToken(token);
  if (!activationToken) {
    throw new Error("Invalid or expired activation token");
  }

  // Get user
  const user = activationToken.user;

  // User must be in 'created' state
  if (user.status !== "created") {
    logger.warn("Attempted to activate non-created user", {
      userId: user.id,
      currentStatus: user.status,
    });
    throw new Error("User is already activated or invalid state");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update user and mark token as used in transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    // Update user
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        status: "active",
        updatedAt: new Date(),
      },
    });

    // Mark token as used
    await tx.activationToken.update({
      where: { id: activationToken.id },
      data: { usedAt: new Date() },
    });

    return updated;
  });

  logger.info("User account activated", {
    userId: user.id,
    phone: user.phone,
  });

  return updatedUser;
};

/**
 * Resend activation token (invalidate old, create new)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} New token record
 */
const resendActivationToken = async (userId) => {
  // User must exist and be in 'created' state
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== "created") {
    throw new Error("User is already activated");
  }

  // Invalidate old unused tokens
  await prisma.activationToken.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  // Create new token
  return createActivationToken(userId);
};

module.exports = {
  generateToken,
  createActivationToken,
  validateToken,
  activateUser,
  resendActivationToken,
};
