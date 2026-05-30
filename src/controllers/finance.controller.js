const { z } = require("zod");
const logger = require("../utils/logger");
const financeService = require("../services/finance.service");
const messageService = require("../services/message.service");
const userService = require("../services/user.service");
const prisma = require("../config/database");
const settingService = require("../services/setting.service");

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
  otherDescriptions: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val) return [val];
    return [];
  }, z.array(z.string().max(255))),
  otherAmounts: z.preprocess((val) => {
    if (Array.isArray(val)) return val.map(Number);
    if (val !== undefined && val !== '') return [Number(val)];
    return [];
  }, z.array(z.number().min(0))),
});

const submitMultiPaymentSchema = z.object({
  startMonth: z.coerce.number().min(1).max(12),
  startYear: z.coerce.number().min(2000).max(2100),
  numberOfMonths: z.coerce.number().min(2).max(120),
  hasKas: z.preprocess((val) => val === "true" || val === "on", z.boolean()),
  kasAmount: z.coerce.number().min(0).optional(),
  otherDescriptions: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val) return [val];
    return [];
  }, z.array(z.string().max(255))),
  otherAmounts: z.preprocess((val) => {
    if (Array.isArray(val)) return val.map(Number);
    if (val !== undefined && val !== '') return [Number(val)];
    return [];
  }, z.array(z.number().min(0))),
});

const reviewPaymentSchema = z.object({
  notes: z.string().max(500).optional(),
  otherDescription: z.string().max(255).optional(),
});

const createExpenseSchema = z.object({
  amount: z.coerce.number().min(1, "Nominal pengeluaran harus lebih besar dari 0"),
  description: z.string().min(3, "Deskripsi pengeluaran minimal 3 karakter"),
  category: z.string().min(1, "Kategori harus dipilih"),
  recipient: z.string().min(1, "Penerima dana harus diisi"),
  date: z.string().min(1, "Tanggal pengeluaran harus diisi"),
});

const createIncomeSchema = z.object({
  amount: z.coerce.number().min(1, "Nominal pemasukan harus lebih besar dari 0"),
  description: z.string().min(3, "Deskripsi pemasukan minimal 3 karakter"),
  category: z.string().min(1, "Kategori harus dipilih"),
  source: z.string().min(1, "Sumber dana harus diisi"),
  date: z.string().min(1, "Tanggal pemasukan harus diisi"),
});

// ============================================================
// PORTAL — Warga area
// ============================================================

const getMyFinance = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userDetails = await userService.getUserById(userId);
    const canManageFinance = req.session.userPermissions?.includes("finance.manage") || false;
    
    let viewCorridorId = userDetails?.corridorId || null;
    let viewCorridorName = userDetails?.corridor?.name || null;

    if (canManageFinance && req.query.corridorId) {
      viewCorridorId = req.query.corridorId;
      const c = await prisma.corridor.findUnique({ where: { id: viewCorridorId } });
      if (c) {
        viewCorridorName = c.name;
      }
    }

    const [
      payments,
      activePeriods,
      unreadCount,
      rtSummary,
      rtTransactions,
      corridorSummary,
      corridorTransactions,
      allCorridors,
      settings
    ] = await Promise.all([
      financeService.getPaymentsByUser(userId),
      financeService.getActivePeriods(),
      messageService.getUnreadCount(userId),
      financeService.getFinanceSummary(null),
      financeService.getRecentTransactions(10, null),
      viewCorridorId ? financeService.getFinanceSummary(viewCorridorId) : null,
      viewCorridorId ? financeService.getRecentTransactions(10, viewCorridorId) : null,
      canManageFinance ? prisma.corridor.findMany({ orderBy: { name: 'asc' } }) : [],
      settingService.getAllSettings(),
    ]);

    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const flash = req.flash();

    res.render("portal/finance/index", {
      title: "Iuran & Keuangan",
      user: {
        id: userId,
        name: req.session.userName,
        corridorId: userDetails?.corridorId || null, // Keep original user corridor for identity
        corridorName: userDetails?.corridor?.name || null,
        language: userDetails?.language || "id",
      },
      viewCorridor: {
        id: viewCorridorId,
        name: viewCorridorName
      },
      allCorridors,
      payments,
      activePeriods,
      unreadCount,
      hasAdminAccess,
      canManageFinance,
      rtSummary,
      rtTransactions,
      corridorSummary,
      corridorTransactions,
      settings,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading finance portal", { error: error.message, stack: error.stack });
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
    logger.error("Error loading payment form", { error: error.message, stack: error.stack });
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
    logger.error("Error submitting payment", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Gagal mengirim laporan pembayaran");
    res.redirect(`/portal/finance/pay?periodId=${req.body.periodId}`);
  }
};

const getMultiPaymentForm = async (req, res) => {
  try {
    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const flash = req.flash();
    
    // Default fixed dues fallback if no period is available to copy from yet
    let defaultFixedDues = 100000;
    const allPeriods = await financeService.getAllPeriods();
    if (allPeriods.length > 0) {
      defaultFixedDues = allPeriods[0].fixedDuesAmount;
    }

    res.render("portal/finance/pay-multi", {
      title: "Bayar Multi-Periode",
      user: { id: req.session.userId, name: req.session.userName },
      hasAdminAccess,
      defaultFixedDues,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading multi-payment form", { error: error.message, stack: error.stack });
    req.flash("error", "Gagal memuat form pembayaran multi-periode");
    res.redirect("/portal/finance");
  }
};

const postMultiPayment = async (req, res) => {
  try {
    if (!req.file) {
      req.flash("error", "Bukti transfer harus diupload");
      return res.redirect("/portal/finance/pay-multi");
    }

    const validation = submitMultiPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", "Data tidak valid. Periksa kembali input Anda.");
      return res.redirect("/portal/finance/pay-multi");
    }

    const filePath = `/uploads/payments/${req.file.filename}`;
    const data = {
      ...validation.data,
      filePath,
      fileName: req.file.originalname,
    };

    const result = await financeService.submitMultiPaymentReport(req.session.userId, data);
    
    let msg = `Berhasil mensubmit pembayaran untuk ${result.created.length + result.credits.length} bulan. `;
    if (result.skipped.length > 0) {
      msg += `(${result.skipped.length} bulan dilewati karena sudah dibayar).`;
    }

    req.flash("success", msg);
    res.redirect("/portal/finance");
  } catch (error) {
    logger.error("Error submitting multi payment", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Gagal mengirim laporan pembayaran");
    res.redirect("/portal/finance/pay-multi");
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
    logger.error("Error loading payment detail", { error: error.message, stack: error.stack });
    req.flash("error", "Gagal memuat detail pembayaran");
    res.redirect("/portal/finance");
  }
};

// ============================================================
// ADMIN — finance.manage area
// ============================================================

const adminGetFinanceDashboard = async (req, res) => {
  try {
    const permissions = req.session.userPermissions || [];
    const hasGlobalFinance = permissions.includes("finance.manage");
    let filterCorridorId = undefined;
    
    if (hasGlobalFinance) {
      if (req.query.corridorId) {
        filterCorridorId = req.query.corridorId;
      }
    } else if (permissions.includes("finance.manage_corridor")) {
      filterCorridorId = req.session.userCorridorId || null;
    }

    const [periods, expenses, incomes, summary, transactions, corridors] = await Promise.all([
      financeService.getAllPeriods(),
      financeService.getAllExpenses(filterCorridorId),
      financeService.getAllIncomes(filterCorridorId),
      financeService.getFinanceSummary(filterCorridorId),
      financeService.getRecentTransactions(10, filterCorridorId),
      prisma.corridor.findMany({ orderBy: { name: 'asc' } })
    ]);
    const flash = req.flash();

    res.render("admin/finance/index", {
      title: "Keuangan & Iuran",
      user: { id: req.session.userId, name: req.session.userName },
      periods,
      expenses,
      incomes,
      summary,
      transactions,
      corridors,
      hasGlobalFinance,
      filterCorridorId,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading admin finance", { error: error.message, stack: error.stack });
    req.flash("error", "Gagal memuat data keuangan");
    res.redirect("/admin");
  }
};

const adminCreateExpense = async (req, res) => {
  try {
    const validation = createExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", validation.error.errors[0]?.message || "Input data pengeluaran tidak valid");
      return res.redirect("/admin/finance");
    }

    const proofFilePath = req.file ? `/uploads/payments/${req.file.filename}` : null;

    const permissions = req.session.userPermissions || [];
    let corridorId = null;
    if (permissions.includes("finance.manage")) {
      corridorId = validation.data.corridorId || null;
    } else if (permissions.includes("finance.manage_corridor")) {
      corridorId = req.session.userCorridorId || null;
    }

    await financeService.createExpense({
      ...validation.data,
      proofFilePath,
      createdById: req.session.userId,
      corridorId,
    });

    req.flash("success", "Pengeluaran kas RT berhasil dicatat");
    res.redirect("/admin/finance");
  } catch (error) {
    logger.error("Error creating expense", { error: error.message, stack: error.stack });
    req.flash("error", "Gagal mencatat pengeluaran keuangan");
    res.redirect("/admin/finance");
  }
};

const adminCreateIncome = async (req, res) => {
  try {
    const validation = createIncomeSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", validation.error.errors[0]?.message || "Input data pemasukan tidak valid");
      return res.redirect("/admin/finance");
    }

    const proofFilePath = req.file ? `/uploads/payments/${req.file.filename}` : null;

    const permissions = req.session.userPermissions || [];
    let corridorId = null;
    if (permissions.includes("finance.manage")) {
      corridorId = validation.data.corridorId || null;
    } else if (permissions.includes("finance.manage_corridor")) {
      corridorId = req.session.userCorridorId || null;
    }

    await financeService.createIncome({
      ...validation.data,
      proofFilePath,
      createdById: req.session.userId,
      corridorId,
    });

    req.flash("success", "Pemasukan manual kas RT berhasil dicatat");
    res.redirect("/admin/finance");
  } catch (error) {
    logger.error("Error creating manual income", { error: error.message, stack: error.stack });
    req.flash("error", "Gagal mencatat pemasukan keuangan");
    res.redirect("/admin/finance");
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
    logger.error("Error creating period", { error: error.message, stack: error.stack });
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
    logger.error("Error toggling period", { error: error.message, stack: error.stack });
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

    const permissions = req.session.userPermissions || [];
    let filterCorridorId = undefined;
    if (!permissions.includes("finance.manage") && permissions.includes("finance.manage_corridor")) {
      filterCorridorId = req.session.userCorridorId || null;
    }

    const { residents, stats } = await financeService.getPeriodResidentStatus(req.params.id, filterCorridorId);

    let handoverStatus = [];
    if (permissions.includes("finance.manage")) {
      handoverStatus = await financeService.getCorridorHandoverStatus(req.params.id);
    }

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
      user: { id: req.session.userId, name: req.session.userName, roles: req.session.userRoles || [] },
      period,
      residents: filteredResidents,
      stats,
      currentFilter,
      handoverStatus,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading period detail", { error: error.message, stack: error.stack });
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
    logger.error("Error loading admin payment detail", { error: error.message, stack: error.stack });
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
    logger.error("Error approving payment", { error: error.message, stack: error.stack });
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
    logger.error("Error rejecting payment", { error: error.message, stack: error.stack });
    req.flash("error", "Gagal menolak pembayaran");
    res.redirect(`/admin/finance/payment/${req.params.id}`);
  }
};

const markPaidFormSchema = z.object({
  hasFixedDues: z.preprocess((val) => val === "true" || val === "on" || val === true, z.boolean()).default(false),
  fixedDuesAmount: z.coerce.number().min(0).default(0),
  hasKas: z.preprocess((val) => val === "true" || val === "on" || val === true, z.boolean()).default(false),
  kasAmount: z.coerce.number().min(0).default(0),
  hasOther: z.preprocess((val) => val === "true" || val === "on" || val === true, z.boolean()).default(false),
  otherDescription: z.string().max(255).optional().nullable(),
  otherAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  isMulti: z.preprocess((val) => val === "true" || val === "on" || val === true, z.boolean()).default(false),
  numberOfMonths: z.coerce.number().min(2).max(60).default(12),
});

const adminMarkPaid = async (req, res, next) => {
  try {
    const { periodId, userId } = req.params;
    const reviewerId = req.session.userId;

    const validation = markPaidFormSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", "Data pembayaran tidak valid. Periksa kembali input Anda.");
      return res.redirect(`/admin/finance/period/${periodId}`);
    }

    if (validation.data.isMulti) {
      await financeService.markUserPaidMulti(periodId, userId, reviewerId, validation.data);
      req.flash("success", "Status pembayaran warga berhasil ditandai LUNAS secara multi-periode.");
    } else {
      await financeService.markUserPaid(periodId, userId, reviewerId, validation.data);
      req.flash("success", "Status pembayaran warga berhasil ditandai sebagai LUNAS dengan rincian.");
    }

    res.redirect(`/admin/finance/period/${periodId}`);
  } catch (error) {
    logger.error("Error marking user paid", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Gagal menandai lunas");
    res.redirect(`/admin/finance/period/${req.params.periodId}`);
  }
};

const exportReportSchema = z.object({
  startDate: z.string().min(10, "Tanggal mulai harus diisi"),
  endDate: z.string().min(10, "Tanggal akhir harus diisi"),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "Tanggal akhir tidak boleh mendahului tanggal mulai",
  path: ["endDate"]
});

const adminExportFinanceReport = async (req, res) => {
  try {
    const validation = exportReportSchema.safeParse(req.query);
    if (!validation.success) {
      req.flash("error", validation.error.errors[0]?.message || "Parameter tanggal tidak valid");
      return res.redirect("/admin/finance");
    }

    const { startDate, endDate } = validation.data;
    
    const permissions = req.session.userPermissions || [];
    const hasGlobalFinance = permissions.includes("finance.manage");
    let filterCorridorId = undefined;
    
    if (hasGlobalFinance) {
      if (req.query.corridorId) {
        filterCorridorId = req.query.corridorId;
      }
    } else if (permissions.includes("finance.manage_corridor")) {
      filterCorridorId = req.session.userCorridorId || null;
    }

    const records = await financeService.exportFinanceReport(startDate, endDate, filterCorridorId);

    // Build CSV safely supporting semicolon separator for Excel compatibility
    let csv = "\uFEFF"; // Add UTF-8 BOM for Indonesian Excel to parse accents/characters correctly
    csv += "No;Tanggal;Tipe;Kategori;Keterangan / Rincian;Sumber / Penerima;Nominal (Rp);Dicatat Oleh\n";
    
    records.forEach((r, idx) => {
      const formattedDate = new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const cleanCat = `"${r.category.replace(/"/g, '""')}"`;
      const cleanDesc = `"${r.description.replace(/"/g, '""')}"`;
      const cleanEntity = `"${r.entity.replace(/"/g, '""')}"`;
      const cleanRecordedBy = `"${r.recordedBy.replace(/"/g, '""')}"`;
      
      csv += `${idx + 1};${formattedDate};${r.type};${cleanCat};${cleanDesc};${cleanEntity};${r.amount};${cleanRecordedBy}\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="laporan_keuangan_rt_${startDate}_to_${endDate}.csv"`);
    return res.send(csv);
  } catch (error) {
    logger.error("Error exporting finance report", { error: error.message, stack: error.stack });
    req.flash("error", "Gagal memproses ekspor laporan keuangan");
    res.redirect("/admin/finance");
  }
};

const adminHandoverKas = async (req, res) => {
  try {
    const { periodId, corridorId } = req.params;
    const { amountKas, amountFixed, amountOther, notes } = req.body;
    
    // Check permission - only global finance.manage can hand over
    const permissions = req.session.userPermissions || [];
    if (!permissions.includes("finance.manage")) {
      req.flash("error", "Anda tidak memiliki izin untuk menyerahkan kas");
      return res.redirect(`/admin/finance/period/${periodId}`);
    }

    let otherDetails = {};
    if (typeof amountOther === 'object' && amountOther !== null) {
      // Loop over keys to parse amounts
      Object.keys(amountOther).forEach(key => {
        const val = parseInt(amountOther[key]);
        if (!isNaN(val) && val > 0) {
          otherDetails[key] = val;
        }
      });
    }

    await financeService.createFinanceHandover(req.session.userId, {
      periodId,
      corridorId,
      amountKas: parseInt(amountKas) || 0,
      amountFixed: parseInt(amountFixed) || 0,
      otherDetails,
      notes
    });

    req.flash("success", "Penyerahan kas berhasil dicatat");
    res.redirect(`/admin/finance/period/${periodId}`);
  } catch (error) {
    logger.error("Error handing over kas", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Gagal menyerahkan kas");
    res.redirect(`/admin/finance/period/${req.params.periodId}`);
  }
};

const adminBulkApproveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = await financeService.bulkApproveByGroup(groupId, req.session.userId);
    req.flash("success", `Berhasil menyetujui massal ${result.count} bulan untuk grup transaksi tersebut.`);
    res.redirect("back"); // Redirect back to wherever they were (period detail or user detail)
  } catch (error) {
    logger.error("Error bulk approving group", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Gagal menyetujui massal");
    res.redirect("back");
  }
};

module.exports = {
  getMyFinance,
  getPaymentForm,
  getMultiPaymentForm,
  postPayment,
  postMultiPayment,
  getMyPaymentDetail,
  adminGetFinanceDashboard,
  adminCreatePeriod,
  adminTogglePeriod,
  adminGetPeriodDetail,
  adminGetPaymentDetail,
  adminApprovePayment,
  adminRejectPayment,
  adminBulkApproveGroup,
  adminMarkPaid,
  adminCreateExpense,
  adminCreateIncome,
  adminExportFinanceReport,
  adminHandoverKas,
};
