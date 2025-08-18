const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function fixMissingWebhookTransactions() {
  try {
    console.log('🔧 [FIX MISSING WEBHOOK TRANSACTIONS] Fixing failed webhook processing...\n');

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

    // ==================== GET FAILED WEBHOOK LOGS ====================
    console.log('🔔 [FAILED WEBHOOKS] Getting webhook logs that failed to update wallet...\n');

    const failedWebhooks = await prisma.webhookLog.findMany({
      where: {
        AND: [
          {
            OR: [
              { accountNumber: user.wallet.virtualAccountNumber },
              { accountNumber: `0${user.wallet.virtualAccountNumber}` }
            ]
          },
          { processed: true },
          { walletUpdated: false }
        ]
      },
      select: {
        id: true,
        provider: true,
        eventType: true,
        payload: true,
        createdAt: true,
        reference: true,
        accountNumber: true,
        amount: true,
        currency: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`🔔 [FAILED] Found ${failedWebhooks.length} webhook logs that failed to update wallet:\n`);

    if (failedWebhooks.length === 0) {
      console.log('✅ [STATUS] No failed webhooks found!');
      return;
    }

    // Display failed webhooks
    failedWebhooks.forEach((webhook, index) => {
      const date = new Date(webhook.createdAt).toLocaleDateString();
      const time = new Date(webhook.createdAt).toLocaleTimeString();
      
      console.log(`  ${index + 1}. ${webhook.provider} - ${webhook.eventType}`);
      console.log(`     Reference: ${webhook.reference}`);
      console.log(`     Amount: ₦${webhook.amount.toLocaleString()}`);
      console.log(`     Date: ${date} ${time}`);
      console.log();
    });

    // ==================== CHECK WHICH TRANSACTIONS ARE MISSING ====================
    console.log('🔍 [MISSING TRANSACTIONS] Checking which transactions are missing from tables...\n');

    const webhookRefs = failedWebhooks.map(w => w.reference);
    const existingWalletRefs = await prisma.walletTransaction.findMany({
      where: {
        reference: { in: webhookRefs }
      },
      select: { reference: true }
    });

    const existingMainRefs = await prisma.transaction.findMany({
      where: {
        reference: { in: webhookRefs }
      },
      select: { reference: true }
    });

    const missingWalletRefs = webhookRefs.filter(ref => 
      !existingWalletRefs.find(w => w.reference === ref)
    );

    const missingMainRefs = webhookRefs.filter(ref => 
      !existingMainRefs.find(w => w.reference === ref)
    );

    console.log(`📊 [MISSING ANALYSIS]:`);
    console.log(`  Webhook References: ${webhookRefs.length}`);
    console.log(`  Missing in Wallet: ${missingWalletRefs.length}`);
    console.log(`  Missing in Main: ${missingMainRefs.length}`);

    if (missingWalletRefs.length > 0) {
      console.log(`\n❌ [MISSING IN WALLET]:`);
      missingWalletRefs.forEach(ref => console.log(`  - ${ref}`));
    }

    if (missingMainRefs.length > 0) {
      console.log(`\n❌ [MISSING IN MAIN]:`);
      missingMainRefs.forEach(ref => console.log(`  - ${ref}`));
    }

    // ==================== FIX MISSING TRANSACTIONS ====================
    console.log('\n🔧 [FIXING] Creating missing transaction records...\n');

    let fixedCount = 0;
    for (const webhook of failedWebhooks) {
      try {
        // Check if transaction already exists
        const existingWallet = await prisma.walletTransaction.findUnique({
          where: { reference: webhook.reference }
        });

        const existingMain = await prisma.transaction.findUnique({
          where: { reference: webhook.reference }
        });

        if (!existingWallet) {
          console.log(`  🔧 Creating missing wallet transaction: ${webhook.reference}`);
          
          // Create wallet transaction
          const walletTransaction = await prisma.walletTransaction.create({
            data: {
              reference: webhook.reference,
              amount: webhook.amount,
              type: 'FUNDING',
              status: 'COMPLETED',
              description: 'NYRA funding via webhook',
              fee: 0,
              receiverWalletId: user.wallet.id,
              receiverBalanceBefore: user.wallet.balance,
              receiverBalanceAfter: user.wallet.balance + webhook.amount,
              metadata: {
                provider: webhook.provider,
                eventType: webhook.eventType,
                webhookId: webhook.id,
                fixedAt: new Date().toISOString(),
                operationType: 'WEBHOOK_FIX'
              }
            }
          });

          console.log(`    ✅ Created wallet transaction: ${walletTransaction.id}`);
        } else {
          console.log(`  ✅ Wallet transaction already exists: ${webhook.reference}`);
        }

        if (!existingMain) {
          console.log(`  🔧 Creating missing main transaction: ${webhook.reference}`);
          
          // Create main transaction
          const mainTransaction = await prisma.transaction.create({
            data: {
              userId: user.id,
              type: 'DEPOSIT',
              amount: webhook.amount,
              currency: webhook.currency || 'NGN',
              status: 'COMPLETED',
              reference: webhook.reference,
              description: 'NYRA funding via webhook',
              metadata: {
                provider: webhook.provider,
                eventType: webhook.eventType,
                webhookId: webhook.id,
                walletTransactionId: existingWallet?.id || 'pending',
                fixedAt: new Date().toISOString(),
                operationType: 'WEBHOOK_FIX'
              }
            }
          });

          console.log(`    ✅ Created main transaction: ${mainTransaction.id}`);
        } else {
          console.log(`  ✅ Main transaction already exists: ${webhook.reference}`);
        }

        fixedCount++;
      } catch (error) {
        console.log(`  ❌ Failed to fix ${webhook.reference}: ${error.message}`);
      }
    }

    // ==================== UPDATE WALLET BALANCE ====================
    console.log('\n💰 [UPDATING BALANCE] Calculating and updating wallet balance...\n');

    // Calculate total missing amount
    const totalMissing = failedWebhooks.reduce((sum, webhook) => sum + webhook.amount, 0);
    const newBalance = user.wallet.balance + totalMissing;

    console.log(`💰 [BALANCE UPDATE]:`);
    console.log(`  Current Balance: ₦${user.wallet.balance.toLocaleString()}`);
    console.log(`  Missing Amount: ₦${totalMissing.toLocaleString()}`);
    console.log(`  New Balance: ₦${newBalance.toLocaleString()}`);

    // Update wallet balance
    const updatedWallet = await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: {
        balance: newBalance,
        lastTransactionAt: new Date()
      }
    });

    console.log(`  ✅ Wallet balance updated to: ₦${updatedWallet.balance.toLocaleString()}`);

    // ==================== MARK WEBHOOKS AS FIXED ====================
    console.log('\n✅ [MARKING FIXED] Updating webhook logs as fixed...\n');

    for (const webhook of failedWebhooks) {
      try {
        await prisma.webhookLog.update({
          where: { id: webhook.id },
          data: {
            walletUpdated: true,
            status: 'fixed'
          }
        });
        console.log(`  ✅ Marked webhook as fixed: ${webhook.reference}`);
      } catch (error) {
        console.log(`  ❌ Failed to mark webhook as fixed: ${webhook.reference}`);
      }
    }

    // ==================== VERIFICATION ====================
    console.log('\n🔍 [VERIFICATION] Verifying fix was successful...\n');

    const finalWalletCount = await prisma.walletTransaction.count({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ]
      }
    });

    const finalMainCount = await prisma.transaction.count({
      where: { userId: user.id }
    });

    const finalWallet = await prisma.wallet.findUnique({
      where: { id: user.wallet.id },
      select: { balance: true }
    });

    console.log(`📊 [FINAL STATUS]:`);
    console.log(`  Wallet Transactions: ${finalWalletCount}`);
    console.log(`  Main Transactions: ${finalMainCount}`);
    console.log(`  Final Balance: ₦${finalWallet.balance.toLocaleString()}`);

    // ==================== FINAL SUMMARY ====================
    console.log('\n📋 [FIX SUMMARY]:\n');
    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`💰 Account: ${user.wallet.virtualAccountNumber}`);
    console.log(`🔔 Failed Webhooks: ${failedWebhooks.length}`);
    console.log(`🔧 Transactions Fixed: ${fixedCount}`);
    console.log(`💰 Balance Updated: ₦${user.wallet.balance.toLocaleString()} → ₦${finalWallet.balance.toLocaleString()}`);
    console.log(`📊 New Transaction Count: ${finalWalletCount} (wallet) / ${finalMainCount} (main)`);

    if (finalWalletCount === finalMainCount && finalWallet.balance === newBalance) {
      console.log('\n🎉 [SUCCESS] All missing webhook transactions have been fixed!');
      console.log('   - Missing transactions created in both tables');
      console.log('   - Wallet balance updated correctly');
      console.log('   - Webhook logs marked as fixed');
      console.log('   - System is now fully synchronized');
    } else {
      console.log('\n⚠️  [PARTIAL] Some issues remain - may need additional investigation');
    }

  } catch (error) {
    console.error('❌ [ERROR] Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingWebhookTransactions();


