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
    ip: req.ip,
    path: req.path,
  });
  res.redirect("/login");
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
