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
    select: { id: true, name: true, phone: true }
  });

  // Get all approved/pending/rejected payments for this period
  const payments = await prisma.paymentReport.findMany({
    where: { periodId },
    include: { reviewer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  let paidCount = 0;
  let unpaidCount = 0;
  let totalCollected = 0;
  
  const breakdown = {
    fixedDues: 0,
    kas: 0,
    others: {}
  };

  const residentStatus = users.map(user => {
    // Find first payment for this user
    const payment = payments.find(p => p.userId === user.id) || null;
    let status = "unpaid"; // unpaid, pending, approved, rejected
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
      user,
      payment,
      paymentStatus: status
    };
  });

  return {
    residents: residentStatus,
    stats: {
      totalUsers: users.length,
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
};
