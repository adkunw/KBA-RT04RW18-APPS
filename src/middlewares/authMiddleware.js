const logger = require("../utils/logger");

/**
 * Middleware to check if user is authenticated
 * Checks if user session exists
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  logger.warn("Unauthorized access attempt to protected route", {
    userId: req.session?.userId || null,
    userName: req.session?.userName || null,
    userPhone: req.session?.userPhone || null,
    userRoles: req.session?.userRoles || null,
    ip: req.ip,
    path: req.path,
  });
  res.redirect("/auth/login");
};

/**
 * Middleware to check if user is NOT authenticated
 * Redirects to portal if already logged in
 */
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/portal");
  }
  next();
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
};
