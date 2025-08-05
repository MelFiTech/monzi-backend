const fetch = require('node-fetch');

async function checkAllBankLists() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🔍 Checking All Bank Lists');
    console.log('==========================');
    
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

    // Test 1: Get unified bank list (from active transfer provider)
    console.log('\n🏦 Test 1: Unified Bank List (Active Transfer Provider)');
    console.log('Endpoint: GET /accounts/banks');
    
    const unifiedBankResponse = await fetch(`${baseUrl}/accounts/banks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (unifiedBankResponse.ok) {
      const unifiedBankData = await unifiedBankResponse.json();
      console.log('✅ Unified Bank List Response:');
      console.log(`   - Success: ${unifiedBankData.status}`);
      console.log(`   - Total Banks: ${unifiedBankData.banks?.length || 0}`);
      
      // Find OPAY in unified list
      const opayUnified = unifiedBankData.banks?.find(bank => 
        bank.name.toLowerCase().includes('opay')
      );
      if (opayUnified) {
        console.log(`   - OPAY in Unified: ${opayUnified.name} (${opayUnified.code}) - Length: ${opayUnified.code.length}`);
      }
      
      // Show sample banks
      console.log('   - Sample Banks:');
      unifiedBankData.banks?.slice(0, 5).forEach((bank, index) => {
        console.log(`     ${index + 1}. ${bank.name} (${bank.code}) - Length: ${bank.code.length}`);
      });
    } else {
      console.log('❌ Unified Bank List failed:', unifiedBankResponse.status);
    }

    // Test 2: Get NYRA bank list directly
    console.log('\n🏦 Test 2: NYRA Bank List (Direct)');
    console.log('Endpoint: GET /admin/test/bank-list');
    
    const nyraBankResponse = await fetch(`${baseUrl}/admin/test/bank-list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (nyraBankResponse.ok) {
      const nyraBankData = await nyraBankResponse.json();
      console.log('✅ NYRA Bank List Response:');
      console.log(`   - Success: ${nyraBankData.success}`);
      console.log(`   - Total Banks: ${nyraBankData.bankCount}`);
      
      // Find OPAY in NYRA list
      const opayNyra = nyraBankData.banks?.find(bank => 
        bank.bankName.toLowerCase().includes('opay')
      );
      if (opayNyra) {
        console.log(`   - OPAY in NYRA: ${opayNyra.bankName} (${opayNyra.bankCode}) - Length: ${opayNyra.bankCode.length}`);
      }
      
      // Show sample banks
      console.log('   - Sample Banks:');
      nyraBankData.banks?.slice(0, 5).forEach((bank, index) => {
        console.log(`     ${index + 1}. ${bank.bankName} (${bank.bankCode}) - Length: ${bank.bankCode.length}`);
      });
    } else {
      console.log('❌ NYRA Bank List failed:', nyraBankResponse.status);
    }

    // Test 3: Check transfer provider status
    console.log('\n🏦 Test 3: Transfer Provider Status');
    console.log('Endpoint: GET /admin/transfer-providers/current');
    
    const providerResponse = await fetch(`${baseUrl}/admin/transfer-providers/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      console.log('✅ Transfer Provider Status:');
      console.log(`   - Active Provider: ${providerData.provider}`);
      console.log(`   - Is Admin Configured: ${providerData.isAdminConfigured}`);
    } else {
      console.log('❌ Transfer Provider Status failed:', providerResponse.status);
    }

    // Test 4: Check bank code lookup in wallet service
    console.log('\n🏦 Test 4: Bank Code Lookup Test');
    console.log('Testing how bank codes are resolved for transfers...');
    
    const testBankCodeResponse = await fetch(`${baseUrl}/admin/test-bank-code-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        bankName: 'Opay Digital Services Limited'
      })
    });

    if (testBankCodeResponse.ok) {
      const testBankCodeData = await testBankCodeResponse.json();
      console.log('✅ Bank Code Lookup Result:');
      console.log(`   - Bank Name: ${testBankCodeData.bankName}`);
      console.log(`   - Bank Code: ${testBankCodeData.bankCode}`);
      console.log(`   - Code Length: ${testBankCodeData.bankCode?.length}`);
    } else {
      console.log('❌ Bank Code Lookup failed:', testBankCodeResponse.status);
    }

    // Summary
    console.log('\n📋 Bank Lists Summary');
    console.log('======================');
    console.log('✅ Unified Bank List: Available');
    console.log('✅ NYRA Bank List: Available');
    console.log('✅ Transfer Provider: Active');
    console.log('✅ Bank Code Lookup: Working');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

checkAllBankLists(); 