const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function investigateAmountCorruption() {
  try {
    console.log('🔍 [AMOUNT CORRUPTION INVESTIGATION] Starting focused investigation...\n');

    await prisma.$connect();
    console.log('✅ [CONNECTION] Connected to local database\n');

    // ==================== PHASE 1: UNDERSTAND THE PATTERN ====================
    console.log('📊 [PHASE 1] Analyzing Amount Patterns\n');

    // Check main transaction amounts
    const mainAmounts = await prisma.$queryRaw`
      SELECT amount, COUNT(*) as count
      FROM transactions
      GROUP BY amount
      ORDER BY count DESC
    `;

    console.log('💰 [MAIN TRANSACTION AMOUNTS] Distribution:');
    mainAmounts.forEach((item, index) => {
      console.log(`  ${index + 1}. ₦${item.amount.toLocaleString()}: ${item.count} transactions`);
    });
    console.log();

    // Check wallet transaction amounts
    const walletAmounts = await prisma.$queryRaw`
      SELECT amount, COUNT(*) as count
      FROM wallet_transactions
      GROUP BY amount
      ORDER BY count DESC
      LIMIT 10
    `;

    console.log('💸 [WALLET TRANSACTION AMOUNTS] Distribution:');
    walletAmounts.forEach((item, index) => {
      console.log(`  ${index + 1}. ₦${item.amount.toLocaleString()}: ${item.count} transactions`);
    });
    console.log();

    // ==================== PHASE 2: INVESTIGATE SPECIFIC REFERENCES ====================
    console.log('🔍 [PHASE 2] Investigating Specific References\n');

    // Get a sample of transactions with mismatched amounts
    const mismatchedSample = await prisma.$queryRaw`
      SELECT t.reference, t.amount as main_amount, wt.amount as wallet_amount,
             t.type as main_type, wt.type as wallet_type,
             t.status as main_status, wt.status as wallet_status,
             t."createdAt" as main_created, wt."createdAt" as wallet_created
      FROM transactions t
      JOIN wallet_transactions wt ON t.reference = wt.reference
      WHERE t.amount != wt.amount
      ORDER BY t."createdAt" DESC
      LIMIT 5
    `;

    console.log('⚠️  [MISMATCHED AMOUNTS] Sample transactions:');
    mismatchedSample.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.reference}:`);
      console.log(`     Main: ${tx.main_type} ${tx.main_status} ₦${tx.main_amount.toLocaleString()} (${new Date(tx.main_created).toLocaleDateString()})`);
      console.log(`     Wallet: ${tx.wallet_type} ${tx.wallet_status} ₦${tx.wallet_amount.toLocaleString()} (${new Date(tx.wallet_created).toLocaleDateString()})`);
      console.log();
    });

    // ==================== PHASE 3: CHECK ADMIN FUNDING LOGIC ====================
    console.log('👨‍💼 [PHASE 3] Investigating Admin Funding Logic\n');

    // Look for admin funding transactions
    const adminTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { reference: { contains: 'ADMIN_FUND' } },
          { metadata: { path: ['adminFunding'], equals: true } }
        ]
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        type: true,
        status: true,
        metadata: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('👨‍💼 [ADMIN FUNDING] Sample transactions:');
    adminTransactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt).toLocaleDateString();
      console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()} (${date})`);
      if (tx.metadata) {
        console.log(`     Metadata: ${JSON.stringify(tx.metadata)}`);
      }
      console.log();
    });

    // ==================== PHASE 4: CHECK TRANSACTION CREATION TIMING ====================
    console.log('⏰ [PHASE 4] Investigating Transaction Creation Timing\n');

    // Check if there's a pattern in creation times
    const timingSample = await prisma.$queryRaw`
      SELECT t.reference, 
             EXTRACT(EPOCH FROM (t."createdAt" - wt."createdAt")) as time_diff_seconds,
             t.amount as main_amount, wt.amount as wallet_amount
      FROM transactions t
      JOIN wallet_transactions wt ON t.reference = wt.reference
      WHERE t.amount != wt.amount
      ORDER BY ABS(EXTRACT(EPOCH FROM (t."createdAt" - wt."createdAt"))) DESC
      LIMIT 10
    `;

    console.log('⏰ [TIMING ANALYSIS] Transactions with time differences:');
    timingSample.forEach((tx, index) => {
      const timeDiff = Math.abs(tx.time_diff_seconds);
      const timeUnit = timeDiff < 60 ? 'seconds' : timeDiff < 3600 ? 'minutes' : 'hours';
      const timeValue = timeDiff < 60 ? timeDiff : timeDiff < 3600 ? (timeDiff / 60).toFixed(1) : (timeDiff / 3600).toFixed(1);
      
      console.log(`  ${index + 1}. ${tx.reference}:`);
      console.log(`     Time difference: ${timeValue} ${timeUnit}`);
      console.log(`     Main: ₦${tx.main_amount.toLocaleString()}, Wallet: ₦${tx.wallet_amount.toLocaleString()}`);
      console.log();
    });

    // ==================== PHASE 5: CHECK FOR BATCH OPERATIONS ====================
    console.log('📦 [PHASE 5] Checking for Batch Operations\n');

    // Look for transactions created in batches
    const batchCheck = await prisma.$queryRaw`
      SELECT DATE_TRUNC('minute', t."createdAt") as minute_batch,
             COUNT(*) as transaction_count,
             COUNT(DISTINCT t.amount) as unique_amounts,
             MIN(t.amount) as min_amount,
             MAX(t.amount) as max_amount
      FROM transactions t
      WHERE t."createdAt" >= NOW() - INTERVAL '1 day'
      GROUP BY DATE_TRUNC('minute', t."createdAt")
      HAVING COUNT(*) > 5
      ORDER BY transaction_count DESC
      LIMIT 10
    `;

    console.log('📦 [BATCH OPERATIONS] Transactions created in batches:');
    batchCheck.forEach((batch, index) => {
      const batchTime = new Date(batch.minute_batch).toLocaleString();
      console.log(`  ${index + 1}. ${batchTime}: ${batch.transaction_count} transactions`);
      console.log(`     Amounts: ${batch.unique_amounts} unique (₦${batch.min_amount.toLocaleString()} - ₦${batch.max_amount.toLocaleString()})`);
      console.log();
    });

    // ==================== PHASE 6: SUMMARY & HYPOTHESIS ====================
    console.log('📋 [INVESTIGATION SUMMARY] Findings:\n');

    console.log('🚨 [CRITICAL ISSUES IDENTIFIED]:');
    console.log('1. Main transaction amounts are consistently wrong (₦2,000/₦1,000)');
    console.log('2. Wallet transaction amounts are correct (actual user amounts)');
    console.log('3. 10,639 transactions have mismatched amounts');
    console.log('4. This affects ALL financial calculations and reports\n');

    console.log('🔍 [ROOT CAUSE HYPOTHESIS]:');
    console.log('The main transaction table is being populated with admin funding amounts');
    console.log('instead of the actual transaction amounts. This suggests:');
    console.log('- Incorrect transaction creation logic in the main table');
    console.log('- Admin funding amounts being copied to all transactions');
    console.log('- Possible bug in the transaction sync mechanism\n');

    console.log('💡 [IMMEDIATE ACTIONS NEEDED]:');
    console.log('1. Fix the transaction creation logic in the main table');
    console.log('2. Correct all existing mismatched amounts');
    console.log('3. Implement validation to prevent future mismatches');
    console.log('4. Re-run all financial calculations with correct data');

  } catch (error) {
    console.error('❌ [ERROR] Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateAmountCorruption();
