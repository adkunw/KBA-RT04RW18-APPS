const express = require("express");
const activationController = require("../controllers/activation.controller");

const router = express.Router();

/**
 * Activation routes - public (no auth required)
 */

// GET /activate/:token - Show activation form
router.get("/:token", activationController.showActivationForm);

// POST /activate/:token - Process activation
router.post("/:token", activationController.processActivation);

module.exports = router;
