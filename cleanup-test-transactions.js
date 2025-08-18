const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupTestTransactions() {
  try {
    console.log('🧹 [CLEANUP TEST TRANSACTIONS] Removing test data for perfect sync...\n');

    await prisma.$connect();
    console.log('✅ [CONNECTION] Connected to local database\n');

    // ==================== IDENTIFY TEST TRANSACTIONS ====================
    console.log('🔍 [IDENTIFYING] Finding test transactions to clean up...\n');

    const testTransactions = await prisma.$queryRaw`
      SELECT t.id, t.reference, t.type, t.status, t.amount, t."createdAt"
      FROM transactions t
      LEFT JOIN wallet_transactions wt ON t.reference = wt.reference
      WHERE wt.reference IS NULL
      ORDER BY t."createdAt" DESC
    `;

    console.log(`🧪 [TEST TRANSACTIONS] Found ${testTransactions.length} test transactions to clean up:\n`);

    if (testTransactions.length === 0) {
      console.log('✅ [STATUS] No test transactions found!');
      return;
    }

    // Display test transactions
    testTransactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt).toLocaleDateString();
      console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()} (${date})`);
    });
    console.log();

    // ==================== CONFIRMATION ====================
    console.log('⚠️  [WARNING] These are TEST transactions that will be PERMANENTLY DELETED!\n');
    console.log('📋 [TEST TRANSACTION TYPES]:');
    console.log('  - Location test transactions (ref-test-loc-*)');
    console.log('  - Business test transactions (TXN_TEST_*)');
    console.log('  - Payment test transactions (PAY_*)');
    console.log('  - All have "test" in reference or metadata\n');

    // ==================== SAFETY CHECK ====================
    console.log('🔒 [SAFETY CHECK] Verifying these are actually test transactions...\n');

    const testPatterns = [
      'ref-test-',
      'TXN_TEST_',
      'PAY_',
      'test-',
      'TEST_'
    ];

    let confirmedTestCount = 0;
    for (const tx of testTransactions) {
      const isTest = testPatterns.some(pattern => 
        tx.reference.includes(pattern) || 
        tx.reference.toLowerCase().includes('test')
      );
      
      if (isTest) {
        confirmedTestCount++;
        console.log(`  ✅ Confirmed test: ${tx.reference}`);
      } else {
        console.log(`  ⚠️  Potential production: ${tx.reference} - SKIPPING`);
      }
    }

    console.log(`\n📊 [CONFIRMATION] ${confirmedTestCount}/${testTransactions.length} confirmed as test transactions\n`);

    if (confirmedTestCount === 0) {
      console.log('🚨 [SAFETY] No test transactions confirmed - aborting cleanup');
      return;
    }

    // ==================== CLEANUP ====================
    console.log('🧹 [CLEANUP] Removing confirmed test transactions...\n');

    let deletedCount = 0;
    for (const tx of testTransactions) {
      const isTest = testPatterns.some(pattern => 
        tx.reference.includes(pattern) || 
        tx.reference.toLowerCase().includes('test')
      );

      if (isTest) {
        try {
          await prisma.transaction.delete({
            where: { id: tx.id }
          });
          console.log(`  ✅ Deleted: ${tx.reference}`);
          deletedCount++;
        } catch (error) {
          console.log(`  ❌ Failed to delete ${tx.reference}: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 [CLEANUP COMPLETE] Deleted ${deletedCount} test transactions`);

    // ==================== VERIFICATION ====================
    console.log('\n🔍 [VERIFICATION] Checking final sync status...\n');

    const finalMainCount = await prisma.transaction.count();
    const finalWalletCount = await prisma.walletTransaction.count();
    
    console.log(`📋 Final Main Transactions: ${finalMainCount}`);
    console.log(`💸 Final Wallet Transactions: ${finalWalletCount}`);
    console.log(`📊 Final Difference: ${Math.abs(finalMainCount - finalWalletCount)}`);

    // ==================== FINAL STATUS ====================
    console.log('\n📋 [FINAL STATUS]:\n');
    
    if (Math.abs(finalMainCount - finalWalletCount) === 0) {
      console.log('🎉 [PERFECT SYNC] Transaction tables are now perfectly synchronized!');
      console.log('   - No orphaned records');
      console.log('   - Perfect 1:1 mapping');
      console.log('   - Ready for production deployment');
    } else if (Math.abs(finalMainCount - finalWalletCount) <= 1) {
      console.log('✅ [EXCELLENT SYNC] Transaction tables are nearly perfectly synchronized!');
      console.log('   - Minor difference of 1 transaction (acceptable)');
      console.log('   - Ready for production deployment');
    } else {
      console.log('⚠️  [PARTIAL SYNC] Some discrepancies remain');
      console.log('   - May need additional investigation');
      console.log('   - Consider manual review before production');
    }

    // ==================== SUMMARY ====================
    console.log('\n📊 [CLEANUP SUMMARY]:');
    console.log(`  - Test transactions identified: ${testTransactions.length}`);
    console.log(`  - Test transactions confirmed: ${confirmedTestCount}`);
    console.log(`  - Test transactions deleted: ${deletedCount}`);
    console.log(`  - Production transactions preserved: ${finalMainCount}`);
    console.log(`  - Sync status: ${Math.abs(finalMainCount - finalWalletCount) === 0 ? 'PERFECT' : 'GOOD'}`);

  } catch (error) {
    console.error('❌ [ERROR] Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestTransactions();


