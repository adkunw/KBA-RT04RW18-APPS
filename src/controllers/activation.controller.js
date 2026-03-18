const logger = require("../utils/logger");
const activationService = require("../services/activation.service");
const { z } = require("zod");

// Validation schema
const activationSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    passwordConfirm: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });

/**
 * GET /activate/:token - Show activation form
 */
const showActivationForm = async (req, res) => {
  try {
    const { token } = req.params;

    // Validate token exists and is not expired/used
    const activationToken = await activationService.validateToken(token);
    if (!activationToken) {
      logger.warn("Invalid activation link accessed", {
        token: token.substring(0, 8) + "...",
      });
      return res.render("auth/activate-error", {
        title: "Activation Failed",
        error: "This activation link is invalid or has expired.",
      });
    }

    const user = activationToken.user;

    res.render("auth/activate", {
      title: "Activate Account",
      token,
      user: {
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    logger.error("Error showing activation form", { error: error.message });
    res.render("auth/activate-error", {
      title: "Activation Error",
      error: "An error occurred. Please try again later.",
    });
  }
};

/**
 * POST /activate/:token - Process activation
 */
const processActivation = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;

    // Validate input
    const validation = activationSchema.safeParse({
      password,
      passwordConfirm,
    });

    if (!validation.success) {
      logger.warn("Activation validation failed", {
        errors: validation.error.flatten(),
        token: token.substring(0, 8) + "...",
      });
      req.flash(
        "error",
        validation.error.flatten().fieldErrors[
          Object.keys(validation.error.flatten().fieldErrors)[0]
        ][0],
      );
      return res.redirect(`/activate/${token}`);
    }

    // Activate user
    const user = await activationService.activateUser(token, password);

    logger.info("User activated successfully", {
      userId: user.id,
      phone: user.phone,
    });

    // Render success page
    res.render("auth/activate-success", {
      title: "Account Activated",
      user: {
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    logger.warn("Activation error", {
      error: error.message,
      token: req.params.token.substring(0, 8) + "...",
    });

    let errorMessage = "Activation failed. Please try again.";
    if (error.message.includes("expired")) {
      errorMessage = "The activation link has expired.";
    } else if (error.message.includes("invalid")) {
      errorMessage = "Invalid activation link.";
    } else if (error.message.includes("already")) {
      errorMessage = "This account is already activated.";
    }

    res.render("auth/activate-error", {
      title: "Activation Failed",
      error: errorMessage,
    });
  }
};

module.exports = {
  showActivationForm,
  processActivation,
};
