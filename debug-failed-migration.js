require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://monzi-backend.onrender.com';

async function debugFailedMigration() {
  try {
    console.log('🔍 Debugging Failed Migration for thismaleek@gmail.com...\n');

    // Step 1: Login to get admin token
    console.log('🔐 Step 1: Logging in to production server...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    });

    let token;
    if (loginResponse.data.access_token) {
      token = loginResponse.data.access_token;
    } else if (loginResponse.data.token) {
      token = loginResponse.data.token;
    } else {
      throw new Error('No token found in login response');
    }

    console.log('✅ Login successful!');
    console.log('');

    // Step 2: Find the user details
    console.log('👤 Step 2: Finding user details...');
    const usersResponse = await axios.get(`${BASE_URL}/admin/users?search=thismaleek@gmail.com`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!usersResponse.data.users || usersResponse.data.users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = usersResponse.data.users[0];
    console.log('📋 User Found:');
    console.log('   Email:', user.email);
    console.log('   ID:', user.id);
    console.log('   Name:', `${user.firstName} ${user.lastName}`);
    console.log('   Phone:', user.phone);
    console.log('   KYC Status:', user.kycStatus);
    console.log('   BVN:', user.bvn ? 'Available' : 'Missing');
    console.log('   Date of Birth:', user.dateOfBirth);
    console.log('   Gender:', user.gender);
    console.log('');

    // Step 3: Check wallet details
    console.log('💳 Step 3: Checking wallet details...');
    if (user.wallet) {
      console.log('   Wallet ID:', user.wallet.id);
      console.log('   Provider:', user.wallet.provider);
      console.log('   Account Number:', user.wallet.virtualAccountNumber);
      console.log('   Balance:', `₦${user.wallet.balance.toLocaleString()}`);
      console.log('   Status:', user.wallet.status);
      console.log('   Created:', new Date(user.wallet.createdAt).toLocaleString());
      
      if (user.wallet.metadata) {
        console.log('   Metadata:', JSON.stringify(user.wallet.metadata, null, 4));
      }
    } else {
      console.log('   ❌ No wallet found');
    }
    console.log('');

    // Step 4: Try dry-run migration for this specific user
    console.log('🧪 Step 4: Testing dry-run migration for this user...');
    try {
      const dryRunResponse = await axios.post(
        `${BASE_URL}/admin/migrate-to-nyra?dryRun=true&userId=${user.id}`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      console.log('📋 Dry Run Result:');
      console.log('   Success:', dryRunResponse.data.success);
      console.log('   Message:', dryRunResponse.data.message);
      console.log('   Would Process:', dryRunResponse.data.processedUsers);
      console.log('   Would Succeed:', dryRunResponse.data.successfulMigrations);
      console.log('   Would Fail:', dryRunResponse.data.failedMigrations);

      if (dryRunResponse.data.results && dryRunResponse.data.results.length > 0) {
        const result = dryRunResponse.data.results[0];
        console.log('   Result Status:', result.status);
        if (result.error) {
          console.log('   Error:', result.error);
        }
      }
    } catch (dryRunError) {
      console.log('❌ Dry run failed:');
      console.log('   Status:', dryRunError.response?.status);
      console.log('   Error:', dryRunError.response?.data || dryRunError.message);
    }
    console.log('');

    // Step 5: Try actual migration for this specific user
    console.log('⚡ Step 5: Attempting actual migration for this user...');
    try {
      const migrationResponse = await axios.post(
        `${BASE_URL}/admin/migrate-to-nyra?userId=${user.id}`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      console.log('✅ Migration Result:');
      console.log('   Success:', migrationResponse.data.success);
      console.log('   Message:', migrationResponse.data.message);
      console.log('   Processed:', migrationResponse.data.processedUsers);
      console.log('   Succeeded:', migrationResponse.data.successfulMigrations);
      console.log('   Failed:', migrationResponse.data.failedMigrations);

      if (migrationResponse.data.results && migrationResponse.data.results.length > 0) {
        const result = migrationResponse.data.results[0];
        console.log('   Result Status:', result.status);
        if (result.status === 'success') {
          console.log('   🏦 NYRA Account:', result.nyraAccountNumber);
          console.log('   👤 Account Name:', result.nyraAccountName);
          console.log('   🏪 Bank:', result.nyraBankName);
        } else if (result.error) {
          console.log('   ❌ Error:', result.error);
        }
      }

      if (migrationResponse.data.errors && migrationResponse.data.errors.length > 0) {
        console.log('   Detailed Errors:');
        migrationResponse.data.errors.forEach((error, index) => {
          console.log(`     ${index + 1}. ${error.error}`);
        });
      }

    } catch (migrationError) {
      console.log('❌ Migration failed:');
      console.log('   Status:', migrationError.response?.status);
      console.log('   Error Data:', JSON.stringify(migrationError.response?.data, null, 2));
      console.log('   Full Error:', migrationError.message);

      // If it's a 500 error, there might be server logs we can check
      if (migrationError.response?.status === 500) {
        console.log('');
        console.log('🔍 Server Error Analysis:');
        console.log('   This appears to be an internal server error during NYRA account creation.');
        console.log('   Possible causes:');
        console.log('   1. Missing required user data (BVN, phone, DOB, etc.)');
        console.log('   2. NYRA API rate limiting or temporary failure');
        console.log('   3. Invalid data format for NYRA API');
        console.log('   4. Network timeout or connection issue');
      }
    }

    console.log('');

    // Step 6: Check user's current wallet status again
    console.log('🔍 Step 6: Checking current wallet status...');
    const finalUsersResponse = await axios.get(`${BASE_URL}/admin/users?search=thismaleek@gmail.com`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const finalUser = finalUsersResponse.data.users[0];
    if (finalUser.wallet) {
      console.log('💳 Current Wallet Status:');
      console.log('   Provider:', finalUser.wallet.provider);
      console.log('   Account Number:', finalUser.wallet.virtualAccountNumber);
      console.log('   Balance:', `₦${finalUser.wallet.balance.toLocaleString()}`);
      
      if (finalUser.wallet.metadata) {
        console.log('   Migration Status:', finalUser.wallet.metadata.nyraAccount ? 'Migrated' : 'Not Migrated');
        if (finalUser.wallet.metadata.nyraAccount) {
          console.log('   NYRA Account:', finalUser.wallet.metadata.nyraAccount.accountNumber);
        }
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log('===========');
    console.log('User data looks complete, investigating specific NYRA API failure...');

  } catch (error) {
    console.error('❌ Debug script failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('🔐 Authentication failed');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Cannot connect to server');
    }
  }
}

console.log('🔧 Debug Failed Migration Script');
console.log('=================================');
console.log('');
debugFailedMigration(); 