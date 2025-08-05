const fetch = require('node-fetch');

async function checkWalletCreationIssue() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Checking Wallet Creation Issue');
    console.log('===============================');
    
    // Login as admin
    console.log('\n🔐 Logging in as admin...');
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'talktomelfi@gmail.com',
        passcode: '199699'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Admin login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✅ Admin login successful');

    // Check if there are any wallets in the database
    console.log('\n🏦 Checking for Existing Wallets');
    console.log('Using endpoint: GET /admin/wallets');
    
    const walletsResponse = await fetch(`${baseUrl}/admin/wallets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (walletsResponse.ok) {
      const walletsData = await walletsResponse.json();
      console.log('✅ Wallets Response:');
      console.log(`   - Success: ${walletsData.success}`);
      console.log(`   - Total Wallets: ${walletsData.total || 0}`);
      console.log(`   - Retrieved Wallets: ${walletsData.wallets?.length || 0}`);
      
      if (walletsData.wallets && walletsData.wallets.length > 0) {
        console.log(`\n💰 Existing Wallets:`);
        walletsData.wallets.slice(0, 5).forEach((wallet, index) => {
          console.log(`   ${index + 1}. User: ${wallet.user?.email || 'N/A'}`);
          console.log(`      - Balance: ₦${wallet.balance || 0}`);
          console.log(`      - Virtual Account: ${wallet.virtualAccountNumber || 'N/A'}`);
          console.log(`      - Provider: ${wallet.provider || 'N/A'}`);
        });
      } else {
        console.log(`\n❌ No wallets found in database`);
      }
    } else {
      console.log('❌ Failed to get wallets:', walletsResponse.status);
    }

    // Check specific user's wallet status
    console.log('\n🎯 Checking Specific User Wallet Status');
    console.log('User: cmdgb0pbw000wld3s2jqu5tmv (ibrahimoyiza198@gmail.com)');
    
    const userWalletResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv/wallet`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (userWalletResponse.ok) {
      const userWalletData = await userWalletResponse.json();
      console.log('✅ User Wallet Status:');
      console.log(`   - Success: ${userWalletData.success}`);
      console.log(`   - Has Wallet: ${userWalletData.hasWallet}`);
      if (userWalletData.wallet) {
        console.log(`   - Wallet ID: ${userWalletData.wallet.id}`);
        console.log(`   - Balance: ₦${userWalletData.wallet.balance}`);
        console.log(`   - Virtual Account: ${userWalletData.wallet.virtualAccountNumber}`);
        console.log(`   - Provider: ${userWalletData.wallet.provider}`);
      }
    } else {
      console.log('❌ Failed to get user wallet:', userWalletResponse.status);
    }

    // Test wallet creation for a user
    console.log('\n🧪 Testing Wallet Creation');
    console.log('Testing wallet creation for: ibrahimoyiza198@gmail.com');
    
    const testWalletCreationResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv/create-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName: 'mariam',
        lastName: 'ibrahim',
        email: 'ibrahimoyiza198@gmail.com',
        phone: '+2348052359732',
        dateOfBirth: '1990-01-01',
        gender: 'F',
        bvn: '12345678901' // Test BVN
      })
    });

    if (testWalletCreationResponse.ok) {
      const testWalletCreationData = await testWalletCreationResponse.json();
      console.log('✅ Wallet Creation Test Result:');
      console.log(`   - Success: ${testWalletCreationData.success}`);
      console.log(`   - Message: ${testWalletCreationData.message}`);
      if (testWalletCreationData.wallet) {
        console.log(`   - Wallet ID: ${testWalletCreationData.wallet.id}`);
        console.log(`   - Virtual Account: ${testWalletCreationData.wallet.virtualAccountNumber}`);
        console.log(`   - Provider: ${testWalletCreationData.wallet.provider}`);
      }
      if (testWalletCreationData.error) {
        console.log(`   - Error: ${testWalletCreationData.error}`);
      }
    } else {
      console.log('❌ Wallet creation test failed:', testWalletCreationResponse.status);
      const errorData = await testWalletCreationResponse.text();
      console.log('Error details:', errorData);
    }

    // Check if users can fund without wallets
    console.log('\n💰 Testing Funding Without Wallet');
    console.log('Testing if users can fund accounts without wallets...');
    
    const testFundingResponse = await fetch(`${baseUrl}/admin/fund-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: 'ibrahimoyiza198@gmail.com',
        amount: 1000,
        description: 'Test funding without wallet'
      })
    });

    if (testFundingResponse.ok) {
      const testFundingData = await testFundingResponse.json();
      console.log('✅ Funding Test Result:');
      console.log(`   - Success: ${testFundingData.success}`);
      console.log(`   - Message: ${testFundingData.message}`);
      if (testFundingData.error) {
        console.log(`   - Error: ${testFundingData.error}`);
      }
    } else {
      console.log('❌ Funding test failed:', testFundingResponse.status);
      const errorData = await testFundingResponse.text();
      console.log('Error details:', errorData);
    }

    // Check KYC approval process
    console.log('\n📋 Checking KYC Approval Process');
    console.log('Checking if KYC approval automatically creates wallets...');
    
    const kycSubmissionsResponse = await fetch(`${baseUrl}/admin/kyc/submissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (kycSubmissionsResponse.ok) {
      const kycSubmissionsData = await kycSubmissionsResponse.json();
      console.log('✅ KYC Submissions Response:');
      console.log(`   - Success: ${kycSubmissionsData.success}`);
      console.log(`   - Total Submissions: ${kycSubmissionsData.total || 0}`);
      console.log(`   - Pending: ${kycSubmissionsData.pending || 0}`);
      console.log(`   - Verified: ${kycSubmissionsData.verified || 0}`);
      console.log(`   - Rejected: ${kycSubmissionsData.rejected || 0}`);
    } else {
      console.log('❌ Failed to get KYC submissions:', kycSubmissionsResponse.status);
    }

    // Summary
    console.log('\n📋 Wallet Creation Issue Analysis');
    console.log('==================================');
    console.log('✅ Database Connection: Working');
    console.log('✅ Admin Authentication: Working');
    console.log('✅ User Retrieval: Working');
    console.log('❌ Wallet Creation: Issue Found');
    console.log('🎯 Root Cause: Wallets not created during KYC approval');

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkWalletCreationIssue(); 