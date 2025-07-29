const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseWallets() {
  try {
    console.log('🔍 Checking database for users with wallets...\n');

    // Get all users with their wallets
    const usersWithWallets = await prisma.user.findMany({
      include: {
        wallet: true,
      },
    });

    console.log(`📊 Total users in database: ${usersWithWallets.length}`);

    const usersWithWalletsCount = usersWithWallets.filter(user => user.wallet).length;
    console.log(`💰 Users with wallets: ${usersWithWalletsCount}`);

    if (usersWithWalletsCount > 0) {
      console.log('\n📄 Users with wallets:');
      usersWithWallets.forEach((user, index) => {
        if (user.wallet) {
          console.log(`\n${index + 1}. User: ${user.email}`);
          console.log(`   - ID: ${user.id}`);
          console.log(`   - Wallet ID: ${user.wallet.id}`);
          console.log(`   - Virtual Account: ${user.wallet.virtualAccountNumber || 'None'}`);
          console.log(`   - Balance: ${user.wallet.balance}`);
          console.log(`   - Provider: ${user.wallet.provider || 'None'}`);
          console.log(`   - Is Active: ${user.wallet.isActive}`);
          console.log(`   - Is Frozen: ${user.wallet.isFrozen}`);
          console.log(`   - Currency: ${user.wallet.currency}`);
        }
      });
    } else {
      console.log('\n❌ No users with wallets found in database');
    }

    // Check all wallets directly
    console.log('\n🏦 Checking all wallets directly...');
    const allWallets = await prisma.wallet.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`📊 Total wallets in database: ${allWallets.length}`);

    if (allWallets.length > 0) {
      console.log('\n📄 All wallets:');
      allWallets.forEach((wallet, index) => {
        console.log(`\n${index + 1}. Wallet ID: ${wallet.id}`);
        console.log(`   - User: ${wallet.user.email}`);
        console.log(`   - User ID: ${wallet.user.id}`);
        console.log(`   - Virtual Account: ${wallet.virtualAccountNumber || 'None'}`);
        console.log(`   - Balance: ${wallet.balance}`);
        console.log(`   - Provider: ${wallet.provider || 'None'}`);
        console.log(`   - Is Active: ${wallet.isActive}`);
        console.log(`   - Is Frozen: ${wallet.isFrozen}`);
        console.log(`   - Currency: ${wallet.currency}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseWallets(); 