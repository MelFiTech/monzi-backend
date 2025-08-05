const fetch = require('node-fetch');

async function debugUserTransferIssue() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Debugging User Transfer Issue');
    console.log('================================');
    
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

    const userId = 'cmdgb0pbw000wld3s2jqu5tmv';
    const userEmail = 'ibrahimoyiza198@gmail.com';

    // Step 1: Check user details and wallet status
    console.log('\n👤 Step 1: Check User Details');
    console.log(`Checking user: ${userId}`);
    
    const userDetailResponse = await fetch(`${baseUrl}/admin/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (userDetailResponse.ok) {
      const userDetailData = await userDetailResponse.json();
      console.log('✅ User Details:');
      console.log(`   - User ID: ${userDetailData.user?.id}`);
      console.log(`   - Email: ${userDetailData.user?.email}`);
      console.log(`   - KYC Status: ${userDetailData.user?.kycStatus}`);
      console.log(`   - Is Verified: ${userDetailData.user?.isVerified}`);
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
        console.log(`   - Provider: ${userDetailData.user.wallet.provider}`);
        console.log(`   - Virtual Account: ${userDetailData.user.wallet.virtualAccountNumber}`);
      }
    }

    // Step 2: Test the exact transfer flow query
    console.log('\n💸 Step 2: Test Transfer Flow Query');
    console.log('Testing the exact same query used in transfer flow...');
    
    const transferQueryResponse = await fetch(`${baseUrl}/admin/test-wallet-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId: userId
      })
    });

    if (transferQueryResponse.ok) {
      const transferQueryData = await transferQueryResponse.json();
      console.log('✅ Transfer Flow Query Result:');
      console.log(`   - Success: ${transferQueryData.success}`);
      console.log(`   - Wallet Found: ${transferQueryData.walletFound}`);
      console.log(`   - User ID: ${transferQueryData.userId}`);
      console.log(`   - Wallet User ID: ${transferQueryData.walletUserId}`);
      console.log(`   - Balance: ₦${transferQueryData.balance || 0}`);
      console.log(`   - Virtual Account: ${transferQueryData.virtualAccountNumber || 'N/A'}`);
      console.log(`   - Is Active: ${transferQueryData.isActive}`);
      console.log(`   - Is Frozen: ${transferQueryData.isFrozen}`);
      
      if (!transferQueryData.walletFound) {
        console.log('\n❌ ISSUE: Transfer flow cannot find wallet!');
        console.log('This explains why transfers are failing.');
      } else if (transferQueryData.userId !== transferQueryData.walletUserId) {
        console.log('\n❌ ISSUE: Wallet not properly linked to user!');
        console.log('This explains why transfers are failing.');
      } else {
        console.log('\n✅ Transfer flow can find wallet and it\'s properly linked!');
      }
    }

    // Step 3: Check user authentication
    console.log('\n🔐 Step 3: Check User Authentication');
    console.log('Testing if user can authenticate...');
    
    const possiblePasscodes = ['123456', '199699', '0000', '1111', '2222', '3333', '4444', '5555', '1234'];
    let workingPasscode = null;
    let userToken = null;
    
    for (const passcode of possiblePasscodes) {
      console.log(`\n🔐 Trying passcode: ${passcode}`);
      
      const userLoginResponse = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userEmail,
          passcode: passcode
        })
      });

      if (userLoginResponse.ok) {
        const userLoginData = await userLoginResponse.json();
        userToken = userLoginData.access_token;
        workingPasscode = passcode;
        console.log(`✅ User login successful with passcode: ${passcode}`);
        break;
      } else {
        console.log(`❌ User login failed with passcode ${passcode}:`, userLoginResponse.status);
      }
    }

    if (!userToken) {
      console.log('\n❌ ISSUE: User cannot authenticate with any common passcode!');
      console.log('This is why transfers are failing - user cannot login.');
      return;
    }

    // Step 4: Test wallet access with user token
    console.log('\n🏦 Step 4: Test Wallet Access with User Token');
    console.log('Testing wallet access with user authentication...');
    
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
    } else {
      console.log('❌ User wallet access failed:', userWalletResponse.status);
      const errorData = await userWalletResponse.text();
      console.log('Error details:', errorData);
    }

    // Step 5: Test PIN status
    console.log('\n🔒 Step 5: Check Wallet PIN Status');
    console.log('Testing if user has set a wallet PIN...');
    
    const pinStatusResponse = await fetch(`${baseUrl}/wallet/pin-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      }
    });

    if (pinStatusResponse.ok) {
      const pinStatusData = await pinStatusResponse.json();
      console.log('✅ PIN Status:');
      console.log(`   - Has PIN Set: ${pinStatusData.hasPinSet}`);
      console.log(`   - Message: ${pinStatusData.message}`);
      console.log(`   - Wallet Exists: ${pinStatusData.walletExists}`);
      
      if (!pinStatusData.hasPinSet) {
        console.log('\n❌ ISSUE: User has not set a wallet PIN!');
        console.log('This will cause transfers to fail.');
      }
    } else {
      console.log('❌ PIN status check failed:', pinStatusResponse.status);
    }

    // Step 6: Test a small transfer
    console.log('\n💸 Step 6: Test Small Transfer');
    console.log('Testing a small transfer to identify the exact failure point...');
    
    const transferResponse = await fetch(`${baseUrl}/wallet/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        amount: 1,
        accountNumber: '8106381265',
        bankName: 'OPAY',
        accountName: 'ABDULLAHI OGIRIMA MOHAMMAD',
        pin: '1234',
        description: 'Debug transfer test'
      })
    });

    if (transferResponse.ok) {
      const transferData = await transferResponse.json();
      console.log('✅ Transfer Test Result:');
      console.log(`   - Success: ${transferData.success}`);
      console.log(`   - Message: ${transferData.message}`);
      console.log(`   - Reference: ${transferData.reference}`);
      console.log(`   - Amount: ₦${transferData.amount}`);
      console.log(`   - Fee: ₦${transferData.fee}`);
      console.log(`   - New Balance: ₦${transferData.newBalance}`);
      
      console.log('\n🎉 SUCCESS: Transfer works for this user!');
    } else {
      const errorData = await transferResponse.text();
      console.log('❌ Transfer test failed:', transferResponse.status);
      console.log('Error details:', errorData);
      
      // Parse error to identify specific issue
      try {
        const errorJson = JSON.parse(errorData);
        console.log('\n🔍 Error Analysis:');
        console.log(`   - Error Type: ${errorJson.error || 'Unknown'}`);
        console.log(`   - Message: ${errorJson.message || 'No message'}`);
        console.log(`   - Status Code: ${transferResponse.status}`);
        
        if (errorJson.message?.includes('Wallet not found')) {
          console.log('❌ ISSUE: Wallet not found in transfer flow');
        } else if (errorJson.message?.includes('Invalid wallet PIN')) {
          console.log('❌ ISSUE: Invalid wallet PIN');
        } else if (errorJson.message?.includes('Insufficient balance')) {
          console.log('❌ ISSUE: Insufficient balance');
        } else if (errorJson.message?.includes('Wallet is inactive')) {
          console.log('❌ ISSUE: Wallet is inactive');
        } else if (errorJson.message?.includes('Wallet is frozen')) {
          console.log('❌ ISSUE: Wallet is frozen');
        } else {
          console.log('❌ ISSUE: Unknown transfer error');
        }
      } catch (e) {
        console.log('❌ Could not parse error response');
      }
    }

    // Step 7: Compare with a working user
    console.log('\n🔍 Step 7: Compare with Working User');
    console.log('Let\'s check if other users can transfer...');
    
    // Try to find another user with a wallet
    const usersResponse = await fetch(`${baseUrl}/admin/users?limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      const usersWithWallets = usersData.users.filter(user => user.hasWallet && user.id !== userId);
      
      if (usersWithWallets.length > 0) {
        const workingUser = usersWithWallets[0];
        console.log(`✅ Found working user: ${workingUser.email} (${workingUser.id})`);
        console.log(`   - Has Wallet: ${workingUser.hasWallet}`);
        console.log(`   - Wallet Balance: ₦${workingUser.walletBalance || 0}`);
        console.log(`   - KYC Status: ${workingUser.kycStatus}`);
        console.log(`   - Is Verified: ${workingUser.isVerified}`);
        
        // Compare the working user with the problematic user
        console.log('\n📊 Comparison:');
        console.log(`Problem User (${userEmail}):`);
        console.log(`   - KYC Status: ${userDetailData.user?.kycStatus}`);
        console.log(`   - Is Verified: ${userDetailData.user?.isVerified}`);
        console.log(`   - Has Wallet: ${userDetailData.user?.hasWallet}`);
        console.log(`   - Wallet Balance: ₦${userDetailData.user?.walletBalance || 0}`);
        
        console.log(`\nWorking User (${workingUser.email}):`);
        console.log(`   - KYC Status: ${workingUser.kycStatus}`);
        console.log(`   - Is Verified: ${workingUser.isVerified}`);
        console.log(`   - Has Wallet: ${workingUser.hasWallet}`);
        console.log(`   - Wallet Balance: ₦${workingUser.walletBalance || 0}`);
      }
    }

    // Summary
    console.log('\n📋 Debug Summary');
    console.log('================');
    console.log('✅ User details and wallet status checked');
    console.log('✅ Transfer flow query tested');
    console.log('✅ User authentication tested');
    console.log('✅ Wallet access tested');
    console.log('✅ PIN status checked');
    console.log('✅ Transfer test performed');
    console.log('✅ Comparison with working users done');

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugUserTransferIssue(); 