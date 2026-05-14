const express = require("express");
const homeController = require("../controllers/homeController");
const portalController = require("../controllers/portal.controller");
const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const userRoutes = require("./user.routes");
const roleRoutes = require("./role.routes");
const messageRoutes = require("./message.routes");
const portalRoutes = require("./portal.routes");
const activationRoutes = require("./activation.routes");
const { isAuthenticated } = require("../middlewares/authMiddleware");

const router = express.Router();

// Home routes
router.get("/", homeController.getLanding);
router.get("/portal", isAuthenticated, portalController.getPortal);

// Auth routes (mounted at /auth)
router.use("/auth", authRoutes);

// Activation routes (mounted at /activate)
router.use("/activate", activationRoutes);

// Admin routes (mounted at /admin)
router.use("/admin", adminRoutes);

// User routes (mounted at /admin/users)
router.use("/admin/users", userRoutes);

// Role & Permission routes (mounted at /admin/roles)
router.use("/admin/roles", roleRoutes);

// Message routes (mounted at /admin/messages)
router.use("/admin/messages", messageRoutes);

// Portal sub-routes (inbox, etc.)
router.use("/portal", portalRoutes);

module.exports = router;

