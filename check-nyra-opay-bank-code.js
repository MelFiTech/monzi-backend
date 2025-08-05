const fetch = require('node-fetch');

async function checkNyraOpayBankCode() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🔍 Checking NYRA OPAY Bank Code');
    console.log('=====================================');
    
    // Login as admin
    console.log('\n🔐 Logging in as admin...');
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

    if (!loginResponse.ok) {
      console.log('❌ Admin login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✅ Admin login successful');

    // Get NYRA bank list
    console.log('\n🏦 Getting NYRA bank list...');
    const bankListResponse = await fetch(`${baseUrl}/admin/test/bank-list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (bankListResponse.ok) {
      const bankListData = await bankListResponse.json();
      console.log('✅ NYRA bank list retrieved');
      console.log(`📊 Total banks: ${bankListData.bankCount}`);
      
      // Find OPAY in the list
      const opayBanks = bankListData.banks.filter(bank => 
        bank.bankName.toLowerCase().includes('opay')
      );
      
      console.log('\n🔍 OPAY banks found in NYRA:');
      opayBanks.forEach((bank, index) => {
        console.log(`${index + 1}. ${bank.bankName} (${bank.bankCode}) - Length: ${bank.bankCode.length}`);
      });
      
      if (opayBanks.length === 0) {
        console.log('❌ No OPAY banks found in NYRA list');
      } else {
        console.log('\n✅ Found OPAY banks with proper bank codes');
      }
    } else {
      console.log('❌ Failed to get bank list:', bankListResponse.status);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

checkNyraOpayBankCode(); 