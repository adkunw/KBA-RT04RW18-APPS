const fs = require("fs");
const path = require("path");

class AdminErrorLogService {
  /**
   * Reads and parses all error logs from file.log in the project root.
   * Returns a parsed array of log entries sorted by timestamp descending (newest first).
   * @returns {Promise<Array>}
   */
  async getErrorLogs() {
    const logFilePath = path.join(__dirname, "../../file.log");
    
    if (!fs.existsSync(logFilePath)) {
      return [];
    }

    try {
      const fileContent = fs.readFileSync(logFilePath, "utf8");
      const lines = fileContent.split("\n").filter((line) => line.trim() !== "");
      
      const logs = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          logs.push({
            timestamp: parsed.timestamp || "Unknown",
            message: parsed.message || parsed.error || "No message",
            level: parsed.level || "error",
            path: parsed.path || "-",
            stack: parsed.stack || "",
            details: parsed
          });
        } catch (e) {
          // If line is not JSON, push it as a raw string
          logs.push({
            timestamp: "Raw Format",
            message: line,
            level: "error",
            path: "-",
            stack: "",
            details: {}
          });
        }
      }

      // Reverse so newest errors are shown first
      return logs.reverse();
    } catch (error) {
      console.error("Failed to read error log file:", error.message);
      return [];
    }
  }

  /**
   * Clears the error log file by emptying its content.
   * @returns {Promise<boolean>}
   */
  async clearErrorLogs() {
    const logFilePath = path.join(__dirname, "../../file.log");
    try {
      if (fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, "", "utf8");
      }
      return true;
    } catch (error) {
      console.error("Failed to clear error log file:", error.message);
      return false;
    }
  }
}

module.exports = new AdminErrorLogService();
