const session = require("express-session");
const PostgresStore = require("connect-pg-simple")(session);
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sessionConfig = {
  store: new PostgresStore({
    pool: pool,
    tableName: "session", // Table will be auto-created by connect-pg-simple
  }),
  secret: process.env.SESSION_SECRET || "development-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

module.exports = sessionConfig;
