const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create Permissions
  console.log("Creating permissions...");
  const permissions = [
    { name: "dashboard.view" },
    { name: "warga.create" },
    { name: "warga.read" },
    { name: "warga.update" },
    { name: "warga.delete" },
    { name: "role.manage" },
    { name: "permission.manage" },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((perm) =>
      prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      }),
    ),
  );

  console.log(`✓ Created ${createdPermissions.length} permissions`);

  // Create Roles
  console.log("Creating roles...");
  const superAdminRole = await prisma.role.upsert({
    where: { name: "super_admin" },
    update: {},
    create: { name: "super_admin" },
  });

  const ketuaRtRole = await prisma.role.upsert({
    where: { name: "ketua_rt" },
    update: {},
    create: { name: "ketua_rt" },
  });

  const wargaRole = await prisma.role.upsert({
    where: { name: "warga" },
    update: {},
    create: { name: "warga" },
  });

  console.log("✓ Created 3 roles");

  // Assign all permissions to super_admin
  console.log("Assigning permissions to super_admin...");
  await Promise.all(
    createdPermissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      }),
    ),
  );

  console.log("✓ All permissions assigned to super_admin");

  // Assign permissions to ketua_rt
  console.log("Assigning permissions to ketua_rt...");
  const ketuaPermissions = createdPermissions.filter((p) =>
    ["dashboard.view", "warga.create", "warga.read", "warga.update"].includes(
      p.name,
    ),
  );

  await Promise.all(
    ketuaPermissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: ketuaRtRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: ketuaRtRole.id,
          permissionId: perm.id,
        },
      }),
    ),
  );

  console.log("✓ Permissions assigned to ketua_rt");

  // Create super_admin user
  console.log("Creating super_admin user...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const superAdminUser = await prisma.user.upsert({
    where: { phone: "admin" },
    update: {},
    create: {
      name: "Super Admin",
      phone: "admin",
      password: hashedPassword,
      status: "active",
    },
  });

  // Assign super_admin role to super_admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
    },
  });

  console.log("✓ Super admin user created");
  console.log("");
  console.log("🎉 Database seeding completed!");
  console.log("");
  console.log("📝 Default login credentials:");
  console.log("   Phone: admin");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
