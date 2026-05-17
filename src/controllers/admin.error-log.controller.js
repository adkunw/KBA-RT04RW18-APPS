const adminErrorLogService = require("../services/admin.error-log.service");

class AdminErrorLogController {
  /**
   * Renders the administrative error logs tab page
   */
  async getErrorLogsPage(req, res, next) {
    try {
      const logs = await adminErrorLogService.getErrorLogs();
      res.render("admin/error-log/index", {
        title: "Log Error Aplikasi",
        currentPage: "error-logs",
        logs,
        error: req.flash("error")[0],
        success: req.flash("success")[0],
        user: req.session.user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clears all log entries from file.log
   */
  async clearErrorLogs(req, res, next) {
    try {
      const success = await adminErrorLogService.clearErrorLogs();
      if (success) {
        req.flash("success", "Log error berhasil dibersihkan.");
      } else {
        req.flash("error", "Gagal membersihkan log error.");
      }
      res.redirect("/admin/error-logs");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminErrorLogController();
