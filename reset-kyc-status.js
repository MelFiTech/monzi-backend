const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const USER_EMAIL = 'talktomelfi@gmail.com';

async function resetKycStatus() {
  try {
    console.log('🚀 Starting KYC status reset process...');
    console.log(`User: ${USER_EMAIL}`);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      select: {
        id: true,
        email: true,
        kycStatus: true,
        bvnVerifiedAt: true,
        kycVerifiedAt: true,
        bvnProviderResponse: true,
        metadata: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            virtualAccountNumber: true,
            provider: true,
            isActive: true
          }
        }
      }
    });

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log('\n📋 Current User Status:');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`KYC Status: ${user.kycStatus}`);
    console.log(`BVN Verified At: ${user.bvnVerifiedAt}`);
    console.log(`KYC Verified At: ${user.kycVerifiedAt}`);

    console.log('\n💰 Current Wallet Status:');
    if (user.wallet) {
      console.log(`Wallet ID: ${user.wallet.id}`);
      console.log(`Virtual Account Number: ${user.wallet.virtualAccountNumber}`);
      console.log(`Balance: ${user.wallet.balance}`);
      console.log(`Provider: ${user.wallet.provider}`);
      console.log(`Active: ${user.wallet.isActive}`);
    } else {
      console.log('No wallet found');
    }

    // Store current wallet info for comparison
    const initialWallet = user.wallet ? { ...user.wallet } : null;

    console.log('\n🔄 Resetting KYC status to UNDER_REVIEW...');
    
    // Update KYC status to UNDER_REVIEW and clear BVN data to allow re-verification
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'UNDER_REVIEW',
        kycVerifiedAt: null, // Clear KYC verification timestamp
        bvnVerifiedAt: null, // Clear BVN verification timestamp to allow re-verification
        bvnProviderResponse: null, // Clear old provider response
        metadata: null, // Clear old metadata (will be replaced with Identity Pass data)
        // Keep wallet intact
      },
      select: {
        id: true,
        email: true,
        kycStatus: true,
        bvnVerifiedAt: true,
        kycVerifiedAt: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            virtualAccountNumber: true,
            provider: true,
            isActive: true
          }
        }
      }
    });

    console.log('\n✅ KYC Status Updated:');
    console.log(`New KYC Status: ${updatedUser.kycStatus}`);
    console.log(`KYC Verified At: ${updatedUser.kycVerifiedAt}`);
    console.log(`BVN Verified At: ${updatedUser.bvnVerifiedAt}`);

    console.log('\n💰 Wallet Status After Update:');
    if (updatedUser.wallet) {
      console.log(`Wallet ID: ${updatedUser.wallet.id}`);
      console.log(`Virtual Account Number: ${updatedUser.wallet.virtualAccountNumber}`);
      console.log(`Balance: ${updatedUser.wallet.balance}`);
      console.log(`Provider: ${updatedUser.wallet.provider}`);
      console.log(`Active: ${updatedUser.wallet.isActive}`);
    } else {
      console.log('No wallet found');
    }

    // Verify wallet integrity
    console.log('\n✅ Wallet Integrity Check:');
    if (initialWallet && updatedUser.wallet) {
      const balanceUnchanged = initialWallet.balance === updatedUser.wallet.balance;
      const accountUnchanged = initialWallet.virtualAccountNumber === updatedUser.wallet.virtualAccountNumber;
      const providerUnchanged = initialWallet.provider === updatedUser.wallet.provider;
      const activeUnchanged = initialWallet.isActive === updatedUser.wallet.isActive;

      console.log(`Balance unchanged: ${balanceUnchanged ? '✅' : '❌'}`);
      console.log(`Virtual account number unchanged: ${accountUnchanged ? '✅' : '❌'}`);
      console.log(`Provider unchanged: ${providerUnchanged ? '✅' : '❌'}`);
      console.log(`Active status unchanged: ${activeUnchanged ? '✅' : '❌'}`);

      if (balanceUnchanged && accountUnchanged && providerUnchanged && activeUnchanged) {
        console.log('🎉 SUCCESS: Wallet and balance completely preserved!');
      } else {
        console.log('⚠️ WARNING: Some wallet properties may have changed!');
      }
    } else {
      console.log('ℹ️ No wallet to compare');
    }

    console.log('\n🎉 KYC status reset completed successfully!');
    console.log('The user can now rerun KYC verification with Identity Pass.');
    
  } catch (error) {
    console.error('❌ Error resetting KYC status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetKycStatus().catch(console.error); 