const express = require("express");
const router = express.Router();
const financeController = require("../controllers/finance.controller");
const upload = require("../config/upload");
const { isAuthenticated } = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(isAuthenticated);

router.get("/", financeController.getMyFinance);
router.get("/pay", financeController.getPaymentForm);
router.post(
  "/pay",
  upload.single("proofFile"),
  financeController.postPayment
);
router.get("/pay-multi", financeController.getMultiPaymentForm);
router.post(
  "/pay-multi",
  upload.single("proofFile"),
  financeController.postMultiPayment
);
router.get("/:id", financeController.getMyPaymentDetail);

module.exports = router;
