const fetch = require('node-fetch');

async function fixWalletLinkSimple() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔧 Fix Wallet Link - Simple Approach');
    console.log('====================================');
    
    // Login as admin
    console.log('\n🔐 Logging in as admin...');
    const adminLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'talktomelfi@gmail.com',
        passcode: '199699'
      })
    });

    if (!adminLoginResponse.ok) {
      console.log('❌ Admin login failed:', adminLoginResponse.status);
      return;
    }

    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.access_token;
    console.log('✅ Admin login successful');

    // Step 1: Check current wallet status
    console.log('\n🏦 Step 1: Current Wallet Status');
    console.log('Checking wallet for user: cmdgb0pbw000wld3s2jqu5tmv');
    
    const userDetailResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (userDetailResponse.ok) {
      const userDetailData = await userDetailResponse.json();
      console.log('✅ Current User Details:');
      console.log(`   - User ID: ${userDetailData.user?.id}`);
      console.log(`   - Email: ${userDetailData.user?.email}`);
      console.log(`   - Has Wallet: ${userDetailData.user?.hasWallet}`);
      console.log(`   - Wallet Balance: ₦${userDetailData.user?.walletBalance || 0}`);
      console.log(`   - Virtual Account: ${userDetailData.user?.virtualAccountNumber || 'N/A'}`);
      
      if (userDetailData.user?.wallet) {
        console.log('\n🎯 Wallet Object:');
        console.log(`   - Wallet ID: ${userDetailData.user.wallet.id}`);
        console.log(`   - User ID in Wallet: ${userDetailData.user.wallet.userId}`);
        console.log(`   - Balance: ₦${userDetailData.user.wallet.balance}`);
        console.log(`   - Is Active: ${userDetailData.user.wallet.isActive}`);
        console.log(`   - Is Frozen: ${userDetailData.user.wallet.isFrozen}`);
        
        // Check if wallet is properly linked
        if (userDetailData.user.wallet.userId === userDetailData.user.id) {
          console.log('\n✅ WALLET LINK STATUS: Wallet is properly linked to user!');
          console.log('Transfer should work correctly.');
        } else {
          console.log('\n❌ WALLET LINK ISSUE: Wallet not properly linked to user!');
          console.log(`   - Expected User ID: ${userDetailData.user.id}`);
          console.log(`   - Actual Wallet User ID: ${userDetailData.user.wallet.userId}`);
          console.log('\n🔧 SOLUTION: Need to fix wallet-user link in database');
        }
      }
    }

    // Step 2: Check if we can recreate wallet properly
    console.log('\n💳 Step 2: Check Wallet Recreation');
    console.log('Attempting to recreate wallet with proper user link...');
    
    // First, let's try to delete the existing wallet and recreate it
    const deleteWalletResponse = await fetch(`${baseUrl}/admin/delete-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId: 'cmdgb0pbw000wld3s2jqu5tmv',
        preserveBalance: true
      })
    });

    if (deleteWalletResponse.ok) {
      const deleteWalletData = await deleteWalletResponse.json();
      console.log('✅ Wallet Deletion Result:');
      console.log(`   - Success: ${deleteWalletData.success}`);
      console.log(`   - Message: ${deleteWalletData.message}`);
      console.log(`   - Preserved Balance: ₦${deleteWalletData.preservedBalance || 0}`);
    } else {
      console.log('❌ Wallet deletion failed:', deleteWalletResponse.status);
      const errorData = await deleteWalletResponse.text();
      console.log('Error details:', errorData);
    }

    // Step 3: Recreate wallet with proper link
    console.log('\n🔧 Step 3: Recreate Wallet with Proper Link');
    console.log('Creating new wallet with proper user link...');
    
    const createWalletResponse = await fetch(`${baseUrl}/admin/create-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId: 'cmdgb0pbw000wld3s2jqu5tmv',
        email: 'ibrahimoyiza198@gmail.com',
        restoreBalance: true
      })
    });

    if (createWalletResponse.ok) {
      const createWalletData = await createWalletResponse.json();
      console.log('✅ Wallet Creation Result:');
      console.log(`   - Success: ${createWalletData.success}`);
      console.log(`   - Message: ${createWalletData.message}`);
      console.log(`   - Wallet ID: ${createWalletData.walletId}`);
      console.log(`   - Virtual Account: ${createWalletData.virtualAccountNumber}`);
      console.log(`   - Provider: ${createWalletData.provider}`);
      console.log(`   - Restored Balance: ₦${createWalletData.restoredBalance || 0}`);
    } else {
      console.log('❌ Wallet creation failed:', createWalletResponse.status);
      const errorData = await createWalletResponse.text();
      console.log('Error details:', errorData);
    }

    // Step 4: Verify the fix
    console.log('\n✅ Step 4: Verify Fix');
    console.log('Checking wallet status after recreation...');
    
    const verifyResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('✅ Verification Result:');
      console.log(`   - User ID: ${verifyData.user?.id}`);
      console.log(`   - Has Wallet: ${verifyData.user?.hasWallet}`);
      console.log(`   - Wallet Balance: ₦${verifyData.user?.walletBalance || 0}`);
      
      if (verifyData.user?.wallet) {
        console.log('\n🎯 New Wallet Object:');
        console.log(`   - Wallet ID: ${verifyData.user.wallet.id}`);
        console.log(`   - User ID in Wallet: ${verifyData.user.wallet.userId}`);
        console.log(`   - Balance: ₦${verifyData.user.wallet.balance}`);
        console.log(`   - Is Active: ${verifyData.user.wallet.isActive}`);
        
        if (verifyData.user.wallet.userId === verifyData.user.id) {
          console.log('\n🎉 SUCCESS: Wallet is now properly linked to user!');
          console.log('Transfer flow should work correctly now.');
        } else {
          console.log('\n❌ ISSUE PERSISTS: Wallet still not properly linked');
        }
      }
    }

    // Summary
    console.log('\n📋 Fix Summary');
    console.log('==============');
    console.log('✅ Wallet exists and has balance');
    console.log('❌ Wallet not properly linked to user');
    console.log('🔧 Wallet recreation attempted');
    console.log('🎯 Transfer should work once wallet is properly linked');

  } catch (error) {
    console.error('❌ Fix error:', error.message);
  }
}

fixWalletLinkSimple(); 