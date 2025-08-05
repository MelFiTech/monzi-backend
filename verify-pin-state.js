const { PrismaClient } = require('@prisma/client');

async function verifyPinState() {
  const prisma = new PrismaClient();
  const userEmail = 'talktomelfi@gmail.com';
  
  try {
    console.log('🔍 Verifying PIN State in Database');
    console.log('===================================');
    console.log(`👤 User: ${userEmail}`);
    
    // Check current state in database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        wallet: {
          select: {
            id: true,
            pin: true,
            balance: true,
            isActive: true,
            virtualAccountNumber: true,
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('📊 Current Database State:');
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Has Wallet: ${!!user.wallet}`);
    
    if (user.wallet) {
      console.log(`   - Wallet ID: ${user.wallet.id}`);
      console.log(`   - PIN Value: ${user.wallet.pin || 'null'}`);
      console.log(`   - PIN Length: ${user.wallet.pin ? user.wallet.pin.length : 0}`);
      console.log(`   - Balance: ₦${user.wallet.balance}`);
      console.log(`   - Is Active: ${user.wallet.isActive}`);
      console.log(`   - Virtual Account: ${user.wallet.virtualAccountNumber}`);
      
      // Check PIN status logic
      const hasPinSet = user.wallet.pin !== null && user.wallet.pin !== undefined && user.wallet.pin.length > 0;
      console.log(`\n🔒 PIN Status Logic Check:`);
      console.log(`   - PIN !== null: ${user.wallet.pin !== null}`);
      console.log(`   - PIN !== undefined: ${user.wallet.pin !== undefined}`);
      console.log(`   - PIN length > 0: ${user.wallet.pin ? user.wallet.pin.length > 0 : false}`);
      console.log(`   - Final hasPinSet: ${hasPinSet}`);
    }

    // Test the exact same logic as the service
    console.log('\n🧪 Testing Service Logic:');
    if (user.wallet) {
      const wallet = user.wallet;
      const hasPinSet = wallet.pin !== null && wallet.pin !== undefined && wallet.pin.length > 0;
      
      console.log(`   - wallet.pin: ${wallet.pin}`);
      console.log(`   - wallet.pin !== null: ${wallet.pin !== null}`);
      console.log(`   - wallet.pin !== undefined: ${wallet.pin !== undefined}`);
      console.log(`   - wallet.pin.length > 0: ${wallet.pin ? wallet.pin.length > 0 : false}`);
      console.log(`   - hasPinSet: ${hasPinSet}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPinState(); 