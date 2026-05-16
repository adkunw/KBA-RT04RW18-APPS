const express = require("express");
const documentController = require("../controllers/document.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const router = express.Router();

// ============================================================
// ADMIN — document.manage required for all routes
// ============================================================

// GET /admin/documents — All documents
router.get(
  "/",
  isAuthenticated,
  requirePermission("document.manage"),
  documentController.adminGetAllDocuments
);

// GET /admin/documents/:id — Document detail
router.get(
  "/:id",
  isAuthenticated,
  requirePermission("document.manage"),
  documentController.adminGetDocumentDetail
);

// POST /admin/documents/:id/approve — Approve
router.post(
  "/:id/approve",
  isAuthenticated,
  requirePermission("document.manage"),
  documentController.adminApproveDocument
);

// POST /admin/documents/:id/reject — Reject
router.post(
  "/:id/reject",
  isAuthenticated,
  requirePermission("document.manage"),
  documentController.adminRejectDocument
);

// POST /admin/documents/:id/delete — Delete
router.post(
  "/:id/delete",
  isAuthenticated,
  requirePermission("document.manage"),
  documentController.adminDeleteDocument
);

module.exports = router;
