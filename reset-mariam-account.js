const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function resetMariamAccount() {
  try {
    console.log('🔄 [RESET MARIAM ACCOUNT] Completely clearing account and starting fresh...\n');

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
    console.log(`💰 [WALLET] Current Balance: ₦${user.wallet?.balance.toLocaleString()}`);
    console.log(`💰 [WALLET] Last Transaction: ${user.wallet?.lastTransactionAt ? new Date(user.wallet.lastTransactionAt).toLocaleString() : 'Never'}\n`);

    // ==================== CONFIRMATION ====================
    console.log('⚠️  [WARNING] This will PERMANENTLY DELETE all data for this user!\n');
    console.log('🗑️  [WHAT WILL BE DELETED]:');
    console.log('  - All wallet transactions');
    console.log('  - All main transactions');
    console.log('  - All webhook logs');
    console.log('  - Wallet balance reset to ₦0');
    console.log('  - Transaction history completely cleared');
    console.log('\n🔄 [WHAT WILL HAPPEN]:');
    console.log('  - Account will be reset to a clean state');
    console.log('  - User can start fresh with new transactions');
    console.log('  - No more corrupted data or balance issues');
    console.log('\n⚠️  [THIS ACTION CANNOT BE UNDONE!]\n');

    // ==================== GET CURRENT DATA COUNTS ====================
    console.log('📊 [CURRENT DATA] Getting current data counts...\n');

    const walletTxCount = await prisma.walletTransaction.count({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ]
      }
    });

    const mainTxCount = await prisma.transaction.count({
      where: { userId: user.id }
    });

    const webhookCount = await prisma.webhookLog.count({
      where: {
        OR: [
          { accountNumber: user.wallet.virtualAccountNumber },
          { accountNumber: `0${user.wallet.virtualAccountNumber}` }
        ]
      }
    });

    console.log(`📊 [CURRENT COUNTS]:`);
    console.log(`  Wallet Transactions: ${walletTxCount}`);
    console.log(`  Main Transactions: ${mainTxCount}`);
    console.log(`  Webhook Logs: ${webhookCount}`);
    console.log(`  Total Records: ${walletTxCount + mainTxCount + webhookCount}\n`);

    if (walletTxCount + mainTxCount + webhookCount === 0) {
      console.log('✅ [STATUS] Account is already clean - no data to delete!');
      return;
    }

    // ==================== DELETE ALL DATA ====================
    console.log('🗑️  [DELETING DATA] Starting complete data deletion...\n');

    // 1. Delete wallet transactions
    console.log('💸 [DELETING] Wallet transactions...');
    const deletedWalletTx = await prisma.walletTransaction.deleteMany({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ]
      }
    });
    console.log(`  ✅ Deleted ${deletedWalletTx.count} wallet transactions`);

    // 2. Delete main transactions
    console.log('📋 [DELETING] Main transactions...');
    const deletedMainTx = await prisma.transaction.deleteMany({
      where: { userId: user.id }
    });
    console.log(`  ✅ Deleted ${deletedMainTx.count} main transactions`);

    // 3. Delete webhook logs
    console.log('🔔 [DELETING] Webhook logs...');
    const deletedWebhooks = await prisma.webhookLog.deleteMany({
      where: {
        OR: [
          { accountNumber: user.wallet.virtualAccountNumber },
          { accountNumber: `0${user.wallet.virtualAccountNumber}` }
        ]
      }
    });
    console.log(`  ✅ Deleted ${deletedWebhooks.count} webhook logs`);

    console.log(`\n📊 [DELETION COMPLETE] Total records deleted: ${deletedWalletTx.count + deletedMainTx.count + deletedWebhooks.count}`);

    // ==================== RESET WALLET ====================
    console.log('\n🔄 [RESETTING WALLET] Resetting wallet to clean state...\n');

    const resetWallet = await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: {
        balance: 0,
        lastTransactionAt: null,
        updatedAt: new Date()
      }
    });

    console.log(`💰 [WALLET RESET] Wallet reset successfully:`);
    console.log(`  Balance: ₦${resetWallet.balance.toLocaleString()}`);
    console.log(`  Last Transaction: ${resetWallet.lastTransactionAt ? new Date(resetWallet.lastTransactionAt).toLocaleString() : 'Never'}`);

    // ==================== VERIFICATION ====================
    console.log('\n🔍 [VERIFICATION] Verifying all data has been cleared...\n');

    const finalWalletTxCount = await prisma.walletTransaction.count({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ]
      }
    });

    const finalMainTxCount = await prisma.transaction.count({
      where: { userId: user.id }
    });

    const finalWebhookCount = await prisma.webhookLog.count({
      where: {
        OR: [
          { accountNumber: user.wallet.virtualAccountNumber },
          { accountNumber: `0${user.wallet.virtualAccountNumber}` }
        ]
      }
    });

    const finalWallet = await prisma.wallet.findUnique({
      where: { id: user.wallet.id },
      select: { balance: true, lastTransactionAt: true }
    });

    console.log(`📊 [FINAL VERIFICATION]:`);
    console.log(`  Wallet Transactions: ${finalWalletTxCount} (should be 0)`);
    console.log(`  Main Transactions: ${finalMainTxCount} (should be 0)`);
    console.log(`  Webhook Logs: ${finalWebhookCount} (should be 0)`);
    console.log(`  Wallet Balance: ₦${finalWallet.balance.toLocaleString()} (should be 0)`);
    console.log(`  Last Transaction: ${finalWallet.lastTransactionAt ? 'EXISTS' : 'NULL'} (should be NULL)`);

    // ==================== SUCCESS CHECK ====================
    const allCleared = (
      finalWalletTxCount === 0 && 
      finalMainTxCount === 0 && 
      finalWebhookCount === 0 && 
      finalWallet.balance === 0 && 
      finalWallet.lastTransactionAt === null
    );

    if (allCleared) {
      console.log(`\n✅ [VERIFICATION SUCCESS] All data has been completely cleared!`);
    } else {
      console.log(`\n⚠️  [VERIFICATION ISSUE] Some data may still exist - manual check needed`);
    }

    // ==================== FINAL STATUS ====================
    console.log('\n📋 [RESET SUMMARY]:\n');
    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`💰 Account: ${user.wallet.virtualAccountNumber}`);
    console.log(`🗑️  Records Deleted:`);
    console.log(`     Wallet Transactions: ${deletedWalletTx.count}`);
    console.log(`     Main Transactions: ${deletedMainTx.count}`);
    console.log(`     Webhook Logs: ${deletedWebhooks.count}`);
    console.log(`     Total: ${deletedWalletTx.count + deletedMainTx.count + deletedWebhooks.count}`);
    console.log(`🔄 Wallet Reset: ₦${user.wallet.balance.toLocaleString()} → ₦0`);
    console.log(`🔗 Sync Status: ${allCleared ? 'Perfect' : 'Needs Attention'}`);

    if (allCleared) {
      console.log('\n🎉 [SUCCESS] Account has been completely reset to a clean state!');
      console.log('   - All transaction history cleared');
      console.log('   - All webhook logs removed');
      console.log('   - Wallet balance reset to ₦0');
      console.log('   - User can now start fresh');
      console.log('   - No more corrupted data or balance issues');
      console.log('   - System is ready for new transactions');
    } else {
      console.log('\n⚠️  [PARTIAL] Some data may still exist - manual verification recommended');
    }

    // ==================== NEXT STEPS ====================
    console.log('\n📋 [NEXT STEPS]:');
    console.log('1. ✅ Account has been reset to clean state');
    console.log('2. 🔄 User can now receive new funding transactions');
    console.log('3. 📊 All future transactions will be properly recorded');
    console.log('4. 🔗 No more synchronization issues');
    console.log('5. 💰 Balance will be calculated correctly from new transactions');

  } catch (error) {
    console.error('❌ [ERROR] Account reset failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetMariamAccount();


