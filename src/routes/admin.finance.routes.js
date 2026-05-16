const express = require("express");
const router = express.Router();
const financeController = require("../controllers/finance.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

// All admin finance routes require auth and finance.manage permission
router.use(isAuthenticated);
router.use(requirePermission("finance.manage"));

router.get("/", financeController.adminGetFinanceDashboard);
router.post("/periods", financeController.adminCreatePeriod);
router.post("/periods/:id/toggle", financeController.adminTogglePeriod);
router.get("/period/:id", financeController.adminGetPeriodDetail);

router.get("/payment/:id", financeController.adminGetPaymentDetail);
router.post("/payment/:id/approve", financeController.adminApprovePayment);
router.post("/payment/:id/reject", financeController.adminRejectPayment);

module.exports = router;
