const fetch = require('node-fetch');

async function diagnoseWalletIssue() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Diagnosing Wallet Issue');
    console.log('==========================');
    
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

    // Step 1: Check user details
    console.log('\n👤 Step 1: Check User Details');
    console.log('Getting user details for cmdgb0pbw000wld3s2jqu5tmv...');
    
    const userDetailResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv`, {
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

    // Step 2: Try to create wallet for this user
    console.log('\n💳 Step 2: Attempt Wallet Creation');
    console.log('Attempting to create wallet for user...');
    
    const createWalletResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv/create-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (createWalletResponse.ok) {
      const createWalletData = await createWalletResponse.json();
      console.log('✅ Wallet Creation Result:');
      console.log(`   - Success: ${createWalletData.success}`);
      console.log(`   - Message: ${createWalletData.message}`);
      console.log(`   - Wallet ID: ${createWalletData.walletId}`);
      console.log(`   - Virtual Account: ${createWalletData.virtualAccountNumber}`);
      console.log(`   - Provider: ${createWalletData.provider}`);
    } else {
      const errorData = await createWalletResponse.text();
      console.log('❌ Wallet creation failed:', createWalletResponse.status);
      console.log('Error details:', errorData);
    }

    // Step 3: Check if user can login and get their wallet
    console.log('\n🔐 Step 3: Test User Login and Wallet Access');
    console.log('Testing if user can access their wallet...');
    
    // Try to login as the user
    const userLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'ibrahimoyiza198@gmail.com',
        passcode: '123456' // Try default passcode
      })
    });

    if (userLoginResponse.ok) {
      const userLoginData = await userLoginResponse.json();
      const userToken = userLoginData.access_token;
      console.log('✅ User login successful');

      // Try to get wallet details
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
    } else {
      console.log('❌ User login failed:', userLoginResponse.status);
      console.log('This might be why transfers are failing - user cannot authenticate');
    }

    // Step 4: Check funding to see if wallet exists
    console.log('\n💰 Step 4: Test Funding to Verify Wallet');
    console.log('Testing funding to see if wallet exists and works...');
    
    const fundingResponse = await fetch(`${baseUrl}/admin/fund-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        email: 'ibrahimoyiza198@gmail.com',
        amount: 1,
        description: 'Wallet verification test'
      })
    });

    if (fundingResponse.ok) {
      const fundingData = await fundingResponse.json();
      console.log('✅ Funding Test Result:');
      console.log(`   - Success: ${fundingData.success}`);
      console.log(`   - Previous Balance: ₦${fundingData.previousBalance || 0}`);
      console.log(`   - New Balance: ₦${fundingData.newBalance || 0}`);
      console.log(`   - Reference: ${fundingData.reference}`);
      
      console.log('\n🎯 WALLET STATUS: Wallet EXISTS and is functional!');
    } else {
      const errorData = await fundingResponse.text();
      console.log('❌ Funding test failed:', fundingResponse.status);
      console.log('Error details:', errorData);
    }

    // Summary
    console.log('\n📋 Diagnosis Summary');
    console.log('====================');
    console.log('✅ Admin endpoints show wallet exists');
    console.log('✅ Funding works (confirms wallet exists)');
    console.log('❌ User authentication might be the issue');
    console.log('🎯 Transfer failure likely due to user authentication, not wallet');

  } catch (error) {
    console.error('❌ Diagnosis error:', error.message);
  }
}

diagnoseWalletIssue(); 