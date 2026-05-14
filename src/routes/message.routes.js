const express = require("express");
const messageController = require("../controllers/message.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { requireAnyPermission } = require("../middlewares/rbacMiddleware");

const router = express.Router();

const canRead = [isAuthenticated, requireAnyPermission(["message.read", "message.create"])];
const canCreate = [isAuthenticated, requireAnyPermission(["message.create"])];

// GET  /admin/messages          - List all messages
router.get("/", ...canRead, messageController.listMessages);

// GET  /admin/messages/create   - Compose form
router.get("/create", ...canCreate, messageController.showCreateForm);

// POST /admin/messages          - Submit message
router.post("/", ...canCreate, messageController.createMessage);

// GET  /admin/messages/:id      - View detail
router.get("/:id", ...canRead, messageController.viewMessage);

// POST /admin/messages/:id/delete
router.post("/:id/delete", ...canCreate, messageController.deleteMessage);

module.exports = router;
