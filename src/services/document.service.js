const prisma = require("../config/database");
const logger = require("../utils/logger");
const fs = require("fs");
const path = require("path");

/**
 * Create a new document record after upload
 * @param {string} userId - Uploader user ID
 * @param {object} data - { title, type, fileName, filePath }
 */
const createDocument = async (userId, { title, type, fileName, filePath }) => {
  const document = await prisma.document.create({
    data: {
      userId,
      title,
      type,
      fileName,
      filePath,
      status: "pending",
    },
  });

  logger.info("Document uploaded", { documentId: document.id, userId, type });
  return document;
};

/**
 * Get all documents uploaded by a specific user (own documents)
 * @param {string} userId
 * @param {string|null} status - Optional status filter
 */
const getDocumentsByUser = async (userId, status = null) => {
  return await prisma.document.findMany({
    where: { 
      userId,
      ...(status ? { status } : {})
    },
    include: {
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Get a single document by ID
 * @param {string} documentId
 */
const getDocumentById = async (documentId) => {
  return await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      uploader: { select: { id: true, name: true, phone: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
};

/**
 * Get all documents (admin view), with optional status filter
 * @param {string|null} status - Optional status filter
 */
const getAllDocuments = async (status = null) => {
  return await prisma.document.findMany({
    where: status ? { status } : {},
    include: {
      uploader: { select: { id: true, name: true, phone: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Approve a document
 * @param {string} documentId
 * @param {string} reviewerId - User ID of the reviewer
 * @param {string|null} notes - Optional approval notes
 */
const approveDocument = async (documentId, reviewerId, notes = null) => {
  const document = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      notes: notes || null,
    },
  });

  logger.info("Document approved", { documentId, reviewerId });
  return document;
};

/**
 * Reject a document
 * @param {string} documentId
 * @param {string} reviewerId - User ID of the reviewer
 * @param {string|null} notes - Optional rejection reason
 */
const rejectDocument = async (documentId, reviewerId, notes = null) => {
  const document = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      notes: notes || null,
    },
  });

  logger.info("Document rejected", { documentId, reviewerId });
  return document;
};

/**
 * Delete a document (removes DB record and physical file)
 * @param {string} documentId
 */
const deleteDocument = async (documentId) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // Delete physical file
  const absolutePath = path.join(
    __dirname,
    "../../public",
    document.filePath
  );
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }

  await prisma.document.delete({ where: { id: documentId } });
  logger.info("Document deleted", { documentId, filePath: document.filePath });
};

/**
 * Count documents by status (for admin dashboard stats)
 */
const getDocumentStats = async () => {
  const [total, pending, approved, rejected] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: "pending" } }),
    prisma.document.count({ where: { status: "approved" } }),
    prisma.document.count({ where: { status: "rejected" } }),
  ]);

  return { total, pending, approved, rejected };
};

/**
 * Count documents by status for a specific user
 * @param {string} userId
 */
const getDocumentStatsByUser = async (userId) => {
  const [total, pending, approved, rejected] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.document.count({ where: { userId, status: "pending" } }),
    prisma.document.count({ where: { userId, status: "approved" } }),
    prisma.document.count({ where: { userId, status: "rejected" } }),
  ]);

  return { total, pending, approved, rejected };
};

module.exports = {
  createDocument,
  getDocumentsByUser,
  getDocumentById,
  getAllDocuments,
  approveDocument,
  rejectDocument,
  deleteDocument,
  getDocumentStats,
  getDocumentStatsByUser,
};
