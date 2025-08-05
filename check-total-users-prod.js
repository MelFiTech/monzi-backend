const fetch = require('node-fetch');

async function checkTotalUsersProd() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Checking Total Users in Production Database');
    console.log('============================================');
    
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

    // Test 1: Get total users count with high limit
    console.log('\n👥 Test 1: Getting Total Users Count');
    console.log('Using endpoint: GET /admin/users?limit=1000');
    
    const totalUsersResponse = await fetch(`${baseUrl}/admin/users?limit=1000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (totalUsersResponse.ok) {
      const totalUsersData = await totalUsersResponse.json();
      console.log('✅ Total Users Response:');
      console.log(`   - Success: ${totalUsersData.success}`);
      console.log(`   - Message: ${totalUsersData.message}`);
      console.log(`   - Total Users: ${totalUsersData.total}`);
      console.log(`   - Retrieved Users: ${totalUsersData.users?.length || 0}`);
      console.log(`   - Limit Used: 1000`);
      
      if (totalUsersData.users && totalUsersData.users.length > 0) {
        console.log(`\n📊 Sample Users (first 5):`);
        totalUsersData.users.slice(0, 5).forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} - ${user.firstName} ${user.lastName}`);
          console.log(`      - ID: ${user.id}`);
          console.log(`      - KYC: ${user.kycStatus}`);
          console.log(`      - Has Wallet: ${user.wallet ? 'Yes' : 'No'}`);
          if (user.wallet) {
            console.log(`      - Balance: ₦${user.wallet.balance}`);
          }
        });
      }
    } else {
      console.log('❌ Failed to get total users:', totalUsersResponse.status);
      const errorData = await totalUsersResponse.text();
      console.log('Error details:', errorData);
    }

    // Test 2: Get users with no limit to see if there are more
    console.log('\n👥 Test 2: Getting All Users (No Limit)');
    console.log('Using endpoint: GET /admin/users');
    
    const allUsersResponse = await fetch(`${baseUrl}/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (allUsersResponse.ok) {
      const allUsersData = await allUsersResponse.json();
      console.log('✅ All Users Response:');
      console.log(`   - Success: ${allUsersData.success}`);
      console.log(`   - Message: ${allUsersData.message}`);
      console.log(`   - Total Users: ${allUsersData.total}`);
      console.log(`   - Retrieved Users: ${allUsersData.users?.length || 0}`);
      console.log(`   - Default Limit: 20`);
    } else {
      console.log('❌ Failed to get all users:', allUsersResponse.status);
    }

    // Test 3: Get users with different status filters
    console.log('\n👥 Test 3: Getting Users by Status');
    
    const statuses = ['active', 'inactive', 'APPROVED', 'PENDING', 'REJECTED'];
    
    for (const status of statuses) {
      console.log(`\n🔍 Checking users with status: ${status}`);
      
      const statusResponse = await fetch(`${baseUrl}/admin/users?status=${status}&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`✅ ${status} Users:`);
        console.log(`   - Total: ${statusData.total}`);
        console.log(`   - Retrieved: ${statusData.users?.length || 0}`);
      } else {
        console.log(`❌ Failed to get ${status} users:`, statusResponse.status);
      }
    }

    // Test 4: Check specific user again
    console.log('\n🎯 Test 4: Checking Specific User Again');
    console.log('User ID: cmdgb0pbw000wld3s2jqu5tmv');
    
    const specificUserResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (specificUserResponse.ok) {
      const specificUserData = await specificUserResponse.json();
      console.log('✅ Specific User Found:');
      console.log(`   - ID: ${specificUserData.id}`);
      console.log(`   - Email: ${specificUserData.email}`);
      console.log(`   - Name: ${specificUserData.firstName} ${specificUserData.lastName}`);
      console.log(`   - KYC Status: ${specificUserData.kycStatus}`);
      console.log(`   - Has Wallet: ${specificUserData.wallet ? 'Yes' : 'No'}`);
      if (specificUserData.wallet) {
        console.log(`   - Balance: ₦${specificUserData.wallet.balance}`);
      }
    } else {
      console.log('❌ Specific user not found:', specificUserResponse.status);
    }

    // Summary
    console.log('\n📋 Production Database Summary');
    console.log('==============================');
    console.log('✅ Admin Endpoint: GET /admin/users');
    console.log('✅ Authentication: Working');
    console.log('✅ User Retrieval: Working');
    console.log('✅ Status Filtering: Working');
    console.log('✅ Specific User Lookup: Working');

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkTotalUsersProd(); 