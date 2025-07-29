const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let adminToken = '';

async function loginAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    });
    
    adminToken = response.data.access_token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkUsersWithWallets() {
  try {
    console.log('\n👥 Checking for users with wallets...');
    
    // Get all users
    const usersResponse = await axios.get(`${BASE_URL}/admin/users?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`📊 Total users: ${usersResponse.data.users.length}`);
    
    // Check each user for wallet details
    const usersWithWallets = [];
    const usersWithoutWallets = [];
    
    for (const user of usersResponse.data.users) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Virtual Account: ${user.virtualAccountNumber || 'None'}`);
      console.log(`- Wallet Balance: ${user.walletBalance || 'None'}`);
      console.log(`- Wallet Status: ${user.walletStatus || 'None'}`);
      console.log(`- Wallet Provider: ${user.walletProvider || 'None'}`);
      
      if (user.virtualAccountNumber) {
        usersWithWallets.push(user);
        console.log('✅ Has wallet');
      } else {
        usersWithoutWallets.push(user);
        console.log('❌ No wallet');
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Users with wallets: ${usersWithWallets.length}`);
    console.log(`- Users without wallets: ${usersWithoutWallets.length}`);
    
    if (usersWithWallets.length > 0) {
      console.log('\n💰 Users with wallets:');
      usersWithWallets.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - ${user.virtualAccountNumber} - Balance: ${user.walletBalance}`);
      });
    }
    
    return usersWithWallets;
  } catch (error) {
    console.error('❌ Check users with wallets failed:', error.response?.data || error.message);
    return [];
  }
}

async function testWalletOperations(usersWithWallets) {
  if (usersWithWallets.length === 0) {
    console.log('\n⚠️ No users with wallets found for testing wallet operations');
    return;
  }
  
  const testUser = usersWithWallets[0];
  console.log(`\n💰 Testing wallet operations with user: ${testUser.email}`);
  console.log(`- Account Number: ${testUser.virtualAccountNumber}`);
  console.log(`- Current Balance: ${testUser.walletBalance}`);
  
  // Test 1: Get wallet balance
  console.log('\n📋 Test 1: Getting wallet balance...');
  try {
    const balanceResponse = await axios.get(`${BASE_URL}/admin/wallet/balance?accountNumber=${testUser.virtualAccountNumber}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Wallet balance response:', balanceResponse.data);
  } catch (error) {
    console.error('❌ Get wallet balance failed:', error.response?.data || error.message);
  }
  
  // Test 2: Fund wallet
  console.log('\n📋 Test 2: Testing fund wallet...');
  try {
    const fundResponse = await axios.post(`${BASE_URL}/admin/fund-wallet`, {
      accountNumber: testUser.virtualAccountNumber,
      amount: 1000,
      description: 'Test funding from admin'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Fund wallet response:', fundResponse.data);
  } catch (error) {
    console.error('❌ Fund wallet failed:', error.response?.data || error.message);
  }
  
  // Test 3: Debit wallet
  console.log('\n📋 Test 3: Testing debit wallet...');
  try {
    const debitResponse = await axios.post(`${BASE_URL}/admin/debit-wallet`, {
      accountNumber: testUser.virtualAccountNumber,
      amount: 500,
      description: 'Test debit from admin'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Debit wallet response:', debitResponse.data);
  } catch (error) {
    console.error('❌ Debit wallet failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Starting Users with Wallets Check...\n');
  
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without admin login');
    return;
  }
  
  const usersWithWallets = await checkUsersWithWallets();
  await testWalletOperations(usersWithWallets);
  
  console.log('\n✅ Users with Wallets Check completed!');
}

main().catch(console.error); 