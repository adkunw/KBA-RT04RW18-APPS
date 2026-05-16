const express = require("express");
const documentController = require("../controllers/document.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/rbacMiddleware");
const upload = require("../config/upload");

const router = express.Router();

// ============================================================
// PORTAL — Warga: access own documents
// ============================================================

// GET /portal/documents — List my documents
router.get("/", isAuthenticated, documentController.getMyDocuments);

// GET /portal/documents/upload — Upload form (before /:id to avoid conflict)
router.get("/upload", isAuthenticated, documentController.getUploadForm);

// POST /portal/documents/upload — Process upload
router.post(
  "/upload",
  isAuthenticated,
  upload.single("documentFile"),
  documentController.postUploadDocument
);

// GET /portal/documents/:id — View own document detail
router.get("/:id", isAuthenticated, documentController.getMyDocumentDetail);

module.exports = router;
