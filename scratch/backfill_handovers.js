const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting backfill for existing handovers...");
  
  const handovers = await prisma.financeHandover.findMany({
    include: {
      expenses: true,
      incomes: true,
      corridor: true,
    }
  });

  console.log(`Found ${handovers.length} handover(s) in database.`);

  for (const handover of handovers) {
    const corridorName = handover.corridor ? handover.corridor.name : 'Koridor';
    
    if (handover.expenses.length === 0) {
      console.log(`Creating missing FinanceExpense for handover ${handover.id} (${corridorName})...`);
      await prisma.financeExpense.create({
        data: {
          amount: handover.totalAmount,
          description: `Penyerahan dana ke ${corridorName}`,
          category: 'Distribusi Koridor',
          recipient: `Pengurus ${corridorName}`,
          date: handover.handedOverAt,
          createdById: handover.handedOverBy,
          corridorId: null,
          handoverId: handover.id,
        }
      });
    } else {
      console.log(`Handover ${handover.id} already has FinanceExpense.`);
    }

    if (handover.incomes.length === 0) {
      console.log(`Creating missing FinanceIncome for handover ${handover.id} (${corridorName})...`);
      await prisma.financeIncome.create({
        data: {
          amount: handover.totalAmount,
          description: `Penerimaan dana dari Kas RT`,
          category: 'Penerimaan RT',
          source: 'Kas RT / Bendahara',
          date: handover.handedOverAt,
          createdById: handover.handedOverBy,
          corridorId: handover.corridorId,
          handoverId: handover.id,
        }
      });
    } else {
      console.log(`Handover ${handover.id} already has FinanceIncome.`);
    }
  }

  console.log("Backfill complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
