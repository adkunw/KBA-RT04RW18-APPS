const financeService = require("../src/services/finance.service");

async function test() {
  const gTengahId = "cmpi3tz8f0001wg5eb08xf2nm";

  console.log("=== RT GENERAL KAS SUMMARY (null) ===");
  const rtSummary = await financeService.getFinanceSummary(null);
  console.log(rtSummary);

  console.log("\n=== RT GENERAL KAS TRANSACTIONS (null) ===");
  const rtTransactions = await financeService.getRecentTransactions(10, null);
  console.log(rtTransactions);

  console.log("\n=== G TENGAH KAS SUMMARY ===");
  const gTengahSummary = await financeService.getFinanceSummary(gTengahId);
  console.log(gTengahSummary);

  console.log("\n=== G TENGAH KAS TRANSACTIONS ===");
  const gTengahTransactions = await financeService.getRecentTransactions(10, gTengahId);
  console.log(gTengahTransactions);
}

test().catch(console.error);
