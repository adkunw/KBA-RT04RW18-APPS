const { z } = require("zod");
const logger = require("../utils/logger");
const messageService = require("../services/message.service");

// Validation
const createMessageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["personal", "broadcast", "announcement"], {
    errorMap: () => ({ message: "Invalid message type" }),
  }),
  recipientIds: z.union([z.string(), z.array(z.string())]).optional(),
});

/**
 * GET /admin/messages - List all messages
 */
const listMessages = async (req, res) => {
  try {
    const { type } = req.query;
    const validTypes = ["personal", "broadcast", "announcement"];
    const filterType = validTypes.includes(type) ? type : null;

    const messages = await messageService.listMessages(filterType);
    const messages_flash = req.flash();

    res.render("admin/messages/index", {
      title: "Messages",
      messages,
      filterType,
      user: { id: req.session.userId, name: req.session.userName },
      error: messages_flash.error?.[0] || null,
      success: messages_flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error listing messages", { error: error.message, stack: error.stack });
    req.flash("error", "Failed to load messages");
    res.redirect("/admin");
  }
};

/**
 * GET /admin/messages/create - Show compose form
 */
const showCreateForm = async (req, res) => {
  try {
    const activeUsers = await messageService.getActiveUsers(req.session.userId);
    const flash = req.flash();

    res.render("admin/messages/create", {
      title: "Compose Message",
      activeUsers,
      user: { id: req.session.userId, name: req.session.userName },
      error: flash.error?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading compose form", { error: error.message, stack: error.stack });
    req.flash("error", "Failed to load form");
    res.redirect("/admin/messages");
  }
};

/**
 * POST /admin/messages - Submit new message
 */
const createMessage = async (req, res) => {
  try {
    const validation = createMessageSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", validation.error.errors.map((e) => e.message).join(", "));
      return res.redirect("/admin/messages/create");
    }

    let { title, content, type, recipientIds } = validation.data;

    // Normalize recipientIds to array
    if (type === "personal") {
      if (!recipientIds) {
        req.flash("error", "Please select at least one recipient");
        return res.redirect("/admin/messages/create");
      }
      recipientIds = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
    } else {
      recipientIds = [];
    }

    await messageService.createMessage(req.session.userId, {
      title,
      content,
      type,
      recipientIds,
    });

    const typeLabels = { personal: "Personal message", broadcast: "Broadcast", announcement: "Announcement" };
    req.flash("success", `${typeLabels[type]} "${title}" sent successfully`);
    res.redirect("/admin/messages");
  } catch (error) {
    logger.error("Error creating message", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Failed to send message");
    res.redirect("/admin/messages/create");
  }
};

/**
 * GET /admin/messages/:id - View message detail
 */
const viewMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await messageService.getMessageById(id);

    if (!message) {
      req.flash("error", "Message not found");
      return res.redirect("/admin/messages");
    }

    const flash = req.flash();
    const readCount = message.recipients.filter((r) => r.readAt).length;
    const unreadCount = message.recipients.length - readCount;

    res.render("admin/messages/view", {
      title: message.title,
      message,
      readCount,
      unreadCount,
      user: { id: req.session.userId, name: req.session.userName },
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error viewing message", { error: error.message, stack: error.stack });
    req.flash("error", "Failed to load message");
    res.redirect("/admin/messages");
  }
};

/**
 * POST /admin/messages/:id/delete - Delete message
 */
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await messageService.deleteMessage(id);
    req.flash("success", "Message deleted successfully");
    res.redirect("/admin/messages");
  } catch (error) {
    logger.error("Error deleting message", { error: error.message, stack: error.stack });
    req.flash("error", error.message || "Failed to delete message");
    res.redirect("/admin/messages");
  }
};

module.exports = {
  listMessages,
  showCreateForm,
  createMessage,
  viewMessage,
  deleteMessage,
};
