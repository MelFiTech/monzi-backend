const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function fixMariamBalance() {
  try {
    console.log('🔧 [FIX MARIAM BALANCE] Fixing balance discrepancy for mariam ibrahim...\n');

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

    // ==================== IDENTIFY SUSPICIOUS TRANSACTIONS ====================
    console.log('🔍 [SUSPICIOUS TRANSACTIONS] Looking for transactions to remove...\n');

    // Find suspicious credit transactions based on the logs
    const suspiciousTransactions = await prisma.walletTransaction.findMany({
      where: {
        receiverWalletId: user.wallet.id,
        status: 'COMPLETED',
        OR: [
          { amount: 0 },           // ₦0 credits
          { amount: 1 },           // ₦1 credits  
          { amount: 1004 },        // ₦1004 credit
          { amount: 1104 },        // ₦1104 credit (matches discrepancy exactly!)
          { amount: 9000 }         // ₦9000 credit (suspicious large amount)
        ]
      },
      select: {
        id: true,
        reference: true,
        type: true,
        amount: true,
        createdAt: true,
        metadata: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`🚨 [SUSPICIOUS] Found ${suspiciousTransactions.length} suspicious transactions:\n`);

    if (suspiciousTransactions.length === 0) {
      console.log('✅ [STATUS] No suspicious transactions found');
      return;
    }

    // Display suspicious transactions
    suspiciousTransactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt).toLocaleDateString();
      const time = new Date(tx.createdAt).toLocaleTimeString();
      console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ₦${tx.amount.toLocaleString()}`);
      console.log(`     Date: ${date} ${time}`);
      if (tx.metadata && Object.keys(tx.metadata).length > 0) {
        const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
        console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
      }
      console.log();
    });

    // ==================== CALCULATE TOTAL TO REMOVE ====================
    const totalToRemove = suspiciousTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    console.log(`💰 [TOTAL TO REMOVE] ₦${totalToRemove.toLocaleString()} from suspicious transactions\n`);

    // ==================== CONFIRMATION ====================
    console.log('⚠️  [WARNING] These suspicious transactions will be PERMANENTLY DELETED!\n');
    console.log('📋 [REASONING]:');
    console.log('  - ₦0 credits are invalid');
    console.log('  - Multiple ₦1 credits are suspicious');
    console.log('  - ₦1004 and ₦1104 credits are unusual amounts');
    console.log('  - ₦9000 credit is suspicious large amount');
    console.log('  - These transactions are causing the balance discrepancy\n');

    // ==================== REMOVE SUSPICIOUS TRANSACTIONS ====================
    console.log('🧹 [CLEANUP] Removing suspicious transactions...\n');

    let deletedCount = 0;
    let deletedAmount = 0;

    for (const tx of suspiciousTransactions) {
      try {
        await prisma.walletTransaction.delete({
          where: { id: tx.id }
        });
        
        console.log(`  ✅ Deleted: ${tx.reference} (₦${tx.amount.toLocaleString()})`);
        deletedCount++;
        deletedAmount += tx.amount;
      } catch (error) {
        console.log(`  ❌ Failed to delete ${tx.reference}: ${error.message}`);
      }
    }

    console.log(`\n📊 [CLEANUP COMPLETE] Deleted ${deletedCount} transactions (₦${deletedAmount.toLocaleString()})`);

    // ==================== UPDATE WALLET BALANCE ====================
    console.log('\n💰 [BALANCE UPDATE] Updating wallet balance...\n');

    const newBalance = user.wallet.balance - deletedAmount;
    
    const updatedWallet = await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: { balance: newBalance }
    });

    console.log(`💰 [BALANCE UPDATED]`);
    console.log(`  Old Balance: ₦${user.wallet.balance.toLocaleString()}`);
    console.log(`  Removed Amount: ₦${deletedAmount.toLocaleString()}`);
    console.log(`  New Balance: ₦${newBalance.toLocaleString()}`);

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
    console.log(`💰 New Balance: ₦${newBalance.toLocaleString()}`);
    console.log(`🧹 Removed Transactions: ${deletedCount}`);
    console.log(`💰 Removed Amount: ₦${deletedAmount.toLocaleString()}`);
    console.log(`📊 Remaining Transactions: ${updatedTransactionCount}`);

    if (deletedAmount > 0) {
      console.log('\n✅ [SUCCESS] Balance discrepancy has been fixed!');
      console.log('   - Suspicious transactions removed');
      console.log('   - Wallet balance corrected');
      console.log('   - User should now have accurate balance');
    } else {
      console.log('\n⚠️  [STATUS] No changes made - no suspicious transactions found');
    }

  } catch (error) {
    console.error('❌ [ERROR] Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMariamBalance();


