const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Mulai melakukan sinkronisasi data corridorId pada PaymentReport...");
  
  const payments = await prisma.paymentReport.findMany({
    include: { user: true }
  });

  let count = 0;
  for (const p of payments) {
    if (!p.corridorId && p.user && p.user.corridorId) {
      await prisma.paymentReport.update({
        where: { id: p.id },
        data: { corridorId: p.user.corridorId }
      });
      count++;
    }
  }

  console.log(`Selesai! Berhasil memperbarui ${count} data.`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
