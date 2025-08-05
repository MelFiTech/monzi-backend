const fetch = require('node-fetch');

async function checkApprovedUsersNoWallets() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Checking Approved Users Without Wallets');
    console.log('=========================================');
    
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

    // Get all approved users
    console.log('\n👥 Getting All Approved Users');
    console.log('Using endpoint: GET /admin/users?status=APPROVED&limit=100');
    
    const approvedUsersResponse = await fetch(`${baseUrl}/admin/users?status=APPROVED&limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!approvedUsersResponse.ok) {
      console.log('❌ Failed to get approved users:', approvedUsersResponse.status);
      return;
    }

    const approvedUsersData = await approvedUsersResponse.json();
    const approvedUsers = approvedUsersData.users || [];
    console.log(`✅ Found ${approvedUsers.length} approved users`);

    // Filter users without wallets
    const usersWithoutWallets = approvedUsers.filter(user => !user.wallet);
    const usersWithWallets = approvedUsers.filter(user => user.wallet);

    console.log(`\n📊 Approved Users Analysis:`);
    console.log(`   - Total Approved Users: ${approvedUsers.length}`);
    console.log(`   - Users Without Wallets: ${usersWithoutWallets.length}`);
    console.log(`   - Users With Wallets: ${usersWithWallets.length}`);

    // Show users without wallets
    if (usersWithoutWallets.length > 0) {
      console.log(`\n❌ Approved Users Without Wallets (${usersWithoutWallets.length}):`);
      
      usersWithoutWallets.forEach((user, index) => {
        console.log(`\n   ${index + 1}. ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`      - Phone: ${user.phone || 'N/A'}`);
        console.log(`      - BVN: ${user.bvn || 'N/A'}`);
        console.log(`      - Created: ${user.createdAt}`);
        console.log(`      - KYC Status: ${user.kycStatus}`);
        console.log(`      - Has Wallet: ${user.wallet ? 'Yes' : 'No'}`);
        
        // Check if user has required data for wallet creation
        const missingData = [];
        if (!user.firstName) missingData.push('First Name');
        if (!user.lastName) missingData.push('Last Name');
        if (!user.phone) missingData.push('Phone');
        if (!user.bvn) missingData.push('BVN');
        if (!user.dateOfBirth) missingData.push('Date of Birth');
        if (!user.gender) missingData.push('Gender');
        
        if (missingData.length > 0) {
          console.log(`      - Missing Data: ${missingData.join(', ')}`);
        } else {
          console.log(`      - ✅ Ready for wallet creation`);
        }
      });
    }

    // Show users with wallets
    if (usersWithWallets.length > 0) {
      console.log(`\n✅ Approved Users With Wallets (${usersWithWallets.length}):`);
      
      usersWithWallets.forEach((user, index) => {
        console.log(`\n   ${index + 1}. ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`      - Wallet Balance: ₦${user.wallet.balance || 0}`);
        console.log(`      - Virtual Account: ${user.wallet.virtualAccountNumber || 'N/A'}`);
        console.log(`      - Wallet Frozen: ${user.wallet.isFrozen ? 'Yes' : 'No'}`);
      });
    }

    // Check wallet creation readiness for users without wallets
    console.log(`\n🏦 Wallet Creation Readiness Check:`);
    
    const readyForWallet = [];
    const notReadyForWallet = [];
    
    usersWithoutWallets.forEach(user => {
      const hasRequiredData = user.firstName && user.lastName && user.phone && user.bvn && user.dateOfBirth && user.gender;
      
      if (hasRequiredData) {
        readyForWallet.push(user);
      } else {
        notReadyForWallet.push(user);
      }
    });

    console.log(`   - Users Ready for Wallet Creation: ${readyForWallet.length}`);
    console.log(`   - Users Not Ready for Wallet Creation: ${notReadyForWallet.length}`);

    if (readyForWallet.length > 0) {
      console.log(`\n✅ Users Ready for Wallet Creation:`);
      readyForWallet.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - ${user.firstName} ${user.lastName}`);
      });
    }

    if (notReadyForWallet.length > 0) {
      console.log(`\n❌ Users Not Ready for Wallet Creation:`);
      notReadyForWallet.forEach((user, index) => {
        const missingData = [];
        if (!user.firstName) missingData.push('First Name');
        if (!user.lastName) missingData.push('Last Name');
        if (!user.phone) missingData.push('Phone');
        if (!user.bvn) missingData.push('BVN');
        if (!user.dateOfBirth) missingData.push('Date of Birth');
        if (!user.gender) missingData.push('Gender');
        
        console.log(`   ${index + 1}. ${user.email} - Missing: ${missingData.join(', ')}`);
      });
    }

    // Test wallet creation for a ready user
    if (readyForWallet.length > 0) {
      console.log(`\n🧪 Testing Wallet Creation for Ready User`);
      const testUser = readyForWallet[0];
      console.log(`Testing wallet creation for: ${testUser.email}`);
      
      const walletCreationResponse = await fetch(`${baseUrl}/admin/users/${testUser.id}/create-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          email: testUser.email,
          phone: testUser.phone,
          dateOfBirth: testUser.dateOfBirth,
          gender: testUser.gender,
          bvn: testUser.bvn
        })
      });

      if (walletCreationResponse.ok) {
        const walletCreationData = await walletCreationResponse.json();
        console.log(`✅ Wallet Creation Test Result:`);
        console.log(`   - Success: ${walletCreationData.success}`);
        console.log(`   - Message: ${walletCreationData.message}`);
        if (walletCreationData.wallet) {
          console.log(`   - Wallet ID: ${walletCreationData.wallet.id}`);
          console.log(`   - Virtual Account: ${walletCreationData.wallet.virtualAccountNumber}`);
        }
      } else {
        console.log(`❌ Wallet creation test failed: ${walletCreationResponse.status}`);
        const errorData = await walletCreationResponse.text();
        console.log('Error details:', errorData);
      }
    }

    // Summary
    console.log(`\n📋 Approved Users Summary`);
    console.log(`=========================`);
    console.log(`✅ Total Approved Users: ${approvedUsers.length}`);
    console.log(`❌ Users Without Wallets: ${usersWithoutWallets.length}`);
    console.log(`✅ Users With Wallets: ${usersWithWallets.length}`);
    console.log(`✅ Ready for Wallet Creation: ${readyForWallet.length}`);
    console.log(`❌ Not Ready for Wallet Creation: ${notReadyForWallet.length}`);
    console.log(`🎯 Action Required: Create wallets for ${readyForWallet.length} ready users`);

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkApprovedUsersNoWallets(); 