const express = require("express");
const homeController = require("../controllers/homeController");
const portalController = require("../controllers/portal.controller");
const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const userRoutes = require("./user.routes");
const roleRoutes = require("./role.routes");
const messageRoutes = require("./message.routes");
const documentRoutes = require("./document.routes");
const adminDocumentRoutes = require("./admin.document.routes");
const activationRoutes = require("./activation.routes");
const financeRoutes = require("./finance.routes");
const adminFinanceRoutes = require("./admin.finance.routes");
const adminSettingRoutes = require("./admin.setting.routes");
const portalRoutes = require("./portal.routes");
const reportRoutes = require("./report.routes");
const { isAuthenticated } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", homeController.getLanding);
router.get("/portal", isAuthenticated, portalController.getPortal);

// Auth routes (mounted at /auth)
router.use("/auth", authRoutes);

// Activation routes (mounted at /activate)
router.use("/activate", activationRoutes);

// Admin routes
router.use("/admin", adminRoutes);
router.use("/admin/users", userRoutes);
router.use("/admin/roles", roleRoutes);
router.use("/admin/messages", messageRoutes);
router.use("/admin/documents", adminDocumentRoutes);
router.use("/admin/finance", adminFinanceRoutes);
router.use("/admin/settings", adminSettingRoutes);

// Portal routes
router.use("/portal", portalRoutes);
router.use("/portal/documents", documentRoutes);
router.use("/portal/finance", financeRoutes);
router.use("/portal/reports", reportRoutes);

module.exports = router;
