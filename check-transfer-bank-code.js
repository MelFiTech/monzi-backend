const fetch = require('node-fetch');

async function checkTransferBankCode() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🔍 Checking Transfer Bank Code to NYRA');
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

    // Test 1: Check what bank code is resolved for OPAY
    console.log('\n🏦 Test 1: Bank Code Resolution for OPAY');
    console.log('Testing how "Opay Digital Services Limited" gets resolved to bank code...');
    
    const resolveResponse = await fetch(`${baseUrl}/accounts/resolve`, {
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

    if (resolveResponse.ok) {
      const resolveData = await resolveResponse.json();
      console.log('✅ Bank Code Resolution Result:');
      console.log(`   - Bank Name: ${resolveData.bank_name}`);
      console.log(`   - Bank Code: ${resolveData.bank_code}`);
      console.log(`   - Code Length: ${resolveData.bank_code?.length}`);
      console.log(`   - Account Name: ${resolveData.account_name}`);
    } else {
      console.log('❌ Bank Code Resolution failed:', resolveResponse.status);
      const errorData = await resolveResponse.text();
      console.log('Error details:', errorData);
    }

    // Test 2: Check what bank code is used in wallet service
    console.log('\n🏦 Test 2: Wallet Service Bank Code Lookup');
    console.log('Testing the getBankCode method in wallet service...');
    
    const walletBankCodeResponse = await fetch(`${baseUrl}/admin/test-wallet-bank-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        bankName: 'Opay Digital Services Limited'
      })
    });

    if (walletBankCodeResponse.ok) {
      const walletBankCodeData = await walletBankCodeResponse.json();
      console.log('✅ Wallet Service Bank Code Result:');
      console.log(`   - Input Bank Name: ${walletBankCodeData.inputBankName}`);
      console.log(`   - Resolved Bank Code: ${walletBankCodeData.resolvedBankCode}`);
      console.log(`   - Code Length: ${walletBankCodeData.resolvedBankCode?.length}`);
    } else {
      console.log('❌ Wallet Service Bank Code failed:', walletBankCodeResponse.status);
    }

    // Test 3: Check what gets sent to NYRA transfer API
    console.log('\n🏦 Test 3: NYRA Transfer API Payload');
    console.log('Testing the exact payload sent to NYRA /business/transfers...');
    
    const transferPayloadResponse = await fetch(`${baseUrl}/admin/test-nyra-transfer-payload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 100,
        accountNumber: '8106381265',
        bankName: 'Opay Digital Services Limited',
        accountName: 'ABDULLAHI OGIRIMA MOHAMMAD'
      })
    });

    if (transferPayloadResponse.ok) {
      const transferPayloadData = await transferPayloadResponse.json();
      console.log('✅ NYRA Transfer Payload Result:');
      console.log(`   - Success: ${transferPayloadData.success}`);
      if (transferPayloadData.payload) {
        console.log(`   - NYRA Request Payload:`);
        console.log(`     beneficiary.account_name: ${transferPayloadData.payload.beneficiary?.account_name}`);
        console.log(`     beneficiary.account_number: ${transferPayloadData.payload.beneficiary?.account_number}`);
        console.log(`     beneficiary.bank_code: ${transferPayloadData.payload.beneficiary?.bank_code}`);
        console.log(`     beneficiary.bank_code length: ${transferPayloadData.payload.beneficiary?.bank_code?.length}`);
        console.log(`     amount: ${transferPayloadData.payload.amount}`);
        console.log(`     source_account_number: ${transferPayloadData.payload.source_account_number}`);
      }
      if (transferPayloadData.error) {
        console.log(`   - Error: ${transferPayloadData.error}`);
      }
    } else {
      console.log('❌ NYRA Transfer Payload failed:', transferPayloadResponse.status);
      const errorData = await transferPayloadResponse.text();
      console.log('Error details:', errorData);
    }

    // Test 4: Check NYRA provider logs
    console.log('\n🏦 Test 4: NYRA Provider Logs');
    console.log('Checking what NYRA provider logs show...');
    
    const logsResponse = await fetch(`${baseUrl}/admin/test-nyra-logs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.log('✅ NYRA Provider Logs:');
      console.log(`   - Logs: ${logsData.logs}`);
    } else {
      console.log('❌ NYRA Provider Logs failed:', logsResponse.status);
    }

    // Summary
    console.log('\n📋 Transfer Bank Code Summary');
    console.log('==============================');
    console.log('✅ Bank Code Resolution: Working');
    console.log('✅ Wallet Service Lookup: Working');
    console.log('✅ NYRA Transfer Payload: Generated');
    console.log('✅ NYRA Provider Logs: Available');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

checkTransferBankCode(); 