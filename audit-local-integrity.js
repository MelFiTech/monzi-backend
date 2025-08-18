const { PrismaClient } = require('@prisma/client');

// Connect to local database
const prisma = new PrismaClient();

async function auditLocalDataIntegrity() {
  try {
    console.log('🔍 [LOCAL DATA INTEGRITY AUDIT] Starting comprehensive data integrity investigation...\n');

    // Test connection
    await prisma.$connect();
    console.log('✅ [CONNECTION] Connected to local database\n');

    // ==================== PHASE 1: FAILED TRANSACTION INVESTIGATION ====================
    console.log('🚨 [PHASE 1] Investigating Failed Transaction Discrepancies\n');

    // Get all failed transactions
    const failedMainTransactions = await prisma.transaction.findMany({
      where: { status: 'FAILED' },
      select: {
        id: true,
        reference: true,
        type: true,
        amount: true,
        createdAt: true,
        metadata: true,
        user: {
          select: { email: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const failedWalletTransactions = await prisma.walletTransaction.findMany({
      where: { status: 'FAILED' },
      select: {
        id: true,
        reference: true,
        type: true,
        amount: true,
        fee: true,
        createdAt: true,
        metadata: true,
        senderWallet: {
          select: {
            user: { select: { email: true, firstName: true, lastName: true } }
          }
        },
        receiverWallet: {
          select: {
            user: { select: { email: true, firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 [FAILED TRANSACTIONS] Found:`);
    console.log(`  Main Table: ${failedMainTransactions.length} failed transactions`);
    console.log(`  Wallet Table: ${failedWalletTransactions.length} failed transactions\n`);

    if (failedMainTransactions.length > 0) {
      console.log('📋 [FAILED MAIN TRANSACTIONS] Details:');
      failedMainTransactions.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const time = new Date(tx.createdAt).toLocaleTimeString();
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ₦${tx.amount.toLocaleString()}`);
        console.log(`     User: ${tx.user?.email || 'Unknown'} | Date: ${date} ${time}`);
        if (tx.metadata && Object.keys(tx.metadata).length > 0) {
          const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
          console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
        }
      });
      console.log();
    }

    if (failedWalletTransactions.length > 0) {
      console.log('💸 [FAILED WALLET TRANSACTIONS] Details:');
      failedWalletTransactions.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const time = new Date(tx.createdAt).toLocaleTimeString();
        const user = tx.senderWallet?.user || tx.receiverWallet?.user;
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ₦${tx.amount.toLocaleString()}`);
        console.log(`     User: ${user?.email || 'Unknown'} | Fee: ₦${tx.fee.toLocaleString()} | Date: ${date} ${time}`);
        if (tx.metadata && Object.keys(tx.metadata).length > 0) {
          const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
          console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
        }
      });
      console.log();
    }

    // ==================== PHASE 2: DUPLICATE REFERENCE INVESTIGATION ====================
    console.log('🔍 [PHASE 2] Investigating Duplicate References\n');

    // Check for duplicate references across both tables
    const allReferences = await prisma.$queryRaw`
      SELECT reference, COUNT(*) as count,
             COUNT(CASE WHEN table_name = 'transactions' THEN 1 END) as main_count,
             COUNT(CASE WHEN table_name = 'wallet_transactions' THEN 1 END) as wallet_count
      FROM (
        SELECT reference, 'transactions' as table_name FROM transactions
        UNION ALL
        SELECT reference, 'wallet_transactions' as table_name FROM wallet_transactions
      ) combined
      GROUP BY reference
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    console.log(`🔍 [DUPLICATE REFERENCES] Found ${allReferences.length} references with multiple records:\n`);

    if (allReferences.length > 0) {
      allReferences.forEach((ref, index) => {
        console.log(`  ${index + 1}. ${ref.reference}: Total=${ref.count}, Main=${ref.main_count}, Wallet=${ref.wallet_count}`);
      });
      console.log();
    }

    // ==================== PHASE 3: ORPHANED RECORDS INVESTIGATION ====================
    console.log('👻 [PHASE 3] Investigating Orphaned Records\n');

    // Find orphaned main transactions
    const orphanedMain = await prisma.$queryRaw`
      SELECT t.id, t.reference, t.type, t.status, t.amount, t."createdAt"
      FROM transactions t
      LEFT JOIN wallet_transactions wt ON t.reference = wt.reference
      WHERE wt.reference IS NULL
      ORDER BY t."createdAt" DESC
      LIMIT 20
    `;

    // Find orphaned wallet transactions
    const orphanedWallet = await prisma.$queryRaw`
      SELECT wt.id, wt.reference, wt.type, wt.status, wt.amount, wt."createdAt"
      FROM wallet_transactions wt
      LEFT JOIN transactions t ON wt.reference = t.reference
      WHERE t.reference IS NULL
      ORDER BY wt."createdAt" DESC
      LIMIT 20
    `;

    console.log(`📋 [ORPHANED MAIN] Found ${orphanedMain.length} orphaned main transactions:`);
    if (orphanedMain.length > 0) {
      orphanedMain.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()} (${date})`);
      });
      console.log();
    }

    console.log(`💸 [ORPHANED WALLET] Found ${orphanedMain.length} orphaned wallet transactions:`);
    if (orphanedWallet.length > 0) {
      orphanedWallet.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()} (${date})`);
      });
      console.log();
    }

    // ==================== PHASE 4: TRANSACTION STATE VALIDATION ====================
    console.log('✅ [PHASE 4] Validating Transaction States\n');

    // Check for transactions with conflicting states
    const conflictingStates = await prisma.$queryRaw`
      SELECT t.reference, t.status as main_status, wt.status as wallet_status,
             t.amount as main_amount, wt.amount as wallet_amount
      FROM transactions t
      JOIN wallet_transactions wt ON t.reference = t.reference
      WHERE t.status != wt.status OR t.amount != wt.amount
      ORDER BY t."createdAt" DESC
    `;

    console.log(`⚠️  [CONFLICTING STATES] Found ${conflictingStates.length} transactions with mismatched states:`);
    if (conflictingStates.length > 0) {
      conflictingStates.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.reference}:`);
        console.log(`     Main: ${tx.main_status} ₦${tx.main_amount.toLocaleString()}`);
        console.log(`     Wallet: ${tx.wallet_status} ₦${tx.wallet_amount.toLocaleString()}`);
      });
      console.log();
    }

    // ==================== PHASE 5: BALANCE VALIDATION ====================
    console.log('💰 [PHASE 5] Validating Wallet Balances\n');

    // Get a sample of wallets to check balance consistency
    const sampleWallets = await prisma.wallet.findMany({
      select: {
        id: true,
        balance: true,
        virtualAccountNumber: true,
        user: {
          select: { email: true }
        }
      },
      take: 3,
      orderBy: { lastTransactionAt: 'desc' }
    });

    console.log('🔍 [BALANCE VALIDATION] Checking sample wallets:\n');
    
    for (const wallet of sampleWallets) {
      // Calculate expected balance from transactions
      const transactions = await prisma.walletTransaction.findMany({
        where: {
          OR: [
            { senderWalletId: wallet.id },
            { receiverWalletId: wallet.id }
          ]
        },
        select: {
          type: true,
          amount: true,
          status: true,
          senderWalletId: true,
          receiverWalletId: true
        }
      });

      let calculatedBalance = 0;
      transactions.forEach(tx => {
        if (tx.status === 'COMPLETED') {
          if (tx.receiverWalletId === wallet.id) {
            calculatedBalance += tx.amount; // Credit
          } else if (tx.senderWalletId === wallet.id) {
            calculatedBalance -= tx.amount; // Debit
          }
        }
      });

      const discrepancy = Math.abs(wallet.balance - calculatedBalance);
      const status = discrepancy > 0.01 ? '❌ MISMATCH' : '✅ MATCH';
      
      console.log(`  Wallet: ${wallet.virtualAccountNumber} (${wallet.user?.email})`);
      console.log(`    Stored Balance: ₦${wallet.balance.toLocaleString()}`);
      console.log(`    Calculated Balance: ₦${calculatedBalance.toLocaleString()}`);
      console.log(`    Discrepancy: ₦${discrepancy.toLocaleString()} ${status}\n`);
    }

    // ==================== PHASE 6: SUMMARY & RECOMMENDATIONS ====================
    console.log('📋 [AUDIT SUMMARY] Data Integrity Status:\n');

    const totalIssues = failedMainTransactions.length + failedWalletTransactions.length + 
                       orphanedMain.length + orphanedWallet.length + conflictingStates.length;

    console.log(`🚨 Critical Issues Found: ${totalIssues}`);
    console.log(`  - Failed Main Transactions: ${failedMainTransactions.length}`);
    console.log(`  - Failed Wallet Transactions: ${failedWalletTransactions.length}`);
    console.log(`  - Orphaned Main: ${orphanedMain.length}`);
    console.log(`  - Orphaned Wallet: ${orphanedWallet.length}`);
    console.log(`  - Conflicting States: ${conflictingStates.length}`);
    console.log(`  - Duplicate References: ${allReferences.length}`);

    if (totalIssues === 0) {
      console.log('\n✅ [STATUS] Data integrity is PERFECT!');
    } else if (totalIssues <= 5) {
      console.log('\n⚠️  [STATUS] Minor data integrity issues detected');
    } else if (totalIssues <= 20) {
      console.log('\n🚨 [STATUS] Significant data integrity issues detected');
    } else {
      console.log('\n💥 [STATUS] CRITICAL data integrity issues detected - IMMEDIATE ACTION REQUIRED');
    }

    console.log('\n💡 [NOTE] This is a LOCAL database audit. Production may have different issues.');

  } catch (error) {
    console.error('❌ [ERROR] Local data integrity audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditLocalDataIntegrity();


