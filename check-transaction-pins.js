const fetch = require('node-fetch');

async function checkTransactionPins() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔒 Checking Transaction PINs for All Users');
    console.log('==========================================');
    
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

    // Step 1: Get all users
    console.log('\n👥 Step 1: Fetch All Users');
    console.log('Getting all users from production database...');
    
    const usersResponse = await fetch(`${baseUrl}/admin/users?limit=1000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!usersResponse.ok) {
      console.log('❌ Failed to fetch users:', usersResponse.status);
      return;
    }

    const usersData = await usersResponse.json();
    const allUsers = usersData.users || [];
    
    console.log(`✅ Fetched ${allUsers.length} users from database`);

    // Step 2: Filter users with wallets
    console.log('\n🏦 Step 2: Filter Users with Wallets');
    const usersWithWallets = allUsers.filter(user => user.hasWallet);
    console.log(`✅ Found ${usersWithWallets.length} users with wallets`);

    // Step 3: Check transaction PIN status for each user with wallet
    console.log('\n🔒 Step 3: Check Transaction PIN Status');
    console.log('Checking transaction PIN status for users with wallets...');
    
    const usersWithoutPin = [];
    const usersWithPin = [];
    const usersWithIssues = [];

    for (let i = 0; i < usersWithWallets.length; i++) {
      const user = usersWithWallets[i];
      console.log(`\n🔍 Checking user ${i + 1}/${usersWithWallets.length}: ${user.email}`);
      
      try {
        // Check transaction PIN status directly from admin endpoint
        const pinStatusResponse = await fetch(`${baseUrl}/admin/users/${user.id}/pin-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          }
        });

        if (pinStatusResponse.ok) {
          const pinStatusData = await pinStatusResponse.json();
          
          if (pinStatusData.hasPinSet) {
            usersWithPin.push({
              id: user.id,
              email: user.email,
              walletBalance: user.walletBalance,
              kycStatus: user.kycStatus,
              isVerified: user.isVerified
            });
            console.log(`   ✅ PIN Set: ${user.email}`);
          } else {
            usersWithoutPin.push({
              id: user.id,
              email: user.email,
              walletBalance: user.walletBalance,
              kycStatus: user.kycStatus,
              isVerified: user.isVerified
            });
            console.log(`   ❌ No PIN: ${user.email}`);
          }
        } else {
          // Try alternative endpoint or check wallet details
          const walletDetailsResponse = await fetch(`${baseUrl}/admin/users/${user.id}/wallet-details`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`
            }
          });

          if (walletDetailsResponse.ok) {
            const walletDetails = await walletDetailsResponse.json();
            
            if (walletDetails.pin) {
              usersWithPin.push({
                id: user.id,
                email: user.email,
                walletBalance: user.walletBalance,
                kycStatus: user.kycStatus,
                isVerified: user.isVerified
              });
              console.log(`   ✅ PIN Set: ${user.email} (from wallet details)`);
            } else {
              usersWithoutPin.push({
                id: user.id,
                email: user.email,
                walletBalance: user.walletBalance,
                kycStatus: user.kycStatus,
                isVerified: user.isVerified
              });
              console.log(`   ❌ No PIN: ${user.email} (from wallet details)`);
            }
          } else {
            usersWithIssues.push({
              id: user.id,
              email: user.email,
              issue: 'Cannot check PIN status - endpoint not available'
            });
            console.log(`   ⚠️  Issue: ${user.email} - Cannot check PIN status`);
          }
        }
      } catch (error) {
        usersWithIssues.push({
          id: user.id,
          email: user.email,
          issue: `Error: ${error.message}`
        });
        console.log(`   ⚠️  Error: ${user.email} - ${error.message}`);
      }
    }

    // Step 4: Generate summary report
    console.log('\n📊 Step 4: Summary Report');
    console.log('==========================');
    console.log(`Total Users: ${allUsers.length}`);
    console.log(`Users with Wallets: ${usersWithWallets.length}`);
    console.log(`Users with Transaction PIN: ${usersWithPin.length}`);
    console.log(`Users without Transaction PIN: ${usersWithoutPin.length}`);
    console.log(`Users with Issues: ${usersWithIssues.length}`);

    // Display users without transaction PIN
    if (usersWithoutPin.length > 0) {
      console.log('\n❌ Users Without Transaction PINs:');
      console.log('==================================');
      usersWithoutPin.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - Wallet Balance: ₦${user.walletBalance || 0}`);
        console.log(`   - KYC Status: ${user.kycStatus}`);
        console.log(`   - Is Verified: ${user.isVerified}`);
        console.log('');
      });
    }

    // Display users with transaction PIN
    if (usersWithPin.length > 0) {
      console.log('\n✅ Users With Transaction PINs:');
      console.log('================================');
      console.log(`Total: ${usersWithPin.length} users`);
      usersWithPin.slice(0, 10).forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (Balance: ₦${user.walletBalance || 0})`);
      });
      if (usersWithPin.length > 10) {
        console.log(`... and ${usersWithPin.length - 10} more users`);
      }
    }

    // Display users with issues
    if (usersWithIssues.length > 0) {
      console.log('\n⚠️  Users With Issues:');
      console.log('=====================');
      usersWithIssues.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   - Issue: ${user.issue}`);
        console.log('');
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('===================');
    if (usersWithoutPin.length > 0) {
      console.log(`❌ ${usersWithoutPin.length} users need to set transaction PINs`);
      console.log('   - These users cannot make transfers');
      console.log('   - They need to login and set a transaction PIN');
      console.log('   - Consider sending them notifications to set PIN');
    } else {
      console.log('✅ All users with wallets have transaction PINs set');
    }

    if (usersWithIssues.length > 0) {
      console.log(`⚠️  ${usersWithIssues.length} users have issues checking PIN status`);
      console.log('   - May need to implement better PIN checking endpoints');
    }

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkTransactionPins(); 