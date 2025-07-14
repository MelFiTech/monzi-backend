// scripts/check-user-notification-preferences.js
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
    console.log('🔍 Checking user notification preferences...\n');

    // Get all users with their notification preferences
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        notificationsEnabled: true,
        transactionNotificationsEnabled: true,
        promotionalNotificationsEnabled: true,
        pushTokens: {
          where: { isActive: true },
          select: {
            token: true,
            deviceName: true,
            lastUsedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Total Users: ${users.length}\n`);

    for (const user of users) {
      console.log(`👤 ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   All Notifications: ${user.notificationsEnabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Transaction Notifications: ${user.transactionNotificationsEnabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Promotional Notifications: ${user.promotionalNotificationsEnabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Active Push Tokens: ${user.pushTokens.length}`);
      
      if (user.pushTokens.length > 0) {
        user.pushTokens.forEach((token, index) => {
          console.log(`   Token ${index + 1}: ${token.token}`);
          console.log(`   Device: ${token.deviceName}`);
          console.log(`   Last Used: ${token.lastUsedAt}`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 