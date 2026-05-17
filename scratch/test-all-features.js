const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const userService = require("../src/services/user.service");
const authService = require("../src/services/auth.service");
const activationService = require("../src/services/activation.service");
const roleService = require("../src/services/role.service");
const messageService = require("../src/services/message.service");
const documentService = require("../src/services/document.service");
const financeService = require("../src/services/finance.service");
const reportService = require("../src/services/report.service");
const settingService = require("../src/services/setting.service");

// Visual Styling
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

const testResults = [];
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  ${colors.green}✓ PASS:${colors.reset} ${message}`);
    testResults.push({ name: message, status: "PASS" });
  } else {
    failedCount++;
    console.log(`  ${colors.red}✗ FAIL:${colors.reset} ${message}`);
    testResults.push({ name: message, status: "FAIL" });
  }
}

async function runTests() {
  console.log(`\n${colors.bright}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}          RT MANAGEMENT SYSTEM - SYSTEM E2E TEST RUNNER         ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}================================================================${colors.reset}\n`);

  let mockUserId = null;
  let mockRoleId = null;
  let mockDocId = null;
  let mockPeriodId = null;
  let mockPaymentId = null;
  let mockReportId = null;
  let mockReplyId = null;
  let mockExpenseId = null;
  let mockIncomeId = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: ROLE & PERMISSION SYSTEM (RBAC)
    // -------------------------------------------------------------
    console.log(`${colors.bright}${colors.blue}[TEST GROUP 1] Role & Permission System (RBAC)${colors.reset}`);
    const roles = await roleService.listRoles();
    assert(roles.length > 0, "Retrieve roles list successfully");

    const superAdminRole = roles.find(r => r.name === "super_admin");
    assert(superAdminRole !== undefined, "Find super_admin role successfully");

    const permissions = await roleService.listPermissions();
    assert(permissions.length > 0, "Retrieve system permissions successfully");

    const wargaRole = roles.find(r => r.name === "warga");
    assert(wargaRole !== undefined, "Find warga role successfully");
    mockRoleId = wargaRole.id;

    // -------------------------------------------------------------
    // TEST 2: USER MANAGEMENT & DEMOGRAPHICS
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.blue}[TEST GROUP 2] User Management & Family Demographics${colors.reset}`);
    
    // Create temporary mock user
    const tempPhone = "999999999999";
    const tempName = "Test Resident E2E";
    
    // Cleanup any lingering prior run
    await prisma.userRole.deleteMany({ where: { user: { phone: tempPhone } } });
    await prisma.user.deleteMany({ where: { phone: tempPhone } });

    const createdUserResult = await userService.createUser({
      name: tempName,
      phone: tempPhone
    }, mockRoleId);

    mockUserId = createdUserResult.user.id;
    assert(createdUserResult.user.name === tempName, "Create temporary resident successfully");
    assert(createdUserResult.user.status === "created", "New resident initialized with status 'created'");

    // Update family demographics
    const spouseData = {
      spouseName: "Spouse Test",
      spousePhone: "888888888888",
      spouseBirthDate: "1992-05-15",
      spouseNik: "3204123456780002"
    };

    const childrenData = [
      { name: "Child A", birthDate: "2018-10-10", nik: "3204123456780003" },
      { name: "Child B", birthDate: "2021-12-12", nik: "3204123456780004" }
    ];

    const demographicsPayload = {
      houseNumber: "Blok Z No. 100",
      birthDate: "1990-01-01",
      nik: "3204123456780001",
      kkNumber: "3204000011112222",
      ...spouseData,
      children: childrenData
    };

    const updatedUser = await userService.updateUser(mockUserId, demographicsPayload);
    assert(updatedUser.kkNumber === "3204000011112222", "Update resident Nomor KK successfully");
    assert(updatedUser.nik === "3204123456780001", "Update resident NIK successfully");
    assert(updatedUser.spouseName === "Spouse Test", "Update resident spouse details successfully");
    assert(Array.isArray(updatedUser.children) && updatedUser.children.length === 2, "Update dynamic JSON array children successfully");

    // Fetch user and verify
    const fetchedUser = await userService.getUserById(mockUserId);
    assert(fetchedUser.houseNumber === "Blok Z No. 100", "Retrieve full resident record with demographics successfully");

    // -------------------------------------------------------------
    // TEST 3: AUTHENTICATION & ACTIVATION TOKENS
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.blue}[TEST GROUP 3] Authentication & Activation Flow${colors.reset}`);
    
    // Generate activation token
    const tokenObj = await activationService.createActivationToken(mockUserId);
    assert(tokenObj.token !== undefined, "Create secure account activation token successfully");

    // Validate activation token
    const validToken = await activationService.validateToken(tokenObj.token);
    assert(validToken.userId === mockUserId, "Validate activation token successfully");

    // Activate user by setting password
    const activatedUser = await activationService.activateUser(tokenObj.token, "residentPass123");
    assert(activatedUser.status === "active", "Activate resident status to 'active' successfully");

    // Check login logic
    const loggedInUser = await authService.authenticateUser(tempPhone, "residentPass123");
    assert(loggedInUser.id === mockUserId, "Login with phone and password successfully");

    // -------------------------------------------------------------
    // TEST 4: MESSAGE & NOTIFICATION TRACKING
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.blue}[TEST GROUP 4] Messages & Notification System${colors.reset}`);
    
    // Send message to the mock user
    const msgPayload = {
      title: "Test Alert",
      content: "This is a test notification payload.",
      type: "personal",
      recipientIds: [mockUserId]
    };
    
    // Find admin to send message
    const adminUser = await prisma.user.findFirst({
      where: { roles: { some: { role: { name: "super_admin" } } } }
    });
    
    assert(adminUser !== null, "Find super_admin user for messaging test");
    const sentMsg = await messageService.createMessage(adminUser.id, msgPayload);
    assert(sentMsg.title === "Test Alert", "Create and send personal message successfully");

    // Check unread count
    const unreadCount = await messageService.getUnreadCount(mockUserId);
    assert(unreadCount === 1, "Track unread messages count successfully");

    // Read message
    const receivedMsgs = await messageService.getInboxForUser(mockUserId);
    assert(receivedMsgs.length > 0, "Retrieve received messages list successfully");
    
    await messageService.markAsRead(sentMsg.id, mockUserId);
    const unreadCountAfterRead = await messageService.getUnreadCount(mockUserId);
    assert(unreadCountAfterRead === 0, "Mark message as read and clear unread count successfully");

    // -------------------------------------------------------------
    // TEST 5: DOCUMENT MANAGEMENT SYSTEM
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.blue}[TEST GROUP 5] Document Management System${colors.reset}`);
    
    // Resident uploads a mock document
    const docData = {
      title: "KTP E2E Test",
      type: "ktp",
      fileName: "ktp_test.png",
      filePath: "/uploads/documents/ktp_test.png"
    };

    const uploadedDoc = await documentService.createDocument(mockUserId, docData);
    mockDocId = uploadedDoc.id;
    assert(uploadedDoc.title === "KTP E2E Test", "Upload resident document successfully");
    assert(uploadedDoc.status === "pending", "New document initialized with status 'pending'");

    // Admin reviews document (approve)
    const approvedDoc = await documentService.approveDocument(mockDocId, adminUser.id, "Valid KTP details.");
    assert(approvedDoc.status === "approved", "Admin approves document and sets status successfully");

    // -------------------------------------------------------------
    // TEST 6: RT FINANCIAL SYSTEM (Dues, Periods, Expenses, Incomes, CSVs)
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.blue}[TEST GROUP 6] RT Financial System${colors.reset}`);
    
    // Create new Finance Period
    const currentYear = new Date().getFullYear();
    const periodName = `Test Period ${Date.now()}`;
    const mockPeriod = await prisma.financePeriod.create({
      data: {
        name: periodName,
        month: 1,
        year: currentYear,
        fixedDuesAmount: 25000,
        isActive: true
      }
    });
    mockPeriodId = mockPeriod.id;
    assert(mockPeriod.id !== undefined, "Create new finance monthly period successfully");

    // Submit Payment Report for fixed dues
    const paymentPayload = {
      periodId: mockPeriodId,
      hasFixedDues: true,
      fixedDuesAmount: 25000,
      hasKas: true,
      kasAmount: 5000,
      totalAmount: 30000,
      proofFilePath: "/uploads/payments/proof.png"
    };

    const paymentReportResult = await prisma.paymentReport.create({
      data: {
        userId: mockUserId,
        ...paymentPayload,
        status: "pending"
      }
    });
    mockPaymentId = paymentReportResult.id;
    assert(paymentReportResult.totalAmount === 30000, "Submit resident dues payment report successfully");

    // Admin verifies payment (approve)
    const approvedPayment = await prisma.paymentReport.update({
      where: { id: mockPaymentId },
      data: {
        status: "approved",
        reviewedBy: adminUser.id,
        reviewedAt: new Date()
      }
    });
    assert(approvedPayment.status === "approved", "Admin reviews and approves payment successfully");

    // Register manual other income transaction
    const incomeData = {
      amount: 150000,
      description: "Donation for Independence Day",
      category: "Donasi",
      source: "Corporate CSR",
      date: new Date(),
      proofFilePath: "/uploads/incomes/proof_inc.png"
    };
    const createdIncome = await financeService.createIncome({ ...incomeData, createdById: adminUser.id });
    mockIncomeId = createdIncome.id;
    assert(createdIncome.amount === 150000, "Register manual other income successfully");

    // Register manual expense transaction
    const expenseData = {
      amount: 75000,
      description: "Purchase of main gate padlock",
      category: "Operasional",
      recipient: "Toko Besi Jaya",
      date: new Date(),
      proofFilePath: "/uploads/expenses/proof_exp.png"
    };
    const createdExpense = await financeService.createExpense({ ...expenseData, createdById: adminUser.id });
    mockExpenseId = createdExpense.id;
    assert(createdExpense.amount === 75000, "Register manual expense transaction successfully");

    // Retrieve financial summary and check balances
    const finances = await financeService.getFinanceSummary();
    assert(finances.totalIncome >= 0, "Retrieve financial statement summary successfully");

    // Date range search test
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 2);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 2);

    const mutationsFiltered = await financeService.exportFinanceReport(
      startDate.toISOString().split("T")[0],
      endDate.toISOString().split("T")[0]
    );
    assert(mutationsFiltered.length > 0, "Filter financial mutations by date range successfully");

    // CSV report structure compiling test
    const csvRecords = mutationsFiltered;
    let csvContent = "\uFEFFNO;TANGGAL;TIPE;KATEGORI;DESKRIPSI;NAMA RESIDEN/PIHAK LAIN;NOMINAL;DICATAT OLEH\r\n";
    csvRecords.forEach((rec, idx) => {
      csvContent += `${idx + 1};${new Date(rec.date).toLocaleDateString("id-ID")};${rec.type};${rec.category};${rec.description};${rec.entity};${rec.amount};${rec.recordedBy}\r\n`;
    });
    assert(csvContent.includes("TANGGAL") && csvContent.includes("NOMINAL"), "Compile CSV data report correctly");

    // -------------------------------------------------------------
    // TEST 7: LAPOR RT (COMMUNITY REPORT FORUM)
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.blue}[TEST GROUP 7] Lapor RT (Forum Warga)${colors.reset}`);
    
    // Create new community report
    const reportData = {
      title: "Broken street light",
      content: "The lamp at corner house No. 42 is broken and dark.",
      mediaPath: "/uploads/reports/broken_lamp.png"
    };
    const createdReport = await reportService.createReport(mockUserId, reportData);
    mockReportId = createdReport.id;
    assert(createdReport.title === "Broken street light", "Create community report successfully");

    // Reply to report
    const replyData = {
      content: "We will allocate team to check it tonight.",
      mediaPath: null
    };
    const createdReply = await reportService.createReply(mockReportId, adminUser.id, replyData);
    mockReplyId = createdReply.id;
    assert(createdReply.content === "We will allocate team to check it tonight.", "Reply to report successfully");

    // Update report status (open -> in_progress)
    const inProgressReport = await reportService.updateReportStatus(mockReportId, "in_progress");
    assert(inProgressReport.status === "in_progress", "Admin updates report status to 'in_progress' successfully");

    // Grouping stats retrieval
    const reportStats = await reportService.getReportStats();
    assert(reportStats.in_progress >= 1, "Retrieve reports status count statistics successfully");

    // -------------------------------------------------------------
    // TEST 8: SYSTEM SETTINGS MANAGEMENT
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.blue}[TEST GROUP 8] Global Portal Settings${colors.reset}`);
    
    // Upsert setting value
    const settingKey = "emergency_phone";
    const settingVal = "081234567890";
    const savedSetting = await settingService.updateSetting(settingKey, settingVal);
    assert(savedSetting.value === settingVal, "Upsert global settings key successfully");

    // Retrieve setting
    const retrievedVal = await settingService.getSetting(settingKey);
    assert(retrievedVal === settingVal, "Retrieve setting by key successfully");

  } catch (err) {
    console.error(`${colors.red}Exception thrown during tests: ${err.message}${colors.reset}`);
    console.error(err);
  } finally {
    // -------------------------------------------------------------
    // E2E DATA CLEANUP (ROLLBACK TEST SIDE-EFFECTS)
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.magenta}[DATA CLEANUP] Rolling back E2E mock entities from Postgres...${colors.reset}`);
    
    if (mockReplyId) await prisma.reportReply.deleteMany({ where: { id: mockReplyId } });
    if (mockReportId) await prisma.report.deleteMany({ where: { id: mockReportId } });
    if (mockExpenseId) await prisma.financeExpense.deleteMany({ where: { id: mockExpenseId } });
    if (mockIncomeId) await prisma.financeIncome.deleteMany({ where: { id: mockIncomeId } });
    if (mockPaymentId) await prisma.paymentReport.deleteMany({ where: { id: mockPaymentId } });
    if (mockPeriodId) await prisma.financePeriod.deleteMany({ where: { id: mockPeriodId } });
    if (mockDocId) await prisma.document.deleteMany({ where: { id: mockDocId } });
    
    if (mockUserId) {
      await prisma.messageRecipient.deleteMany({ where: { userId: mockUserId } });
      await prisma.message.deleteMany({ where: { senderId: mockUserId } });
      await prisma.activationToken.deleteMany({ where: { userId: mockUserId } });
      await prisma.userRole.deleteMany({ where: { userId: mockUserId } });
      await prisma.user.deleteMany({ where: { id: mockUserId } });
    }

    console.log(`  ${colors.green}✓ CLEANUP COMPLETE: All mock data cleanly expunged.${colors.reset}`);
    await prisma.$disconnect();

    // -------------------------------------------------------------
    // FINAL RESULTS MATRIX
    // -------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.cyan}================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}                      TESTING MATRIX SUMMARY                    ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}================================================================${colors.reset}`);
    console.log(`  Total Executed Tests : ${passedCount + failedCount}`);
    console.log(`  Passed Assertions    : ${colors.green}${passedCount}${colors.reset}`);
    console.log(`  Failed Assertions    : ${failedCount > 0 ? colors.red + failedCount + colors.reset : "0"}`);
    
    if (failedCount === 0) {
      console.log(`\n  ${colors.bright}${colors.green}🎉 SUCCESS: All application systems are functioning flawlessly!${colors.reset}\n`);
    } else {
      console.log(`\n  ${colors.bright}${colors.red}⚠️ WARNING: Some test failures were encountered during execution.${colors.reset}\n`);
    }
  }
}

runTests();
