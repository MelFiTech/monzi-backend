const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'talktomelfi@gmail.com';
const BVN = '22347795339';

async function getAdminToken() {
  try {
    console.log('🔐 Getting admin token...');
    
    const loginData = {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    };

    const response = await axios.post(`${BASE_URL}/auth/login`, loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Admin token obtained');
    return response.data.access_token;
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return null;
  }
}

async function getUserToken() {
  try {
    console.log('🔐 Getting user token...');
    
    const loginData = {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    };

    const response = await axios.post(`${BASE_URL}/auth/login`, loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ User token obtained');
    return response.data.access_token;
    
  } catch (error) {
    console.error('❌ User login failed:', error.response?.data || error.message);
    return null;
  }
}

async function unapproveUser(adminToken, userId) {
  try {
    console.log('🔄 Unapproving user KYC...');
    
    const response = await axios.put(
      `${BASE_URL}/admin/kyc/submissions/${userId}/review`,
      {
        decision: 'REJECT',
        comment: 'Reopening KYC for Identity Pass verification testing'
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ User KYC unapproved successfully');
    console.log('Response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Failed to unapprove user:', error.response?.data || error.message);
    throw error;
  }
}

async function checkUserWallet(userToken) {
  try {
    console.log('💰 Checking user wallet status...');
    
    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      }
    });

    const wallet = response.data.wallet;
    console.log('✅ Wallet status:');
    console.log(`- Account Number: ${wallet?.accountNumber || 'N/A'}`);
    console.log(`- Balance: ${wallet?.balance || 0}`);
    console.log(`- Status: ${wallet?.status || 'N/A'}`);
    console.log(`- Provider: ${wallet?.provider || 'N/A'}`);
    
    return wallet;
    
  } catch (error) {
    console.error('❌ Failed to check wallet:', error.response?.data || error.message);
    return null;
  }
}

async function rerunKycVerification(userToken) {
  try {
    console.log('🔄 Rerunning KYC verification with Identity Pass...');
    
    const response = await axios.post(
      `${BASE_URL}/kyc/verify-bvn`,
      {
        bvn: BVN
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ KYC verification completed');
    console.log('Response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Failed to rerun KYC:', error.response?.data || error.message);
    throw error;
  }
}

async function checkKycStatus(userToken) {
  try {
    console.log('📋 Checking KYC status...');
    
    const response = await axios.get(`${BASE_URL}/kyc/status`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      }
    });

    console.log('✅ KYC Status:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Failed to check KYC status:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  try {
    console.log('🚀 Starting KYC unapproval and rerun process...');
    console.log(`User: ${USER_EMAIL}`);
    console.log(`BVN: ${BVN}`);
    
    // Get tokens
    const adminToken = await getAdminToken();
    const userToken = await getUserToken();
    
    if (!adminToken || !userToken) {
      console.error('❌ Failed to get required tokens');
      return;
    }

    // Check initial wallet status
    console.log('\n💰 Initial wallet status:');
    const initialWallet = await checkUserWallet(userToken);
    
    // Get user ID from profile
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      }
    });
    
    const userId = profileResponse.data.id;
    console.log(`\n👤 User ID: ${userId}`);

    // Unapprove user KYC
    console.log('\n🔄 Step 1: Unapproving user KYC...');
    await unapproveUser(adminToken, userId);

    // Check KYC status after unapproval
    console.log('\n📋 Step 2: Checking KYC status after unapproval...');
    await checkKycStatus(userToken);

    // Rerun KYC verification
    console.log('\n🔄 Step 3: Rerunning KYC verification with Identity Pass...');
    await rerunKycVerification(userToken);

    // Check KYC status after rerun
    console.log('\n📋 Step 4: Checking KYC status after rerun...');
    await checkKycStatus(userToken);

    // Check final wallet status
    console.log('\n💰 Final wallet status:');
    const finalWallet = await checkUserWallet(userToken);

    // Compare wallet status
    console.log('\n✅ Wallet Status Comparison:');
    console.log('Initial:', {
      accountNumber: initialWallet?.accountNumber,
      balance: initialWallet?.balance,
      status: initialWallet?.status
    });
    console.log('Final:', {
      accountNumber: finalWallet?.accountNumber,
      balance: finalWallet?.balance,
      status: finalWallet?.status
    });

    if (initialWallet?.balance === finalWallet?.balance && 
        initialWallet?.accountNumber === finalWallet?.accountNumber) {
      console.log('✅ SUCCESS: Wallet and balance unchanged!');
    } else {
      console.log('⚠️ WARNING: Wallet or balance may have changed!');
    }

    console.log('\n🎉 Process completed successfully!');
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
  }
}

main().catch(console.error); 