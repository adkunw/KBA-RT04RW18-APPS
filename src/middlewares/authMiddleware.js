const prisma = require("../config/database");

/**
 * Middleware to check if user is authenticated
 * Checks if user session exists and ensures permissions are synced
 */
const isAuthenticated = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      // Sync fresh permissions from database to session
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: {
          status: true,
          corridorId: true,
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || user.status !== "active") {
        req.session.destroy();
        return res.redirect("/auth/login");
      }

      const permissions = user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.name)
      );
      req.session.userPermissions = [...new Set(permissions)];
      req.session.userRoles = user.roles.map((ur) => ur.role.name);
      req.session.userCorridorId = user.corridorId;
    } catch (err) {
      logger.error("Error refreshing session permissions", { error: err.message });
    }

    return next();
  }
  logger.warn("Unauthorized access attempt to protected route", {
    userId: req.session?.userId || null,
    userName: req.session?.userName || null,
    userPhone: req.session?.userPhone || null,
    userRoles: req.session?.userRoles || null,
    ip: req.ip,
    path: req.path,
  });
  res.redirect("/auth/login");
};

/**
 * Middleware to check if user is NOT authenticated
 * Redirects to portal if already logged in
 */
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/portal");
  }
  next();
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
};
