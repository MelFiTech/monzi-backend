const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        passcode: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
      console.log(`${index + 1}. ${fullName} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Passcode: ${user.passcode}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    // Check admin users specifically
    const adminUsers = users.filter(user => 
      ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP', 'DEVELOPER'].includes(user.role)
    );
    
    console.log(`👑 Admin users (${adminUsers.length}):`);
    adminUsers.forEach(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
      console.log(`   - ${user.email} (${user.role}) - ${fullName}`);
    });

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers(); 