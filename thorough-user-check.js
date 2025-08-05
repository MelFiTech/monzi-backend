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

async function getUserDetail(token, userId) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n👤 Getting user details for: ${userId}`);
    
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
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        isVerified: data.isVerified,
        isActive: data.isActive,
        isOnboarded: data.isOnboarded,
        kycStatus: data.kycStatus,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
      return data;
    } else {
      console.log('❌ Failed to get user details:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ User detail error:', error.message);
    return null;
  }
}

async function getWalletBalance(token, userId) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n💰 Getting wallet balance for user: ${userId}`);
    
    const response = await fetch(`${baseUrl}/admin/wallet/balance?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Wallet balance retrieved');
      console.log('📄 Wallet data:', {
        userId: data.userId,
        email: data.email,
        accountNumber: data.accountNumber,
        balance: data.balance,
        provider: data.provider,
        isActive: data.isActive,
        isFrozen: data.isFrozen,
        providerBalance: data.providerBalance,
        discrepancy: data.discrepancy,
        lastTransactionAt: data.lastTransactionAt
      });
      return data;
    } else {
      console.log('❌ Failed to get wallet balance:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Wallet balance error:', error.message);
    return null;
  }
}

async function getUserTransactions(token, userId) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n📊 Getting user transactions for: ${userId}`);
    
    const response = await fetch(`${baseUrl}/admin/transactions?userId=${userId}&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ User transactions retrieved');
      console.log(`📊 Total transactions: ${data.transactions.length}`);
      
      if (data.transactions.length > 0) {
        console.log('📄 Recent transactions:');
        data.transactions.slice(0, 3).forEach((txn, index) => {
          console.log(`${index + 1}. ${txn.type} - ₦${txn.amount} - ${txn.status} - ${txn.createdAt}`);
        });
      }
      return data.transactions;
    } else {
      console.log('❌ Failed to get transactions:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return [];
    }
  } catch (error) {
    console.error('❌ Transactions error:', error.message);
    return [];
  }
}

async function checkTransferProvider(token) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n🏦 Checking transfer provider status`);
    
    const response = await fetch(`${baseUrl}/admin/transfer-providers/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Transfer provider info retrieved');
      console.log('📄 Provider info:', {
        success: data.success,
        provider: data.provider,
        isAdminConfigured: data.isAdminConfigured
      });
      return data;
    } else {
      console.log('❌ Failed to get provider info:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Provider check error:', error.message);
    return null;
  }
}

async function getAvailableTransferProviders(token) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n🏦 Getting available transfer providers`);
    
    const response = await fetch(`${baseUrl}/admin/transfer-providers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Available transfer providers retrieved');
      console.log('📄 Providers info:', {
        success: data.success,
        currentProvider: data.currentProvider,
        providers: data.providers,
        isAdminConfigured: data.isAdminConfigured
      });
      return data;
    } else {
      console.log('❌ Failed to get available providers:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Available providers error:', error.message);
    return null;
  }
}

async function testBankList(token) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n🏦 Testing bank list retrieval`);
    
    const response = await fetch(`${baseUrl}/admin/test/bank-list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Bank list test successful');
      console.log('📄 Bank list info:', {
        success: data.success,
        provider: data.provider,
        bankCount: data.bankCount
      });
      
      // Check if OPAY is in the bank list
      if (data.banks) {
        const opayBank = data.banks.find(bank => 
          bank.bankName.toLowerCase().includes('opay') || 
          bank.bankCode.toLowerCase().includes('opay')
        );
        if (opayBank) {
          console.log('✅ OPAY found in bank list:', opayBank);
        } else {
          console.log('❌ OPAY not found in bank list');
        }
      }
      return data;
    } else {
      console.log('❌ Failed to get bank list:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Bank list error:', error.message);
    return null;
  }
}

async function testBankTransfer(token) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n💸 Testing bank transfer (this will not actually transfer)`);
    
    const response = await fetch(`${baseUrl}/admin/test-bank-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 100,
        accountNumber: '8106381265',
        bankCode: 'OPAY',
        accountName: 'TEST USER',
        narration: 'Test transfer'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Bank transfer test successful');
      console.log('📄 Transfer test result:', data);
      return data;
    } else {
      console.log('❌ Failed to test bank transfer:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Bank transfer test error:', error.message);
    return null;
  }
}

async function testAccountVerification(token) {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log(`\n🔍 Testing account verification for OPAY account`);
    
    const response = await fetch(`${baseUrl}/admin/test-account-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        accountNumber: '8106381265',
        bankCode: 'OPAY' // We'll need to get the correct bank code
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Account verification test successful');
      console.log('📄 Verification result:', data);
      return data;
    } else {
      console.log('❌ Failed to verify account:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Account verification error:', error.message);
    return null;
  }
}

async function runThoroughChecks() {
  console.log('🔍 Starting Thorough User Check');
  console.log('=' .repeat(60));
  
  const userId = 'cmdgb0pbw000wld3s2jqu5tmv';
  
  // Step 1: Login as admin
  const token = await loginAdmin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    return;
  }
  
  // Step 2: Get user details
  const userDetails = await getUserDetail(token, userId);
  
  // Step 3: Get wallet balance
  const walletBalance = await getWalletBalance(token, userId);
  
  // Step 4: Get user transactions
  const transactions = await getUserTransactions(token, userId);
  
  // Step 5: Check transfer provider
  const transferProvider = await checkTransferProvider(token);
  
  // Step 6: Get available transfer providers
  const availableProviders = await getAvailableTransferProviders(token);
  
  // Step 7: Test bank list
  const bankList = await testBankList(token);
  
  // Step 8: Test bank transfer
  const bankTransfer = await testBankTransfer(token);
  
  // Step 9: Test account verification
  const accountVerification = await testAccountVerification(token);
  
  console.log('\n🎯 Thorough checks completed!');
  console.log('=' .repeat(60));
  
  // Summary
  console.log('\n📋 SUMMARY:');
  console.log(`User exists: ${userDetails ? '✅' : '❌'}`);
  console.log(`Wallet exists: ${walletBalance ? '✅' : '❌'}`);
  console.log(`Has transactions: ${transactions.length > 0 ? '✅' : '❌'}`);
  console.log(`Transfer provider active: ${transferProvider?.success ? '✅' : '❌'}`);
  console.log(`Available providers accessible: ${availableProviders?.success ? '✅' : '❌'}`);
  console.log(`Bank list accessible: ${bankList?.success ? '✅' : '❌'}`);
  console.log(`Bank transfer test: ${bankTransfer?.success ? '✅' : '❌'}`);
}

// Run the thorough checks
runThoroughChecks().catch(console.error); 