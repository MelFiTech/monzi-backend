const fetch = require('node-fetch');

async function loginAdmin() {
  const baseUrl = 'http://localhost:3000';
  
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

async function getBankLists(token) {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('\n🏦 Getting bank lists from different providers');
    
    // Get NYRA bank list (current transfer provider)
    const nyraResponse = await fetch(`${baseUrl}/admin/test/bank-list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (nyraResponse.ok) {
      const nyraData = await nyraResponse.json();
      console.log('✅ NYRA bank list retrieved');
      console.log(`📊 NYRA banks count: ${nyraData.bankCount}`);
      
      // Find OPAY in NYRA list
      const nyraOpay = nyraData.banks?.find(bank => 
        bank.bankName.toLowerCase().includes('opay')
      );
      console.log('🔍 OPAY in NYRA list:', nyraOpay);
      
      return {
        nyra: nyraData,
        nyraOpay
      };
    } else {
      console.log('❌ Failed to get NYRA bank list:', nyraResponse.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Bank list error:', error.message);
    return null;
  }
}

async function testAccountResolution(token) {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('\n🔍 Testing account resolution for OPAY account');
    
    const response = await fetch(`${baseUrl}/accounts/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        account_number: '8106381265',
        bank_name: 'Opay Digital Services Limited'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Account resolution successful');
      console.log('📄 Resolution result:', {
        success: data.status,
        accountName: data.account_name,
        bankName: data.bank_name,
        bankCode: data.bank_code,
        message: data.message
      });
      return data;
    } else {
      console.log('❌ Failed to resolve account:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Account resolution error:', error.message);
    return null;
  }
}

async function testTransferWithResolvedBankCode(token, bankCode) {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log(`\n💸 Testing transfer with resolved bank code: ${bankCode}`);
    
    const response = await fetch(`${baseUrl}/admin/test-bank-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 100,
        accountNumber: '8106381265',
        bankCode: bankCode,
        accountName: 'ABDULLAHI OGIRIMA MOHAMMAD',
        narration: 'Test transfer with resolved bank code'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Transfer test successful');
      console.log('📄 Transfer result:', data);
      return data;
    } else {
      console.log('❌ Failed to test transfer:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Transfer test error:', error.message);
    return null;
  }
}

async function analyzeBankCodeSync() {
  console.log('🔍 Starting Bank Code Sync Analysis');
  console.log('=' .repeat(60));
  
  // Step 1: Login as admin
  const token = await loginAdmin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    return;
  }
  
  // Step 2: Get bank lists
  const bankLists = await getBankLists(token);
  
  // Step 3: Test account resolution
  const resolution = await testAccountResolution(token);
  
  // Step 4: Test transfer with resolved bank code
  if (resolution?.bank_code) {
    await testTransferWithResolvedBankCode(token, resolution.bank_code);
  } else {
    // Test with NYRA OPAY bank code directly
    console.log('\n🧪 Testing transfer with NYRA OPAY bank code directly');
    await testTransferWithResolvedBankCode(token, '100004');
  }
  
  console.log('\n📋 ANALYSIS SUMMARY:');
  console.log('=' .repeat(60));
  
  if (bankLists?.nyraOpay) {
    console.log(`✅ OPAY found in NYRA list: ${bankLists.nyraOpay.bankName} (${bankLists.nyraOpay.bankCode})`);
  } else {
    console.log('❌ OPAY not found in NYRA list');
  }
  
  if (resolution?.status) {
    console.log(`✅ Account resolution successful: ${resolution.account_name} (${resolution.bank_code})`);
  } else {
    console.log('❌ Account resolution failed');
  }
  
  console.log('\n🎯 Analysis completed!');
  console.log('=' .repeat(60));
}

// Run the analysis
analyzeBankCodeSync().catch(console.error); 