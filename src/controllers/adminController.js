const logger = require("../utils/logger");
const { requirePermission } = require("../middlewares/rbacMiddleware");

const prisma = require("../config/database");

/**
 * GET /admin - Admin dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const [totalUsers, activeUsers, pendingUsers, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "active" } }),
      prisma.user.count({ where: { status: "created" } }),
      prisma.user.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
    ]);

    logger.info("Admin dashboard accessed", {
      userId: req.session.userId,
    });

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      user: {
        id: req.session.userId,
        name: req.session.userName,
        roles: req.session.userRoles,
      },
      stats: {
        totalUsers,
        activeUsers,
        pendingUsers,
      },
      recentUsers,
    });
  } catch (error) {
    logger.error("Error loading dashboard", { error: error.message, stack: error.stack });
    res.status(500).send("Error loading dashboard");
  }
};

/**
 * GET /admin/tutorial - Admin tutorial page
 */
const getTutorial = async (req, res) => {
  try {
    const userPermissions = req.session.userPermissions || [];

    res.render("admin/tutorial/index", {
      title: "Panduan & Tutorial Admin",
      currentPage: "tutorial",
      user: {
        id: req.session.userId,
        name: req.session.userName,
        roles: req.session.userRoles,
      },
      userPermissions,
    });
  } catch (error) {
    logger.error("Error loading admin tutorial", { error: error.message, stack: error.stack });
    req.flash("error", "Gagal memuat halaman panduan admin");
    res.redirect("/admin");
  }
};

module.exports = {
  getDashboard,
  getTutorial,
};
