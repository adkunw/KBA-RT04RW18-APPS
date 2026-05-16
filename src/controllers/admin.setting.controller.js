const settingService = require("../services/setting.service");
const logger = require("../utils/logger");

const getSettings = async (req, res) => {
  try {
    const settings = await settingService.getAllSettings();
    const flash = req.flash();
    
    res.render("admin/settings/index", {
      title: "Website Settings",
      user: { name: req.session.userName, roles: req.session.userRoles },
      currentPage: "settings",
      settings,
      error: flash.error?.[0] || null,
      success: flash.success?.[0] || null,
    });
  } catch (error) {
    logger.error("Error loading settings", { error: error.message });
    req.flash("error", "Gagal memuat pengaturan");
    res.redirect("/admin");
  }
};

const postUpdateSettings = async (req, res) => {
  try {
    const { emergency_phone, emergency_email, emergency_hours } = req.body;
    
    await settingService.updateManySettings({
      emergency_phone,
      emergency_email,
      emergency_hours,
    });

    req.flash("success", "Pengaturan berhasil disimpan");
    res.redirect("/admin/settings");
  } catch (error) {
    logger.error("Error updating settings", { error: error.message });
    req.flash("error", "Gagal menyimpan pengaturan");
    res.redirect("/admin/settings");
  }
};

module.exports = {
  getSettings,
  postUpdateSettings,
};
