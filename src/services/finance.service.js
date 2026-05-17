const prisma = require("../config/database");
const logger = require("../utils/logger");
const fs = require("fs");
const path = require("path");

/**
 * Period Management
 */

const createPeriod = async ({ name, month, year, fixedDuesAmount }) => {
  const period = await prisma.financePeriod.create({
    data: { name, month, year, fixedDuesAmount, isActive: true },
  });
  logger.info("Finance period created", { periodId: period.id, name });
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
  const { periodId, hasFixedDues, hasKas, kasAmount, otherDescription, otherAmount, filePath, fileName } = data;

  const period = await getPeriodById(periodId);
  if (!period) throw new Error("Period not found");
  if (!period.isActive) throw new Error("Period is already closed");

  const existingPayment = await prisma.paymentReport.findFirst({
    where: { userId, periodId, status: { in: ["pending", "approved"] } },
  });

  if (existingPayment) {
    throw new Error("Anda sudah mengirim laporan untuk periode ini");
  }

  const fixedDuesAmount = hasFixedDues ? period.fixedDuesAmount : 0;
  const kas = hasKas ? Number(kasAmount) : 0;
  const other = Number(otherAmount) || 0;
  const totalAmount = fixedDuesAmount + kas + other;

  const payment = await prisma.paymentReport.create({
    data: {
      userId,
      periodId,
      hasFixedDues,
      fixedDuesAmount,
      hasKas,
      kasAmount: kas,
      otherDescription: otherDescription || null,
      otherAmount: other,
      totalAmount,
      proofFilePath: filePath,
      status: "pending",
    },
  });

  logger.info("Payment report submitted", { paymentId: payment.id, userId, periodId });
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

const getPeriodResidentStatus = async (periodId) => {
  // Get all active users except super_admin
  const users = await prisma.user.findMany({
    where: { 
      status: "active",
      roles: { none: { role: { name: "super_admin" } } }
    },
    select: { 
      id: true, 
      name: true, 
      phone: true, 
      houseNumber: true, 
      familyDetails: true,
      spouseName: true,
      children: true,
      spousePhone: true
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
        ...paymentData,
      },
    });
    logger.info("Payment report manually created with details and approved by bendahara", { paymentId: payment.id, userId, reviewerId });
    return payment;
  }
};

const createExpense = async ({ amount, description, category, recipient, date, proofFilePath, createdById }) => {
  const expense = await prisma.financeExpense.create({
    data: {
      amount: Number(amount),
      description,
      category,
      recipient,
      date: new Date(date),
      proofFilePath: proofFilePath || null,
      createdById,
    },
  });
  logger.info("Finance expense recorded", { expenseId: expense.id, amount, category });
  return expense;
};

const getAllExpenses = async () => {
  return await prisma.financeExpense.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });
};

const createIncome = async ({ amount, description, category, source, date, proofFilePath, createdById }) => {
  const income = await prisma.financeIncome.create({
    data: {
      amount: Number(amount),
      description,
      category,
      source,
      date: new Date(date),
      proofFilePath: proofFilePath || null,
      createdById,
    },
  });
  logger.info("Finance manual income recorded", { incomeId: income.id, amount, category });
  return income;
};

const getAllIncomes = async () => {
  return await prisma.financeIncome.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });
};

const getFinanceSummary = async () => {
  // Total Citizen Payments
  const citizenIncomeResult = await prisma.paymentReport.aggregate({
    where: { status: "approved" },
    _sum: { totalAmount: true },
  });
  const totalCitizenIncome = citizenIncomeResult._sum.totalAmount || 0;

  // Total Manual Other Income
  const manualIncomeResult = await prisma.financeIncome.aggregate({
    _sum: { amount: true },
  });
  const totalManualIncome = manualIncomeResult._sum.amount || 0;

  const totalIncome = totalCitizenIncome + totalManualIncome;

  // Total Expense
  const expenseResult = await prisma.financeExpense.aggregate({
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

const getRecentTransactions = async (limit = 10) => {
  const [approvedPayments, manualIncomes, expenses] = await Promise.all([
    prisma.paymentReport.findMany({
      where: { status: "approved" },
      include: {
        user: { select: { id: true, name: true } },
        period: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.financeIncome.findMany({
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
    }),
    prisma.financeExpense.findMany({
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
      title: `Iuran Bulanan - ${p.period.name}`,
      subtitle: `Dari Warga: ${p.user.name}`,
      amount: p.totalAmount,
      date: p.createdAt,
      proofFilePath: p.proofFilePath,
    })),
    ...manualIncomes.map(i => ({
      id: i.id,
      type: "income",
      title: `Pemasukan Lain - ${i.category} (${i.description})`,
      subtitle: `Sumber: ${i.source}`,
      amount: i.amount,
      date: i.date,
      proofFilePath: i.proofFilePath,
    })),
    ...expenses.map(e => ({
      id: e.id,
      type: "expense",
      title: `Pengeluaran - ${e.category} (${e.description})`,
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
      category: `Iuran Bulanan - ${p.period.name}`,
      description: "Pembayaran iuran bulanan wajib warga",
      entity: p.user.name,
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
      recordedBy: i.createdBy.name,
    })),
    ...expenses.map(e => ({
      date: e.date,
      type: "Pengeluaran",
      category: e.category,
      description: e.description,
      entity: e.recipient,
      amount: -e.amount,
      recordedBy: e.createdBy.name,
    })),
  ];

  return records.sort((a, b) => new Date(a.date) - new Date(b.date));
};

module.exports = {
  createPeriod,
  getAllPeriods,
  getPeriodById,
  getActivePeriods,
  togglePeriodStatus,
  submitPaymentReport,
  getPaymentsByUser,
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
  exportFinanceReport,
};
