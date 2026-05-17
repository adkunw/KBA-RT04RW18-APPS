const logger = require("../utils/logger");
const userService = require("../services/user.service");
const activationService = require("../services/activation.service");
const documentService = require("../services/document.service");
const prisma = require("../config/database");
const { z } = require("zod");

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(1, "Phone is required"),
  roleId: z.string().min(1, "Role is required"),
});

const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(1, "Phone is required"),
  status: z.enum(["created", "active", "inactive", "blocked"]),
  roleId: z.string().min(1, "Role is required"),
  houseNumber: z.string().optional().nullable(),
  familyDetails: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  nik: z.string().optional().nullable(),
  kkNumber: z.string().optional().nullable(),
  spouseName: z.string().optional().nullable(),
  spousePhone: z.string().optional().nullable(),
  spouseBirthDate: z.string().optional().nullable(),
  spouseNik: z.string().optional().nullable(),
  children: z.any().optional(),
});

/**
 * GET /admin/users - List all users
 */
const listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const status = req.query.status || "";
    const roleId = req.query.roleId || "";

    const filters = { search, status, roleId };

    const users = await userService.listUsers(skip, limit, filters);
    const totalCount = await userService.countUsers(filters);
    const totalPages = Math.ceil(totalCount / limit);

    // Get all available roles for the filter dropdown
    const roles = await prisma.role.findMany();

    res.render("admin/users/index", {
      title: "User Management",
      users,
      roles,
      currentPage: page,
      totalPages,
      totalCount,
      search,
      status,
      roleId,
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
    const flash = req.flash();

    res.render("admin/users/create", {
      title: "Create User",
      roles,
      user: {
        id: req.session.userId,
        name: req.session.userName,
      },
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
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

    const approvedDocuments = await documentService.getDocumentsByUser(id, "approved");

    let activationLink = null;
    if (user.status === "created") {
      const tokenRecord = await prisma.activationToken.findFirst({
        where: { userId: id, usedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (tokenRecord) {
        activationLink = `${process.env.APP_URL || "http://localhost:3000"}/activate/${tokenRecord.token}`;
      }
    }

    res.render("admin/users/view", {
      title: "User Details",
      user,
      viewedUser: user,
      activationLink,
      approvedDocuments,
    });
  } catch (error) {
    logger.error("Error viewing user", { error: error.message });
    req.flash("error", "Failed to load user");
    res.redirect("/admin/users");
  }
};

/**
 * POST /admin/users/:id/reset-password - Reset password and generate new token
 */
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/admin/users");
    }

    // Set user status to created and wipe password
    await prisma.user.update({
      where: { id },
      data: { status: "created", password: null },
    });

    // Invalidate old unused tokens
    await prisma.activationToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new token
    await activationService.createActivationToken(id);

    req.flash("success", `Password reset for ${user.name}. New activation link generated.`);
    res.redirect(`/admin/users/${id}`);
  } catch (error) {
    logger.error("Error resetting password", { error: error.message });
    req.flash("error", "Failed to reset password");
    res.redirect(`/admin/users/${req.params.id}`);
  }
};

/**
 * GET /admin/users/:id/edit - Show edit form
 */
const showEditForm = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/admin/users");
    }

    const roles = await prisma.role.findMany();
    const flash = req.flash();

    res.render("admin/users/edit", {
      title: "Edit User",
      editUser: user,
      roles,
      user: { id: req.session.userId, name: req.session.userName },
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading edit form", { error: error.message });
    req.flash("error", "Failed to load edit form");
    res.redirect("/admin/users");
  }
};

/**
 * POST /admin/users/:id/edit - Update user
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = updateUserSchema.safeParse(req.body);

    if (!validation.success) {
      req.flash("error", "Invalid input data");
      return res.redirect(`/admin/users/${id}/edit`);
    }

    const { 
      name, 
      phone, 
      status, 
      roleId, 
      houseNumber, 
      familyDetails,
      birthDate,
      nik,
      kkNumber,
      spouseName,
      spousePhone,
      spouseBirthDate,
      spouseNik
    } = validation.data;

    // Parse dynamic children array from req.body
    const parseChildren = (body) => {
      const { childName, childBirthDate, childNik } = body;
      if (!childName) return [];
      
      const names = Array.isArray(childName) ? childName : [childName];
      const birthDates = Array.isArray(childBirthDate) ? childBirthDate : [childBirthDate];
      const niks = Array.isArray(childNik) ? childNik : [childNik];
      
      const children = [];
      for (let i = 0; i < names.length; i++) {
        const name = (names[i] || "").trim();
        if (name) {
          children.push({
            name,
            birthDate: (birthDates[i] || "").trim() || null,
            nik: (niks[i] || "").trim() || null
          });
        }
      }
      return children;
    };

    const parsedChildren = parseChildren(req.body);

    // Check phone uniqueness
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser && existingUser.id !== id) {
      req.flash("error", "Phone number already used by another user");
      return res.redirect(`/admin/users/${id}/edit`);
    }

    // Update user basic data
    await prisma.user.update({
      where: { id },
      data: { 
        name, 
        phone, 
        status, 
        houseNumber, 
        familyDetails,
        birthDate,
        nik,
        kkNumber,
        spouseName,
        spousePhone,
        spouseBirthDate,
        spouseNik,
        children: parsedChildren
      },
    });

    // Update role (replace existing roles)
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.userRole.create({
      data: { userId: id, roleId },
    });

    req.flash("success", "User updated successfully");
    res.redirect(`/admin/users/${id}`);
  } catch (error) {
    logger.error("Error updating user", { error: error.message });
    req.flash("error", "Failed to update user");
    res.redirect(`/admin/users/${req.params.id}/edit`);
  }
};

// ============================================================
// BULK IMPORT CONTROLLERS (EXCEL / CSV)
// ============================================================

// Robust CSV Parser
const parseCSV = (content) => {
  const lines = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r" || char === "\n") {
        if (char === "\r" && nextChar === "\n") {
          i++; // skip \n
        }
        currentRow.push(currentField.trim());
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
      lines.push(currentRow);
    }
  }

  return lines;
};

/**
 * GET /admin/users/import/template - Download CSV Template
 */
const downloadImportTemplate = (req, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="template_bulk_warga.csv"');
  // UTF-8 BOM to support proper opening in Excel without character issues
  res.write("\uFEFF");
  res.write("Nama,Telepon,Nomor Rumah\n");
  res.write("Budi Santoso,08123456789,B-12\n");
  res.write("Siti Aminah,08987654321,C-05\n");
  res.end();
};

/**
 * POST /admin/users/import/upload - Upload and parse CSV
 */
const uploadAndReviewImport = async (req, res) => {
  try {
    if (!req.file) {
      req.flash("error", "Pilih berkas CSV terlebih dahulu.");
      return res.redirect("/admin/users");
    }

    const csvContent = req.file.buffer.toString("utf-8");
    const rows = parseCSV(csvContent);

    if (rows.length < 2) {
      req.flash("error", "Berkas CSV tidak memiliki baris data yang valid.");
      return res.redirect("/admin/users");
    }

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const nameIdx = headers.indexOf("nama");
    const phoneIdx = headers.indexOf("telepon");
    const houseNumberIdx = headers.indexOf("nomor rumah");

    if (nameIdx === -1 || phoneIdx === -1 || houseNumberIdx === -1) {
      req.flash("error", "Format header CSV salah. Harus memiliki kolom: Nama, Telepon, dan Nomor Rumah.");
      return res.redirect("/admin/users");
    }

    const entries = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Skip empty rows
      if (!row || row.length === 0 || row.join("").trim() === "") continue;

      const name = row[nameIdx] || "";
      const phone = (row[phoneIdx] || "").trim().replace(/[-\s]/g, ""); // Clean formatting like dashes/spaces
      const houseNumber = (row[houseNumberIdx] || "").trim();

      if (!name || !phone) continue;

      entries.push({ name, phone, houseNumber, roleName: "warga" });
    }

    if (entries.length === 0) {
      req.flash("error", "Tidak ada data warga yang valid untuk diimport.");
      return res.redirect("/admin/users");
    }

    req.session.tempImportData = entries;
    res.redirect("/admin/users/import/review");
  } catch (error) {
    logger.error("Error parsing import file", { error: error.message });
    req.flash("error", "Gagal memproses berkas CSV. Pastikan formatnya benar.");
    res.redirect("/admin/users");
  }
};

/**
 * GET /admin/users/import/review - Show comparison table and select rows
 */
const showImportReview = async (req, res) => {
  try {
    const entries = req.session.tempImportData;
    if (!entries || entries.length === 0) {
      req.flash("error", "Tidak ada data review. Silakan unggah berkas CSV kembali.");
      return res.redirect("/admin/users");
    }

    // Map entries with db check
    const reviewList = await Promise.all(
      entries.map(async (entry, index) => {
        const existingUser = await prisma.user.findUnique({
          where: { phone: entry.phone },
          include: { roles: { include: { role: true } } }
        });

        return {
          index,
          name: entry.name,
          phone: entry.phone,
          houseNumber: entry.houseNumber,
          roleName: entry.roleName || "warga",
          exists: !!existingUser,
          dbName: existingUser ? existingUser.name : null,
          dbHouseNumber: existingUser ? existingUser.houseNumber : null,
          dbRole: existingUser && existingUser.roles[0] ? existingUser.roles[0].role.name : null,
        };
      })
    );

    // Get roles list to map correctly
    const roles = await prisma.role.findMany();

    res.render("admin/users/import-review", {
      title: "Review Bulk Import Warga",
      reviewList,
      roles,
      user: { id: req.session.userId, name: req.session.userName },
      error: req.flash("error")?.[0] || null,
      success: req.flash("success")?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading import review", { error: error.message });
    req.flash("error", "Terjadi kesalahan saat memuat data review.");
    res.redirect("/admin/users");
  }
};

/**
 * POST /admin/users/import/process - Commit the selected rows to database (with overwrite option)
 */
const processImport = async (req, res) => {
  try {
    const entries = req.session.tempImportData;
    if (!entries || entries.length === 0) {
      req.flash("error", "Tidak ada data untuk diimport.");
      return res.redirect("/admin/users");
    }

    // selectedRows will be an array of indexes of entries selected by check
    const selectedRows = req.body.selectedRows;
    if (!selectedRows) {
      req.flash("error", "Pilih minimal satu data warga untuk diimport.");
      return res.redirect("/admin/users/import/review");
    }

    const rowIndices = Array.isArray(selectedRows) ? selectedRows.map(Number) : [Number(selectedRows)];
    const roles = await prisma.role.findMany();

    let createdCount = 0;
    let updatedCount = 0;

    for (const idx of rowIndices) {
      const row = entries[idx];
      if (!row) continue;

      // Get database role ID mapping - default to "warga"
      const dbRole = roles.find(r => r.name.toLowerCase() === "warga");
      if (!dbRole) {
        throw new Error("Default role 'warga' not found in database.");
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { phone: row.phone }
      });

      if (existingUser) {
        // Overwrite/menimpa data lama
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { 
              name: row.name,
              houseNumber: row.houseNumber || null
            }
          });

          // Replace old roles with new role
          await tx.userRole.deleteMany({
            where: { userId: existingUser.id }
          });

          await tx.userRole.create({
            data: {
              userId: existingUser.id,
              roleId: dbRole.id
            }
          });
        });
        updatedCount++;
      } else {
        // Create new user (using transaction via userService)
        await userService.createUser(
          { name: row.name, phone: row.phone, houseNumber: row.houseNumber },
          dbRole.id
        );
        createdCount++;
      }
    }

    // Clear temporary session data
    delete req.session.tempImportData;

    req.flash("success", `Berhasil memproses import warga. Warga Baru: ${createdCount}, Data Diperbarui: ${updatedCount}.`);
    res.redirect("/admin/users");
  } catch (error) {
    logger.error("Error processing import", { error: error.message });
    req.flash("error", `Terjadi kesalahan saat memproses import: ${error.message}`);
    res.redirect("/admin/users/import/review");
  }
};

module.exports = {
  listUsers,
  showCreateForm,
  createUser,
  viewUser,
  showEditForm,
  updateUser,
  resetPassword,
  downloadImportTemplate,
  uploadAndReviewImport,
  showImportReview,
  processImport,
};
