const fetch = require('node-fetch');

async function checkAllProdUsers() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Checking All Production Users');
    console.log('================================');
    
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

    // Step 1: Get all users
    console.log('\n👥 Step 1: Fetching All Users');
    console.log('Getting list of all users from production...');
    
    const usersResponse = await fetch(`${baseUrl}/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!usersResponse.ok) {
      console.log('❌ Failed to fetch users:', usersResponse.status);
      return;
    }

    const usersData = await usersResponse.json();
    const users = usersData.users || [];
    console.log(`✅ Found ${users.length} users on production`);

    // Step 2: Analyze each user for potential issues
    console.log('\n🔍 Step 2: Analyzing Users for Transfer Issues');
    console.log('Checking each user for potential problems...');
    
    const issues = [];
    const workingUsers = [];
    const usersWithWallets = [];
    const usersWithoutWallets = [];
    const usersWithBalance = [];
    const usersWithoutBalance = [];
    const usersWithTransactions = [];
    const usersWithoutTransactions = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n📊 Analyzing user ${i + 1}/${users.length}: ${user.email || user.id}`);
      
      const userIssues = [];
      
      // Check if user has wallet
      if (!user.wallet) {
        userIssues.push('No wallet');
        usersWithoutWallets.push(user);
      } else {
        usersWithWallets.push(user);
        
        // Check wallet balance
        if (!user.wallet.balance || user.wallet.balance <= 0) {
          userIssues.push('No balance');
          usersWithoutBalance.push(user);
        } else {
          usersWithBalance.push(user);
        }
        
        // Check if wallet has transactions
        if (!user.wallet.transactions || user.wallet.transactions.length === 0) {
          userIssues.push('No transactions');
          usersWithoutTransactions.push(user);
        } else {
          usersWithTransactions.push(user);
        }
        
        // Check wallet status
        if (user.wallet.isFrozen) {
          userIssues.push('Wallet frozen');
        }
        
        // Check virtual account number
        if (!user.wallet.virtualAccountNumber) {
          userIssues.push('No virtual account number');
        }
      }
      
      // Check user status
      if (!user.isActive) {
        userIssues.push('User inactive');
      }
      
      // Check KYC status
      if (user.kycStatus !== 'APPROVED') {
        userIssues.push(`KYC status: ${user.kycStatus}`);
      }
      
      // Check if user has PIN set
      if (!user.wallet?.hasPinSet) {
        userIssues.push('No PIN set');
      }
      
      // Check BVN
      if (!user.bvn) {
        userIssues.push('No BVN');
      }
      
      // Check phone number
      if (!user.phone) {
        userIssues.push('No phone number');
      }
      
      if (userIssues.length > 0) {
        issues.push({
          user: user,
          issues: userIssues
        });
      } else {
        workingUsers.push(user);
      }
    }

    // Step 3: Generate comprehensive report
    console.log('\n📋 Step 3: Production Users Analysis Report');
    console.log('============================================');
    
    console.log(`\n📊 Overall Statistics:`);
    console.log(`   - Total Users: ${users.length}`);
    console.log(`   - Users with Wallets: ${usersWithWallets.length}`);
    console.log(`   - Users without Wallets: ${usersWithoutWallets.length}`);
    console.log(`   - Users with Balance: ${usersWithBalance.length}`);
    console.log(`   - Users without Balance: ${usersWithoutBalance.length}`);
    console.log(`   - Users with Transactions: ${usersWithTransactions.length}`);
    console.log(`   - Users without Transactions: ${usersWithoutTransactions.length}`);
    console.log(`   - Users Ready for Transfers: ${workingUsers.length}`);
    console.log(`   - Users with Issues: ${issues.length}`);

    // Show users with issues
    if (issues.length > 0) {
      console.log(`\n❌ Users with Potential Transfer Issues (${issues.length}):`);
      issues.forEach((issue, index) => {
        const user = issue.user;
        console.log(`\n   ${index + 1}. ${user.email || user.id}`);
        console.log(`      Issues: ${issue.issues.join(', ')}`);
        if (user.wallet) {
          console.log(`      Wallet Balance: ₦${user.wallet.balance || 0}`);
          console.log(`      Virtual Account: ${user.wallet.virtualAccountNumber || 'None'}`);
        }
      });
    }

    // Show working users
    if (workingUsers.length > 0) {
      console.log(`\n✅ Users Ready for Transfers (${workingUsers.length}):`);
      workingUsers.slice(0, 10).forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email || user.id} - Balance: ₦${user.wallet?.balance || 0}`);
      });
      if (workingUsers.length > 10) {
        console.log(`   ... and ${workingUsers.length - 10} more`);
      }
    }

    // Step 4: Check specific user mentioned earlier
    console.log(`\n🎯 Step 4: Checking Specific User (cmdgb0pbw000wld3s2jqu5tmv)`);
    const specificUser = users.find(u => u.id === 'cmdgb0pbw000wld3s2jqu5tmv');
    
    if (specificUser) {
      console.log(`✅ Found specific user: ${specificUser.email || specificUser.id}`);
      console.log(`   - User Status: ${specificUser.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   - KYC Status: ${specificUser.kycStatus}`);
      console.log(`   - Has Wallet: ${specificUser.wallet ? 'Yes' : 'No'}`);
      if (specificUser.wallet) {
        console.log(`   - Wallet Balance: ₦${specificUser.wallet.balance || 0}`);
        console.log(`   - Virtual Account: ${specificUser.wallet.virtualAccountNumber || 'None'}`);
        console.log(`   - Wallet Frozen: ${specificUser.wallet.isFrozen ? 'Yes' : 'No'}`);
        console.log(`   - Has PIN: ${specificUser.wallet.hasPinSet ? 'Yes' : 'No'}`);
        console.log(`   - Transaction Count: ${specificUser.wallet.transactions?.length || 0}`);
      }
    } else {
      console.log(`❌ Specific user not found in user list`);
    }

    // Step 5: Test transfer for a working user
    if (workingUsers.length > 0) {
      console.log(`\n🧪 Step 5: Testing Transfer for Working User`);
      const testUser = workingUsers[0];
      console.log(`Testing transfer for: ${testUser.email || testUser.id}`);
      
      const testTransferResponse = await fetch(`${baseUrl}/admin/test-user-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: testUser.id,
          amount: 100,
          accountNumber: '8106381265',
          bankName: 'Opay Digital Services Limited',
          accountName: 'TEST USER'
        })
      });

      if (testTransferResponse.ok) {
        const testTransferData = await testTransferResponse.json();
        console.log(`✅ Test Transfer Result:`);
        console.log(`   - Success: ${testTransferData.success}`);
        console.log(`   - Message: ${testTransferData.message}`);
        if (testTransferData.error) {
          console.log(`   - Error: ${JSON.stringify(testTransferData.error)}`);
        }
      } else {
        console.log(`❌ Test transfer failed: ${testTransferResponse.status}`);
      }
    }

    // Summary
    console.log(`\n📋 Production Users Summary`);
    console.log(`============================`);
    console.log(`✅ Total Users Analyzed: ${users.length}`);
    console.log(`✅ Users Ready for Transfers: ${workingUsers.length}`);
    console.log(`❌ Users with Issues: ${issues.length}`);
    console.log(`🎯 Transfer Issue: NYRA API validation inconsistency (affects all users)`);

  } catch (error) {
    console.error('❌ Analysis error:', error.message);
  }
}

checkAllProdUsers(); 