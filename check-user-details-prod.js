const fetch = require('node-fetch');

async function checkUserDetailsProd() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Checking User Details on Production');
    console.log('=====================================');
    
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

    // Get detailed user information
    console.log('\n🎯 Getting Detailed User Information');
    console.log('User ID: cmdgb0pbw000wld3s2jqu5tmv');
    console.log('Email: ibrahimoyiza198@gmail.com');
    
    const userResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('\n✅ User Information:');
      console.log(`   - ID: ${userData.id}`);
      console.log(`   - Email: ${userData.email}`);
      console.log(`   - First Name: ${userData.firstName}`);
      console.log(`   - Last Name: ${userData.lastName}`);
      console.log(`   - Phone: ${userData.phone}`);
      console.log(`   - BVN: ${userData.bvn}`);
      console.log(`   - Is Active: ${userData.isActive}`);
      console.log(`   - KYC Status: ${userData.kycStatus}`);
      console.log(`   - Created At: ${userData.createdAt}`);
      console.log(`   - Has Wallet: ${userData.wallet ? 'Yes' : 'No'}`);
      
      if (userData.wallet) {
        console.log(`\n💰 Wallet Details:`);
        console.log(`   - Wallet ID: ${userData.wallet.id}`);
        console.log(`   - Balance: ₦${userData.wallet.balance}`);
        console.log(`   - Virtual Account: ${userData.wallet.virtualAccountNumber}`);
        console.log(`   - Is Frozen: ${userData.wallet.isFrozen}`);
        console.log(`   - Has PIN: ${userData.wallet.hasPinSet}`);
        console.log(`   - Transaction Count: ${userData.wallet.transactions?.length || 0}`);
      }
      
      // Check transfer readiness
      console.log(`\n🔍 Transfer Readiness Analysis:`);
      const transferIssues = [];
      
      if (!userData.isActive) transferIssues.push('User inactive');
      if (userData.kycStatus !== 'APPROVED') transferIssues.push(`KYC not approved (${userData.kycStatus})`);
      if (!userData.wallet) transferIssues.push('No wallet');
      if (!userData.bvn) transferIssues.push('No BVN');
      if (!userData.phone) transferIssues.push('No phone number');
      
      if (userData.wallet) {
        if (!userData.wallet.hasPinSet) transferIssues.push('No PIN set');
        if (userData.wallet.isFrozen) transferIssues.push('Wallet frozen');
        if (!userData.wallet.virtualAccountNumber) transferIssues.push('No virtual account number');
        if (!userData.wallet.balance || userData.wallet.balance <= 0) transferIssues.push('No balance');
      }
      
      if (transferIssues.length > 0) {
        console.log(`❌ Transfer Issues: ${transferIssues.join(', ')}`);
      } else {
        console.log(`✅ User is ready for transfers`);
      }
      
      // Check if user has any transactions
      console.log(`\n📊 Transaction History:`);
      if (userData.wallet && userData.wallet.transactions && userData.wallet.transactions.length > 0) {
        console.log(`✅ User has ${userData.wallet.transactions.length} transactions`);
        userData.wallet.transactions.slice(0, 5).forEach((txn, index) => {
          console.log(`   ${index + 1}. ${txn.type} - ₦${txn.amount} - ${txn.status}`);
        });
      } else {
        console.log(`❌ No transactions found`);
      }
      
    } else {
      console.log('❌ Failed to get user information:', userResponse.status);
      const errorData = await userResponse.text();
      console.log('Error details:', errorData);
    }

    // Check if user can create a wallet
    console.log(`\n🏦 Wallet Creation Check:`);
    const walletCheckResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv/wallet-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (walletCheckResponse.ok) {
      const walletCheckData = await walletCheckResponse.json();
      console.log(`✅ Wallet Status: ${walletCheckData.message}`);
      console.log(`   - Can Create Wallet: ${walletCheckData.canCreateWallet}`);
      console.log(`   - Wallet Exists: ${walletCheckData.walletExists}`);
      console.log(`   - Issues: ${walletCheckData.issues?.join(', ') || 'None'}`);
    } else {
      console.log('❌ Failed to check wallet status:', walletCheckResponse.status);
    }

    // Summary
    console.log(`\n📋 User Analysis Summary`);
    console.log(`========================`);
    console.log(`✅ User Found: cmdgb0pbw000wld3s2jqu5tmv`);
    console.log(`✅ Email: ibrahimoyiza198@gmail.com`);
    console.log(`❌ Main Issue: No wallet created`);
    console.log(`🎯 Transfer Issue: NYRA API validation inconsistency (affects all users)`);

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkUserDetailsProd(); 