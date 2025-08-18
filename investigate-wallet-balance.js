const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function investigateWalletBalance() {
  try {
    console.log('🔍 [INVESTIGATION] Starting wallet balance investigation...\n');

    // User details from the logs
    const userEmail = 'ibrahimoyiza198@gmail.com';
    const accountNumber = '9015263960';
    const walletId = 'cmdktaawn0013pp3tc0wsunny';

    console.log(`👤 [USER] Email: ${userEmail}`);
    console.log(`🏦 [ACCOUNT] Account Number: ${accountNumber}`);
    console.log(`💳 [WALLET] Wallet ID: ${walletId}\n`);

    // Get user details
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log('❌ [USER] User not found');
      return;
    }

    console.log(`✅ [USER] Found user: ${user.firstName} ${user.lastName} (${user.id})`);
    console.log(`📅 [USER] Created: ${user.createdAt}\n`);

    // Get wallet details
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        virtualAccountNumber: true, // Changed from accountNumber
        balance: true,
        isActive: true,
        createdAt: true,
        lastTransactionAt: true,
        userId: true,
      },
    });

    if (!wallet) {
      console.log('❌ [WALLET] Wallet not found');
      return;
    }

    console.log(`✅ [WALLET] Found wallet: ${wallet.virtualAccountNumber}`);
    console.log(`💰 [WALLET] Current balance: ₦${wallet.balance}`);
    console.log(`🔒 [WALLET] Active: ${wallet.isActive}`);
    console.log(`📅 [WALLET] Created: ${wallet.createdAt}`);
    console.log(`📅 [WALLET] Last transaction: ${wallet.lastTransactionAt}\n`);

    // Get all wallet transactions
    const transactions = await prisma.walletTransaction.findMany({
      where: {
        OR: [
          { senderWalletId: walletId },
          { receiverWalletId: walletId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        amount: true,
        fee: true,
        type: true,
        status: true,
        reference: true,
        description: true,
        senderWalletId: true,
        receiverWalletId: true,
        senderBalanceBefore: true,
        senderBalanceAfter: true,
        receiverBalanceBefore: true,
        receiverBalanceAfter: true,
        createdAt: true,
        providerReference: true,
      },
    });

    console.log(`📊 [TRANSACTIONS] Found ${transactions.length} transactions:\n`);

    let calculatedBalance = 0;
    let transactionCount = 0;

    for (const tx of transactions) {
      transactionCount++;
      const isSender = tx.senderWalletId === walletId;
      const isReceiver = tx.receiverWalletId === walletId;
      
      if (isSender) {
        const totalDebit = tx.amount + (tx.fee || 0);
        calculatedBalance -= totalDebit;
        console.log(`${transactionCount}. ➖ [DEBIT] -₦${totalDebit} (Amount: ₦${tx.amount}, Fee: ₦${tx.fee || 0})`);
        console.log(`   📝 ${tx.description}`);
        console.log(`   📅 ${tx.createdAt}`);
        console.log(`   🔗 Reference: ${tx.reference}`);
        console.log(`   💰 Balance before: ₦${tx.senderBalanceBefore}, After: ₦${tx.senderBalanceAfter}`);
      } else if (isReceiver) {
        calculatedBalance += tx.amount;
        console.log(`${transactionCount}. ➕ [CREDIT] +₦${tx.amount}`);
        console.log(`   📝 ${tx.description}`);
        console.log(`   📅 ${tx.createdAt}`);
        console.log(`   🔗 Reference: ${tx.reference}`);
        console.log(`   💰 Balance before: ₦${tx.receiverBalanceBefore}, After: ₦${tx.receiverBalanceAfter}`);
      }
      
      console.log(`   📊 [CALC] Running balance: ₦${calculatedBalance}\n`);
    }

    console.log(`🧮 [SUMMARY] Balance calculation:`);
    console.log(`   💰 Current stored balance: ₦${wallet.balance}`);
    console.log(`   🧮 Calculated from transactions: ₦${calculatedBalance}`);
    console.log(`   📊 Discrepancy: ₦${Math.abs(wallet.balance - calculatedBalance)}`);
    console.log(`   ❓ Is valid: ${Math.abs(wallet.balance - calculatedBalance) < 0.01 ? 'Yes' : 'No'}\n`);

    // Check for any failed or pending transactions that might affect balance
    const failedTransactions = transactions.filter(tx => tx.status !== 'COMPLETED');
    if (failedTransactions.length > 0) {
      console.log(`⚠️ [WARNING] Found ${failedTransactions.length} non-completed transactions:`);
      failedTransactions.forEach(tx => {
        console.log(`   - ${tx.reference}: ${tx.status} (${tx.type})`);
      });
      console.log('');
    }

    // Check for any transactions with missing balance updates
    const transactionsWithMissingBalances = transactions.filter(tx => {
      if (tx.senderWalletId === walletId && (tx.senderBalanceBefore === null || tx.senderBalanceAfter === null)) {
        return true;
      }
      if (tx.receiverWalletId === walletId && (tx.receiverBalanceBefore === null || tx.receiverBalanceAfter === null)) {
        return true;
      }
      return false;
    });

    if (transactionsWithMissingBalances.length > 0) {
      console.log(`⚠️ [WARNING] Found ${transactionsWithMissingBalances.length} transactions with missing balance updates:`);
      transactionsWithMissingBalances.forEach(tx => {
        console.log(`   - ${tx.reference}: Missing balance info`);
      });
      console.log('');
    }

    // Check for duplicate transactions
    const referenceCounts = {};
    transactions.forEach(tx => {
      referenceCounts[tx.reference] = (referenceCounts[tx.reference] || 0) + 1;
    });

    const duplicateReferences = Object.entries(referenceCounts)
      .filter(([ref, count]) => count > 1)
      .map(([ref, count]) => ({ reference: ref, count }));

    if (duplicateReferences.length > 0) {
      console.log(`⚠️ [WARNING] Found duplicate transaction references:`);
      duplicateReferences.forEach(({ reference, count }) => {
        console.log(`   - ${reference}: ${count} occurrences`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ [ERROR] Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateWalletBalance();
