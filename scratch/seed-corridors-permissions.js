const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Corridors and Permissions...");

  // 1. Seed Corridors
  const corridors = [
    { name: "G Bawah", description: "Blok G Bagian Bawah" },
    { name: "G Tengah", description: "Blok G Bagian Tengah" },
    { name: "G Atas", description: "Blok G Bagian Atas" }
  ];

  for (const c of corridors) {
    await prisma.corridor.upsert({
      where: { name: c.name },
      update: {},
      create: c
    });
  }
  console.log("Corridors seeded successfully.");

  // 2. Seed Permissions
  const permissions = [
    { name: "finance.manage_corridor" },
    { name: "warga.read_corridor" },
    { name: "message.create_corridor" }
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: p
    });
  }
  console.log("Permissions seeded successfully.");

  // 3. Ensure Koordinator Role and Mapping
  let koorRole = await prisma.role.findUnique({ where: { name: "koordinator" } });
  if (!koorRole) {
    koorRole = await prisma.role.create({ data: { name: "koordinator" } });
    console.log("Role koordinator created.");
  } else {
    console.log("Role koordinator already exists.");
  }

  // 4. Map permissions to koordinator
  const koorPerms = [
    "dashboard.view",
    "warga.read_corridor",
    "message.create_corridor",
    "message.read",
    "finance.manage_corridor",
    "report.create",
    "report.read",
    "report.update",
    "report.delete"
  ];

  const allPerms = await prisma.permission.findMany({
    where: { name: { in: koorPerms } }
  });

  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: koorRole.id,
          permissionId: p.id
        }
      },
      update: {},
      create: {
        roleId: koorRole.id,
        permissionId: p.id
      }
    });
  }

  // 5. Map permissions to super_admin
  const superAdminRole = await prisma.role.findUnique({ where: { name: "super_admin" } });
  if (superAdminRole) {
    const newPerms = await prisma.permission.findMany({
      where: { name: { in: ["finance.manage_corridor", "warga.read_corridor", "message.create_corridor"] } }
    });
    for (const p of newPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: p.id
          }
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: p.id
        }
      });
    }
  }

  console.log("Role-Permissions mapped successfully.");

  // 6. Set user 087735400606 to G Bawah corridor if corridor is null
  const koorUser = await prisma.user.findUnique({ where: { phone: "087735400606" } });
  if (koorUser) {
    const gBawah = await prisma.corridor.findUnique({ where: { name: "G Bawah" } });
    if (!koorUser.corridorId && gBawah) {
      await prisma.user.update({
        where: { id: koorUser.id },
        data: { corridorId: gBawah.id }
      });
      console.log(`Updated user ${koorUser.phone} to corridor G Bawah.`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
