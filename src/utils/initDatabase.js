/**
 * Database initialization script
 * Creates the session table and other required structures
 * Run this once on application startup if needed
 */

const { Pool } = require("pg");

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🔧 Initializing database...");

    // Create session table (required by connect-pg-simple)
    // Using inline PRIMARY KEY to avoid duplicate constraint errors
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );
    `);

    // Create index for session expiry (separate query to ensure it doesn't fail if table already exists)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    console.log("✅ Session table initialized");
    console.log("✅ Database initialization complete");
  } catch (error) {
    // Check for common "already exists" error codes
    if (error.code === "42P07" || error.code === "42P16") {
      // 42P07 = duplicate table, 42P16 = duplicate primary key
      console.log("✅ Session table already exists");
    } else if (error.message && error.message.includes("already exists")) {
      console.log("✅ Session table already exists");
    } else {
      console.error("❌ Database initialization error:", error);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

module.exports = initializeDatabase;
