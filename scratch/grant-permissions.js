const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Granting privileges on all tables to the database user...");
  
  // Get database user from DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || "";
  let dbUser = "kbagmyid_user_rt"; // Fallback to what we saw in the screenshot
  
  try {
    // Parse DATABASE_URL if possible to get correct user
    // e.g. postgresql://user:pass@host:port/db
    const match = dbUrl.match(/:\/\/([^:]+):/);
    if (match && match[1]) {
      dbUser = match[1];
    }
  } catch (e) {
    console.error("Could not parse DATABASE_URL, using default fallback user:", dbUser);
  }

  console.log(`Target database user: ${dbUser}`);

  try {
    // 1. Grant all privileges on all tables in public schema
    await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${dbUser}"`);
    console.log("✓ Granted privileges on all tables.");

    // 2. Grant all privileges on all sequences in public schema
    await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${dbUser}"`);
    console.log("✓ Granted privileges on all sequences.");

    // 3. Alter default privileges for future tables
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`);
    console.log("✓ Set default privileges for future tables.");

    console.log("🎉 All privileges successfully granted!");
  } catch (error) {
    console.error("❌ Failed to grant privileges:", error.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
