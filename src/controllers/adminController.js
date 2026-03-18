const logger = require("../utils/logger");
const { requirePermission } = require("../middlewares/rbacMiddleware");

/**
 * GET /admin - Admin dashboard
 */
const getDashboard = (req, res) => {
  logger.info("Admin dashboard accessed", {
    userId: req.session.userId,
    roles: req.session.userRoles,
  });

  res.render("admin/dashboard", {
    title: "Admin Dashboard",
    user: {
      id: req.session.userId,
      name: req.session.userName,
      roles: req.session.userRoles,
    },
  });
};

module.exports = {
  getDashboard,
};
