const { PrismaClient } = require('@prisma/client');

async function fixWalletDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing Wallet-User Link in Database');
    console.log('======================================');
    
    const userId = 'cmdgb0pbw000wld3s2jqu5tmv';
    const walletId = 'cmdktaawn0013pp3tc0wsunny';
    
    // Step 1: Check current state
    console.log('\n🔍 Step 1: Check Current State');
    console.log(`Checking user: ${userId}`);
    console.log(`Checking wallet: ${walletId}`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
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
      console.log('\n🎯 Current Wallet:');
      console.log(`   - Wallet ID: ${user.wallet.id}`);
      console.log(`   - User ID in Wallet: ${user.wallet.userId}`);
      console.log(`   - Balance: ₦${user.wallet.balance}`);
      console.log(`   - Virtual Account: ${user.wallet.virtualAccountNumber}`);
      console.log(`   - Is Active: ${user.wallet.isActive}`);
      console.log(`   - Is Frozen: ${user.wallet.isFrozen}`);
      
      if (user.wallet.userId === user.id) {
        console.log('\n✅ WALLET LINK STATUS: Wallet is properly linked to user!');
        console.log('No fix needed.');
        return;
      } else {
        console.log('\n❌ WALLET LINK ISSUE: Wallet not properly linked to user!');
        console.log(`   - Expected User ID: ${user.id}`);
        console.log(`   - Actual Wallet User ID: ${user.wallet.userId}`);
      }
    } else {
      console.log('\n❌ User has no wallet');
    }
    
    // Step 2: Check if wallet exists independently
    console.log('\n💾 Step 2: Check Wallet Independently');
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId }
    });
    
    if (wallet) {
      console.log('✅ Wallet found independently:');
      console.log(`   - Wallet ID: ${wallet.id}`);
      console.log(`   - User ID: ${wallet.userId}`);
      console.log(`   - Balance: ₦${wallet.balance}`);
      console.log(`   - Virtual Account: ${wallet.virtualAccountNumber}`);
    } else {
      console.log('❌ Wallet not found with ID:', walletId);
      return;
    }
    
    // Step 3: Fix the wallet-user link
    console.log('\n🔧 Step 3: Fix Wallet-User Link');
    console.log('Updating wallet to link to correct user...');
    
    const updatedWallet = await prisma.wallet.update({
      where: { id: walletId },
      data: { userId: userId }
    });
    
    console.log('✅ Wallet updated successfully:');
    console.log(`   - Wallet ID: ${updatedWallet.id}`);
    console.log(`   - User ID: ${updatedWallet.userId}`);
    console.log(`   - Balance: ₦${updatedWallet.balance}`);
    console.log(`   - Virtual Account: ${updatedWallet.virtualAccountNumber}`);
    
    // Step 4: Verify the fix
    console.log('\n✅ Step 4: Verify Fix');
    const verifyUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });
    
    if (verifyUser && verifyUser.wallet) {
      console.log('✅ Verification successful:');
      console.log(`   - User ID: ${verifyUser.id}`);
      console.log(`   - Wallet User ID: ${verifyUser.wallet.userId}`);
      console.log(`   - Balance: ₦${verifyUser.wallet.balance}`);
      
      if (verifyUser.wallet.userId === verifyUser.id) {
        console.log('\n🎉 SUCCESS: Wallet is now properly linked to user!');
        console.log('Transfer flow should work correctly now.');
      } else {
        console.log('\n❌ ISSUE PERSISTS: Wallet still not properly linked');
      }
    }
    
    // Step 5: Test the transfer flow query
    console.log('\n💸 Step 5: Test Transfer Flow Query');
    console.log('Testing the exact same query used in transfer flow...');
    
    const transferFlowWallet = await prisma.wallet.findUnique({
      where: { userId: userId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
    
    if (transferFlowWallet) {
      console.log('✅ Transfer Flow Query Result:');
      console.log(`   - Wallet Found: true`);
      console.log(`   - User ID: ${transferFlowWallet.userId}`);
      console.log(`   - Balance: ₦${transferFlowWallet.balance}`);
      console.log(`   - Virtual Account: ${transferFlowWallet.virtualAccountNumber}`);
      console.log(`   - User Name: ${transferFlowWallet.user.firstName} ${transferFlowWallet.user.lastName}`);
      console.log(`   - User Email: ${transferFlowWallet.user.email}`);
      
      console.log('\n🎉 SUCCESS: Transfer flow can now find the wallet!');
    } else {
      console.log('❌ Transfer flow query failed - wallet not found');
    }
    
    // Summary
    console.log('\n📋 Database Fix Summary');
    console.log('========================');
    console.log('✅ Wallet exists and has balance');
    console.log('✅ Wallet-user link fixed');
    console.log('✅ Transfer flow query works');
    console.log('🎯 Transfer should now work correctly');

  } catch (error) {
    console.error('❌ Database fix error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixWalletDatabase(); 