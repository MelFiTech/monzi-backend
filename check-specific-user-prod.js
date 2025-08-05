const fetch = require('node-fetch');

async function checkSpecificUserProd() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Checking Specific User on Production');
    console.log('======================================');
    
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

    // Check specific user by ID
    console.log('\n🎯 Checking Specific User by ID');
    console.log('User ID: cmdgb0pbw000wld3s2jqu5tmv');
    
    const specificUserResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (specificUserResponse.ok) {
      const userData = await specificUserResponse.json();
      console.log('✅ Found specific user:');
      console.log(`   - ID: ${userData.id}`);
      console.log(`   - Email: ${userData.email}`);
      console.log(`   - First Name: ${userData.firstName}`);
      console.log(`   - Last Name: ${userData.lastName}`);
      console.log(`   - Phone: ${userData.phone}`);
      console.log(`   - BVN: ${userData.bvn}`);
      console.log(`   - Is Active: ${userData.isActive}`);
      console.log(`   - KYC Status: ${userData.kycStatus}`);
      console.log(`   - Created At: ${userData.createdAt}`);
      
      if (userData.wallet) {
        console.log(`\n💰 Wallet Information:`);
        console.log(`   - Wallet ID: ${userData.wallet.id}`);
        console.log(`   - Balance: ₦${userData.wallet.balance}`);
        console.log(`   - Virtual Account: ${userData.wallet.virtualAccountNumber}`);
        console.log(`   - Is Frozen: ${userData.wallet.isFrozen}`);
        console.log(`   - Has PIN: ${userData.wallet.hasPinSet}`);
        console.log(`   - Transaction Count: ${userData.wallet.transactions?.length || 0}`);
      } else {
        console.log(`\n❌ No wallet found for this user`);
      }
    } else {
      console.log('❌ Specific user not found by ID');
      
      // Try to find user by email or other means
      console.log('\n🔍 Searching for user by other means...');
      
      const searchResponse = await fetch(`${baseUrl}/admin/users/search?q=cmdgb0pbw000wld3s2jqu5tmv`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log('✅ Search results:', searchData);
      } else {
        console.log('❌ Search failed:', searchResponse.status);
      }
    }

    // Check all users again with more details
    console.log('\n👥 Checking All Users with Details');
    
    const allUsersResponse = await fetch(`${baseUrl}/admin/users?limit=50&include=wallet,transactions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (allUsersResponse.ok) {
      const allUsersData = await allUsersResponse.json();
      const users = allUsersData.users || [];
      console.log(`✅ Found ${users.length} users with details`);
      
      // Look for users with wallets
      const usersWithWallets = users.filter(u => u.wallet);
      console.log(`📊 Users with wallets: ${usersWithWallets.length}`);
      
      if (usersWithWallets.length > 0) {
        console.log('\n💰 Users with Wallets:');
        usersWithWallets.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} - Balance: ₦${user.wallet.balance}`);
        });
      }
      
      // Look for the specific user ID in any format
      const specificUser = users.find(u => 
        u.id === 'cmdgb0pbw000wld3s2jqu5tmv' || 
        u.email?.includes('cmdgb0pbw000wld3s2jqu5tmv')
      );
      
      if (specificUser) {
        console.log('\n🎯 Found specific user in full list:');
        console.log(`   - ID: ${specificUser.id}`);
        console.log(`   - Email: ${specificUser.email}`);
        console.log(`   - Has Wallet: ${specificUser.wallet ? 'Yes' : 'No'}`);
      } else {
        console.log('\n❌ Specific user not found in full list');
      }
    } else {
      console.log('❌ Failed to get all users:', allUsersResponse.status);
    }

    // Check if there are any users with the specific pattern
    console.log('\n🔍 Checking for users with similar ID patterns...');
    
    const patternUsers = allUsersData.users.filter(u => 
      u.id?.includes('cmdgb') || 
      u.id?.includes('wld3s2jqu5tmv')
    );
    
    if (patternUsers.length > 0) {
      console.log('✅ Found users with similar patterns:');
      patternUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}`);
      });
    } else {
      console.log('❌ No users found with similar ID patterns');
    }

    // Get detailed information about the specific user
    console.log('\n🎯 Getting Detailed Information for Specific User');
    console.log('User: cmdgb0pbw000wld3s2jqu5tmv (ibrahimoyiza198@gmail.com)');
    
    const detailedUserResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv/detailed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (detailedUserResponse.ok) {
      const detailedUserData = await detailedUserResponse.json();
      console.log('✅ Detailed User Information:');
      console.log(`   - ID: ${detailedUserData.id}`);
      console.log(`   - Email: ${detailedUserData.email}`);
      console.log(`   - First Name: ${detailedUserData.firstName}`);
      console.log(`   - Last Name: ${detailedUserData.lastName}`);
      console.log(`   - Phone: ${detailedUserData.phone}`);
      console.log(`   - BVN: ${detailedUserData.bvn}`);
      console.log(`   - Is Active: ${detailedUserData.isActive}`);
      console.log(`   - KYC Status: ${detailedUserData.kycStatus}`);
      console.log(`   - Created At: ${detailedUserData.createdAt}`);
      console.log(`   - Has Wallet: ${detailedUserData.wallet ? 'Yes' : 'No'}`);
      
      if (detailedUserData.wallet) {
        console.log(`\n💰 Wallet Details:`);
        console.log(`   - Wallet ID: ${detailedUserData.wallet.id}`);
        console.log(`   - Balance: ₦${detailedUserData.wallet.balance}`);
        console.log(`   - Virtual Account: ${detailedUserData.wallet.virtualAccountNumber}`);
        console.log(`   - Is Frozen: ${detailedUserData.wallet.isFrozen}`);
        console.log(`   - Has PIN: ${detailedUserData.wallet.hasPinSet}`);
        console.log(`   - Transaction Count: ${detailedUserData.wallet.transactions?.length || 0}`);
      }
      
      // Check if user can perform transfers
      console.log(`\n🔍 Transfer Readiness Analysis:`);
      const transferIssues = [];
      
      if (!detailedUserData.isActive) transferIssues.push('User inactive');
      if (detailedUserData.kycStatus !== 'APPROVED') transferIssues.push(`KYC not approved (${detailedUserData.kycStatus})`);
      if (!detailedUserData.wallet) transferIssues.push('No wallet');
      if (!detailedUserData.bvn) transferIssues.push('No BVN');
      if (!detailedUserData.phone) transferIssues.push('No phone number');
      
      if (detailedUserData.wallet) {
        if (!detailedUserData.wallet.hasPinSet) transferIssues.push('No PIN set');
        if (detailedUserData.wallet.isFrozen) transferIssues.push('Wallet frozen');
        if (!detailedUserData.wallet.virtualAccountNumber) transferIssues.push('No virtual account number');
        if (!detailedUserData.wallet.balance || detailedUserData.wallet.balance <= 0) transferIssues.push('No balance');
      }
      
      if (transferIssues.length > 0) {
        console.log(`❌ Transfer Issues: ${transferIssues.join(', ')}`);
      } else {
        console.log(`✅ User is ready for transfers`);
      }
    } else {
      console.log('❌ Failed to get detailed user information:', detailedUserResponse.status);
    }

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkSpecificUserProd(); 