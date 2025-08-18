const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function finalVerificationMariam() {
  try {
    console.log('✅ [FINAL VERIFICATION] Confirming mariam\'s balance and transaction sync...\n');

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

    // ==================== VERIFY TRANSACTION COUNTS ====================
    console.log('📊 [TRANSACTION COUNTS] Verifying table synchronization...\n');

    const walletCount = await prisma.walletTransaction.count({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ]
      }
    });

    const mainCount = await prisma.transaction.count({
      where: { userId: user.id }
    });

    console.log(`📊 [COUNTS]:`);
    console.log(`  Wallet Transactions: ${walletCount}`);
    console.log(`  Main Transactions: ${mainCount}`);
    console.log(`  Difference: ${Math.abs(walletCount - mainCount)}`);

    if (walletCount === mainCount) {
      console.log(`  ✅ [PERFECT SYNC] Tables are perfectly synchronized!`);
    } else {
      console.log(`  ❌ [SYNC ISSUE] Tables are not synchronized!`);
    }

    // ==================== VERIFY BALANCE CALCULATION ====================
    console.log('\n🧮 [BALANCE VERIFICATION] Calculating balance from transactions...\n');

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ]
      },
      select: {
        type: true,
        amount: true,
        fee: true,
        status: true,
        senderWalletId: true,
        receiverWalletId: true
      },
      orderBy: { createdAt: 'asc' }
    });

    let calculatedBalance = 0;
    let transactionSummary = {
      credits: 0,
      debits: 0,
      fees: 0,
      completed: 0,
      failed: 0
    };

    transactions.forEach((tx, index) => {
      if (tx.status === 'COMPLETED') {
        transactionSummary.completed++;
        
        if (tx.receiverWalletId === user.wallet.id) {
          // Credit operation
          calculatedBalance += tx.amount;
          transactionSummary.credits += tx.amount;
          console.log(`  ${index + 1}. ➕ Credit: +₦${tx.amount.toLocaleString()} → Balance: ₦${calculatedBalance.toLocaleString()}`);
        } else if (tx.senderWalletId === user.wallet.id) {
          // Debit operation
          const totalDebit = tx.amount + tx.fee;
          calculatedBalance -= totalDebit;
          transactionSummary.debits += tx.amount;
          transactionSummary.fees += tx.fee;
          console.log(`  ${index + 1}. ➖ Debit: -₦${totalDebit.toLocaleString()} (Amount: ₦${tx.amount.toLocaleString()}, Fee: ₦${tx.fee.toLocaleString()}) → Balance: ₦${calculatedBalance.toLocaleString()}`);
        }
      } else {
        transactionSummary.failed++;
        console.log(`  ${index + 1}. ⚠️  ${tx.type} ${tx.status} (SKIPPED)`);
      }
    });

    console.log(`\n🧮 [CALCULATION SUMMARY]:`);
    console.log(`  Total Credits: ₦${transactionSummary.credits.toLocaleString()}`);
    console.log(`  Total Debits: ₦${transactionSummary.debits.toLocaleString()}`);
    console.log(`  Total Fees: ₦${transactionSummary.fees.toLocaleString()}`);
    console.log(`  Completed Transactions: ${transactionSummary.completed}`);
    console.log(`  Failed Transactions: ${transactionSummary.failed}`);
    console.log(`  Final Calculated Balance: ₦${calculatedBalance.toLocaleString()}`);

    // ==================== BALANCE COMPARISON ====================
    console.log('\n💰 [BALANCE COMPARISON] Comparing stored vs calculated balance...\n');

    const storedBalance = user.wallet.balance;
    const discrepancy = Math.abs(storedBalance - calculatedBalance);
    
    console.log(`💰 [STORED] Wallet stored balance: ₦${storedBalance.toLocaleString()}`);
    console.log(`🧮 [CALCULATED] Balance from transactions: ₦${calculatedBalance.toLocaleString()}`);
    console.log(`❌ [DISCREPANCY] Difference: ₦${discrepancy.toLocaleString()}`);

    if (discrepancy === 0) {
      console.log(`  ✅ [PERFECT MATCH] Stored and calculated balances match perfectly!`);
    } else if (discrepancy <= 0.01) {
      console.log(`  ⚠️  [MINOR DIFFERENCE] Tiny difference (likely rounding) - acceptable`);
    } else {
      console.log(`  ❌ [BALANCE MISMATCH] Significant difference detected!`);
    }

    // ==================== TODAY'S ACTIVITY CHECK ====================
    console.log('\n📅 [TODAY CHECK] Verifying today\'s activity...\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactions = transactions.filter(tx => {
      // We need to get the actual transaction dates
      return true; // Placeholder - we'll check this differently
    });

    // Get actual today's transactions
    const actualTodayTransactions = await prisma.walletTransaction.findMany({
      where: {
        OR: [
          { senderWalletId: user.wallet.id },
          { receiverWalletId: user.wallet.id }
        ],
        createdAt: {
          gte: today
        }
      },
      select: {
        reference: true,
        type: true,
        amount: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📅 [TODAY] Transactions from today (${today.toLocaleDateString()}):`);
    
    if (actualTodayTransactions.length > 0) {
      actualTodayTransactions.forEach((tx, index) => {
        const time = new Date(tx.createdAt).toLocaleTimeString();
        const isCredit = tx.receiverWalletId === user.wallet.id;
        const operation = isCredit ? `➕ Credit: +₦${tx.amount.toLocaleString()}` : `➖ Debit: -₦${tx.amount.toLocaleString()}`;
        
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status}`);
        console.log(`     ${operation} | Time: ${time}`);
      });
    } else {
      console.log('  No transactions found for today');
    }

    // ==================== FINAL STATUS ====================
    console.log('\n📋 [FINAL VERIFICATION STATUS]:\n');
    
    const allGood = (
      walletCount === mainCount && 
      discrepancy === 0 && 
      transactionSummary.completed > 0
    );

    if (allGood) {
      console.log('🎉 [PERFECT STATUS] Everything is working perfectly!');
      console.log('   ✅ Tables are perfectly synchronized');
      console.log('   ✅ Balance calculation is accurate');
      console.log('   ✅ Transaction history is clean');
      console.log('   ✅ Ready for production use');
    } else {
      console.log('⚠️  [ATTENTION NEEDED] Some issues detected:');
      if (walletCount !== mainCount) console.log('   ❌ Table synchronization issue');
      if (discrepancy > 0.01) console.log('   ❌ Balance calculation mismatch');
      if (transactionSummary.completed === 0) console.log('   ❌ No completed transactions found');
    }

    console.log('\n📊 [SUMMARY]:');
    console.log(`  User: ${user.firstName} ${user.lastName}`);
    console.log(`  Account: ${user.wallet.virtualAccountNumber}`);
    console.log(`  Balance: ₦${storedBalance.toLocaleString()}`);
    console.log(`  Transactions: ${walletCount} (both tables)`);
    console.log(`  Sync Status: ${walletCount === mainCount ? 'Perfect' : 'Broken'}`);
    console.log(`  Balance Status: ${discrepancy === 0 ? 'Perfect' : 'Mismatch'}`);

  } catch (error) {
    console.error('❌ [ERROR] Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalVerificationMariam();


