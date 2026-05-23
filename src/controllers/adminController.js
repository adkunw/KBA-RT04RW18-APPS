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

module.exports = {
  getDashboard,
};
