// scripts/check-all-push-tokens.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Make sure this is set to production DB
    },
  },
});

async function main() {
  try {
    console.log('🔍 Checking all users and their push tokens...\n');

    // Get all users with their push tokens
    const users = await prisma.user.findMany({
      include: {
        pushTokens: {
          where: { isActive: true },
          orderBy: { lastUsedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Total Users: ${users.length}\n`);

    let usersWithTokens = 0;
    let totalActiveTokens = 0;

    for (const user of users) {
      const activeTokens = user.pushTokens.filter(token => token.isActive);
      const hasTokens = activeTokens.length > 0;
      
      if (hasTokens) {
        usersWithTokens++;
        totalActiveTokens += activeTokens.length;
      }

      console.log(`👤 ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Wallet Balance: ₦${user.wallet?.balance || 0}`);
      console.log(`   Active Push Tokens: ${activeTokens.length}`);
      
      if (activeTokens.length > 0) {
        activeTokens.forEach((token, index) => {
          console.log(`   Token ${index + 1}: ${token.token}`);
          console.log(`   Device: ${token.deviceName} (${token.deviceId})`);
          console.log(`   Platform: ${token.platform}`);
          console.log(`   Last Used: ${token.lastUsedAt}`);
        });
      } else {
        console.log(`   ❌ No active push tokens`);
      }
      console.log('');
    }

    console.log('📈 Summary:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Users with Active Tokens: ${usersWithTokens}`);
    console.log(`   Total Active Tokens: ${totalActiveTokens}`);
    console.log(`   Users without Tokens: ${users.length - usersWithTokens}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 