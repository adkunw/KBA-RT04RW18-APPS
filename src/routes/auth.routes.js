const express = require("express");
const authController = require("../controllers/authController");
const {
  isAuthenticated,
  isNotAuthenticated,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * Public routes (Not authenticated)
 */

// GET /auth/login - Show login page
router.get("/login", isNotAuthenticated, authController.getLogin);

// POST /auth/login - Process login
router.post("/login", isNotAuthenticated, authController.postLogin);

/**
 * Protected routes (Authenticated)
 */

// GET /auth/logout - Process logout
router.get("/logout", isAuthenticated, authController.getLogout);

module.exports = router;
