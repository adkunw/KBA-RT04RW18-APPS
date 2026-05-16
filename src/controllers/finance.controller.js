const { z } = require("zod");
const logger = require("../utils/logger");
const financeService = require("../services/finance.service");
const messageService = require("../services/message.service");

// Schemas
const createPeriodSchema = z.object({
  name: z.string().min(2, "Nama periode minimal 2 karakter"),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
  fixedDuesAmount: z.coerce.number().min(0),
});

const submitPaymentSchema = z.object({
  periodId: z.string().cuid(),
  hasFixedDues: z.preprocess((val) => val === "true" || val === "on", z.boolean()),
  hasKas: z.preprocess((val) => val === "true" || val === "on", z.boolean()),
  kasAmount: z.coerce.number().min(0).optional(),
  otherDescription: z.string().max(255).optional(),
  otherAmount: z.coerce.number().min(0).optional(),
});

const reviewPaymentSchema = z.object({
  notes: z.string().max(500).optional(),
  otherDescription: z.string().max(255).optional(),
});

// ============================================================
// PORTAL — Warga area
// ============================================================

const getMyFinance = async (req, res) => {
  try {
    const [payments, activePeriods, unreadCount] = await Promise.all([
      financeService.getPaymentsByUser(req.session.userId),
      financeService.getActivePeriods(),
      messageService.getUnreadCount(req.session.userId),
    ]);

    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const canManageFinance = req.session.userPermissions?.includes("finance.manage") || false;
    const flash = req.flash();

    res.render("portal/finance/index", {
      title: "Iuran & Keuangan",
      user: { id: req.session.userId, name: req.session.userName },
      payments,
      activePeriods,
      unreadCount,
      hasAdminAccess,
      canManageFinance,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading finance portal", { error: error.message });
    req.flash("error", "Gagal memuat halaman keuangan");
    res.redirect("/portal");
  }
};

const getPaymentForm = async (req, res) => {
  try {
    const periodId = req.query.periodId;
    if (!periodId) {
      req.flash("error", "Pilih periode pembayaran terlebih dahulu");
      return res.redirect("/portal/finance");
    }

    const period = await financeService.getPeriodById(periodId);
    if (!period || !period.isActive) {
      req.flash("error", "Periode tidak valid atau sudah ditutup");
      return res.redirect("/portal/finance");
    }

    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const flash = req.flash();

    res.render("portal/finance/pay", {
      title: "Lapor Pembayaran",
      user: { id: req.session.userId, name: req.session.userName },
      period,
      hasAdminAccess,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading payment form", { error: error.message });
    req.flash("error", "Gagal memuat form pembayaran");
    res.redirect("/portal/finance");
  }
};

const postPayment = async (req, res) => {
  try {
    if (!req.file) {
      req.flash("error", "Bukti transfer harus diupload");
      return res.redirect(`/portal/finance/pay?periodId=${req.body.periodId}`);
    }

    const validation = submitPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", "Data tidak valid. Periksa kembali input Anda.");
      return res.redirect(`/portal/finance/pay?periodId=${req.body.periodId}`);
    }

    const filePath = `/uploads/payments/${req.file.filename}`;
    const data = {
      ...validation.data,
      filePath,
      fileName: req.file.originalname,
    };

    await financeService.submitPaymentReport(req.session.userId, data);

    req.flash("success", "Laporan pembayaran berhasil dikirim dan sedang diproses.");
    res.redirect("/portal/finance");
  } catch (error) {
    logger.error("Error submitting payment", { error: error.message });
    req.flash("error", error.message || "Gagal mengirim laporan pembayaran");
    res.redirect(`/portal/finance/pay?periodId=${req.body.periodId}`);
  }
};

const getMyPaymentDetail = async (req, res) => {
  try {
    const payment = await financeService.getPaymentReportById(req.params.id);

    if (!payment || payment.userId !== req.session.userId) {
      req.flash("error", "Laporan pembayaran tidak ditemukan");
      return res.redirect("/portal/finance");
    }

    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const unreadCount = await messageService.getUnreadCount(req.session.userId);

    res.render("portal/finance/detail", {
      title: "Detail Pembayaran",
      user: { id: req.session.userId, name: req.session.userName },
      payment,
      hasAdminAccess,
      unreadCount,
      error: null,
      success: null,
    });
  } catch (error) {
    logger.error("Error loading payment detail", { error: error.message });
    req.flash("error", "Gagal memuat detail pembayaran");
    res.redirect("/portal/finance");
  }
};

// ============================================================
// ADMIN — finance.manage area
// ============================================================

const adminGetFinanceDashboard = async (req, res) => {
  try {
    const periods = await financeService.getAllPeriods();
    const flash = req.flash();

    res.render("admin/finance/index", {
      title: "Keuangan & Iuran",
      user: { id: req.session.userId, name: req.session.userName },
      periods,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading admin finance", { error: error.message });
    req.flash("error", "Gagal memuat data keuangan");
    res.redirect("/admin");
  }
};

const adminCreatePeriod = async (req, res) => {
  try {
    const validation = createPeriodSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", "Data periode tidak valid");
      return res.redirect("/admin/finance");
    }

    await financeService.createPeriod(validation.data);
    req.flash("success", "Periode baru berhasil dibuat");
    res.redirect("/admin/finance");
  } catch (error) {
    logger.error("Error creating period", { error: error.message });
    req.flash("error", "Gagal membuat periode");
    res.redirect("/admin/finance");
  }
};

const adminTogglePeriod = async (req, res) => {
  try {
    await financeService.togglePeriodStatus(req.params.id);
    req.flash("success", "Status periode berhasil diubah");
    res.redirect("/admin/finance");
  } catch (error) {
    logger.error("Error toggling period", { error: error.message });
    req.flash("error", "Gagal mengubah status periode");
    res.redirect("/admin/finance");
  }
};

const adminGetPeriodDetail = async (req, res) => {
  try {
    const period = await financeService.getPeriodById(req.params.id);
    if (!period) {
      req.flash("error", "Periode tidak ditemukan");
      return res.redirect("/admin/finance");
    }

    const { residents, stats } = await financeService.getPeriodResidentStatus(req.params.id);

    // Filter logic
    const currentFilter = req.query.filter || 'all';
    let filteredResidents = residents;
    
    if (currentFilter === 'approved') {
      filteredResidents = residents.filter(r => r.paymentStatus === 'approved');
    } else if (currentFilter === 'unpaid') {
      // User says: "belum lunas hanya yang belum bayar dan status terakhir adalah tidak disetujui"
      filteredResidents = residents.filter(r => r.paymentStatus === 'unpaid' || r.paymentStatus === 'rejected');
    } else if (currentFilter === 'pending') {
      filteredResidents = residents.filter(r => r.paymentStatus === 'pending');
    }

    const flash = req.flash();

    res.render("admin/finance/period", {
      title: `Periode: ${period.name}`,
      user: { id: req.session.userId, name: req.session.userName },
      period,
      residents: filteredResidents,
      stats,
      currentFilter,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading period detail", { error: error.message });
    req.flash("error", "Gagal memuat detail periode");
    res.redirect("/admin/finance");
  }
};

const adminGetPaymentDetail = async (req, res) => {
  try {
    const payment = await financeService.getPaymentReportById(req.params.id);
    if (!payment) {
      req.flash("error", "Laporan tidak ditemukan");
      return res.redirect("/admin/finance");
    }

    const flash = req.flash();

    res.render("admin/finance/payment", {
      title: "Review Pembayaran",
      user: { id: req.session.userId, name: req.session.userName },
      payment,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading admin payment detail", { error: error.message });
    req.flash("error", "Gagal memuat detail laporan");
    res.redirect("/admin/finance");
  }
};

const adminApprovePayment = async (req, res) => {
  try {
    const validation = reviewPaymentSchema.safeParse(req.body);
    const notes = validation.success ? validation.data.notes || null : null;
    const otherDescription = validation.success ? validation.data.otherDescription || null : null;

    const payment = await financeService.approvePayment(req.params.id, req.session.userId, notes, otherDescription);
    req.flash("success", "Pembayaran berhasil disetujui");
    res.redirect(`/admin/finance/period/${payment.periodId}`);
  } catch (error) {
    logger.error("Error approving payment", { error: error.message });
    req.flash("error", "Gagal menyetujui pembayaran");
    res.redirect(`/admin/finance/payment/${req.params.id}`);
  }
};

const adminRejectPayment = async (req, res) => {
  try {
    const validation = reviewPaymentSchema.safeParse(req.body);
    const notes = validation.success ? validation.data.notes || null : null;

    const payment = await financeService.rejectPayment(req.params.id, req.session.userId, notes);
    req.flash("success", "Pembayaran telah ditolak");
    res.redirect(`/admin/finance/period/${payment.periodId}`);
  } catch (error) {
    logger.error("Error rejecting payment", { error: error.message });
    req.flash("error", "Gagal menolak pembayaran");
    res.redirect(`/admin/finance/payment/${req.params.id}`);
  }
};

module.exports = {
  getMyFinance,
  getPaymentForm,
  postPayment,
  getMyPaymentDetail,
  adminGetFinanceDashboard,
  adminCreatePeriod,
  adminTogglePeriod,
  adminGetPeriodDetail,
  adminGetPaymentDetail,
  adminApprovePayment,
  adminRejectPayment,
};
