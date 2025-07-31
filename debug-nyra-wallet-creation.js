const axios = require('axios');

const BASE_URL = 'https://monzi-backend.onrender.com';
const ADMIN_EMAIL = 'talktomelfi@gmail.com';
const ADMIN_PASSCODE = '199699';

async function debugNyraWalletCreation() {
  try {
    console.log('🔍 [DEBUG] Starting NYRA wallet creation debug...');
    
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
    console.log('   Phone:', user.phone);
    console.log('   BVN:', user.bvn);
    console.log('   DOB:', user.dateOfBirth);
    console.log('   Gender:', user.gender);
    console.log('   KYC Status:', user.kycStatus);
    console.log('   Has Wallet:', user.hasWallet);
    
    // Step 3: Test NYRA wallet creation with detailed error logging
    console.log('🏦 Step 3: Testing NYRA wallet creation...');
    
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
      
      console.log('✅ Wallet creation successful!');
      console.log('📄 Response:', JSON.stringify(walletResponse.data, null, 2));
      
    } catch (walletError) {
      console.log('❌ Wallet creation failed:');
      console.log('   Status:', walletError.response?.status);
      console.log('   Status Text:', walletError.response?.statusText);
      console.log('   Error Message:', walletError.response?.data?.message);
      console.log('   Full Error Data:', JSON.stringify(walletError.response?.data, null, 2));
      
      // Check if it's a 500 error
      if (walletError.response?.status === 500) {
        console.log('');
        console.log('🔍 500 Error Analysis:');
        console.log('   This is an internal server error. Possible causes:');
        console.log('   1. Missing required user data for NYRA API');
        console.log('   2. Invalid data format for NYRA API');
        console.log('   3. NYRA API rate limiting');
        console.log('   4. Network timeout');
        console.log('   5. NYRA API temporary failure');
        
        // Check if user has all required data
        console.log('');
        console.log('📊 Data Completeness Check:');
        console.log('   First Name:', !!user.firstName ? '✅' : '❌');
        console.log('   Last Name:', !!user.lastName ? '✅' : '❌');
        console.log('   Email:', !!user.email ? '✅' : '❌');
        console.log('   Phone:', !!user.phone ? '✅' : '❌');
        console.log('   BVN:', !!user.bvn ? '✅' : '❌');
        console.log('   DOB:', !!user.dateOfBirth ? '✅' : '❌');
        console.log('   Gender:', !!user.gender ? '✅' : '❌');
        
        const missingFields = [];
        if (!user.firstName) missingFields.push('firstName');
        if (!user.lastName) missingFields.push('lastName');
        if (!user.email) missingFields.push('email');
        if (!user.phone) missingFields.push('phone');
        if (!user.bvn) missingFields.push('bvn');
        if (!user.dateOfBirth) missingFields.push('dateOfBirth');
        if (!user.gender) missingFields.push('gender');
        
        if (missingFields.length > 0) {
          console.log('');
          console.log('⚠️ Missing required fields:', missingFields.join(', '));
          console.log('   These fields are required for NYRA wallet creation');
        } else {
          console.log('');
          console.log('✅ All required fields are present');
          console.log('   The issue might be with NYRA API or network connectivity');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Debug script failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugNyraWalletCreation(); 