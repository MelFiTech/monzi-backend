const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function analyzeTransactionSystem() {
  try {
    console.log('🔍 [ANALYSIS] Starting comprehensive transaction system analysis...\n');

    // 1. Analyze current table structure and data
    console.log('📊 [TABLE ANALYSIS] Current database structure:\n');

    // Count records in each table
    const walletCount = await prisma.wallet.count();
    const walletTransactionCount = await prisma.walletTransaction.count();
    const transactionCount = await prisma.transaction.count();
    const userCount = await prisma.user.count();

    console.log(`👥 Users: ${userCount}`);
    console.log(`💳 Wallets: ${walletCount}`);
    console.log(`💸 Wallet Transactions: ${walletTransactionCount}`);
    console.log(`📋 Main Transactions: ${transactionCount}\n`);

    // 2. Analyze transaction status distribution
    console.log('📊 [STATUS ANALYSIS] Transaction status distribution:\n');

    const walletTransactionStatuses = await prisma.walletTransaction.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    console.log('Wallet Transaction Statuses:');
    walletTransactionStatuses.forEach(status => {
      console.log(`  ${status.status}: ${status._count.status}`);
    });

    const mainTransactionStatuses = await prisma.transaction.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    console.log('\nMain Transaction Statuses:');
    mainTransactionStatuses.forEach(status => {
      console.log(`  ${status.status}: ${status._count.status}`);
    });

    // 3. Analyze failed transactions specifically
    console.log('\n🔍 [FAILED TRANSACTION ANALYSIS] Investigating failed transactions:\n');

    const failedWalletTransactions = await prisma.walletTransaction.findMany({
      where: { status: 'FAILED' },
      select: {
        id: true,
        amount: true,
        fee: true,
        type: true,
        reference: true,
        description: true,
        senderBalanceBefore: true,
        senderBalanceAfter: true,
        receiverBalanceBefore: true,
        receiverBalanceAfter: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`Found ${failedWalletTransactions.length} failed wallet transactions (showing latest 10):\n`);

    failedWalletTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. Failed Transaction: ${tx.reference}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ₦${tx.amount}, Fee: ₦${tx.fee || 0}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Sender Balance: ${tx.senderBalanceBefore} → ${tx.senderBalanceAfter}`);
      console.log(`   Receiver Balance: ${tx.senderBalanceBefore} → ${tx.receiverBalanceAfter}`);
      console.log(`   Date: ${tx.createdAt}`);
      console.log(`   Metadata: ${JSON.stringify(tx.metadata)}`);
      console.log('');
    });

    // 4. Check for balance discrepancies across all wallets
    console.log('💰 [BALANCE DISCREPANCY ANALYSIS] Checking all wallets for balance issues:\n');

    const wallets = await prisma.wallet.findMany({
      select: {
        id: true,
        virtualAccountNumber: true,
        balance: true,
        userId: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 20, // Check first 20 wallets
    });

    console.log(`Checking first ${wallets.length} wallets for balance discrepancies:\n`);

    let walletsWithIssues = 0;
    let totalDiscrepancy = 0;

    for (const wallet of wallets) {
      // Get all transactions for this wallet
      const transactions = await prisma.walletTransaction.findMany({
        where: {
          OR: [
            { senderWalletId: wallet.id },
            { receiverWalletId: wallet.id },
          ],
          status: 'COMPLETED', // Only count completed transactions
        },
        orderBy: { createdAt: 'asc' },
      });

      let calculatedBalance = 0;
      
      for (const tx of transactions) {
        if (tx.senderWalletId === wallet.id) {
          calculatedBalance -= tx.amount + (tx.fee || 0);
        } else if (tx.receiverWalletId === wallet.id) {
          calculatedBalance += tx.amount;
        }
      }

      const discrepancy = Math.abs(wallet.balance - calculatedBalance);
      
      if (discrepancy > 0.01) {
        walletsWithIssues++;
        totalDiscrepancy += discrepancy;
        
        console.log(`⚠️  Wallet ${wallet.virtualAccountNumber} (${wallet.user.email}):`);
        console.log(`    Stored: ₦${wallet.balance}, Calculated: ₦${calculatedBalance}, Discrepancy: ₦${discrepancy.toFixed(2)}`);
      }
    }

    console.log(`\n📊 [SUMMARY] Balance Issues Found:`);
    console.log(`   Wallets with discrepancies: ${walletsWithIssues}/${wallets.length}`);
    console.log(`   Total discrepancy amount: ₦${totalDiscrepancy.toFixed(2)}`);

    // 5. Check for duplicate transaction references
    console.log('\n🔍 [DUPLICATE ANALYSIS] Checking for duplicate transaction references:\n');

    const duplicateReferences = await prisma.$queryRaw`
      SELECT reference, COUNT(*) as count
      FROM wallet_transactions
      GROUP BY reference
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `;

    if (duplicateReferences.length > 0) {
      console.log(`Found ${duplicateReferences.length} duplicate references:`);
      duplicateReferences.forEach(ref => {
        console.log(`  ${ref.reference}: ${ref.count} occurrences`);
      });
    } else {
      console.log('✅ No duplicate transaction references found');
    }

    // 6. Check for orphaned transactions
    console.log('\n🔍 [ORPHANED TRANSACTION ANALYSIS] Checking for orphaned records:\n');

    // Note: Skipping orphaned transaction check due to schema constraints
    console.log('✅ Orphaned transaction check skipped (schema constraints)');

    // 7. Recommendations
    console.log('\n💡 [RECOMMENDATIONS] System improvements needed:\n');
    console.log('1. 🔒 Failed transactions should NEVER update wallet balances');
    console.log('2. 🔄 Unify transaction tables to prevent sync issues');
    console.log('3. 🧮 Implement atomic balance updates with proper rollback');
    console.log('4. 📊 Add balance validation triggers/constraints');
    console.log('5. 🔍 Implement transaction reconciliation system');
    console.log('6. 🚫 Prevent duplicate transaction processing');

  } catch (error) {
    console.error('❌ [ERROR] Analysis failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTransactionSystem();
