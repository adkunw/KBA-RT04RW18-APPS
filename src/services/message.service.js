const prisma = require("../config/database");
const logger = require("../utils/logger");

/**
 * Create a new message / announcement
 * @param {string} senderId
 * @param {object} data - { title, content, type, recipientIds }
 */
const createMessage = async (senderId, { title, content, type, recipientIds = [] }) => {
  return await prisma.$transaction(async (tx) => {
    // Create the message
    const message = await tx.message.create({
      data: { senderId, title, content, type },
    });

    if (type === "personal") {
      // Insert specified recipients
      if (recipientIds.length === 0) {
        throw new Error("Personal message requires at least one recipient");
      }
      await tx.messageRecipient.createMany({
        data: recipientIds.map((userId) => ({
          messageId: message.id,
          userId,
        })),
        skipDuplicates: true,
      });
    } else if (type === "broadcast") {
      // Insert ALL active users as recipients (excluding the sender)
      const activeUsers = await tx.user.findMany({
        where: {
          status: "active",
          id: { not: senderId },
        },
        select: { id: true },
      });
      if (activeUsers.length > 0) {
        await tx.messageRecipient.createMany({
          data: activeUsers.map((u) => ({
            messageId: message.id,
            userId: u.id,
          })),
          skipDuplicates: true,
        });
      }
    }
    // type === "announcement": no recipients needed — public

    logger.info("Message created", {
      messageId: message.id,
      type,
      senderId,
      recipientCount: type === "announcement" ? "all (public)" : recipientIds.length,
    });

    return message;
  });
};

/**
 * List all messages (admin view), optionally filtered by type
 */
const listMessages = async (type = null) => {
  return await prisma.message.findMany({
    where: type ? { type } : {},
    include: {
      sender: { select: { id: true, name: true } },
      _count: { select: { recipients: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Get a single message with full detail (recipients + read status)
 */
const getMessageById = async (messageId) => {
  return await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      sender: { select: { id: true, name: true } },
      recipients: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
};

/**
 * Delete a message by ID
 */
const deleteMessage = async (messageId) => {
  await prisma.message.delete({ where: { id: messageId } });
  logger.info("Message deleted", { messageId });
};

/**
 * Get inbox messages for a specific user (personal + broadcast)
 */
const getInboxForUser = async (userId) => {
  return await prisma.messageRecipient.findMany({
    where: { userId },
    include: {
      message: {
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Get a single inbox item and mark as read
 */
const getInboxMessage = async (messageId, userId) => {
  const recipient = await prisma.messageRecipient.findUnique({
    where: { messageId_userId: { messageId, userId } },
    include: {
      message: {
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
    },
  });
  return recipient;
};

/**
 * Mark a message as read for a user
 */
const markAsRead = async (messageId, userId) => {
  const existing = await prisma.messageRecipient.findUnique({
    where: { messageId_userId: { messageId, userId } },
  });
  if (!existing || existing.readAt) return; // already read or not found

  await prisma.messageRecipient.update({
    where: { messageId_userId: { messageId, userId } },
    data: { readAt: new Date() },
  });
};

/**
 * Get latest announcements (for portal home)
 * @param {number} limit
 */
const getAnnouncements = async (limit = 5) => {
  return await prisma.message.findMany({
    where: { type: "announcement" },
    include: {
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

/**
 * Get unread message count for a user
 */
const getUnreadCount = async (userId) => {
  return await prisma.messageRecipient.count({
    where: { userId, readAt: null },
  });
};

/**
 * Get all active users for recipient selection
 */
const getActiveUsers = async (excludeId = null) => {
  return await prisma.user.findMany({
    where: {
      status: "active",
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });
};

module.exports = {
  createMessage,
  listMessages,
  getMessageById,
  deleteMessage,
  getInboxForUser,
  getInboxMessage,
  markAsRead,
  getAnnouncements,
  getUnreadCount,
  getActiveUsers,
};
