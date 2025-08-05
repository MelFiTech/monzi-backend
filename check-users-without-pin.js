const fetch = require('node-fetch');

async function checkUsersWithoutPin() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Checking Users Without Wallet PINs');
    console.log('====================================');
    
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

    // Step 3: Check PIN status for each user with wallet
    console.log('\n🔒 Step 3: Check PIN Status for Each User');
    console.log('Checking wallet PIN status for users with wallets...');
    
    const usersWithoutPin = [];
    const usersWithPin = [];
    const usersWithIssues = [];

    for (let i = 0; i < usersWithWallets.length; i++) {
      const user = usersWithWallets[i];
      console.log(`\n🔍 Checking user ${i + 1}/${usersWithWallets.length}: ${user.email}`);
      
      try {
        // Try to login as this user to check PIN status
        const userLoginResponse = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            passcode: '123456' // Try default passcode
          })
        });

        if (userLoginResponse.ok) {
          const userLoginData = await userLoginResponse.json();
          const userToken = userLoginData.access_token;
          
          // Check PIN status
          const pinStatusResponse = await fetch(`${baseUrl}/wallet/pin-status`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
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
            usersWithIssues.push({
              id: user.id,
              email: user.email,
              issue: 'PIN status check failed',
              statusCode: pinStatusResponse.status
            });
            console.log(`   ⚠️  Issue: ${user.email} - PIN status check failed`);
          }
        } else {
          // Try different passcodes
          const possiblePasscodes = ['290420', '199699', '000000', '111111', '222222', '333333', '444444', '555555'];
          let loginSuccess = false;
          
          for (const passcode of possiblePasscodes) {
            const retryLoginResponse = await fetch(`${baseUrl}/auth/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: user.email,
                passcode: passcode
              })
            });

            if (retryLoginResponse.ok) {
              const retryLoginData = await retryLoginResponse.json();
              const retryUserToken = retryLoginData.access_token;
              
              // Check PIN status with working token
              const retryPinStatusResponse = await fetch(`${baseUrl}/wallet/pin-status`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${retryUserToken}`
                }
              });

              if (retryPinStatusResponse.ok) {
                const retryPinStatusData = await retryPinStatusResponse.json();
                
                if (retryPinStatusData.hasPinSet) {
                  usersWithPin.push({
                    id: user.id,
                    email: user.email,
                    walletBalance: user.walletBalance,
                    kycStatus: user.kycStatus,
                    isVerified: user.isVerified,
                    passcode: passcode
                  });
                  console.log(`   ✅ PIN Set: ${user.email} (passcode: ${passcode})`);
                } else {
                  usersWithoutPin.push({
                    id: user.id,
                    email: user.email,
                    walletBalance: user.walletBalance,
                    kycStatus: user.kycStatus,
                    isVerified: user.isVerified,
                    passcode: passcode
                  });
                  console.log(`   ❌ No PIN: ${user.email} (passcode: ${passcode})`);
                }
                loginSuccess = true;
                break;
              }
            }
          }
          
          if (!loginSuccess) {
            usersWithIssues.push({
              id: user.id,
              email: user.email,
              issue: 'Cannot authenticate with any common passcode'
            });
            console.log(`   ⚠️  Issue: ${user.email} - Cannot authenticate`);
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
    console.log(`Users with PIN Set: ${usersWithPin.length}`);
    console.log(`Users without PIN: ${usersWithoutPin.length}`);
    console.log(`Users with Issues: ${usersWithIssues.length}`);

    // Display users without PIN
    if (usersWithoutPin.length > 0) {
      console.log('\n❌ Users Without Wallet PINs:');
      console.log('==============================');
      usersWithoutPin.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - Wallet Balance: ₦${user.walletBalance || 0}`);
        console.log(`   - KYC Status: ${user.kycStatus}`);
        console.log(`   - Is Verified: ${user.isVerified}`);
        if (user.passcode) {
          console.log(`   - Working Passcode: ${user.passcode}`);
        }
        console.log('');
      });
    }

    // Display users with PIN
    if (usersWithPin.length > 0) {
      console.log('\n✅ Users With Wallet PINs:');
      console.log('==========================');
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
      console.log(`❌ ${usersWithoutPin.length} users need to set wallet PINs`);
      console.log('   - These users cannot make transfers');
      console.log('   - They need to login and set a wallet PIN');
    } else {
      console.log('✅ All users with wallets have PINs set');
    }

    if (usersWithIssues.length > 0) {
      console.log(`⚠️  ${usersWithIssues.length} users have authentication issues`);
      console.log('   - These users may need passcode reset');
    }

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkUsersWithoutPin(); 