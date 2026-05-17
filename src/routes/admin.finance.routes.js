const express = require("express");
const router = express.Router();
const financeController = require("../controllers/finance.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const upload = require("../config/upload");

// All admin finance routes require auth and finance.manage permission
router.use(isAuthenticated);
router.use(requirePermission("finance.manage"));

router.get("/", financeController.adminGetFinanceDashboard);
router.get("/export", financeController.adminExportFinanceReport);
router.post("/periods", financeController.adminCreatePeriod);
router.post("/periods/:id/toggle", financeController.adminTogglePeriod);
router.post("/expenses", upload.single("proofFile"), financeController.adminCreateExpense);
router.post("/incomes", upload.single("proofFile"), financeController.adminCreateIncome);
router.get("/period/:id", financeController.adminGetPeriodDetail);
router.post("/period/:periodId/mark-paid/:userId", financeController.adminMarkPaid);

router.get("/payment/:id", financeController.adminGetPaymentDetail);
router.post("/payment/:id/approve", financeController.adminApprovePayment);
router.post("/payment/:id/reject", financeController.adminRejectPayment);

module.exports = router;
