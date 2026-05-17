const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:", users.map(u => ({ id: u.id, name: u.name, phone: u.phone, status: u.status })));

  const periods = await prisma.financePeriod.findMany();
  console.log("Periods:", periods);

  const payments = await prisma.paymentReport.findMany({
    include: {
      user: { select: { name: true } },
      period: { select: { name: true } }
    }
  });
  console.log("Payments:", JSON.stringify(payments, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
