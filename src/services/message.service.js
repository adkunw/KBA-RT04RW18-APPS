const prisma = require("../config/database");
const logger = require("../utils/logger");

/**
 * Create a new message / announcement
 * @param {string} senderId
 * @param {object} data - { title, content, type, recipientIds, corridorId }
 */
const createMessage = async (senderId, { title, content, type, recipientIds = [], corridorId = null }) => {
  return await prisma.$transaction(async (tx) => {
    // Create the message
    const message = await tx.message.create({
      data: { senderId, title, content, type, corridorId },
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
      // Insert active users as recipients (excluding the sender)
      // If corridorId is present, filter active users belonging to that corridor
      const userFilter = {
        status: "active",
        id: { not: senderId },
      };
      if (corridorId) {
        userFilter.corridorId = corridorId;
      }

      const activeUsers = await tx.user.findMany({
        where: userFilter,
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
    // type === "announcement": no recipients needed in inbox

    logger.info("Message created", {
      messageId: message.id,
      type,
      senderId,
      corridorId,
      recipientCount: type === "announcement" ? (corridorId ? "corridor" : "all (public)") : recipientIds.length,
    });

    return message;
  });
};

/**
 * List all messages (admin view), optionally filtered by type and corridorId
 */
const listMessages = async (type = null, corridorId = null) => {
  const where = {};
  if (type) where.type = type;
  if (corridorId) where.corridorId = corridorId;

  return await prisma.message.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true } },
      corridor: { select: { id: true, name: true } },
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
      corridor: { select: { id: true, name: true } },
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
 * Get paginated inbox messages for a specific user (personal + broadcast) with search
 * @param {object} params - { userId, page, limit, search }
 */
const getPaginatedInboxForUser = async ({ userId, page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  const where = {
    userId,
  };

  if (search && search.trim().length > 0) {
    const term = search.trim();
    where.message = {
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { content: { contains: term, mode: "insensitive" } },
        { sender: { name: { contains: term, mode: "insensitive" } } },
      ],
    };
  }

  const [messages, totalCount] = await Promise.all([
    prisma.messageRecipient.findMany({
      where,
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true } },
            corridor: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.messageRecipient.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return {
    messages,
    totalCount,
    totalPages,
    currentPage: page,
  };
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
          corridor: { select: { id: true, name: true } },
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
          corridor: { select: { id: true, name: true } },
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
 * Shows global announcements (corridorId: null) and corridor announcements matching user's corridor,
 * or all announcements if canReadAll is true.
 * @param {number} limit
 * @param {string|null} userCorridorId
 * @param {boolean} canReadAll
 */
const getAnnouncements = async (limit = 5, userCorridorId = null, canReadAll = false) => {
  const where = {
    type: "announcement",
  };

  if (!canReadAll) {
    if (userCorridorId) {
      where.OR = [
        { corridorId: null },
        { corridorId: userCorridorId },
      ];
    } else {
      // If user has no corridor, only show global announcements
      where.corridorId = null;
    }
  }

  return await prisma.message.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true } },
      corridor: { select: { id: true, name: true } },
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
    select: {
      id: true,
      name: true,
      phone: true,
      houseNumber: true,
      corridor: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
};

/**
 * Get paginated announcements (for portal messages archive)
 * @param {object} params - { page, limit, userCorridorId, search, canReadAll }
 */
const getPaginatedAnnouncements = async ({ page = 1, limit = 10, userCorridorId = null, search = "", canReadAll = false }) => {
  const skip = (page - 1) * limit;

  const where = {
    type: "announcement",
  };

  // Corridor scope filter
  if (!canReadAll) {
    if (userCorridorId) {
      where.OR = [
        { corridorId: null },
        { corridorId: userCorridorId },
      ];
    } else {
      where.corridorId = null;
    }
  }

  // Search filter
  if (search && search.trim().length > 0) {
    const term = search.trim();
    const searchFilter = [
      { title: { contains: term, mode: "insensitive" } },
      { content: { contains: term, mode: "insensitive" } },
    ];

    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        { OR: searchFilter },
      ];
      delete where.OR;
    } else if (where.corridorId === null) {
      where.AND = [
        { corridorId: null },
        { OR: searchFilter },
      ];
      delete where.corridorId;
    } else {
      where.OR = searchFilter;
    }
  }

  const [announcements, totalCount] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true } },
        corridor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.message.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return {
    announcements,
    totalCount,
    totalPages,
    currentPage: page,
  };
};

module.exports = {
  createMessage,
  listMessages,
  getMessageById,
  deleteMessage,
  getInboxForUser,
  getPaginatedInboxForUser,
  getInboxMessage,
  markAsRead,
  getAnnouncements,
  getPaginatedAnnouncements,
  getUnreadCount,
  getActiveUsers,
};
