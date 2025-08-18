const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function syncMariamMainTransactions() {
  try {
    console.log('🔗 [SYNC MARIAM MAIN TRANSACTIONS] Synchronizing main transaction table...\n');

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
        lastName: true
      }
    });

    if (!user) {
      console.log('❌ [ERROR] User not found');
      return;
    }

    console.log(`👤 [USER] ${user.firstName} ${user.lastName} (${user.email})\n`);

    // ==================== GET MAIN TRANSACTIONS ====================
    console.log('📋 [MAIN TRANSACTIONS] Getting all main transactions for this user...\n');

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

    console.log(`📋 [MAIN] Found ${mainTransactions.length} main transactions\n`);

    // ==================== IDENTIFY ADMIN TRANSACTIONS IN MAIN TABLE ====================
    console.log('🔍 [ADMIN TRANSACTIONS] Identifying admin transactions in main table...\n');

    const adminMainTransactions = mainTransactions.filter(tx => 
      tx.reference.includes('ADMIN_') ||
      (tx.metadata && (tx.metadata.adminFunding || tx.metadata.adminDebit))
    );

    console.log(`👨‍💼 [ADMIN MAIN] Found ${adminMainTransactions.length} admin transactions in main table:\n`);

    if (adminMainTransactions.length > 0) {
      adminMainTransactions.forEach((tx, index) => {
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

    // ==================== IDENTIFY LEGITIMATE TRANSACTIONS IN MAIN TABLE ====================
    console.log('✅ [LEGITIMATE MAIN] Identifying legitimate transactions in main table...\n');

    const legitimateMainTransactions = mainTransactions.filter(tx => 
      !tx.reference.includes('ADMIN_') &&
      (!tx.metadata || (!tx.metadata.adminFunding && !tx.metadata.adminDebit))
    );

    console.log(`✅ [LEGITIMATE MAIN] Found ${legitimateMainTransactions.length} legitimate transactions in main table:\n`);

    if (legitimateMainTransactions.length > 0) {
      legitimateMainTransactions.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const time = new Date(tx.createdAt).toLocaleTimeString();
        console.log(`  ${index + 1}. ${tx.reference}: ${tx.type} ${tx.status} ₦${tx.amount.toLocaleString()}`);
        console.log(`     Date: ${date} ${time}`);
        console.log();
      });
    }

    // ==================== REMOVE ADMIN TRANSACTIONS FROM MAIN TABLE ====================
    console.log('🧹 [CLEANUP MAIN] Removing admin transactions from main table...\n');

    let deletedCount = 0;
    for (const tx of adminMainTransactions) {
      try {
        await prisma.transaction.delete({
          where: { id: tx.id }
        });
        
        console.log(`  ✅ Deleted: ${tx.reference} (₦${tx.amount.toLocaleString()})`);
        deletedCount++;
      } catch (error) {
        console.log(`  ❌ Failed to delete ${tx.reference}: ${error.message}`);
      }
    }

    console.log(`\n📊 [CLEANUP COMPLETE] Deleted ${deletedCount} admin transactions from main table`);

    // ==================== VERIFY SYNC ====================
    console.log('\n🔍 [VERIFICATION] Verifying synchronization...\n');

    // Get updated counts
    const updatedMainCount = await prisma.transaction.count({
      where: { userId: user.id }
    });

    const walletCount = await prisma.walletTransaction.count({
      where: {
        OR: [
          { senderWallet: { userId: user.id } },
          { receiverWallet: { userId: user.id } }
        ]
      }
    });

    console.log(`📊 [SYNC STATUS] After cleanup:`);
    console.log(`  Main Transactions: ${updatedMainCount}`);
    console.log(`  Wallet Transactions: ${walletCount}`);
    console.log(`  Difference: ${Math.abs(updatedMainCount - walletCount)}`);

    if (updatedMainCount === walletCount) {
      console.log(`  ✅ [PERFECT SYNC] Tables are now perfectly synchronized!`);
    } else if (Math.abs(updatedMainCount - walletCount) <= 1) {
      console.log(`  ⚠️  [MINOR SYNC] Tables are mostly synchronized (${Math.abs(updatedMainCount - walletCount)} difference)`);
    } else {
      console.log(`  ❌ [SYNC ISSUE] Tables are still not synchronized (${Math.abs(updatedMainCount - walletCount)} difference)`);
    }

    // ==================== FINAL STATUS ====================
    console.log('\n📋 [FINAL STATUS]:\n');
    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`📋 Main Transactions: ${updatedMainCount}`);
    console.log(`💸 Wallet Transactions: ${walletCount}`);
    console.log(`🧹 Removed Admin: ${deletedCount}`);
    console.log(`🔗 Sync Status: ${updatedMainCount === walletCount ? 'Perfect' : 'Needs Attention'}`);

    if (updatedMainCount === walletCount) {
      console.log('\n✅ [SUCCESS] Main and wallet transaction tables are now perfectly synchronized!');
      console.log('   - All admin transactions removed from both tables');
      console.log('   - Only legitimate user transactions remain');
      console.log('   - Tables are in perfect 1:1 sync');
    } else {
      console.log('\n⚠️  [PARTIAL] Some synchronization issues remain');
      console.log('   - May need additional investigation');
      console.log('   - Check for other discrepancies');
    }

  } catch (error) {
    console.error('❌ [ERROR] Sync failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncMariamMainTransactions();


