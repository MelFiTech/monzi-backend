const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function checkWebhookLogsMariam() {
  try {
    console.log('🔔 [WEBHOOK LOGS CHECK] Analyzing webhook logs for mariam\'s funding transactions...\n');

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
    console.log(`💰 [WALLET] Account: ${user.wallet?.virtualAccountNumber}\n`);

    // ==================== CHECK WEBHOOK LOGS TABLE ====================
    console.log('🔔 [WEBHOOK LOGS] Checking webhook logs table for this user...\n');

    try {
      // First, let's see what fields are available in the webhook logs table
      const sampleWebhook = await prisma.webhookLog.findFirst({
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
          status: true,
          processed: true,
          walletUpdated: true,
          transactionId: true,
          error: true
        }
      });

      console.log('📋 [WEBHOOK SCHEMA] Available fields in webhook logs table:');
      if (sampleWebhook) {
        Object.keys(sampleWebhook).forEach(key => {
          if (sampleWebhook[key] !== null) {
            console.log(`  ✅ ${key}: ${typeof sampleWebhook[key]} - ${JSON.stringify(sampleWebhook[key]).substring(0, 50)}...`);
          } else {
            console.log(`  ❌ ${key}: null`);
          }
        });
      }
      console.log();

      // Now search for webhook logs related to this user's account
      const webhookLogs = await prisma.webhookLog.findMany({
        where: {
          OR: [
            { accountNumber: user.wallet.virtualAccountNumber },
            { accountNumber: `0${user.wallet.virtualAccountNumber}` }, // Try with leading zero
            { 
              payload: {
                path: ['data', 'account_number'],
                equals: user.wallet.virtualAccountNumber
              }
            },
            {
              payload: {
                path: ['data', 'data', 'account_number'],
                equals: user.wallet.virtualAccountNumber
              }
            }
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
          status: true,
          processed: true,
          walletUpdated: true,
          transactionId: true,
          error: true
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`🔔 [WEBHOOK LOGS] Found ${webhookLogs.length} webhook logs for this user:\n`);

      if (webhookLogs.length > 0) {
        webhookLogs.forEach((log, index) => {
          const date = new Date(log.createdAt).toLocaleDateString();
          const time = new Date(log.createdAt).toLocaleTimeString();
          
          console.log(`  ${index + 1}. ${log.provider} - ${log.eventType}`);
          console.log(`     Date: ${date} ${time}`);
          console.log(`     Reference: ${log.reference || 'N/A'}`);
          console.log(`     Account: ${log.accountNumber || 'N/A'}`);
          console.log(`     Amount: ${log.amount ? `₦${log.amount.toLocaleString()}` : 'N/A'}`);
          console.log(`     Currency: ${log.currency || 'N/A'}`);
          console.log(`     Status: ${log.status || 'N/A'}`);
          console.log(`     Processed: ${log.processed ? '✅' : '❌'}`);
          console.log(`     Wallet Updated: ${log.walletUpdated ? '✅' : '❌'}`);
          console.log(`     Transaction ID: ${log.transactionId || 'N/A'}`);
          if (log.error) console.log(`     Error: ${log.error}`);
          
          // Extract additional info from payload
          if (log.payload) {
            try {
              const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
              
              if (payload.data?.data?.narration) {
                console.log(`     Narration: ${payload.data.data.narration.substring(0, 80)}...`);
              } else if (payload.data?.narration) {
                console.log(`     Narration: ${payload.data.narration.substring(0, 80)}...`);
              }
              
              if (payload.data?.data?.sender_name) {
                console.log(`     Sender: ${payload.data.data.sender_name}`);
              } else if (payload.data?.sender_name) {
                console.log(`     Sender: ${payload.data.sender_name}`);
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

    // ==================== CHECK WALLET TRANSACTIONS ====================
    console.log('💸 [WALLET TRANSACTIONS] Checking wallet transactions table...\n');

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
      orderBy: { createdAt: 'desc' }
    });

    console.log(`💸 [WALLET] Found ${walletTransactions.length} wallet transactions:\n`);

    if (walletTransactions.length > 0) {
      walletTransactions.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const time = new Date(tx.createdAt).toLocaleTimeString();
        const isCredit = tx.receiverWalletId === user.wallet.id;
        const operation = isCredit ? `➕ Credit: +₦${tx.amount.toLocaleString()}` : `➖ Debit: -₦${(tx.amount + tx.fee).toLocaleString()}`;
        
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status}`);
        console.log(`     ${operation}`);
        console.log(`     Date: ${date} ${time}`);
        if (tx.metadata && Object.keys(tx.metadata).length > 0) {
          const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
          console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
        }
        console.log();
      });
    }

    // ==================== CHECK MAIN TRANSACTIONS ====================
    console.log('📋 [MAIN TRANSACTIONS] Checking main transactions table...\n');

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
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 [MAIN] Found ${mainTransactions.length} main transactions:\n`);

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
    }

    // ==================== COMPARISON ANALYSIS ====================
    console.log('🔍 [COMPARISON ANALYSIS] Comparing all three sources...\n');

    // Extract funding transactions from each source
    const webhookFunding = webhookLogs.filter(log => 
      log.eventType === 'wallet.credited' || 
      log.eventType === 'managed_wallet.funded' ||
      (log.payload && JSON.stringify(log.payload).includes('funded'))
    );

    const walletFunding = walletTransactions.filter(tx => 
      tx.receiverWalletId === user.wallet.id && tx.status === 'COMPLETED'
    );

    const mainFunding = mainTransactions.filter(tx => 
      tx.type === 'DEPOSIT' && tx.status === 'COMPLETED'
    );

    console.log(`📊 [FUNDING COMPARISON]:`);
    console.log(`  Webhook Logs: ${webhookFunding.length} funding events`);
    console.log(`  Wallet Table: ${walletFunding.length} funding transactions`);
    console.log(`  Main Table: ${mainFunding.length} funding transactions`);

    // Check for mismatches
    if (webhookFunding.length !== walletFunding.length || walletFunding.length !== mainFunding.length) {
      console.log(`  ⚠️  [MISMATCH] Funding transaction counts don't match!`);
      
      if (webhookFunding.length !== walletFunding.length) {
        console.log(`     Webhook vs Wallet: ${webhookFunding.length} vs ${walletFunding.length}`);
      }
      if (walletFunding.length !== mainFunding.length) {
        console.log(`     Wallet vs Main: ${walletFunding.length} vs ${mainFunding.length}`);
      }
    } else {
      console.log(`  ✅ [PERFECT MATCH] All funding transaction counts match!`);
    }

    // ==================== DETAILED FUNDING COMPARISON ====================
    console.log('\n🔍 [DETAILED FUNDING COMPARISON] Analyzing each funding transaction...\n');

    // Create a map of references for easy comparison
    const webhookRefs = new Set(webhookFunding.map(w => w.reference).filter(Boolean));
    const walletRefs = new Set(walletFunding.map(w => w.reference));
    const mainRefs = new Set(mainFunding.map(w => w.reference));

    console.log('🔍 [WEBHOOK FUNDING REFERENCES]:');
    webhookRefs.forEach(ref => console.log(`  - ${ref}`));
    if (webhookRefs.size === 0) console.log('  No references found');

    console.log('\n🔍 [WALLET FUNDING REFERENCES]:');
    walletRefs.forEach(ref => console.log(`  - ${ref}`));

    console.log('\n🔍 [MAIN FUNDING REFERENCES]:');
    mainRefs.forEach(ref => console.log(`  - ${ref}`));

    // Find missing references
    const missingInWallet = [...webhookRefs].filter(ref => !walletRefs.has(ref));
    const missingInMain = [...walletRefs].filter(ref => !mainRefs.has(ref));
    const missingInWebhook = [...walletRefs].filter(ref => !webhookRefs.has(ref));

    if (missingInWallet.length > 0) {
      console.log(`\n❌ [MISSING IN WALLET] ${missingInWallet.length} webhook events not in wallet table:`);
      missingInWallet.forEach(ref => console.log(`  - ${ref}`));
    }

    if (missingInMain.length > 0) {
      console.log(`\n❌ [MISSING IN MAIN] ${missingInMain.length} wallet transactions not in main table:`);
      missingInMain.forEach(ref => console.log(`  - ${ref}`));
    }

    if (missingInWebhook.length > 0) {
      console.log(`\n❌ [MISSING IN WEBHOOK] ${missingInWebhook.length} wallet transactions not in webhook logs:`);
      missingInWebhook.forEach(ref => console.log(`  - ${ref}`));
    }

    if (missingInWallet.length === 0 && missingInMain.length === 0 && missingInWebhook.length === 0) {
      console.log('\n✅ [PERFECT SYNC] All funding transactions are perfectly synchronized across all tables!');
    }

    // ==================== FINAL SUMMARY ====================
    console.log('\n📋 [FINAL SUMMARY]:\n');
    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`💰 Account: ${user.wallet.virtualAccountNumber}`);
    console.log(`🔔 Webhook Logs: ${webhookLogs.length} total, ${webhookFunding.length} funding`);
    console.log(`💸 Wallet Transactions: ${walletTransactions.length} total, ${walletFunding.length} funding`);
    console.log(`📋 Main Transactions: ${mainTransactions.length} total, ${mainFunding.length} funding`);
    
    const allSynced = (webhookFunding.length === walletFunding.length && walletFunding.length === mainFunding.length);
    console.log(`🔗 Sync Status: ${allSynced ? 'Perfect' : 'Needs Attention'}`);

    if (allSynced) {
      console.log('\n🎉 [SUCCESS] All funding transactions are perfectly synchronized!');
      console.log('   - Webhook logs match wallet transactions');
      console.log('   - Wallet transactions match main transactions');
      console.log('   - No missing or orphaned records');
    } else {
      console.log('\n⚠️  [ATTENTION] Synchronization issues detected!');
      console.log('   - Some funding transactions may be missing');
      console.log('   - Requires investigation and fixing');
    }

  } catch (error) {
    console.error('❌ [ERROR] Webhook logs check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWebhookLogsMariam();


