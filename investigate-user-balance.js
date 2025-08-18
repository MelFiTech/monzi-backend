const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function investigateUserBalance() {
  try {
    console.log('🔍 [USER BALANCE INVESTIGATION] Investigating mariam ibrahim balance discrepancy...\n');

    // Test connection
    await prisma.$connect();
    console.log('✅ [CONNECTION] Connected to production database\n');

    // ==================== FIND USER ====================
    console.log('👤 [USER LOOKUP] Finding user: mariam ibrahim (ibrahimoyiza198@gmail.com)\n');

    const user = await prisma.user.findUnique({
      where: { email: 'ibrahimoyiza198@gmail.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            virtualAccountNumber: true,
            lastTransactionAt: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ [ERROR] User not found');
      return;
    }

    console.log(`👤 [USER] ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`💰 [WALLET] Account: ${user.wallet?.virtualAccountNumber}`);
    console.log(`💰 [WALLET] Stored Balance: ₦${user.wallet?.balance.toLocaleString()}`);
    console.log(`💰 [WALLET] Last Transaction: ${user.wallet?.lastTransactionAt ? new Date(user.wallet.lastTransactionAt).toLocaleString() : 'Never'}\n`);

    // ==================== GET ALL TRANSACTIONS ====================
    console.log('📊 [TRANSACTIONS] Getting all transactions for this user...\n');

    const walletTransactions = await prisma.walletTransaction.findMany({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ]
      },
      select: {
        id: true,
        reference: true,
        type: true,
        amount: true,
        fee: true,
        status: true,
        createdAt: true,
        senderWalletId: true,
        receiverWalletId: true,
        metadata: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📊 [TRANSACTIONS] Found ${walletTransactions.length} wallet transactions\n`);

    // ==================== ANALYZE TRANSACTIONS ====================
    console.log('🧮 [BALANCE CALCULATION] Calculating expected balance from transactions:\n');

    let calculatedBalance = 0;
    let transactionLog = [];

    walletTransactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt).toLocaleDateString();
      const time = new Date(tx.createdAt).toLocaleTimeString();
      
      let balanceChange = 0;
      let operation = '';
      
      if (tx.status === 'COMPLETED') {
        if (tx.receiverWalletId === user.wallet.id) {
          // Credit operation
          balanceChange = tx.amount;
          operation = `➕ Credit: +₦${tx.amount.toLocaleString()}`;
          calculatedBalance += tx.amount;
        } else if (tx.senderWalletId === user.wallet.id) {
          // Debit operation
          balanceChange = -(tx.amount + tx.fee);
          operation = `➖ Debit: -₦${(tx.amount + tx.fee).toLocaleString()} (Amount: ₦${tx.amount.toLocaleString()}, Fee: ₦${tx.fee.toLocaleString()})`;
          calculatedBalance -= (tx.amount + tx.fee);
        }
      }

      transactionLog.push({
        index: index + 1,
        reference: tx.reference,
        type: tx.type,
        status: tx.status,
        date: `${date} ${time}`,
        operation: operation,
        balanceAfter: calculatedBalance,
        metadata: tx.metadata
      });

      console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status}`);
      console.log(`     ${operation}`);
      console.log(`     Balance After: ₦${calculatedBalance.toLocaleString()}`);
      console.log(`     Date: ${date} ${time}`);
      
      if (tx.metadata && Object.keys(tx.metadata).length > 0) {
        const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
        console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
      }
      console.log();
    });

    // ==================== BALANCE COMPARISON ====================
    console.log('💰 [BALANCE COMPARISON] Final balance analysis:\n');

    const storedBalance = user.wallet.balance;
    const discrepancy = Math.abs(storedBalance - calculatedBalance);
    
    console.log(`💰 [STORED] Wallet stored balance: ₦${storedBalance.toLocaleString()}`);
    console.log(`🧮 [CALCULATED] Balance from transactions: ₦${calculatedBalance.toLocaleString()}`);
    console.log(`❌ [DISCREPANCY] Difference: ₦${discrepancy.toLocaleString()}\n`);

    // ==================== IDENTIFY PROBLEMATIC TRANSACTIONS ====================
    console.log('🔍 [PROBLEM IDENTIFICATION] Looking for problematic transactions...\n');

    // Check for admin operations
    const adminTransactions = walletTransactions.filter(tx => 
      tx.metadata && (tx.metadata.adminFunding || tx.metadata.adminDebit || tx.metadata.adminOperation)
    );

    if (adminTransactions.length > 0) {
      console.log(`👨‍💼 [ADMIN] Found ${adminTransactions.length} admin transactions:\n`);
      adminTransactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()}`);
        console.log(`     Date: ${new Date(tx.createdAt).toLocaleString()}`);
        console.log(`     Metadata: ${JSON.stringify(tx.metadata)}`);
        console.log();
      });
    }

    // Check for failed transactions that might be affecting balance
    const failedTransactions = walletTransactions.filter(tx => tx.status === 'FAILED');
    if (failedTransactions.length > 0) {
      console.log(`❌ [FAILED] Found ${failedTransactions.length} failed transactions:\n`);
      failedTransactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()}`);
        console.log(`     Date: ${new Date(tx.createdAt).toLocaleString()}`);
        console.log();
      });
    }

    // Check for unusual transaction types
    const unusualTypes = walletTransactions.filter(tx => 
      !['FUNDING', 'WITHDRAWAL', 'TRANSFER'].includes(tx.type)
    );
    if (unusualTypes.length > 0) {
      console.log(`⚠️  [UNUSUAL] Found ${unusualTypes.length} unusual transaction types:\n`);
      unusualTypes.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()}`);
        console.log(`     Date: ${new Date(tx.createdAt).toLocaleString()}`);
        console.log();
      });
    }

    // ==================== RECOMMENDATIONS ====================
    console.log('💡 [RECOMMENDATIONS] How to fix this balance discrepancy:\n');

    if (discrepancy > 0) {
      console.log('🚨 [IMMEDIATE ACTION REQUIRED]:');
      console.log(`1. The user's balance should be ₦${calculatedBalance.toLocaleString()}, not ₦${storedBalance.toLocaleString()}`);
      console.log(`2. The discrepancy of ₦${discrepancy.toLocaleString()} needs to be corrected`);
      
      if (calculatedBalance > storedBalance) {
        console.log('3. The wallet needs to be credited with the missing amount');
      } else {
        console.log('3. The wallet needs to be debited with the excess amount');
      }
      
      console.log('4. All future transactions should use the corrected balance as the starting point');
    }

    console.log('\n🔧 [TECHNICAL RECOMMENDATIONS]:');
    console.log('1. Review the transaction calculation logic for any bugs');
    console.log('2. Check if admin operations are being processed correctly');
    console.log('3. Verify that failed transactions are not affecting balance calculations');
    console.log('4. Implement balance reconciliation checks in the webhook processing');

    // ==================== SUMMARY ====================
    console.log('\n📋 [INVESTIGATION SUMMARY]:\n');
    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`💰 Stored Balance: ₦${storedBalance.toLocaleString()}`);
    console.log(`🧮 Calculated Balance: ₦${calculatedBalance.toLocaleString()}`);
    console.log(`❌ Discrepancy: ₦${discrepancy.toLocaleString()}`);
    console.log(`📊 Total Transactions: ${walletTransactions.length}`);
    console.log(`👨‍💼 Admin Transactions: ${adminTransactions.length}`);
    console.log(`❌ Failed Transactions: ${failedTransactions.length}`);

  } catch (error) {
    console.error('❌ [ERROR] Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateUserBalance();


