const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findUserId() {
  try {
    console.log('🔍 Finding user ID for email: talktomelfi@gmail.com');
    
    const user = await prisma.user.findUnique({
      where: { email: 'talktomelfi@gmail.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        locationNotificationsEnabled: true,
      },
    });

    if (user) {
      console.log('✅ User found:');
      console.log('📄 User Data:', JSON.stringify(user, null, 2));
      console.log('🆔 User ID:', user.id);
      console.log('📍 Location notifications enabled:', user.locationNotificationsEnabled);
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findUserId(); 