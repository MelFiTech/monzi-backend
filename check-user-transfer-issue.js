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

async function checkUserTransferIssue() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  const userId = 'cmdgb0pbw000wld3s2jqu5tmv';

  try {
    console.log('🔍 Checking user transfer issue for:', userId);

    // Login as admin first
    const adminToken = await loginAdmin();
    if (!adminToken) {
      console.log('❌ Cannot proceed without admin token');
      return;
    }

    // 1. Get user details
    console.log('\n📋 1. Getting user details...');
    const userResponse = await fetch(`${baseUrl}/admin/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User details retrieved successfully');
      console.log('📄 User data:', JSON.stringify(userData, null, 2));
      
      // Check wallet status
      if (userData.user && userData.user.wallet) {
        console.log('\n💰 Wallet Status:');
        console.log('- Balance:', userData.user.wallet.balance);
        console.log('- Is Active:', userData.user.wallet.isActive);
        console.log('- Is Frozen:', userData.user.wallet.isFrozen);
        console.log('- Account Number:', userData.user.wallet.virtualAccountNumber);
        console.log('- Provider:', userData.user.wallet.provider);
      } else {
        console.log('❌ No wallet found for user');
      }
    } else {
      console.log('❌ Failed to get user details:', userResponse.status);
    }

    // 2. Get user's recent transactions
    console.log('\n📊 2. Getting user transactions...');
    const transactionsResponse = await fetch(`${baseUrl}/admin/transactions?userId=${userId}&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('✅ User transactions retrieved successfully');
      console.log('📄 Recent transactions:', JSON.stringify(transactionsData, null, 2));
    } else {
      console.log('❌ Failed to get transactions:', transactionsResponse.status);
    }

    // 3. Check wallet balance directly
    console.log('\n💰 3. Getting wallet balance...');
    const balanceResponse = await fetch(`${baseUrl}/admin/wallet/balance?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log('✅ Wallet balance retrieved successfully');
      console.log('📄 Balance data:', JSON.stringify(balanceData, null, 2));
    } else {
      console.log('❌ Failed to get wallet balance:', balanceResponse.status);
    }

    // 4. Check if user has any pending transactions
    console.log('\n⏳ 4. Checking for pending transactions...');
    const pendingResponse = await fetch(`${baseUrl}/admin/transactions?userId=${userId}&status=PENDING&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (pendingResponse.ok) {
      const pendingData = await pendingResponse.json();
      console.log('✅ Pending transactions check completed');
      console.log('📄 Pending transactions:', JSON.stringify(pendingData, null, 2));
    } else {
      console.log('❌ Failed to get pending transactions:', pendingResponse.status);
    }

    console.log('\n🔍 Analysis Summary:');
    console.log('- Check if wallet is frozen');
    console.log('- Check if wallet is active');
    console.log('- Check if user has sufficient balance');
    console.log('- Check if there are any pending transactions blocking new ones');
    console.log('- Check if user KYC is verified');
    console.log('- Check if wallet provider is working');

  } catch (error) {
    console.error('❌ Error checking user transfer issue:', error.message);
  }
}

// Run the check
checkUserTransferIssue(); 