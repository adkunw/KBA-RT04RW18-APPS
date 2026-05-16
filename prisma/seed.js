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
    { name: "message.create" },
    { name: "message.read" },
    { name: "document.manage" },
    { name: "finance.manage" },
    { name: "report.delete_any" },
    { name: "setting.manage" },
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

  const bendaharaRole = await prisma.role.upsert({
    where: { name: "bendahara" },
    update: {},
    create: { name: "bendahara" },
  });

  const sekretarisRole = await prisma.role.upsert({
    where: { name: "sekretaris" },
    update: {},
    create: { name: "sekretaris" },
  });

  const wargaRole = await prisma.role.upsert({
    where: { name: "warga" },
    update: {},
    create: { name: "warga" },
  });

  const createdRoles = [superAdminRole, ketuaRtRole, bendaharaRole, sekretarisRole, wargaRole];

  console.log("✓ Created 5 roles");

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
    [
      "dashboard.view",
      "warga.create",
      "warga.read",
      "warga.update",
      "message.create",
      "message.read",
      "document.manage",
      "report.delete_any",
    ].includes(p.name)
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

  // Assign permissions to bendahara
  console.log("Assigning permissions to bendahara...");
  const bendaharaPermissions = createdPermissions.filter((p) =>
    ["dashboard.view", "finance.manage"].includes(p.name)
  );

  await Promise.all(
    bendaharaPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: bendaharaRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: bendaharaRole.id,
          permissionId: permission.id,
        },
      })
    )
  );
  console.log("✓ Permissions assigned to bendahara");

  // Assign permissions to sekretaris
  console.log("Assigning permissions to sekretaris...");
  const sekretarisPermissions = createdPermissions.filter((p) =>
    ["dashboard.view", "report.delete_any"].includes(p.name)
  );

  await Promise.all(
    sekretarisPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: sekretarisRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: sekretarisRole.id,
          permissionId: permission.id,
        },
      })
    )
  );
  console.log("✓ Permissions assigned to sekretaris");

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
  // Create default settings
  console.log("Creating default settings...");
  const defaultSettings = [
    { key: "emergency_phone", value: "+62-XXX-XXXX" },
    { key: "emergency_email", value: "rt@example.com" },
    { key: "emergency_hours", value: "Mon-Fri, 8 AM - 5 PM" },
  ];
  
  await Promise.all(
    defaultSettings.map((setting) => 
      prisma.setting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      })
    )
  );

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
