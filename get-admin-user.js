const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getAdminUser() {
  try {
    console.log('🔍 Looking for admin user...');
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: 'talktomelfi@gmail.com'
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true
      }
    });

    if (user) {
      console.log('✅ Admin user found:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Name:', `${user.firstName} ${user.lastName}`);
    } else {
      console.log('❌ Admin user not found');
    }

    // Also check for other admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUDO_ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true
      }
    });

    console.log('\n📋 All admin users:');
    adminUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ID: ${user.id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAdminUser(); 