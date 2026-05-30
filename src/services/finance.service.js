const prisma = require("../config/database");
const logger = require("../utils/logger");
const fs = require("fs");
const path = require("path");

/**
 * Period Management
 */

const crypto = require("crypto");

const createPeriod = async ({ name, month, year, fixedDuesAmount }) => {
  const period = await prisma.financePeriod.create({
    data: { name, month, year, fixedDuesAmount, isActive: true },
  });
  logger.info("Finance period created", { periodId: period.id, name });

  // Auto-consume any pending BulkPaymentCredits that match this period
  try {
    const pendingCredits = await prisma.bulkPaymentCredit.findMany({
      where: { targetYear: year, targetMonth: month, status: "pending" },
      include: { user: { select: { id: true, corridorId: true } } },
    });

    for (const credit of pendingCredits) {
      // Create an approved PaymentReport for this credit
      const payment = await prisma.paymentReport.create({
        data: {
          userId: credit.userId,
          periodId: period.id,
          corridorId: credit.corridorId,
          groupTransactionId: credit.groupTransactionId,
          paymentType: "multi",
          hasFixedDues: true,
          fixedDuesAmount: credit.fixedDuesAmount,
          hasKas: false,
          kasAmount: 0,
          otherAmount: 0,
          totalAmount: credit.fixedDuesAmount,
          proofFilePath: credit.proofFilePath,
          status: "approved",
          notes: "Otomatis disetujui dari kredit pembayaran multi-periode",
          reviewedAt: new Date(),
        },
      });

      // Mark credit as consumed
      await prisma.bulkPaymentCredit.update({
        where: { id: credit.id },
        data: { status: "consumed", consumedAt: new Date(), consumedPaymentId: payment.id },
      });

      logger.info("BulkPaymentCredit consumed into PaymentReport", {
        creditId: credit.id, paymentId: payment.id, userId: credit.userId,
        year, month,
      });
    }

    if (pendingCredits.length > 0) {
      logger.info(`Auto-consumed ${pendingCredits.length} BulkPaymentCredits for period ${period.id}`);
    }
  } catch (err) {
    logger.error("Error consuming BulkPaymentCredits during period creation", { error: err.message });
  }

  return period;
};


const getAllPeriods = async () => {
  return await prisma.financePeriod.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
};

const getPeriodById = async (id) => {
  return await prisma.financePeriod.findUnique({
    where: { id },
  });
};

const getActivePeriods = async () => {
  return await prisma.financePeriod.findMany({
    where: { isActive: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
};

const togglePeriodStatus = async (id) => {
  const period = await getPeriodById(id);
  if (!period) throw new Error("Period not found");

  return await prisma.financePeriod.update({
    where: { id },
    data: { isActive: !period.isActive },
  });
};

/**
 * Payment Reports
 */

const submitPaymentReport = async (userId, data) => {
  const { periodId, hasFixedDues, hasKas, kasAmount, otherDescriptions, otherAmounts, filePath, fileName } = data;

  const period = await getPeriodById(periodId);
  if (!period) throw new Error("Period not found");
  if (!period.isActive) throw new Error("Period is already closed");

  const existingPayment = await prisma.paymentReport.findFirst({
    where: { userId, periodId, status: { in: ["pending", "approved"] } },
  });

  if (existingPayment) {
    throw new Error("Anda sudah mengirim laporan untuk periode ini");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const corridorId = user?.corridorId || null;

  const fixedDuesAmount = hasFixedDues ? period.fixedDuesAmount : 0;
  const kas = hasKas ? Number(kasAmount) : 0;
  
  // Process multiple other payments
  let other = 0;
  let otherDescStr = null;
  if (otherDescriptions && otherAmounts) {
    const items = [];
    for (let idx = 0; idx < otherDescriptions.length; idx++) {
      const desc = otherDescriptions[idx]?.trim();
      const amt = Number(otherAmounts[idx]) || 0;
      if (desc && amt > 0) {
        items.push({ desc, amount: amt });
        other += amt;
      }
    }
    if (items.length > 0) {
      otherDescStr = JSON.stringify(items);
    }
  }

  const totalAmount = fixedDuesAmount + kas + other;

  const payment = await prisma.paymentReport.create({
    data: {
      userId,
      periodId,
      hasFixedDues,
      fixedDuesAmount,
      hasKas,
      kasAmount: kas,
      otherDescription: otherDescStr,
      otherAmount: other,
      totalAmount,
      proofFilePath: filePath,
      status: "pending",
      corridorId,
    },
  });

  logger.info("Payment report submitted with multiple other payments", { paymentId: payment.id, userId, periodId });
  return payment;
};

const getPaymentsByUser = async (userId) => {
  return await prisma.paymentReport.findMany({
    where: { userId },
    include: {
      period: true,
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getPeriodResidentStatus = async (periodId, corridorId = undefined) => {
  // Get all active/created users except system admins
  const whereUsers = {
    status: { in: ["active", "created"] },
    roles: { none: { role: { name: { in: ["super_admin", "admin", "system_admin"] } } } }
  };
  if (corridorId !== undefined) {
    whereUsers.corridorId = corridorId;
  }

  const users = await prisma.user.findMany({
    where: whereUsers,
    select: { 
      id: true, 
      name: true, 
      phone: true, 
      houseNumber: true, 
      familyDetails: true,
      spouseName: true,
      children: true,
      spousePhone: true,
      corridorId: true
    }
  });

  // Get all approved/pending/rejected payments for this period
  const payments = await prisma.paymentReport.findMany({
    where: { periodId },
    include: { reviewer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Group users by house key (nomor rumah)
  const houses = {};

  users.forEach(user => {
    const houseKey = user.houseNumber ? user.houseNumber.trim().toUpperCase() : `BELUM_ISI_${user.id}`;
    const houseLabel = user.houseNumber ? user.houseNumber.trim() : `Belum Diisi (${user.name})`;
    
    if (!houses[houseKey]) {
      houses[houseKey] = {
        houseNumber: houseLabel,
        isCustomKey: !user.houseNumber,
        users: [],
        payments: []
      };
    }
    houses[houseKey].users.push(user);
  });

  // Map payments to their respective houses
  payments.forEach(p => {
    const user = users.find(u => u.id === p.userId);
    if (user) {
      const houseKey = user.houseNumber ? user.houseNumber.trim().toUpperCase() : `BELUM_ISI_${user.id}`;
      if (houses[houseKey]) {
        houses[houseKey].payments.push(p);
      }
    }
  });

  let paidCount = 0;
  let unpaidCount = 0;
  let totalCollected = 0;
  
  const breakdown = {
    fixedDues: 0,
    kas: 0,
    others: {}
  };

  const residentStatus = Object.keys(houses).map(key => {
    const house = houses[key];
    
    // Determine payment status
    // Approved takes precedence, then pending, then rejected, then unpaid
    let payment = house.payments.find(p => p.status === "approved") || null;
    if (!payment) {
      payment = house.payments.find(p => p.status === "pending") || null;
    }
    if (!payment) {
      payment = house.payments.find(p => p.status === "rejected") || null;
    }
    if (!payment && house.payments.length > 0) {
      payment = house.payments[0];
    }

    let status = "unpaid";
    if (payment) {
      status = payment.status;
    }

    if (status === "approved") {
      paidCount++;
      totalCollected += payment.totalAmount;
      
      if (payment.hasFixedDues) breakdown.fixedDues += payment.fixedDuesAmount;
      if (payment.hasKas) breakdown.kas += payment.kasAmount;
      if (payment.otherAmount > 0 && payment.otherDescription) {
        const desc = payment.otherDescription.trim() || "Lain-lain";
        breakdown.others[desc] = (breakdown.others[desc] || 0) + payment.otherAmount;
      }
    } else {
      unpaidCount++;
    }

    return {
      houseNumber: house.houseNumber,
      isCustomKey: house.isCustomKey,
      users: house.users,
      payment,
      paymentStatus: status
    };
  });

  return {
    residents: residentStatus,
    stats: {
      totalUsers: Object.keys(houses).length,
      paidCount,
      unpaidCount,
      totalCollected,
      breakdown
    }
  };
};

const getPaymentReportById = async (id) => {
  return await prisma.paymentReport.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      period: true,
      reviewer: { select: { id: true, name: true } },
    },
  });
};

const approvePayment = async (id, reviewerId, notes = null, otherDescription = null) => {
  const data = {
    status: "approved",
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    notes,
  };
  
  if (otherDescription !== null && otherDescription !== undefined) {
    data.otherDescription = otherDescription;
  }

  const payment = await prisma.paymentReport.update({
    where: { id },
    data,
  });
  logger.info("Payment approved", { paymentId: id, reviewerId });
  return payment;
};

const rejectPayment = async (id, reviewerId, notes) => {
  const payment = await prisma.paymentReport.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      notes,
    },
  });
  logger.info("Payment rejected", { paymentId: id, reviewerId });
  return payment;
};

const markUserPaid = async (periodId, userId, reviewerId, details) => {
  const {
    hasFixedDues,
    fixedDuesAmount,
    hasKas,
    kasAmount,
    hasOther,
    otherDescription,
    otherAmount,
    notes,
  } = details;

  const period = await prisma.financePeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) throw new Error("Periode tidak ditemukan");

  const existingPayment = await prisma.paymentReport.findFirst({
    where: { userId, periodId },
    orderBy: { createdAt: "desc" },
  });

  const finalFixedDues = hasFixedDues ? Number(fixedDuesAmount) : 0;
  const finalKas = hasKas ? Number(kasAmount) : 0;
  const finalOther = hasOther ? Number(otherAmount) : 0;
  const totalAmount = finalFixedDues + finalKas + finalOther;

  const reviewer = await prisma.user.findUnique({
    where: { id: reviewerId },
    include: { roles: { include: { role: true } } },
  });
  const reviewerName = reviewer ? reviewer.name : "System";
  const reviewerRoles = reviewer ? reviewer.roles.map(r => r.role.name) : [];

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  const corridorId = targetUser?.corridorId || null;

  let roleDisplayName = "Admin";
  if (reviewerRoles.includes("super_admin")) {
    roleDisplayName = "Super Admin";
  } else if (reviewerRoles.includes("bendahara")) {
    roleDisplayName = "Bendahara";
  } else if (reviewerRoles.includes("ketua_rt")) {
    roleDisplayName = "Ketua RT";
  }

  const finalNotes = notes || `Ditandai lunas secara manual oleh ${roleDisplayName} (${reviewerName})`;

  const paymentData = {
    hasFixedDues,
    fixedDuesAmount: finalFixedDues,
    hasKas,
    kasAmount: finalKas,
    otherDescription: hasOther && otherDescription ? otherDescription : null,
    otherAmount: finalOther,
    totalAmount,
    status: "approved",
    reviewedBy: reviewerId,
      reviewedAt: new Date(),
    notes: finalNotes,
    corridorId,
  };

  if (existingPayment) {
    if (existingPayment.status === "approved") {
      throw new Error("Warga ini sudah berstatus lunas untuk periode ini");
    }

    const updated = await prisma.paymentReport.update({
      where: { id: existingPayment.id },
      data: paymentData,
    });
    logger.info("Payment report manually approved with details by bendahara", { paymentId: existingPayment.id, reviewerId });
    return updated;
  } else {
    const payment = await prisma.paymentReport.create({
      data: {
        userId,
        periodId,
        proofFilePath: "manual",
        corridorId,
        ...paymentData,
      },
    });
    logger.info("Payment report manually created with details and approved by bendahara", { paymentId: payment.id, userId, reviewerId });
    return payment;
  }
};

const createExpense = async ({ amount, description, category, recipient, date, proofFilePath, createdById, corridorId }) => {
  const expense = await prisma.financeExpense.create({
    data: {
      amount: Number(amount),
      description,
      category,
      recipient,
      date: new Date(date),
      proofFilePath: proofFilePath || null,
      createdById,
      corridorId: corridorId || null,
    },
  });
  logger.info("Finance expense recorded", { expenseId: expense.id, amount, category });
  return expense;
};

const getAllExpenses = async (corridorId = undefined) => {
  const where = {};
  if (corridorId !== undefined) {
    // If corridorId is explicitly null, we look for Kas RT (corridorId: null)
    // If corridorId is a specific ID, we look for that Koridor's Kas
    where.corridorId = corridorId;
  }

  return await prisma.financeExpense.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      corridor: true,
    },
    orderBy: { date: "desc" },
  });
};

const createIncome = async ({ amount, description, category, source, date, proofFilePath, createdById, corridorId }) => {
  const income = await prisma.financeIncome.create({
    data: {
      amount: Number(amount),
      description,
      category,
      source,
      date: new Date(date),
      proofFilePath: proofFilePath || null,
      createdById,
      corridorId: corridorId || null,
    },
  });
  logger.info("Finance manual income recorded", { incomeId: income.id, amount, category });
  return income;
};

const getAllIncomes = async (corridorId = undefined) => {
  const where = {};
  if (corridorId !== undefined) {
    where.corridorId = corridorId;
  }

  return await prisma.financeIncome.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      corridor: true,
    },
    orderBy: { date: "desc" },
  });
};

const getFinanceSummary = async (corridorId = undefined) => {
  const paymentWhere = { status: "approved" };
  const incomeWhere = {};
  const expenseWhere = {};

  if (corridorId !== undefined) {
    if (corridorId !== null) {
      paymentWhere.corridorId = corridorId;
    }
    incomeWhere.corridorId = corridorId;
    expenseWhere.corridorId = corridorId;
  }

  let totalCitizenIncome = 0;

  if (corridorId) {
    const handoverResult = await prisma.financeHandover.aggregate({
      where: { corridorId },
      _sum: { totalAmount: true },
    });
    totalCitizenIncome = handoverResult._sum.totalAmount || 0;
  } else {
    const citizenIncomeResult = await prisma.paymentReport.aggregate({
      where: paymentWhere,
      _sum: { totalAmount: true },
    });
    totalCitizenIncome = citizenIncomeResult._sum.totalAmount || 0;
  }

  // Total Manual Other Income
  // Exclude 'Penerimaan RT' category (handovers) for corridor queries to prevent double counting
  const summaryIncomeWhere = { ...incomeWhere };
  if (corridorId) {
    summaryIncomeWhere.category = { not: 'Penerimaan RT' };
  }

  const manualIncomeResult = await prisma.financeIncome.aggregate({
    where: summaryIncomeWhere,
    _sum: { amount: true },
  });
  const totalManualIncome = manualIncomeResult._sum.amount || 0;

  const totalIncome = totalCitizenIncome + totalManualIncome;

  // Total Expense
  const expenseResult = await prisma.financeExpense.aggregate({
    where: expenseWhere,
    _sum: { amount: true },
  });
  const totalExpense = expenseResult._sum.amount || 0;

  const balance = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    balance,
  };
};

const getRecentTransactions = async (limit = 10, corridorId = undefined) => {
  const incomeWhere = {};
  const expenseWhere = {};

  if (corridorId !== undefined) {
    incomeWhere.corridorId = corridorId;
    expenseWhere.corridorId = corridorId;
  }

  const fetchPayments = !corridorId; // Only fetch citizen payments for global RT kas

  const [approvedPayments, manualIncomes, expenses] = await Promise.all([
    fetchPayments
      ? prisma.paymentReport.findMany({
          where: { status: "approved" },
          include: {
            user: { select: { id: true, name: true } },
            period: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]),
    prisma.financeIncome.findMany({
      where: incomeWhere,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
    }),
    prisma.financeExpense.findMany({
      where: expenseWhere,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
    }),
  ]);

  // Merge and sort by date/createdAt descending
  const transactions = [
    ...approvedPayments.map(p => ({
      id: p.id,
      type: "income",
      title: `Iuran Bulanan - ${p.period?.name || "Periode Terhapus"}`,
      subtitle: `Dari Warga: ${p.user?.name || "Warga Terhapus"}`,
      amount: p.totalAmount,
      date: p.createdAt,
      proofFilePath: p.proofFilePath,
    })),
    ...manualIncomes.map(i => ({
      id: i.id,
      type: "income",
      title: i.category === 'Penerimaan RT' ? i.description : `Pemasukan Lain - ${i.category} (${i.description})`,
      subtitle: `Sumber: ${i.source}`,
      amount: i.amount,
      date: i.date,
      proofFilePath: i.proofFilePath,
    })),
    ...expenses.map(e => ({
      id: e.id,
      type: "expense",
      title: e.category === 'Distribusi Koridor' ? e.description : `Pengeluaran - ${e.category} (${e.description})`,
      subtitle: `Penerima: ${e.recipient}`,
      amount: e.amount,
      date: e.date,
      proofFilePath: e.proofFilePath,
    })),
  ];

  return transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};

/**
 * Finance Handover (Penyerahan Kas ke Koridor)
 */

const getCorridorHandoverStatus = async (periodId) => {
  // 1. Get all approved payments for this period grouped by corridor
  const payments = await prisma.paymentReport.findMany({
    where: { periodId, status: "approved", corridorId: { not: null } },
  });

  const corridors = await prisma.corridor.findMany();
  
  // 2. Get all handovers for this period
  const handovers = await prisma.financeHandover.findMany({
    where: { periodId },
  });

  const statusList = corridors.map(c => {
    const corridorPayments = payments.filter(p => p.corridorId === c.id);
    const totalKasCollected = corridorPayments.reduce((sum, p) => sum + (p.kasAmount || 0), 0);
    const totalFixedCollected = corridorPayments.reduce((sum, p) => sum + (p.fixedDuesAmount || 0), 0);
    
    const totalOthersCollected = {};
    corridorPayments.forEach(p => {
      if (p.otherAmount > 0 && p.otherDescription) {
        const desc = p.otherDescription.trim();
        totalOthersCollected[desc] = (totalOthersCollected[desc] || 0) + p.otherAmount;
      }
    });

    const corridorHandovers = handovers.filter(h => h.corridorId === c.id);
    const handedKas = corridorHandovers.reduce((sum, h) => sum + h.amountKas, 0);
    const handedFixed = corridorHandovers.reduce((sum, h) => sum + h.amountFixed, 0);
    
    const handedOthers = {};
    corridorHandovers.forEach(h => {
      if (h.otherDetails) {
        const details = typeof h.otherDetails === 'string' ? JSON.parse(h.otherDetails) : h.otherDetails;
        Object.keys(details).forEach(desc => {
          handedOthers[desc] = (handedOthers[desc] || 0) + Number(details[desc]);
        });
      }
    });

    const pendingOthers = {};
    let totalPendingOther = 0;
    Object.keys(totalOthersCollected).forEach(desc => {
      const pending = totalOthersCollected[desc] - (handedOthers[desc] || 0);
      if (pending > 0) {
        pendingOthers[desc] = pending;
        totalPendingOther += pending;
      }
    });

    return {
      corridor: c,
      collected: { kas: totalKasCollected, fixed: totalFixedCollected, others: totalOthersCollected },
      handed: { kas: handedKas, fixed: handedFixed, others: handedOthers },
      pending: {
        kas: totalKasCollected - handedKas,
        fixed: totalFixedCollected - handedFixed,
        others: pendingOthers,
        hasPending: (totalKasCollected - handedKas) > 0 || (totalFixedCollected - handedFixed) > 0 || totalPendingOther > 0
      },
      history: corridorHandovers
    };
  });

  return statusList;
};

const createFinanceHandover = async (bendaharaId, data) => {
  const { periodId, corridorId, amountKas, amountFixed, otherDetails, notes } = data;
  
  // otherDetails will be an object like {"Agustusan": 50000, "Sampah": 20000}
  const amountOther = otherDetails ? Object.values(otherDetails).reduce((sum, val) => sum + Number(val), 0) : 0;
  
  const totalAmount = (amountKas || 0) + (amountFixed || 0) + amountOther;
  if (totalAmount <= 0) throw new Error("Nominal penyerahan harus lebih dari 0");

  // We need to fetch the corridor name for the description
  const corridor = await prisma.corridor.findUnique({ where: { id: corridorId } });
  const corridorName = corridor ? corridor.name : 'Koridor';

  const handover = await prisma.$transaction(async (tx) => {
    // 1. Create the Handover Record
    const newHandover = await tx.financeHandover.create({
      data: {
        periodId,
        corridorId,
        amountKas: amountKas || 0,
        amountFixed: amountFixed || 0,
        amountOther,
        otherDetails: otherDetails || null,
        totalAmount,
        notes,
        handedOverBy: bendaharaId,
      }
    });

    // 2. Create Expense for RT (corridorId: null)
    await tx.financeExpense.create({
      data: {
        amount: totalAmount,
        description: `Penyerahan dana ke ${corridorName}`,
        category: 'Distribusi Koridor',
        recipient: `Pengurus ${corridorName}`,
        date: new Date(),
        createdById: bendaharaId,
        corridorId: null,
        handoverId: newHandover.id,
      }
    });

    // 3. Create Income for Corridor (corridorId)
    await tx.financeIncome.create({
      data: {
        amount: totalAmount,
        description: `Penerimaan dana dari Kas RT`,
        category: 'Penerimaan RT',
        source: 'Kas RT / Bendahara',
        date: new Date(),
        createdById: bendaharaId,
        corridorId: corridorId,
        handoverId: newHandover.id,
      }
    });

    return newHandover;
  });

  logger.info("Finance handover created with matching expense/income", { handoverId: handover.id, periodId, corridorId, totalAmount });
  return handover;
};

const exportFinanceReport = async (startDateStr, endDateStr) => {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  const [approvedPayments, manualIncomes, expenses] = await Promise.all([
    prisma.paymentReport.findMany({
      where: {
        status: "approved",
        createdAt: { gte: start, lte: end },
      },
      include: {
        user: { select: { name: true } },
        period: true,
        reviewer: { select: { name: true } },
      },
    }),
    prisma.financeIncome.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        createdBy: { select: { name: true } },
      },
    }),
    prisma.financeExpense.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  // Merge and sort chronologically (ascending for financial reports)
  const records = [
    ...approvedPayments.map(p => ({
      date: p.createdAt,
      type: "Pemasukan",
      category: `Iuran Bulanan - ${p.period?.name || "Periode Terhapus"}`,
      description: "Pembayaran iuran bulanan wajib warga",
      entity: p.user?.name || "Warga Terhapus",
      amount: p.totalAmount,
      recordedBy: p.reviewer?.name || "Sistem",
    })),
    ...manualIncomes.map(i => ({
      date: i.date,
      type: "Pemasukan",
      category: `Lain-lain (${i.category})`,
      description: i.description,
      entity: i.source,
      amount: i.amount,
      recordedBy: i.createdBy?.name || "Sistem",
    })),
    ...expenses.map(e => ({
      date: e.date,
      type: "Pengeluaran",
      category: e.category,
      description: e.description,
      entity: e.recipient,
      amount: -e.amount,
      recordedBy: e.createdBy?.name || "Sistem",
    })),
  ];

  return records.sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Multi-Period Payment (Advance Payment)
 */

/**
 * Get active periods grouped by year for a specific year
 */
const getActivePeriodsByYear = async (year) => {
  return await prisma.financePeriod.findMany({
    where: { year, isActive: true },
    orderBy: { month: "asc" },
  });
};

/**
 * Get all finance periods for a year (active or not), for checking availability
 */
const getPeriodsByYear = async (year) => {
  return await prisma.financePeriod.findMany({
    where: { year },
    orderBy: { month: "asc" },
  });
};

/**
 * Submit multi-period (advance) payment.
 * - Creates PaymentReport records for months that already have a FinancePeriod.
 * - Creates BulkPaymentCredit records for future months (no period yet).
 * - First month gets kas & other amounts; subsequent months only get fixedDues.
 * - Skips months where user already has an approved/pending PaymentReport.
 * 
 * @param {string} userId
 * @param {object} data - { startMonth, startYear, numberOfMonths, hasKas, kasAmount, otherDescription, otherAmount, filePath, fixedDuesAmountOverride? }
 * @returns {{ created: [], credits: [], skipped: [], warnings: [] }}
 */
const submitMultiPaymentReport = async (userId, data) => {
  const {
    startMonth, startYear, numberOfMonths,
    hasKas, kasAmount, otherDescriptions, otherAmounts,
    filePath,
  } = data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const corridorId = user?.corridorId || null;

  // Generate a shared group ID for all records in this batch
  const groupTransactionId = crypto.randomUUID();

  const months = []; // { year, month } for each target month
  let m = startMonth;
  let y = startYear;
  for (let i = 0; i < numberOfMonths; i++) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  // Check which months already have approved/pending payments (to warn and skip)
  const existingPayments = await prisma.paymentReport.findMany({
    where: {
      userId,
      status: { in: ["pending", "approved"] },
    },
    include: { period: true },
  });

  // Also check existing BulkPaymentCredits
  const existingCredits = await prisma.bulkPaymentCredit.findMany({
    where: { userId, status: "pending" },
  });

  const skipped = [];
  const created = [];
  const credits = [];

  for (let i = 0; i < months.length; i++) {
    const { year, month } = months[i];
    const isFirstMonth = i === 0;

    // Check if already paid (via PaymentReport)
    const alreadyPaid = existingPayments.find(p =>
      p.period?.year === year && p.period?.month === month
    );
    // Check if already has a credit for this month
    const alreadyCredit = existingCredits.find(c =>
      c.targetYear === year && c.targetMonth === month
    );

    if (alreadyPaid || alreadyCredit) {
      skipped.push({ year, month, reason: alreadyPaid ? alreadyPaid.status : "credit_exists" });
      continue;
    }

    // Look for existing FinancePeriod
    const period = await prisma.financePeriod.findFirst({
      where: { year, month },
    });

    // Calculate amounts
    const periodFixedAmount = period ? period.fixedDuesAmount : 0;
    // For months without a period, use the first month's period amount as reference
    // (will be corrected when period is created via auto-consume)
    const fixedDues = period ? period.fixedDuesAmount : 0;
    const kas = isFirstMonth && hasKas ? Number(kasAmount) : 0;
    
    // Process multiple other payments for first month
    let other = 0;
    let otherDescStr = null;
    if (isFirstMonth && otherDescriptions && otherAmounts) {
      const items = [];
      for (let idx = 0; idx < otherDescriptions.length; idx++) {
        const desc = otherDescriptions[idx]?.trim();
        const amt = Number(otherAmounts[idx]) || 0;
        if (desc && amt > 0) {
          items.push({ desc, amount: amt });
          other += amt;
        }
      }
      if (items.length > 0) {
        otherDescStr = JSON.stringify(items);
      }
    }

    const total = fixedDues + kas + other;

    if (period) {
      // Create PaymentReport now
      const payment = await prisma.paymentReport.create({
        data: {
          userId,
          periodId: period.id,
          corridorId,
          groupTransactionId,
          paymentType: "multi",
          hasFixedDues: true,
          fixedDuesAmount: fixedDues,
          hasKas: isFirstMonth && hasKas,
          kasAmount: kas,
          otherDescription: otherDescStr,
          otherAmount: other,
          totalAmount: total,
          proofFilePath: filePath,
          status: "pending",
        },
      });
      created.push({ year, month, paymentId: payment.id, periodId: period.id });
    } else {
      // Create BulkPaymentCredit for future period
      const credit = await prisma.bulkPaymentCredit.create({
        data: {
          userId,
          corridorId,
          groupTransactionId,
          targetYear: year,
          targetMonth: month,
          fixedDuesAmount: fixedDues, // Will be 0 until period is created; corrected on consume
          proofFilePath: filePath,
          status: "pending",
        },
      });
      credits.push({ year, month, creditId: credit.id });
    }
  }

  logger.info("Multi-period payment submitted", {
    userId, groupTransactionId, startMonth, startYear, numberOfMonths,
    created: created.length, credits: credits.length, skipped: skipped.length,
  });

  return { groupTransactionId, created, credits, skipped };
};

/**
 * Bulk approve all PaymentReports in a group transaction
 */
const bulkApproveByGroup = async (groupTransactionId, reviewerId) => {
  const payments = await prisma.paymentReport.findMany({
    where: {
      groupTransactionId,
      status: { in: ["pending", "rejected"] },
    },
  });

  if (payments.length === 0) {
    throw new Error("Tidak ada pembayaran yang perlu disetujui dalam grup ini");
  }

  const updated = await prisma.paymentReport.updateMany({
    where: {
      groupTransactionId,
      status: { in: ["pending", "rejected"] },
    },
    data: {
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      notes: "Disetujui massal melalui approve grup multi-periode",
    },
  });

  logger.info("Bulk approve by group", {
    groupTransactionId, reviewerId, count: updated.count,
  });

  return { count: updated.count };
};

/**
 * Get payment history for a specific user (for admin view)
 */
const getUserPaymentHistory = async (userId) => {
  const [payments, credits] = await Promise.all([
    prisma.paymentReport.findMany({
      where: { userId },
      include: {
        period: true,
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.bulkPaymentCredit.findMany({
      where: { userId },
      orderBy: [{ targetYear: "desc" }, { targetMonth: "desc" }],
    }),
  ]);

  return { payments, credits };
};

module.exports = {
  createPeriod,
  getAllPeriods,
  getPeriodById,
  getActivePeriods,
  getActivePeriodsByYear,
  getPeriodsByYear,
  togglePeriodStatus,
  submitPaymentReport,
  submitMultiPaymentReport,
  bulkApproveByGroup,
  getPaymentsByUser,
  getUserPaymentHistory,
  getPeriodResidentStatus,
  getPaymentReportById,
  approvePayment,
  rejectPayment,
  markUserPaid,
  createExpense,
  getAllExpenses,
  createIncome,
  getAllIncomes,
  getFinanceSummary,
  getRecentTransactions,
  getCorridorHandoverStatus,
  createFinanceHandover,
  exportFinanceReport,
};
