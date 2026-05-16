const { z } = require("zod");
const logger = require("../utils/logger");
const reportService = require("../services/report.service");
const messageService = require("../services/message.service");

const createReportSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(100),
  content: z.string().min(10, "Isi laporan minimal 10 karakter"),
});

const createReplySchema = z.object({
  content: z.string().min(1, "Balasan tidak boleh kosong"),
});

const updateStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

const getReports = async (req, res) => {
  try {
    const statusFilter = req.query.status || null;
    const reports = await reportService.getAllReports(statusFilter);
    const stats = await reportService.getReportStats();
    const unreadCount = await messageService.getUnreadCount(req.session.userId);

    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const canManageReport = req.session.userPermissions?.includes("report.manage") || false;
    const flash = req.flash();

    res.render("portal/reports/index", {
      title: "Lapor RT (Forum Warga)",
      user: { id: req.session.userId, name: req.session.userName },
      reports,
      stats,
      filterStatus: statusFilter || "all",
      hasAdminAccess,
      canManageReport,
      unreadCount,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading reports", { error: error.message });
    req.flash("error", "Gagal memuat daftar laporan");
    res.redirect("/portal");
  }
};

const getCreateForm = async (req, res) => {
  try {
    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const unreadCount = await messageService.getUnreadCount(req.session.userId);
    const flash = req.flash();

    res.render("portal/reports/create", {
      title: "Buat Laporan Baru",
      user: { id: req.session.userId, name: req.session.userName },
      hasAdminAccess,
      unreadCount,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading create report form", { error: error.message });
    req.flash("error", "Gagal memuat form");
    res.redirect("/portal/reports");
  }
};

const postCreateReport = async (req, res) => {
  try {
    const validation = createReportSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", validation.error.errors.map((e) => e.message).join(", "));
      return res.redirect("/portal/reports/create");
    }

    const { title, content } = validation.data;
    let mediaPath = null;
    
    if (req.file) {
      mediaPath = `/uploads/reports/${req.file.filename}`;
    }

    await reportService.createReport(req.session.userId, {
      title,
      content,
      mediaPath,
    });

    req.flash("success", "Laporan berhasil dibuat");
    res.redirect("/portal/reports");
  } catch (error) {
    logger.error("Error creating report", { error: error.message });
    req.flash("error", "Gagal membuat laporan");
    res.redirect("/portal/reports/create");
  }
};

const getReportDetail = async (req, res) => {
  try {
    const report = await reportService.getReportById(req.params.id);
    if (!report) {
      req.flash("error", "Laporan tidak ditemukan");
      return res.redirect("/portal/reports");
    }

    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const canManageReport = req.session.userPermissions?.includes("report.manage") || false;
    const canDeleteAny = req.session.userPermissions?.includes("report.delete_any") || false;
    const unreadCount = await messageService.getUnreadCount(req.session.userId);
    const flash = req.flash();

    res.render("portal/reports/detail", {
      title: report.title,
      user: { id: req.session.userId, name: req.session.userName },
      report,
      hasAdminAccess,
      canManageReport,
      canDeleteAny,
      unreadCount,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading report detail", { error: error.message });
    req.flash("error", "Gagal memuat detail laporan");
    res.redirect("/portal/reports");
  }
};

const postCreateReply = async (req, res) => {
  try {
    const report = await reportService.getReportById(req.params.id);
    if (!report) {
      req.flash("error", "Laporan tidak ditemukan");
      return res.redirect("/portal/reports");
    }

    const validation = createReplySchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", validation.error.errors.map((e) => e.message).join(", "));
      return res.redirect(`/portal/reports/${req.params.id}`);
    }

    let mediaPath = null;
    if (req.file) {
      mediaPath = `/uploads/reports/${req.file.filename}`;
    }

    await reportService.createReply(req.params.id, req.session.userId, {
      content: validation.data.content,
      mediaPath,
    });

    req.flash("success", "Balasan berhasil ditambahkan");
    res.redirect(`/portal/reports/${req.params.id}`);
  } catch (error) {
    logger.error("Error creating reply", { error: error.message });
    req.flash("error", "Gagal menambahkan balasan");
    res.redirect(`/portal/reports/${req.params.id}`);
  }
};

const postUpdateStatus = async (req, res) => {
  try {
    const report = await reportService.getReportById(req.params.id);
    if (!report) {
      req.flash("error", "Laporan tidak ditemukan");
      return res.redirect("/portal/reports");
    }

    const canManageReport = req.session.userPermissions?.includes("report.manage") || false;
    if (!canManageReport) {
      req.flash("error", "Tidak ada akses");
      return res.redirect(`/portal/reports/${req.params.id}`);
    }

    const validation = updateStatusSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", "Status tidak valid");
      return res.redirect(`/portal/reports/${req.params.id}`);
    }

    await reportService.updateReportStatus(req.params.id, validation.data.status);

    req.flash("success", "Status laporan berhasil diubah");
    res.redirect(`/portal/reports/${req.params.id}`);
  } catch (error) {
    logger.error("Error updating report status", { error: error.message });
    req.flash("error", "Gagal mengubah status laporan");
    res.redirect(`/portal/reports/${req.params.id}`);
  }
};

const postDeleteReport = async (req, res) => {
  try {
    const report = await reportService.getReportById(req.params.id);
    if (!report) {
      req.flash("error", "Laporan tidak ditemukan");
      return res.redirect("/portal/reports");
    }

    const canDeleteAny = req.session.userPermissions?.includes("report.delete_any") || false;
    
    if (report.authorId !== req.session.userId && !canDeleteAny) {
      req.flash("error", "Tidak ada akses untuk menghapus laporan ini");
      return res.redirect(`/portal/reports/${req.params.id}`);
    }

    if (report.authorId !== req.session.userId) {
      const reason = req.body.reason;
      if (!reason || reason.trim() === "") {
        req.flash("error", "Alasan penghapusan wajib diisi");
        return res.redirect(`/portal/reports/${req.params.id}`);
      }
      
      // Send message to the author
      await messageService.createMessage(req.session.userId, {
        title: "Laporan Anda Telah Dihapus",
        content: `Laporan Anda yang berjudul "${report.title}" telah dihapus oleh Admin/Moderator.\n\nAlasan:\n${reason}`,
        type: "personal",
        recipientIds: [report.authorId],
      });
    }

    await reportService.deleteReport(req.params.id);

    req.flash("success", "Laporan berhasil dihapus");
    res.redirect("/portal/reports");
  } catch (error) {
    logger.error("Error deleting report", { error: error.message });
    req.flash("error", "Gagal menghapus laporan");
    res.redirect(`/portal/reports/${req.params.id}`);
  }
};

module.exports = {
  getReports,
  getCreateForm,
  postCreateReport,
  getReportDetail,
  postCreateReply,
  postUpdateStatus,
  postDeleteReport,
};
