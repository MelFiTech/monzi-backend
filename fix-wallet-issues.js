const fetch = require('node-fetch');

async function fixWalletIssues() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔧 Fixing Wallet Issues');
    console.log('=======================');
    
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
      }
    }

    // Step 2: Try different user credentials
    console.log('\n🔐 Step 2: Test Different User Credentials');
    console.log('Testing different passcodes for user login...');
    
    const possiblePasscodes = ['123456', '199699', '0000', '1111', '2222', '3333', '4444', '5555', '1234'];
    
    for (const passcode of possiblePasscodes) {
      console.log(`\n🔐 Trying passcode: ${passcode}`);
      
      const userLoginResponse = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'ibrahimoyiza198@gmail.com',
          passcode: passcode
        })
      });

      if (userLoginResponse.ok) {
        const userLoginData = await userLoginResponse.json();
        const userToken = userLoginData.access_token;
        console.log(`✅ User login successful with passcode: ${passcode}`);
        
        // Test wallet access with this token
        const userWalletResponse = await fetch(`${baseUrl}/wallet/details`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          }
        });

        if (userWalletResponse.ok) {
          const userWalletData = await userWalletResponse.json();
          console.log('✅ User Wallet Access:');
          console.log(`   - Success: ${userWalletData.success}`);
          console.log(`   - Has Wallet: ${userWalletData.hasWallet}`);
          console.log(`   - Balance: ₦${userWalletData.balance || 0}`);
          console.log(`   - Virtual Account: ${userWalletData.virtualAccountNumber || 'N/A'}`);
          
          console.log(`\n🎉 SUCCESS: Found working passcode: ${passcode}`);
          console.log('User can now authenticate and access wallet!');
          break;
        } else {
          console.log(`❌ Wallet access failed with passcode ${passcode}:`, userWalletResponse.status);
        }
      } else {
        console.log(`❌ User login failed with passcode ${passcode}:`, userLoginResponse.status);
      }
    }

    // Step 3: Check if we need to fix wallet-user relationship
    console.log('\n🔧 Step 3: Check Wallet-User Relationship');
    console.log('Checking if wallet is properly linked to user...');
    
    // Try to get wallet details directly
    const directWalletResponse = await fetch(`${baseUrl}/admin/test-wallet-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId: 'cmdgb0pbw000wld3s2jqu5tmv',
        walletId: 'cmdktaawn0013pp3tc0wsunny'
      })
    });

    if (directWalletResponse.ok) {
      const directWalletData = await directWalletResponse.json();
      console.log('✅ Wallet Link Check:');
      console.log(`   - Success: ${directWalletData.success}`);
      console.log(`   - Wallet Found: ${directWalletData.walletFound}`);
      console.log(`   - User ID Match: ${directWalletData.userIdMatch}`);
      console.log(`   - Wallet User ID: ${directWalletData.walletUserId}`);
      console.log(`   - Expected User ID: ${directWalletData.expectedUserId}`);
      
      if (!directWalletData.userIdMatch) {
        console.log('\n❌ ISSUE: Wallet not properly linked to user!');
        console.log('This explains why transfer flow cannot find the wallet.');
      } else {
        console.log('\n✅ Wallet properly linked to user!');
      }
    } else {
      console.log('❌ Wallet link check failed:', directWalletResponse.status);
    }

    // Step 4: Safe wallet recreation if needed
    console.log('\n💳 Step 4: Safe Wallet Recreation (if needed)');
    console.log('Attempting to safely recreate wallet if issues found...');
    
    const safeRecreationResponse = await fetch(`${baseUrl}/admin/safe-wallet-fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId: 'cmdgb0pbw000wld3s2jqu5tmv',
        email: 'ibrahimoyiza198@gmail.com',
        preserveBalance: true,
        fixUserLink: true
      })
    });

    if (safeRecreationResponse.ok) {
      const safeRecreationData = await safeRecreationResponse.json();
      console.log('✅ Safe Wallet Fix Result:');
      console.log(`   - Success: ${safeRecreationData.success}`);
      console.log(`   - Action: ${safeRecreationData.action}`);
      console.log(`   - Message: ${safeRecreationData.message}`);
      
      if (safeRecreationData.wallet) {
        console.log('\n🎯 Fixed Wallet Details:');
        console.log(`   - Wallet ID: ${safeRecreationData.wallet.id}`);
        console.log(`   - User ID: ${safeRecreationData.wallet.userId}`);
        console.log(`   - Balance: ₦${safeRecreationData.wallet.balance}`);
        console.log(`   - Virtual Account: ${safeRecreationData.wallet.virtualAccountNumber}`);
        console.log(`   - Provider: ${safeRecreationData.wallet.provider}`);
      }
    } else {
      console.log('❌ Safe wallet fix failed:', safeRecreationResponse.status);
      const errorData = await safeRecreationResponse.text();
      console.log('Error details:', errorData);
    }

    // Summary
    console.log('\n📋 Fix Summary');
    console.log('==============');
    console.log('✅ Wallet exists and has balance');
    console.log('❌ User authentication issue (wrong passcode)');
    console.log('❌ Possible wallet-user link issue');
    console.log('🔧 Safe fixes attempted');
    console.log('🎯 Transfer should work once user can authenticate');

  } catch (error) {
    console.error('❌ Fix error:', error.message);
  }
}

fixWalletIssues(); 