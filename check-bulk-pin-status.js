const fetch = require('node-fetch');

async function checkBulkPinStatus() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔒 Checking Bulk Transaction PIN Status');
    console.log('=======================================');
    
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

    // Step 1: Get bulk PIN status
    console.log('\n🔒 Step 1: Get Bulk PIN Status');
    console.log('Fetching PIN status for all users...');
    
    const pinStatusResponse = await fetch(`${baseUrl}/admin/users/pin-status/bulk?limit=1000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!pinStatusResponse.ok) {
      console.log('❌ Failed to get bulk PIN status:', pinStatusResponse.status);
      return;
    }

    const pinStatusData = await pinStatusResponse.json();
    console.log('✅ Bulk PIN status retrieved successfully');

    // Step 2: Analyze results
    console.log('\n📊 Step 2: Analysis Results');
    console.log('============================');
    
    const { users, total, usersWithPin, usersWithoutPin, pinSetPercentage } = pinStatusData;
    
    console.log(`📈 Summary Statistics:`);
    console.log(`   - Total Users: ${total}`);
    console.log(`   - Users with PIN: ${usersWithPin}`);
    console.log(`   - Users without PIN: ${usersWithoutPin}`);
    console.log(`   - PIN Set Rate: ${pinSetPercentage}`);

    // Step 3: Display users without PIN
    if (usersWithoutPin > 0) {
      console.log('\n❌ Users Without Transaction PINs:');
      console.log('==================================');
      
      const usersWithoutPinList = users.filter(user => !user.hasPinSet);
      usersWithoutPinList.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - Full Name: ${user.fullName}`);
        console.log(`   - Has Wallet: ${user.hasWallet ? 'Yes' : 'No'}`);
        console.log(`   - Wallet Balance: ₦${user.walletBalance || 0}`);
        console.log(`   - Wallet Status: ${user.walletStatus || 'N/A'}`);
        console.log(`   - KYC Status: ${user.kycStatus}`);
        console.log(`   - Is Verified: ${user.isVerified ? 'Yes' : 'No'}`);
        console.log(`   - Created: ${user.createdAt}`);
        console.log('');
      });
    }

    // Step 4: Display users with PIN (sample)
    if (usersWithPin > 0) {
      console.log('\n✅ Users With Transaction PINs (Sample):');
      console.log('========================================');
      
      const usersWithPinList = users.filter(user => user.hasPinSet);
      const sampleSize = Math.min(10, usersWithPinList.length);
      
      usersWithPinList.slice(0, sampleSize).forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   - Full Name: ${user.fullName}`);
        console.log(`   - Wallet Balance: ₦${user.walletBalance || 0}`);
        console.log(`   - Wallet Status: ${user.walletStatus || 'N/A'}`);
        console.log(`   - KYC Status: ${user.kycStatus}`);
        console.log('');
      });

      if (usersWithPinList.length > sampleSize) {
        console.log(`... and ${usersWithPinList.length - sampleSize} more users with PINs`);
      }
    }

    // Step 5: Detailed analysis
    console.log('\n📈 Step 3: Detailed Analysis');
    console.log('============================');
    
    // Users with wallets but no PIN
    const usersWithWalletNoPin = users.filter(user => user.hasWallet && !user.hasPinSet);
    console.log(`🔴 Users with Wallet but No PIN: ${usersWithWalletNoPin.length}`);
    
    // Users with wallets and PIN
    const usersWithWalletAndPin = users.filter(user => user.hasWallet && user.hasPinSet);
    console.log(`🟢 Users with Wallet and PIN: ${usersWithWalletAndPin.length}`);
    
    // Users without wallets
    const usersWithoutWallet = users.filter(user => !user.hasWallet);
    console.log(`🟡 Users without Wallet: ${usersWithoutWallet.length}`);

    // KYC status breakdown
    const kycApproved = users.filter(user => user.kycStatus === 'APPROVED').length;
    const kycPending = users.filter(user => user.kycStatus === 'PENDING').length;
    const kycRejected = users.filter(user => user.kycStatus === 'REJECTED').length;
    
    console.log(`\n📋 KYC Status Breakdown:`);
    console.log(`   - Approved: ${kycApproved}`);
    console.log(`   - Pending: ${kycPending}`);
    console.log(`   - Rejected: ${kycRejected}`);

    // Verification status breakdown
    const verifiedUsers = users.filter(user => user.isVerified).length;
    const unverifiedUsers = users.filter(user => !user.isVerified).length;
    
    console.log(`\n📋 Verification Status:`);
    console.log(`   - Verified: ${verifiedUsers}`);
    console.log(`   - Unverified: ${unverifiedUsers}`);

    // Step 6: Recommendations
    console.log('\n💡 Step 4: Recommendations');
    console.log('===========================');
    
    if (usersWithoutPin > 0) {
      console.log(`❌ CRITICAL: ${usersWithoutPin} users need to set transaction PINs`);
      console.log('   - These users cannot make transfers');
      console.log('   - They need to login and set a transaction PIN');
      console.log('   - Consider sending them notifications to set PIN');
      
      if (usersWithWalletNoPin.length > 0) {
        console.log(`\n🚨 URGENT: ${usersWithWalletNoPin.length} users have wallets but no PIN`);
        console.log('   - These users have funded accounts but cannot transfer');
        console.log('   - Immediate action required');
        console.log('   - Consider bulk PIN setting or user notifications');
      }
    } else {
      console.log('✅ All users with wallets have transaction PINs set');
    }

    if (usersWithoutWallet.length > 0) {
      console.log(`\n⚠️  ${usersWithoutWallet.length} users do not have wallets`);
      console.log('   - These users may need KYC approval');
      console.log('   - Check KYC status and approve if needed');
    }

    // Step 7: Export data for further analysis
    console.log('\n📤 Step 5: Data Export');
    console.log('=======================');
    
    const exportData = {
      summary: {
        total: total,
        usersWithPin: usersWithPin,
        usersWithoutPin: usersWithoutPin,
        pinSetPercentage: pinSetPercentage,
        usersWithWalletNoPin: usersWithWalletNoPin.length,
        usersWithWalletAndPin: usersWithWalletAndPin.length,
        usersWithoutWallet: usersWithoutWallet.length,
      },
      usersWithoutPin: users.filter(user => !user.hasPinSet),
      usersWithPin: users.filter(user => user.hasPinSet),
    };

    console.log('📄 Data ready for export (see exportData object)');
    console.log('   - Summary statistics available');
    console.log('   - List of users without PINs available');
    console.log('   - List of users with PINs available');

    return exportData;

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkBulkPinStatus(); 