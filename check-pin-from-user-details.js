const fetch = require('node-fetch');

async function checkPinFromUserDetails() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔒 Checking Transaction PINs from User Details');
    console.log('=============================================');
    
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

    // Step 3: Analyze wallet data for PIN information
    console.log('\n🔒 Step 3: Analyze Wallet Data for PIN Status');
    console.log('Checking wallet objects for PIN information...');
    
    const usersWithoutPin = [];
    const usersWithPin = [];
    const usersWithIncompleteData = [];

    for (let i = 0; i < usersWithWallets.length; i++) {
      const user = usersWithWallets[i];
      console.log(`\n🔍 Checking user ${i + 1}/${usersWithWallets.length}: ${user.email}`);
      
      // Check if user has wallet object with PIN information
      if (user.wallet) {
        console.log(`   - Wallet ID: ${user.wallet.id}`);
        console.log(`   - Balance: ₦${user.wallet.balance || 0}`);
        console.log(`   - Virtual Account: ${user.wallet.virtualAccountNumber || 'N/A'}`);
        console.log(`   - Provider: ${user.wallet.provider || 'N/A'}`);
        console.log(`   - PIN Field: ${user.wallet.pin ? 'SET' : 'NOT SET'}`);
        
        if (user.wallet.pin) {
          usersWithPin.push({
            id: user.id,
            email: user.email,
            walletBalance: user.wallet.balance,
            kycStatus: user.kycStatus,
            isVerified: user.isVerified,
            walletId: user.wallet.id
          });
          console.log(`   ✅ PIN Set: ${user.email}`);
        } else {
          usersWithoutPin.push({
            id: user.id,
            email: user.email,
            walletBalance: user.wallet.balance,
            kycStatus: user.kycStatus,
            isVerified: user.isVerified,
            walletId: user.wallet.id
          });
          console.log(`   ❌ No PIN: ${user.email}`);
        }
      } else {
        usersWithIncompleteData.push({
          id: user.id,
          email: user.email,
          walletBalance: user.walletBalance,
          kycStatus: user.kycStatus,
          isVerified: user.isVerified
        });
        console.log(`   ⚠️  Incomplete Data: ${user.email} - No wallet object`);
      }
    }

    // Step 4: Generate summary report
    console.log('\n📊 Step 4: Summary Report');
    console.log('==========================');
    console.log(`Total Users: ${allUsers.length}`);
    console.log(`Users with Wallets: ${usersWithWallets.length}`);
    console.log(`Users with Transaction PIN: ${usersWithPin.length}`);
    console.log(`Users without Transaction PIN: ${usersWithoutPin.length}`);
    console.log(`Users with Incomplete Data: ${usersWithIncompleteData.length}`);

    // Display users without transaction PIN
    if (usersWithoutPin.length > 0) {
      console.log('\n❌ Users Without Transaction PINs:');
      console.log('==================================');
      usersWithoutPin.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - Wallet ID: ${user.walletId}`);
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

    // Display users with incomplete data
    if (usersWithIncompleteData.length > 0) {
      console.log('\n⚠️  Users With Incomplete Data:');
      console.log('==============================');
      usersWithIncompleteData.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - Wallet Balance: ₦${user.walletBalance || 0}`);
        console.log(`   - KYC Status: ${user.kycStatus}`);
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

    if (usersWithIncompleteData.length > 0) {
      console.log(`⚠️  ${usersWithIncompleteData.length} users have incomplete wallet data`);
      console.log('   - May need to refresh user data or check wallet creation');
    }

    // Additional analysis
    console.log('\n📈 Additional Analysis:');
    console.log('=======================');
    
    const totalUsersWithWallets = usersWithPin.length + usersWithoutPin.length + usersWithIncompleteData.length;
    const pinSetPercentage = totalUsersWithWallets > 0 ? ((usersWithPin.length / totalUsersWithWallets) * 100).toFixed(1) : 0;
    
    console.log(`📊 PIN Set Rate: ${pinSetPercentage}% (${usersWithPin.length}/${totalUsersWithWallets})`);
    console.log(`📊 PIN Not Set Rate: ${((usersWithoutPin.length / totalUsersWithWallets) * 100).toFixed(1)}% (${usersWithoutPin.length}/${totalUsersWithWallets})`);
    
    if (usersWithoutPin.length > 0) {
      console.log('\n🚨 CRITICAL: Users without PINs cannot make transfers!');
      console.log('   - Immediate action required');
      console.log('   - Consider bulk PIN setting or user notifications');
    }

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkPinFromUserDetails(); 