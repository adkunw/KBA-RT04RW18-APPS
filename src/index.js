require("dotenv").config();

const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const csrf = require("csurf");
const morgan = require("morgan");
const flash = require("connect-flash");
const path = require("path");

const logger = require("./utils/logger");
const sessionConfig = require("./config/session");
const routes = require("./routes/index");
const initDatabase = require("./utils/initDatabase");

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Cookie parser
app.use(cookieParser());

// Session
app.use(session(sessionConfig));

// Flash messages
app.use(flash());

// CSRF protection
const csrfProtection = csrf({ cookie: false });

// Logging
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
  ),
);

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// ============================================
// ROUTES
// ============================================

// Main routes
app.use("/", routes);

// Admin routes (will be added later)
// app.use('/admin', adminRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).render("errors/notfound", {
    message: "Page not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(err.status || 500).render("errors/error", {
    error: NODE_ENV === "development" ? err : {},
    message: NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Initialize database (create session table if needed)
    await initDatabase();

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`, { NODE_ENV });
      console.log(`🌐 Application: http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

module.exports = app;
