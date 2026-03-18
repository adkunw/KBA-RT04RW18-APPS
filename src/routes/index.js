const express = require("express");
const homeController = require("../controllers/homeController");
const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const userRoutes = require("./user.routes");
const activationRoutes = require("./activation.routes");
const { isAuthenticated } = require("../middlewares/authMiddleware");

const router = express.Router();

// Home routes
router.get("/", homeController.getLanding);
router.get("/portal", isAuthenticated, homeController.getPortal);

// Auth routes (mounted at /auth)
router.use("/auth", authRoutes);

// Activation routes (mounted at /activate)
router.use("/activate", activationRoutes);

// Admin routes (mounted at /admin)
router.use("/admin", adminRoutes);

// User routes (mounted at /admin/users)
router.use("/admin/users", userRoutes);

module.exports = router;
