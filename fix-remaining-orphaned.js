const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRemainingOrphaned() {
  try {
    console.log('🔧 [FIX REMAINING ORPHANED] Fixing 18 orphaned main transactions...\n');

    await prisma.$connect();
    console.log('✅ [CONNECTION] Connected to local database\n');

    // ==================== IDENTIFY ORPHANED TRANSACTIONS ====================
    console.log('🔍 [IDENTIFYING] Finding orphaned main transactions...\n');

    const orphanedTransactions = await prisma.$queryRaw`
      SELECT t.id, t.reference, t.type, t.status, t.amount, t.currency, t.description, t."createdAt", t.metadata
      FROM transactions t
      LEFT JOIN wallet_transactions wt ON t.reference = wt.reference
      WHERE wt.reference IS NULL
      ORDER BY t."createdAt" DESC
    `;

    console.log(`📋 [ORPHANED] Found ${orphanedTransactions.length} orphaned main transactions:\n`);

    if (orphanedTransactions.length === 0) {
      console.log('✅ [STATUS] No orphaned transactions found!');
      return;
    }

    // Display orphaned transactions
    orphanedTransactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt).toLocaleDateString();
      console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()} (${date})`);
      if (tx.metadata && Object.keys(tx.metadata).length > 0) {
        const metadataKeys = Object.keys(tx.metadata).slice(0, 3).join(', ');
        console.log(`     Metadata: ${metadataKeys}${Object.keys(tx.metadata).length > 3 ? '...' : ''}`);
      }
    });
    console.log();

    // ==================== ANALYZE ORPHANED TRANSACTIONS ====================
    console.log('📊 [ANALYSIS] Analyzing orphaned transaction types:\n');

    const typeAnalysis = await prisma.$queryRaw`
      SELECT t.type, COUNT(*) as count, 
             MIN(t.amount) as min_amount, MAX(t.amount) as max_amount,
             SUM(t.amount) as total_amount
      FROM transactions t
      LEFT JOIN wallet_transactions wt ON t.reference = wt.reference
      WHERE wt.reference IS NULL
      GROUP BY t.type
      ORDER BY count DESC
    `;

    console.log('📊 [TYPE BREAKDOWN]:');
    typeAnalysis.forEach((type, index) => {
      console.log(`  ${index + 1}. ${type.type}: ${type.count} transactions`);
      console.log(`     Amount Range: ₦${type.min_amount.toLocaleString()} - ₦${type.max_amount.toLocaleString()}`);
      console.log(`     Total Value: ₦${type.total_amount.toLocaleString()}`);
      console.log();
    });

    // ==================== DECIDE ON FIX STRATEGY ====================
    console.log('🛠️  [FIX STRATEGY] Determining how to handle orphaned transactions:\n');

    const adminTransactions = orphanedTransactions.filter(tx => 
      tx.reference.includes('ADMIN_') || 
      (tx.metadata && tx.metadata.adminFunding)
    );

    const regularTransactions = orphanedTransactions.filter(tx => 
      !tx.reference.includes('ADMIN_') && 
      (!tx.metadata || !tx.metadata.adminFunding)
    );

    console.log(`👨‍💼 [ADMIN] Admin transactions: ${adminTransactions.length}`);
    console.log(`👤 [REGULAR] Regular transactions: ${regularTransactions.length}\n`);

    if (adminTransactions.length > 0) {
      console.log('🔧 [ADMIN FIX] Creating missing wallet transactions for admin operations...\n');
      
      for (const tx of adminTransactions) {
        try {
          // Create corresponding wallet transaction
          const walletTransaction = await prisma.walletTransaction.create({
            data: {
              reference: tx.reference,
              amount: tx.amount,
              type: tx.type === 'DEPOSIT' ? 'FUNDING' : 'WITHDRAWAL',
              status: tx.status,
              description: tx.description || 'Admin operation',
              fee: 0,
              metadata: {
                adminOperation: true,
                adminId: 'admin',
                operationType: tx.type === 'DEPOSIT' ? 'ADMIN_FUNDING' : 'ADMIN_DEBIT',
                linkedFromMain: true,
                linkedAt: new Date().toISOString()
              }
            }
          });

          // Update main transaction metadata to link them
          await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              metadata: {
                ...tx.metadata,
                walletTransactionId: walletTransaction.id,
                linked: true,
                linkedAt: new Date().toISOString()
              }
            }
          });

          console.log(`  ✅ Fixed: ${tx.reference} -> Wallet Transaction ID: ${walletTransaction.id}`);
        } catch (error) {
          console.log(`  ❌ Failed to fix ${tx.reference}: ${error.message}`);
        }
      }
    }

    if (regularTransactions.length > 0) {
      console.log('\n🔧 [REGULAR FIX] Handling regular orphaned transactions...\n');
      
      for (const tx of regularTransactions) {
        try {
          // For regular transactions, we need to determine if they should exist
          // Check if this is a duplicate or legitimate orphan
          const existingWalletTx = await prisma.walletTransaction.findFirst({
            where: { reference: tx.reference }
          });

          if (existingWalletTx) {
            console.log(`  ⚠️  Duplicate reference found: ${tx.reference} - marking main as duplicate`);
            
            // Mark as duplicate in metadata
            await prisma.transaction.update({
              where: { id: tx.id },
              data: {
                metadata: {
                  ...tx.metadata,
                  duplicate: true,
                  duplicateOf: existingWalletTx.id,
                  markedAt: new Date().toISOString()
                }
              }
            });
          } else {
            console.log(`  ❓ Unknown orphan: ${tx.reference} - requires manual investigation`);
          }
        } catch (error) {
          console.log(`  ❌ Failed to handle ${tx.reference}: ${error.message}`);
        }
      }
    }

    // ==================== VERIFY FIX ====================
    console.log('\n🔍 [VERIFICATION] Checking if fix was successful...\n');

    const remainingOrphaned = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM transactions t
      LEFT JOIN wallet_transactions wt ON t.reference = wt.reference
      WHERE wt.reference IS NULL
    `;

    const remainingCount = remainingOrphaned[0].count;
    console.log(`📊 [REMAINING] Orphaned transactions after fix: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('✅ [SUCCESS] All orphaned transactions have been resolved!');
    } else {
      console.log(`⚠️  [PARTIAL] ${remainingCount} orphaned transactions remain - may require manual review`);
    }

    // ==================== FINAL STATUS ====================
    console.log('\n📋 [FINAL STATUS]:\n');
    
    const mainCount = await prisma.transaction.count();
    const walletCount = await prisma.walletTransaction.count();
    
    console.log(`📋 Main Transactions: ${mainCount}`);
    console.log(`💸 Wallet Transactions: ${walletCount}`);
    console.log(`📊 Difference: ${Math.abs(mainCount - walletCount)}`);

    if (Math.abs(mainCount - walletCount) <= 1) {
      console.log('\n✅ [CONCLUSION] Transaction tables are now properly synced!');
    } else {
      console.log('\n⚠️  [CONCLUSION] Some discrepancies remain - may need additional investigation');
    }

  } catch (error) {
    console.error('❌ [ERROR] Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingOrphaned();


