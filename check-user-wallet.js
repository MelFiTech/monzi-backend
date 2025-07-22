require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function checkUserWallet() {
  try {
    console.log('🔐 Step 1: Logging in to get admin access...');
    
    // Login to get JWT token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    });

    const token = loginResponse.data.access_token;
    console.log('✅ Login successful!');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('\n👤 Step 2: Finding user modibest03@gmail.com...');
    
    // Get all users to find the specific user
    const usersResponse = await axios.get(`${BASE_URL}/admin/users?search=modibest03@gmail.com`, { headers });
    
    if (usersResponse.data.users.length === 0) {
      throw new Error('User modibest03@gmail.com not found');
    }

    const user = usersResponse.data.users[0];
    console.log('📋 User Details:');
    console.log('  - ID:', user.id);
    console.log('  - Email:', user.email);
    console.log('  - Phone:', user.phone);
    console.log('  - KYC Status:', user.kycStatus);
    console.log('  - Wallet Status:', user.walletStatus);
    console.log('  - Wallet Provider:', user.walletProvider);
    console.log('  - Account Number:', user.virtualAccountNumber);
    console.log('  - Wallet Balance:', `₦${user.walletBalance?.toLocaleString() || '0'}`);

    console.log('\n💳 Step 3: Getting detailed user information...');
    
    // Get detailed user info
    const userDetailResponse = await axios.get(`${BASE_URL}/admin/users/${user.id}`, { headers });
    const userDetail = userDetailResponse.data.user;
    
    console.log('📋 Detailed Wallet Info:');
    if (userDetail.wallet) {
      console.log('  - Wallet ID:', userDetail.wallet.id);
      console.log('  - Balance:', `₦${userDetail.wallet.balance.toLocaleString()}`);
      console.log('  - Currency:', userDetail.wallet.currency);
      console.log('  - Account Number:', userDetail.wallet.virtualAccountNumber);
      console.log('  - Provider:', userDetail.wallet.provider);
      console.log('  - Is Active:', userDetail.wallet.isActive);
      console.log('  - Created:', new Date(userDetail.wallet.createdAt).toLocaleDateString());
    } else {
      console.log('  - No wallet found!');
    }

    console.log('\n🧪 Step 4: Testing migration for this specific user...');
    
    // Test migration for this specific user
    const migrationResponse = await axios.post(
      `${BASE_URL}/admin/migrate-to-nyra?dryRun=true&userId=${user.id}`,
      {},
      { headers }
    );

    console.log('📋 Migration Test Results:');
    console.log('  - Would be processed:', migrationResponse.data.processedUsers);
    console.log('  - Would succeed:', migrationResponse.data.successfulMigrations);
    console.log('  - Would fail:', migrationResponse.data.failedMigrations);
    console.log('  - Message:', migrationResponse.data.message);

    if (migrationResponse.data.results.length > 0) {
      const result = migrationResponse.data.results[0];
      console.log('\n📋 Migration Details:');
      console.log('  - Status:', result.status);
      console.log('  - Current Provider:', result.oldProvider);
      console.log('  - Current Account:', result.oldAccountNumber);
      
      if (result.status === 'success') {
        console.log('  - Would get NYRA Account:', result.nyraAccountNumber);
        console.log('  - Would get NYRA Bank:', result.nyraBankName);
      } else if (result.status === 'skipped') {
        console.log('  - Reason: User already has NYRA account or not eligible');
      } else if (result.error) {
        console.log('  - Error:', result.error);
      }
    }

    console.log('\n💰 Step 5: Getting user transactions...');
    
    // Get recent transactions
    const transactionsResponse = await axios.get(
      `${BASE_URL}/admin/transactions?userId=${user.id}&limit=5`,
      { headers }
    );
    
    console.log('📋 Recent Transactions:');
    if (transactionsResponse.data.transactions.length > 0) {
      transactionsResponse.data.transactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.type} - ₦${tx.amount.toLocaleString()}`);
        console.log(`     Status: ${tx.status} | Date: ${new Date(tx.createdAt).toLocaleDateString()}`);
        console.log(`     Ref: ${tx.reference}`);
        console.log('');
      });
    } else {
      console.log('  - No transactions found');
    }

    console.log('\n🎯 Summary:');
    console.log('================');
    console.log(`👤 User: ${user.email}`);
    console.log(`💳 Current Provider: ${userDetail.wallet?.provider || 'None'}`);
    console.log(`🏦 Account Number: ${userDetail.wallet?.virtualAccountNumber || 'None'}`);
    console.log(`💰 Balance: ₦${userDetail.wallet?.balance?.toLocaleString() || '0'}`);
    console.log(`🔄 Migration Status: ${migrationResponse.data.results[0]?.status || 'Unknown'}`);
    
    if (userDetail.wallet?.provider !== 'NYRA') {
      console.log('\n📝 What migration would do:');
      console.log('  1. Create new NYRA account for this user');
      console.log('  2. Update primary wallet details to show NYRA account');
      console.log(`  3. Keep current ${userDetail.wallet?.provider} account as backup funding source`);
      console.log('  4. User sees NYRA account in app, but can still fund via old account');
    } else {
      console.log('\n✅ User already has NYRA account - no migration needed');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

console.log('🔄 Checking wallet details for modibest03@gmail.com...\n');
checkUserWallet(); 