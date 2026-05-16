const express = require("express");
const reportController = require("../controllers/report.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const upload = require("../config/upload");

const router = express.Router();

// GET /portal/reports — List all reports
router.get("/", isAuthenticated, reportController.getReports);

// GET /portal/reports/create — Create report form
router.get("/create", isAuthenticated, reportController.getCreateForm);

// POST /portal/reports/create — Process create
router.post(
  "/create",
  isAuthenticated,
  upload.single("reportMedia"),
  reportController.postCreateReport
);

// GET /portal/reports/:id — View report detail
router.get("/:id", isAuthenticated, reportController.getReportDetail);

// POST /portal/reports/:id/reply — Post reply
router.post(
  "/:id/reply",
  isAuthenticated,
  upload.single("replyMedia"),
  reportController.postCreateReply
);

// POST /portal/reports/:id/status — Update status (admin/ketua_rt)
router.post("/:id/status", isAuthenticated, reportController.postUpdateStatus);

// POST /portal/reports/:id/delete — Delete report (owner or admin/ketua_rt)
router.post("/:id/delete", isAuthenticated, reportController.postDeleteReport);

module.exports = router;
