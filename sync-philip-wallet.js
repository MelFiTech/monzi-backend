const axios = require('axios');

const BASE_URL = 'https://monzi-backend.onrender.com';
const ADMIN_EMAIL = 'talktomelfi@gmail.com';
const ADMIN_PASSCODE = '199699';

async function syncPhilipWallet() {
  try {
    console.log('🔍 [SYNC WALLET] Syncing Philip\'s wallet data...');
    
    // Step 1: Login as admin
    console.log('🔐 Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      passcode: ADMIN_PASSCODE,
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Admin login successful');
    
    // Step 2: Get user details
    console.log('👤 Step 2: Getting user details...');
    const userResponse = await axios.get(`${BASE_URL}/admin/users/cmdq3vzri001cp13usmegs76p`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const user = userResponse.data.user;
    console.log('📋 User Details:');
    console.log('   Name:', user.firstName, user.lastName);
    console.log('   Email:', user.email);
    console.log('   Has Wallet:', user.hasWallet);
    console.log('   Wallet Count:', user.walletCount);
    
    // Step 3: Create wallet record in our database
    console.log('💳 Step 3: Creating wallet record in database...');
    
    const walletData = {
      userId: user.id,
      provider: 'NYRA'
    };
    
    try {
      const walletResponse = await axios.post(`${BASE_URL}/admin/create-wallet`, walletData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Wallet record created successfully!');
      console.log('📄 Response:', JSON.stringify(walletResponse.data, null, 2));
      
      // Step 4: Verify the wallet was created
      console.log('🔍 Step 4: Verifying wallet creation...');
      const verifyResponse = await axios.get(`${BASE_URL}/admin/users/cmdq3vzri001cp13usmegs76p`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const updatedUser = verifyResponse.data.user;
      console.log('📊 Updated User Status:');
      console.log('   Has Wallet:', updatedUser.hasWallet);
      console.log('   Wallet Count:', updatedUser.walletCount);
      console.log('   Total Balance:', updatedUser.totalBalance);
      
      if (updatedUser.hasWallet) {
        console.log('🎉 SUCCESS! Philip\'s wallet has been successfully created and synced!');
        console.log('💳 Wallet Details:');
        console.log('   - Account Number: 9015449504');
        console.log('   - Account Name: philip eikhomun');
        console.log('   - Provider: NYRA');
        console.log('   - Status: ACTIVE');
      } else {
        console.log('⚠️ Wallet creation may have failed in our database');
      }
      
    } catch (walletError) {
      console.log('❌ Wallet creation failed:');
      console.log('   Status:', walletError.response?.status);
      console.log('   Message:', walletError.response?.data?.message || walletError.message);
      
      // Check if it's because wallet already exists
      if (walletError.response?.data?.message?.includes('already has a wallet')) {
        console.log('ℹ️ Wallet already exists for this user');
        
        // Try to get the existing wallet details
        console.log('🔍 Getting existing wallet details...');
        const existingWalletResponse = await axios.get(`${BASE_URL}/admin/users/cmdq3vzri001cp13usmegs76p`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const userWithWallet = existingWalletResponse.data.user;
        console.log('📊 Current Wallet Status:');
        console.log('   Has Wallet:', userWithWallet.hasWallet);
        console.log('   Wallet Count:', userWithWallet.walletCount);
        console.log('   Total Balance:', userWithWallet.totalBalance);
        
        if (userWithWallet.hasWallet) {
          console.log('✅ Wallet already exists and is properly linked!');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Sync failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

syncPhilipWallet(); 