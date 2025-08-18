const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function checkMariamTransactions() {
  try {
    console.log('🔍 [CHECK MARIAM TRANSACTIONS] Analyzing complete transaction history and webhook logs...\n');

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
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 [TOTAL] Found ${allTransactions.length} transactions\n`);

    // ==================== TODAY'S TRANSACTIONS ====================
    console.log('📅 [TODAY] Transactions from today (8/16/2025):\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactions = allTransactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate >= today;
    });

    if (todayTransactions.length > 0) {
      todayTransactions.forEach((tx, index) => {
        const time = new Date(tx.createdAt).toLocaleTimeString();
        const isCredit = tx.receiverWalletId === user.wallet.id;
        const operation = isCredit ? `➕ Credit: +₦${tx.amount.toLocaleString()}` : `➖ Debit: -₦${(tx.amount + tx.fee).toLocaleString()}`;
        
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status}`);
        console.log(`     ${operation}`);
        console.log(`     Time: ${time}`);
        if (tx.metadata && Object.keys(tx.metadata).length > 0) {
          const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
          console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
        }
        console.log();
      });
    } else {
      console.log('  No transactions found for today\n');
    }

    // ==================== COMPLETE TRANSACTION HISTORY ====================
    console.log('📋 [COMPLETE HISTORY] All transactions in chronological order:\n');

    const chronologicalTransactions = [...allTransactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    let runningBalance = 0;
    chronologicalTransactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt).toLocaleDateString();
      const time = new Date(tx.createdAt).toLocaleTimeString();
      
      if (tx.status === 'COMPLETED') {
        if (tx.receiverWalletId === user.wallet.id) {
          // Credit operation
          runningBalance += tx.amount;
          console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status}`);
          console.log(`     ➕ Credit: +₦${tx.amount.toLocaleString()}`);
          console.log(`     Balance After: ₦${runningBalance.toLocaleString()}`);
          console.log(`     Date: ${date} ${time}`);
        } else if (tx.senderWalletId === user.wallet.id) {
          // Debit operation
          const totalDebit = tx.amount + tx.fee;
          runningBalance -= totalDebit;
          console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status}`);
          console.log(`     ➖ Debit: -₦${totalDebit.toLocaleString()} (Amount: ₦${tx.amount.toLocaleString()}, Fee: ₦${tx.fee.toLocaleString()})`);
          console.log(`     Balance After: ₦${runningBalance.toLocaleString()}`);
          console.log(`     Date: ${date} ${time}`);
        }
      } else {
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} (SKIPPED - not completed)`);
        console.log(`     Date: ${date} ${time}`);
      }
      
      if (tx.metadata && Object.keys(tx.metadata).length > 0) {
        const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
        console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
      }
      console.log();
    });

    // ==================== CHECK WEBHOOK LOGS ====================
    console.log('🔔 [WEBHOOK LOGS] Checking webhook logs for this user...\n');

    try {
      const webhookLogs = await prisma.webhookLog.findMany({
        where: {
          OR: [
            { payload: { path: ['data', 'account_number'], equals: user.wallet.virtualAccountNumber } },
            { payload: { path: ['data', 'data', 'account_number'], equals: user.wallet.virtualAccountNumber } }
          ]
        },
        select: {
          id: true,
          provider: true,
          eventType: true,
          payload: true,
          createdAt: true,
          isValid: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      console.log(`🔔 [WEBHOOKS] Found ${webhookLogs.length} webhook logs for this user:\n`);

      if (webhookLogs.length > 0) {
        webhookLogs.forEach((log, index) => {
          const date = new Date(log.createdAt).toLocaleDateString();
          const time = new Date(log.createdAt).toLocaleTimeString();
          
          console.log(`  ${index + 1}. ${log.provider} - ${log.eventType}`);
          console.log(`     Valid: ${log.isValid ? '✅' : '❌'}`);
          console.log(`     Date: ${date} ${time}`);
          
          // Extract key information from payload
          if (log.payload) {
            try {
              const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
              
              if (payload.data?.data?.amount) {
                console.log(`     Amount: ₦${payload.data.data.amount.toLocaleString()}`);
              } else if (payload.data?.amount) {
                console.log(`     Amount: ₦${payload.data.amount.toLocaleString()}`);
              }
              
              if (payload.data?.data?.reference) {
                console.log(`     Reference: ${payload.data.data.reference}`);
              } else if (payload.data?.reference) {
                console.log(`     Reference: ${payload.data.reference}`);
              }
            } catch (e) {
              console.log(`     Payload: [Error parsing]`);
            }
          }
          console.log();
        });
      } else {
        console.log('  No webhook logs found for this user\n');
      }
    } catch (error) {
      console.log(`  ⚠️  Could not check webhook logs: ${error.message}\n`);
    }

    // ==================== CHECK MAIN TRANSACTION TABLE ====================
    console.log('📋 [MAIN TRANSACTIONS] Checking main transaction table synchronization...\n');

    try {
      const mainTransactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          reference: true,
          type: true,
          amount: true,
          status: true,
          createdAt: true,
          metadata: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      console.log(`📋 [MAIN] Found ${mainTransactions.length} main transactions for this user:\n`);

      if (mainTransactions.length > 0) {
        mainTransactions.forEach((tx, index) => {
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
      } else {
        console.log('  No main transactions found for this user\n');
      }
    } catch (error) {
      console.log(`  ⚠️  Could not check main transactions: ${error.message}\n`);
    }

    // ==================== SYNC STATUS ====================
    console.log('🔗 [SYNC STATUS] Checking synchronization between tables...\n');

    const walletTxCount = allTransactions.length;
    const mainTxCount = mainTransactions?.length || 0;
    const syncDifference = Math.abs(walletTxCount - mainTxCount);

    console.log(`📊 [SYNC] Table synchronization status:`);
    console.log(`  Wallet Transactions: ${walletTxCount}`);
    console.log(`  Main Transactions: ${mainTxCount}`);
    console.log(`  Difference: ${syncDifference}`);

    if (syncDifference === 0) {
      console.log(`  ✅ [PERFECT SYNC] Tables are perfectly synchronized!`);
    } else if (syncDifference <= 2) {
      console.log(`  ⚠️  [MINOR SYNC] Tables are mostly synchronized (${syncDifference} difference)`);
    } else {
      console.log(`  ❌ [SYNC ISSUE] Tables are not properly synchronized (${syncDifference} difference)`);
    }

    // ==================== FINAL SUMMARY ====================
    console.log('\n📋 [FINAL SUMMARY]:\n');
    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`💰 Current Balance: ₦${user.wallet.balance.toLocaleString()}`);
    console.log(`📊 Total Transactions: ${allTransactions.length}`);
    console.log(`📅 Today's Transactions: ${todayTransactions.length}`);
    console.log(`🔔 Webhook Logs: ${webhookLogs?.length || 0}`);
    console.log(`📋 Main Transactions: ${mainTxCount}`);
    console.log(`🔗 Sync Status: ${syncDifference === 0 ? 'Perfect' : syncDifference <= 2 ? 'Good' : 'Needs Attention'}`);

    if (todayTransactions.length > 0) {
      console.log('\n🎯 [TODAY ACTIVITY] User had transactions today - check if they match webhook logs');
    } else {
      console.log('\n📅 [TODAY] No transactions today - check if webhooks are being processed');
    }

  } catch (error) {
    console.error('❌ [ERROR] Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMariamTransactions();
