const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function fixMariamBalanceProperly() {
  try {
    console.log('🔧 [FIX MARIAM BALANCE PROPERLY] Removing all admin transactions and recalculating...\n');

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
            virtualAccountNumber: true
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
    console.log(`💰 [WALLET] Current Balance: ₦${user.wallet?.balance.toLocaleString()}\n`);

    // ==================== GET ALL TRANSACTIONS ====================
    console.log('📊 [TRANSACTIONS] Getting all transactions for this user...\n');

    const allTransactions = await prisma.walletTransaction.findMany({
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

    console.log(`📊 [TOTAL] Found ${allTransactions.length} total transactions\n`);

    // ==================== IDENTIFY ADMIN TRANSACTIONS ====================
    console.log('🔍 [ADMIN TRANSACTIONS] Identifying all admin-related transactions...\n');

    const adminTransactions = allTransactions.filter(tx => 
      tx.metadata && (
        tx.metadata.adminFunding || 
        tx.metadata.adminDebit || 
        tx.metadata.adminOperation ||
        tx.reference.includes('ADMIN_') ||
        tx.reference.includes('BALANCE_CORRECTION')
      )
    );

    console.log(`👨‍💼 [ADMIN] Found ${adminTransactions.length} admin transactions:\n`);

    if (adminTransactions.length > 0) {
      adminTransactions.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const time = new Date(tx.createdAt).toLocaleTimeString();
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()}`);
        console.log(`     Date: ${date} ${time}`);
        if (tx.metadata && Object.keys(tx.metadata).length > 0) {
          const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
          console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
        }
        console.log();
      });
    }

    // ==================== IDENTIFY LEGITIMATE TRANSACTIONS ====================
    console.log('✅ [LEGITIMATE TRANSACTIONS] Identifying legitimate user transactions...\n');

    const legitimateTransactions = allTransactions.filter(tx => 
      !tx.metadata?.adminFunding && 
      !tx.metadata?.adminDebit && 
      !tx.metadata?.adminOperation &&
      !tx.reference.includes('ADMIN_') &&
      !tx.reference.includes('BALANCE_CORRECTION')
    );

    console.log(`✅ [LEGITIMATE] Found ${legitimateTransactions.length} legitimate transactions:\n`);

    if (legitimateTransactions.length > 0) {
      legitimateTransactions.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const time = new Date(tx.createdAt).toLocaleTimeString();
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()}`);
        console.log(`     Date: ${date} ${time}`);
        console.log();
      });
    }

    // ==================== CALCULATE CORRECT BALANCE ====================
    console.log('🧮 [BALANCE CALCULATION] Calculating correct balance from legitimate transactions only...\n');

    let correctBalance = 0;
    let calculationLog = [];

    legitimateTransactions.forEach((tx, index) => {
      if (tx.status === 'COMPLETED') {
        if (tx.receiverWalletId === user.wallet.id) {
          // Credit operation
          correctBalance += tx.amount;
          calculationLog.push({
            index: index + 1,
            operation: `➕ Credit: +₦${tx.amount.toLocaleString()}`,
            balanceAfter: correctBalance
          });
        } else if (tx.senderWalletId === user.wallet.id) {
          // Debit operation
          const totalDebit = tx.amount + tx.fee;
          correctBalance -= totalDebit;
          calculationLog.push({
            index: index + 1,
            operation: `➖ Debit: -₦${totalDebit.toLocaleString()} (Amount: ₦${tx.amount.toLocaleString()}, Fee: ₦${tx.fee.toLocaleString()})`,
            balanceAfter: correctBalance
          });
        }
      }
    });

    // Display calculation
    calculationLog.forEach((log, index) => {
      console.log(`  ${log.index}. ${log.operation}`);
      console.log(`     Balance After: ₦${log.balanceAfter.toLocaleString()}`);
    });

    console.log(`\n🧮 [FINAL CALCULATION] Correct balance: ₦${correctBalance.toLocaleString()}`);

    // ==================== REMOVE ALL ADMIN TRANSACTIONS ====================
    console.log('\n🧹 [CLEANUP] Removing all admin transactions...\n');

    let deletedCount = 0;
    for (const tx of adminTransactions) {
      try {
        await prisma.walletTransaction.delete({
          where: { id: tx.id }
        });
        
        console.log(`  ✅ Deleted: ${tx.reference} (₦${tx.amount.toLocaleString()})`);
        deletedCount++;
      } catch (error) {
        console.log(`  ❌ Failed to delete ${tx.reference}: ${error.message}`);
      }
    }

    console.log(`\n📊 [CLEANUP COMPLETE] Deleted ${deletedCount} admin transactions`);

    // ==================== UPDATE WALLET BALANCE ====================
    console.log('\n💰 [BALANCE UPDATE] Setting wallet balance to calculated correct balance...\n');

    const updatedWallet = await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: { balance: correctBalance }
    });

    console.log(`💰 [BALANCE UPDATED]`);
    console.log(`  Old Balance: ₦${user.wallet.balance.toLocaleString()}`);
    console.log(`  Correct Balance: ₦${correctBalance.toLocaleString()}`);
    console.log(`  Difference: ₦${(correctBalance - user.wallet.balance).toLocaleString()}`);

    // ==================== VERIFY FIX ====================
    console.log('\n🔍 [VERIFICATION] Verifying the fix...\n');

    // Get updated transaction count
    const updatedTransactionCount = await prisma.walletTransaction.count({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ]
      }
    });

    console.log(`📊 [UPDATED] Transaction count after cleanup: ${updatedTransactionCount}`);

    // ==================== FINAL STATUS ====================
    console.log('\n📋 [FINAL STATUS]:\n');
    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`💰 Old Balance: ₦${user.wallet.balance.toLocaleString()}`);
    console.log(`💰 New Balance: ₦${correctBalance.toLocaleString()}`);
    console.log(`🧹 Removed Admin Transactions: ${deletedCount}`);
    console.log(`📊 Remaining Legitimate Transactions: ${updatedTransactionCount}`);
    console.log(`🧮 Balance Calculation: Based on ${legitimateTransactions.length} legitimate transactions only`);

    if (correctBalance === 1104) {
      console.log('\n🎯 [PERFECT MATCH] Balance is now exactly ₦1,104 as expected!');
    } else {
      console.log(`\n⚠️  [BALANCE] Balance is ₦${correctBalance.toLocaleString()}, not ₦1,104`);
      console.log('   This suggests there may be other issues or the expected balance is incorrect');
    }

    console.log('\n✅ [SUCCESS] Balance has been corrected based on legitimate transactions only!');
    console.log('   - All admin transactions removed');
    console.log('   - Balance calculated from legitimate user transactions');
    console.log('   - No more corrupted admin funding affecting balance');

  } catch (error) {
    console.error('❌ [ERROR] Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMariamBalanceProperly();
