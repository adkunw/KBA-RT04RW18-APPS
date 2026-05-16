const logger = require("../utils/logger");
const messageService = require("../services/message.service");
const userService = require("../services/user.service");
const settingService = require("../services/setting.service");
const bcrypt = require("bcrypt");
const { z } = require("zod");

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().optional(),
});

/**
 * GET /portal - Portal home (inject real announcements)
 */
const getPortal = async (req, res) => {
  try {
    const [announcements, unreadCount, settings] = await Promise.all([
      messageService.getAnnouncements(5),
      messageService.getUnreadCount(req.session.userId),
      settingService.getAllSettings()
    ]);

    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;

    res.render("portal/index", {
      title: "Portal",
      user: { id: req.session.userId, name: req.session.userName, language: req.session.userLanguage || "id" },
      announcements,
      unreadCount,
      settings,
      hasAdminAccess,
    });
  } catch (error) {
    logger.error("Error loading portal", { error: error.message });
    res.render("portal/index", {
      title: "Portal",
      user: { id: req.session.userId, name: req.session.userName, language: req.session.userLanguage || "id" },
      announcements: [],
      unreadCount: 0,
      settings: {},
    });
  }
};

/**
 * GET /portal/messages - Warga inbox
 */
const getInbox = async (req, res) => {
  try {
    const messages = await messageService.getInboxForUser(req.session.userId);
    const unreadCount = await messageService.getUnreadCount(req.session.userId);
    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const flash = req.flash();

    res.render("portal/messages/index", {
      title: "My Messages",
      user: { id: req.session.userId, name: req.session.userName },
      messages,
      unreadCount,
      hasAdminAccess,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading inbox", { error: error.message });
    req.flash("error", "Failed to load inbox");
    res.redirect("/portal");
  }
};

/**
 * GET /portal/messages/:messageId - Read a message (mark as read)
 */
const readMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.session.userId;

    const recipient = await messageService.getInboxMessage(messageId, userId);

    if (!recipient) {
      req.flash("error", "Message not found");
      return res.redirect("/portal/messages");
    }

    // Mark as read
    await messageService.markAsRead(messageId, userId);

    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;

    res.render("portal/messages/view", {
      title: recipient.message.title,
      recipient,
      message: recipient.message,
      user: { id: req.session.userId, name: req.session.userName },
      hasAdminAccess,
    });
  } catch (error) {
    logger.error("Error reading message", { error: error.message });
    req.flash("error", "Failed to load message");
    res.redirect("/portal/messages");
  }
};

/**
 * GET /portal/profile - View user profile
 */
const getProfile = async (req, res) => {
  try {
    const profileUser = await userService.getUserById(req.session.userId);
    const hasAdminAccess = req.session.userPermissions?.includes("dashboard.view") || false;
    const flash = req.flash();

    res.render("portal/profile", {
      title: "My Profile",
      user: { id: req.session.userId, name: req.session.userName },
      profileUser,
      hasAdminAccess,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading profile", { error: error.message });
    req.flash("error", "Failed to load profile");
    res.redirect("/portal");
  }
};

/**
 * POST /portal/profile - Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      req.flash("error", "Invalid input data");
      return res.redirect("/portal/profile");
    }

    const { name, password } = validation.data;
    const updateData = { name };

    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    } else if (password && password.length > 0) {
      req.flash("error", "Password must be at least 6 characters if provided");
      return res.redirect("/portal/profile");
    }

    await userService.updateUser(req.session.userId, updateData);

    // Update session name if changed
    if (name !== req.session.userName) {
      req.session.userName = name;
    }

    req.flash("success", "Profile updated successfully");
    res.redirect("/portal/profile");
  } catch (error) {
    logger.error("Error updating profile", { error: error.message });
    req.flash("error", "Failed to update profile");
    res.redirect("/portal/profile");
  }
};

/**
 * POST /portal/settings/language - Update user language
 */
const postChangeLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    if (["id", "en"].includes(language)) {
      await userService.updateUser(req.session.userId, { language });
      req.session.userLanguage = language;
    }
    res.redirect("back"); // Return to the page they were on
  } catch (error) {
    logger.error("Error updating language", { error: error.message });
    res.redirect("/portal");
  }
};

module.exports = {
  getPortal,
  getInbox,
  readMessage,
  getProfile,
  updateProfile,
  postChangeLanguage,
};
