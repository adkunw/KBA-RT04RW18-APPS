const { z } = require("zod");
const logger = require("../utils/logger");
const documentService = require("../services/document.service");
const messageService = require("../services/message.service");

// Valid document types matching the enum
const DOCUMENT_TYPES = ["ktp", "kk", "surat_keterangan", "other"];

const uploadDocumentSchema = z.object({
  title: z.string().min(2, "Judul minimal 2 karakter").max(100),
  type: z.enum(["ktp", "kk", "surat_keterangan", "other"], {
    errorMap: () => ({ message: "Tipe dokumen tidak valid" }),
  }),
});

const reviewDocumentSchema = z.object({
  notes: z.string().max(500).optional(),
});

// ============================================================
// PORTAL — Warga area
// ============================================================

/**
 * GET /portal/documents — List own documents
 */
const getMyDocuments = async (req, res) => {
  try {
    const statusFilter = req.query.status || "approved"; // Default to approved
    const validStatuses = ["pending", "approved", "rejected", "all"];
    const filterStatus = validStatuses.includes(statusFilter) ? statusFilter : "approved";
    
    // Pass null if 'all' to get everything
    const queryStatus = filterStatus === "all" ? null : filterStatus;

    const [documents, unreadCount, stats] = await Promise.all([
      documentService.getDocumentsByUser(req.session.userId, queryStatus),
      messageService.getUnreadCount(req.session.userId),
      documentService.getDocumentStatsByUser(req.session.userId),
    ]);

    const hasAdminAccess =
      req.session.userPermissions?.includes("dashboard.view") || false;
    const canManageDocs =
      req.session.userPermissions?.includes("document.manage") || false;
    const flash = req.flash();

    res.render("portal/documents/index", {
      title: "Dokumen Saya",
      user: { id: req.session.userId, name: req.session.userName },
      documents,
      unreadCount,
      stats,
      filterStatus,
      hasAdminAccess,
      canManageDocs,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading documents", { error: error.message });
    req.flash("error", "Gagal memuat dokumen");
    res.redirect("/portal");
  }
};

/**
 * GET /portal/documents/upload — Upload form
 */
const getUploadForm = async (req, res) => {
  try {
    const hasAdminAccess =
      req.session.userPermissions?.includes("dashboard.view") || false;
    const flash = req.flash();

    res.render("portal/documents/upload", {
      title: "Upload Dokumen",
      user: { id: req.session.userId, name: req.session.userName },
      hasAdminAccess,
      documentTypes: DOCUMENT_TYPES,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading upload form", { error: error.message });
    req.flash("error", "Gagal memuat form upload");
    res.redirect("/portal/documents");
  }
};

/**
 * POST /portal/documents/upload — Process upload
 */
const postUploadDocument = async (req, res) => {
  try {
    // multer already placed the file in req.file
    if (!req.file) {
      req.flash("error", "File tidak ditemukan. Pilih file terlebih dahulu.");
      return res.redirect("/portal/documents/upload");
    }

    const validation = uploadDocumentSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash(
        "error",
        validation.error.errors.map((e) => e.message).join(", ")
      );
      return res.redirect("/portal/documents/upload");
    }

    const { title, type } = validation.data;

    // Store relative path from /public for serving
    const filePath = `/uploads/documents/${req.file.filename}`;

    await documentService.createDocument(req.session.userId, {
      title,
      type,
      fileName: req.file.originalname,
      filePath,
    });

    req.flash(
      "success",
      "Dokumen berhasil diupload dan sedang menunggu verifikasi."
    );
    res.redirect("/portal/documents");
  } catch (error) {
    logger.error("Error uploading document", { error: error.message });
    req.flash("error", "Gagal mengupload dokumen. Coba lagi.");
    res.redirect("/portal/documents/upload");
  }
};

/**
 * GET /portal/documents/:id — Detail own document
 */
const getMyDocumentDetail = async (req, res) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);

    // User can only view their own document
    if (!document || document.userId !== req.session.userId) {
      req.flash("error", "Dokumen tidak ditemukan");
      return res.redirect("/portal/documents");
    }

    const hasAdminAccess =
      req.session.userPermissions?.includes("dashboard.view") || false;
    const unreadCount = await messageService.getUnreadCount(req.session.userId);

    res.render("portal/documents/detail", {
      title: document.title,
      user: { id: req.session.userId, name: req.session.userName },
      document,
      hasAdminAccess,
      unreadCount,
      error: null,
      success: null,
    });
  } catch (error) {
    logger.error("Error loading document detail", { error: error.message });
    req.flash("error", "Gagal memuat detail dokumen");
    res.redirect("/portal/documents");
  }
};

// ============================================================
// ADMIN — document.manage area
// ============================================================

/**
 * GET /admin/documents — All documents (admin view)
 */
const adminGetAllDocuments = async (req, res) => {
  try {
    const statusFilter = req.query.status || null;
    const validStatuses = ["pending", "approved", "rejected"];
    const filterStatus = validStatuses.includes(statusFilter)
      ? statusFilter
      : null;

    const [documents, stats] = await Promise.all([
      documentService.getAllDocuments(filterStatus),
      documentService.getDocumentStats(),
    ]);

    const flash = req.flash();

    res.render("admin/documents/index", {
      title: "Manajemen Dokumen",
      user: { id: req.session.userId, name: req.session.userName },
      documents,
      stats,
      filterStatus,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading admin documents", { error: error.message });
    req.flash("error", "Gagal memuat data dokumen");
    res.redirect("/admin");
  }
};

/**
 * GET /admin/documents/:id — Admin detail view
 */
const adminGetDocumentDetail = async (req, res) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);

    if (!document) {
      req.flash("error", "Dokumen tidak ditemukan");
      return res.redirect("/admin/documents");
    }

    const flash = req.flash();

    res.render("admin/documents/detail", {
      title: `Review: ${document.title}`,
      user: { id: req.session.userId, name: req.session.userName },
      document,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading admin document detail", {
      error: error.message,
    });
    req.flash("error", "Gagal memuat detail dokumen");
    res.redirect("/admin/documents");
  }
};

/**
 * POST /admin/documents/:id/approve — Approve document
 */
const adminApproveDocument = async (req, res) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    if (!document) {
      req.flash("error", "Dokumen tidak ditemukan");
      return res.redirect("/admin/documents");
    }

    const validation = reviewDocumentSchema.safeParse(req.body);
    const notes = validation.success ? validation.data.notes || null : null;

    await documentService.approveDocument(
      req.params.id,
      req.session.userId,
      notes
    );

    req.flash("success", `Dokumen "${document.title}" berhasil disetujui`);
    res.redirect(`/admin/documents/${req.params.id}`);
  } catch (error) {
    logger.error("Error approving document", { error: error.message });
    req.flash("error", "Gagal menyetujui dokumen");
    res.redirect(`/admin/documents/${req.params.id}`);
  }
};

/**
 * POST /admin/documents/:id/reject — Reject document
 */
const adminRejectDocument = async (req, res) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    if (!document) {
      req.flash("error", "Dokumen tidak ditemukan");
      return res.redirect("/admin/documents");
    }

    const validation = reviewDocumentSchema.safeParse(req.body);
    const notes = validation.success ? validation.data.notes || null : null;

    await documentService.rejectDocument(
      req.params.id,
      req.session.userId,
      notes
    );

    req.flash("success", `Dokumen "${document.title}" telah ditolak`);
    res.redirect(`/admin/documents/${req.params.id}`);
  } catch (error) {
    logger.error("Error rejecting document", { error: error.message });
    req.flash("error", "Gagal menolak dokumen");
    res.redirect(`/admin/documents/${req.params.id}`);
  }
};

/**
 * POST /admin/documents/:id/delete — Delete document
 */
const adminDeleteDocument = async (req, res) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    if (!document) {
      req.flash("error", "Dokumen tidak ditemukan");
      return res.redirect("/admin/documents");
    }

    await documentService.deleteDocument(req.params.id);

    req.flash("success", `Dokumen "${document.title}" berhasil dihapus`);
    res.redirect("/admin/documents");
  } catch (error) {
    logger.error("Error deleting document", { error: error.message });
    req.flash("error", "Gagal menghapus dokumen");
    res.redirect("/admin/documents");
  }
};

module.exports = {
  getMyDocuments,
  getUploadForm,
  postUploadDocument,
  getMyDocumentDetail,
  adminGetAllDocuments,
  adminGetDocumentDetail,
  adminApproveDocument,
  adminRejectDocument,
  adminDeleteDocument,
};
