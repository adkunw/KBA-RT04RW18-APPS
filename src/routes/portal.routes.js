const express = require("express");
const portalController = require("../controllers/portal.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /portal/messages          - Warga inbox
router.get("/messages", isAuthenticated, portalController.getInbox);

// GET /portal/messages/:messageId  - Read a message
router.get("/messages/:messageId", isAuthenticated, portalController.readMessage);

// GET /portal/profile - View profile
router.get("/profile", isAuthenticated, portalController.getProfile);

// POST /portal/profile - Update profile
router.post("/profile", isAuthenticated, portalController.updateProfile);

module.exports = router;
