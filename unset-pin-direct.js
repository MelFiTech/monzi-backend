const { PrismaClient } = require('@prisma/client');

async function unsetPinDirect() {
  const prisma = new PrismaClient();
  const userEmail = 'talktomelfi@gmail.com';
  
  try {
    console.log('🗑️  Directly Unsetting Transaction PIN');
    console.log('=======================================');
    console.log(`👤 User: ${userEmail}`);
    
    // Step 1: Find the user
    console.log('\n🔍 Step 1: Find User');
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

    console.log('✅ User found:');
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Has Wallet: ${!!user.wallet}`);
    
    if (user.wallet) {
      console.log(`   - Wallet ID: ${user.wallet.id}`);
      console.log(`   - Current PIN: ${user.wallet.pin ? 'SET' : 'NOT SET'}`);
      console.log(`   - Wallet Balance: ₦${user.wallet.balance}`);
      console.log(`   - Virtual Account: ${user.wallet.virtualAccountNumber}`);
    }

    // Step 2: Check current PIN status
    console.log('\n🔒 Step 2: Current PIN Status');
    if (user.wallet) {
      const hasPinSet = user.wallet.pin !== null && user.wallet.pin !== undefined && user.wallet.pin.length > 0;
      console.log(`   - Has PIN Set: ${hasPinSet}`);
      console.log(`   - PIN Value: ${user.wallet.pin || 'null'}`);
    } else {
      console.log('   - No wallet found');
    }

    // Step 3: Unset PIN
    console.log('\n🗑️  Step 3: Unsetting PIN');
    if (user.wallet) {
      const updatedWallet = await prisma.wallet.update({
        where: { id: user.wallet.id },
        data: {
          pin: null
        },
        select: {
          id: true,
          pin: true,
          balance: true,
          isActive: true,
          virtualAccountNumber: true,
        }
      });

      console.log('✅ PIN unset successfully');
      console.log(`   - Wallet ID: ${updatedWallet.id}`);
      console.log(`   - New PIN Value: ${updatedWallet.pin || 'null'}`);
      console.log(`   - Balance: ₦${updatedWallet.balance}`);
      console.log(`   - Is Active: ${updatedWallet.isActive}`);
    } else {
      console.log('❌ No wallet found to unset PIN');
    }

    // Step 4: Verify PIN is unset
    console.log('\n✅ Step 4: Verify PIN is Unset');
    const verifyUser = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        wallet: {
          select: {
            id: true,
            pin: true,
            balance: true,
            isActive: true,
          }
        }
      }
    });

    if (verifyUser && verifyUser.wallet) {
      const hasPinSet = verifyUser.wallet.pin !== null && verifyUser.wallet.pin !== undefined && verifyUser.wallet.pin.length > 0;
      console.log(`   - Has PIN Set: ${hasPinSet}`);
      console.log(`   - PIN Value: ${verifyUser.wallet.pin || 'null'}`);
      
      if (!hasPinSet) {
        console.log('✅ Success: PIN has been unset');
      } else {
        console.log('❌ Error: PIN is still set');
      }
    }

    console.log('\n🎉 PIN Unsetting Complete!');
    console.log('============================');
    console.log('✅ PIN has been unset successfully');
    console.log('✅ User can now test PIN status endpoints');
    console.log('✅ Ready for PIN setup testing');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

unsetPinDirect(); 