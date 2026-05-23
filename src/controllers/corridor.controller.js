const { z } = require("zod");
const corridorService = require("../services/corridor.service");

const corridorSchema = z.object({
  name: z.string().min(1, "Nama koridor wajib diisi"),
  description: z.string().optional(),
});

const listCorridors = async (req, res) => {
  try {
    const corridors = await corridorService.getAllCorridors();
    res.render("admin/corridors/index", { 
      corridors, 
      currentPage: "corridors",
      user: { id: req.session.userId, name: req.session.userName, roles: req.session.userRoles || [] }
    });
  } catch (error) {
    req.flash("error_msg", "Gagal memuat data koridor");
    res.redirect("/admin");
  }
};

const renderCreateCorridor = (req, res) => {
  res.render("admin/corridors/create", { 
    currentPage: "corridors",
    user: { id: req.session.userId, name: req.session.userName, roles: req.session.userRoles || [] }
  });
};

const createCorridor = async (req, res) => {
  try {
    const validatedData = corridorSchema.parse(req.body);
    await corridorService.createCorridor(validatedData);
    req.flash("success_msg", "Koridor berhasil ditambahkan");
    res.redirect("/admin/corridors");
  } catch (error) {
    if (error instanceof z.ZodError) {
      req.flash("error_msg", error.errors[0].message);
    } else {
      req.flash("error_msg", "Gagal menambahkan koridor. Mungkin nama sudah ada.");
    }
    res.redirect("/admin/corridors/create");
  }
};

const renderEditCorridor = async (req, res) => {
  try {
    const corridor = await corridorService.getCorridorById(req.params.id);
    if (!corridor) {
      req.flash("error_msg", "Koridor tidak ditemukan");
      return res.redirect("/admin/corridors");
    }
    res.render("admin/corridors/edit", { 
      corridor, 
      currentPage: "corridors",
      user: { id: req.session.userId, name: req.session.userName, roles: req.session.userRoles || [] }
    });
  } catch (error) {
    req.flash("error_msg", "Terjadi kesalahan");
    res.redirect("/admin/corridors");
  }
};

const updateCorridor = async (req, res) => {
  try {
    const validatedData = corridorSchema.parse(req.body);
    await corridorService.updateCorridor(req.params.id, validatedData);
    req.flash("success_msg", "Koridor berhasil diperbarui");
    res.redirect("/admin/corridors");
  } catch (error) {
    if (error instanceof z.ZodError) {
      req.flash("error_msg", error.errors[0].message);
    } else {
      req.flash("error_msg", "Gagal memperbarui koridor");
    }
    res.redirect(`/admin/corridors/${req.params.id}/edit`);
  }
};

const deleteCorridor = async (req, res) => {
  try {
    await corridorService.deleteCorridor(req.params.id);
    req.flash("success_msg", "Koridor berhasil dihapus");
  } catch (error) {
    req.flash("error_msg", "Gagal menghapus koridor karena mungkin masih digunakan oleh warga atau transaksi");
  }
  res.redirect("/admin/corridors");
};

module.exports = {
  listCorridors,
  renderCreateCorridor,
  createCorridor,
  renderEditCorridor,
  updateCorridor,
  deleteCorridor,
};
