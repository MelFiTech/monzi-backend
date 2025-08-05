const fetch = require('node-fetch');

async function loginAdmin() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔐 Logging in as admin...');
    
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

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Admin login successful');
      return loginData.access_token;
    } else {
      console.log('❌ Admin login failed:', loginResponse.status);
      const errorData = await loginResponse.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

async function checkUserWallet(token, userId) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n💰 Checking wallet for user: ${userId}`);
    
    const response = await fetch(`${baseUrl}/admin/wallet/details/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Wallet details retrieved');
      console.log('📄 Wallet data:', {
        id: data.id,
        balance: data.balance,
        isActive: data.isActive,
        isFrozen: data.isFrozen,
        virtualAccountNumber: data.virtualAccountNumber,
        provider: data.provider
      });
      return data;
    } else {
      console.log('❌ Failed to get wallet details:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Wallet check error:', error.message);
    return null;
  }
}

async function checkUserDetails(token, userId) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n👤 Checking user details for: ${userId}`);
    
    const response = await fetch(`${baseUrl}/admin/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ User details retrieved');
      console.log('📄 User data:', {
        id: data.id,
        email: data.email,
        isVerified: data.isVerified,
        isActive: data.isActive,
        role: data.role
      });
      return data;
    } else {
      console.log('❌ Failed to get user details:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ User check error:', error.message);
    return null;
  }
}

async function testTransferFlow(token, userId) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n💸 Testing transfer flow for user: ${userId}`);
    
    const response = await fetch(`${baseUrl}/wallet/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 100,
        accountNumber: '8106381265',
        bankName: 'OPAY',
        accountName: 'TEST USER',
        pin: '1234',
        description: 'Test transfer'
      })
    });

    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Transfer successful');
      console.log('📄 Transfer response:', data);
    } else {
      const errorData = await response.text();
      console.log('❌ Transfer failed');
      console.log('Error details:', errorData);
    }
  } catch (error) {
    console.error('❌ Transfer test error:', error.message);
  }
}

async function checkTransferProviderStatus(token) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('\n🏦 Checking transfer provider status');
    
    const response = await fetch(`${baseUrl}/admin/providers/transfer/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Transfer provider info retrieved');
      console.log('📄 Provider info:', data);
    } else {
      console.log('❌ Failed to get provider info:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
    }
  } catch (error) {
    console.error('❌ Provider check error:', error.message);
  }
}

async function runDebugTests() {
  console.log('🔍 Starting Transfer Issue Debug');
  console.log('=' .repeat(60));
  
  const userId = 'cmdgb0pbw000wld3s2jqu5tmv';
  
  // Step 1: Login as admin
  const token = await loginAdmin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    return;
  }
  
  // Step 2: Check user details
  await checkUserDetails(token, userId);
  
  // Step 3: Check wallet details
  await checkUserWallet(token, userId);
  
  // Step 4: Check transfer provider status
  await checkTransferProviderStatus(token);
  
  // Step 5: Test transfer flow (this might fail, but we'll see where it stops)
  await testTransferFlow(token, userId);
  
  console.log('\n🎯 Debug tests completed!');
  console.log('=' .repeat(60));
}

// Run the debug tests
runDebugTests().catch(console.error); 