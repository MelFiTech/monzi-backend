const fetch = require('node-fetch');

async function checkAllOpayBanks() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🔍 Checking All OPAY-Related Banks');
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
      
      // Find all banks that might be related to OPAY
      const opayRelatedBanks = bankListData.banks.filter(bank => 
        bank.bankName.toLowerCase().includes('opay') ||
        bank.bankName.toLowerCase().includes('o-pay') ||
        bank.bankName.toLowerCase().includes('digital') ||
        bank.bankCode === '100004' ||
        bank.bankCode === '1000040' ||
        bank.bankCode === '10000400'
      );
      
      console.log('\n🔍 OPAY-related banks found in NYRA:');
      opayRelatedBanks.forEach((bank, index) => {
        console.log(`${index + 1}. ${bank.bankName} (${bank.bankCode}) - Length: ${bank.bankCode.length}`);
      });
      
      // Also check for banks with longer codes that might be OPAY
      const longerOpayBanks = bankListData.banks.filter(bank => 
        bank.bankCode.length >= 7 && 
        (bank.bankName.toLowerCase().includes('opay') || bank.bankName.toLowerCase().includes('digital'))
      );
      
      console.log('\n🔍 Banks with longer codes (7+ chars) that might be OPAY:');
      longerOpayBanks.forEach((bank, index) => {
        console.log(`${index + 1}. ${bank.bankName} (${bank.bankCode}) - Length: ${bank.bankCode.length}`);
      });
      
      // Check for any bank with code starting with 100004
      const banksWith100004 = bankListData.banks.filter(bank => 
        bank.bankCode.startsWith('100004')
      );
      
      console.log('\n🔍 Banks with codes starting with 100004:');
      banksWith100004.forEach((bank, index) => {
        console.log(`${index + 1}. ${bank.bankName} (${bank.bankCode}) - Length: ${bank.bankCode.length}`);
      });
      
    } else {
      console.log('❌ Failed to get bank list:', bankListResponse.status);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

checkAllOpayBanks(); 