const logger = require("../utils/logger");

/**
 * GET / - Landing page
 */
const getLanding = (req, res) => {
  res.render("index", {
    title: "RT Management System",
    user: req.session?.userId
      ? { id: req.session.userId, name: req.session.userName }
      : null,
  });
};

/**
 * GET /portal - User portal (authenticated only)
 */
const getPortal = (req, res) => {
  res.render("portal/index", {
    title: "Portal",
    user: {
      id: req.session.userId,
      name: req.session.userName,
    },
  });
};

module.exports = {
  getLanding,
  getPortal,
};
