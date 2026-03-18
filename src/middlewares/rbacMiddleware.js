const logger = require("../utils/logger");

/**
 * Middleware factory to check if user has specific permission
 * @param {string} requiredPermission - Permission in format 'resource.action'
 * @returns {Function} Middleware function
 */
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    // First check if user is authenticated
    if (!req.session || !req.session.userId) {
      logger.error("Permission check failed: user not authenticated");
      return res.status(401).redirect("/login");
    }

    // Check if user has the required permission
    if (
      req.session.userPermissions &&
      req.session.userPermissions.includes(requiredPermission)
    ) {
      return next();
    }

    logger.warn("Permission denied", {
      userId: req.session.userId,
      requiredPermission,
      userPermissions: req.session.userPermissions || [],
      path: req.path,
    });

    res.status(403).render("errors/forbidden", {
      message: "You do not have permission to access this resource",
    });
  };
};

/**
 * Middleware to check if user has ANY of the provided permissions
 * @param {string[]} permissions - Array of permission names
 * @returns {Function} Middleware function
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      logger.error("Permission check failed: user not authenticated");
      return res.status(401).redirect("/login");
    }

    const hasPermission = permissions.some((perm) =>
      req.session.userPermissions?.includes(perm),
    );

    if (hasPermission) {
      return next();
    }

    logger.warn("Permission denied - none of required permissions found", {
      userId: req.session.userId,
      requiredPermissions: permissions,
      userPermissions: req.session.userPermissions || [],
    });

    res.status(403).render("errors/forbidden", {
      message: "You do not have permission to access this resource",
    });
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
};
