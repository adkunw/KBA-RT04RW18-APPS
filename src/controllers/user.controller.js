const logger = require("../utils/logger");
const userService = require("../services/user.service");
const activationService = require("../services/activation.service");
const prisma = require("../config/database");
const { z } = require("zod");

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(1, "Phone is required"),
  roleId: z.string().min(1, "Role is required"),
});

/**
 * GET /admin/users - List all users
 */
const listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const users = await userService.listUsers(skip, limit);
    const totalCount = await userService.countUsers();
    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/users/index", {
      title: "User Management",
      users,
      currentPage: page,
      totalPages,
      totalCount,
      user: {
        id: req.session.userId,
        name: req.session.userName,
      },
    });
  } catch (error) {
    logger.error("Error listing users", { error: error.message });
    req.flash("error", "Failed to load users");
    res.redirect("/admin");
  }
};

/**
 * GET /admin/users/create - Show create user form
 */
const showCreateForm = async (req, res) => {
  try {
    // Get all available roles
    const roles = await prisma.role.findMany();

    res.render("admin/users/create", {
      title: "Create User",
      roles,
      user: {
        id: req.session.userId,
        name: req.session.userName,
      },
    });
  } catch (error) {
    logger.error("Error loading create form", { error: error.message });
    req.flash("error", "Failed to load form");
    res.redirect("/admin/users");
  }
};

/**
 * POST /admin/users - Create new user
 */
const createUser = async (req, res) => {
  try {
    // Validate input
    const validation = createUserSchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn("User creation validation failed", {
        errors: validation.error.flatten(),
        adminId: req.session.userId,
      });
      req.flash("error", "Invalid input. Please check your entries.");
      return res.redirect("/admin/users/create");
    }

    const { name, phone, roleId } = validation.data;

    // Create user and token
    const { user, activationToken } = await userService.createUser(
      { name, phone },
      roleId,
    );

    // Generate activation link
    const activationLink = `${process.env.APP_URL || "http://localhost:3000"}/activate/${activationToken.token}`;

    logger.info("User created successfully", {
      userId: user.id,
      createdBy: req.session.userId,
    });

    // Render confirmation page with activation link
    res.render("admin/users/created", {
      title: "User Created",
      user,
      activationLink,
      activationToken: activationToken.token,
    });
  } catch (error) {
    if (error.message.includes("already exists")) {
      logger.warn("Duplicate phone during user creation", {
        phone: req.body.phone,
        adminId: req.session.userId,
      });
      req.flash("error", "Phone number already exists");
    } else {
      logger.error("Error creating user", { error: error.message });
      req.flash("error", error.message || "Failed to create user");
    }
    res.redirect("/admin/users/create");
  }
};

/**
 * GET /admin/users/:id - View user details
 */
const viewUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/admin/users");
    }

    res.render("admin/users/view", {
      title: "User Details",
      user,
      viewedUser: user,
    });
  } catch (error) {
    logger.error("Error viewing user", { error: error.message });
    req.flash("error", "Failed to load user");
    res.redirect("/admin/users");
  }
};

module.exports = {
  listUsers,
  showCreateForm,
  createUser,
  viewUser,
};
