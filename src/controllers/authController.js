const logger = require("../utils/logger");
const authService = require("../services/auth.service");
const { z } = require("zod");

// Validation schema for login input
const loginSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * GET /auth/login - Show login page
 */
const getLogin = (req, res) => {
  const messages = req.flash();
  res.render("auth/login", {
    title: "Login",
    error: messages.error ? messages.error[0] : null,
    success: messages.success ? messages.success[0] : null,
  });
};

/**
 * POST /auth/login - Handle login authentication
 */
const postLogin = async (req, res) => {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn("Login validation failed", {
        errors: validation.error.flatten(),
        ip: req.ip,
      });
      req.flash("error", "Phone and password are required");
      return res.redirect("/auth/login");
    }

    const { phone, password } = validation.data;

    // Authenticate user
    const user = await authService.authenticateUser(phone, password);
    if (!user) {
      // Generic error message - do not reveal if user exists or not
      logger.warn("Login failed: authentication unsuccessful", {
        phone,
        ip: req.ip,
      });
      req.flash("error", "Invalid credentials");
      return res.redirect("/auth/login");
    }

    // Create session
    authService.createSession(req, user);

    // Update last login timestamp
    await authService.updateLastLogin(user.id);

    logger.info("User logged in successfully", {
      userId: user.id,
      phone: user.phone,
      roles: user.roles,
    });

    // Determine redirect URL based on roles
    const redirectUrl = authService.getRedirectUrl(user.roles);
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error("Login error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });
    req.flash("error", "An error occurred during login");
    res.redirect("/auth/login");
  }
};

/**
 * GET /auth/logout - Handle logout
 */
const getLogout = async (req, res) => {
  const userId = req.session?.userId;
  const userPhone = req.session?.userPhone;

  const success = await authService.destroySession(req);

  if (success) {
    logger.info("User logged out successfully", {
      userId,
      phone: userPhone,
    });
  }

  res.redirect("/");
};

module.exports = {
  getLogin,
  postLogin,
  getLogout,
};
