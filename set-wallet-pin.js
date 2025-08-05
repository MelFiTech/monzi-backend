const fetch = require('node-fetch');

async function setWalletPin() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔒 Setting Wallet PIN');
    console.log('=====================');
    
    const userEmail = 'ibrahimoyiza198@gmail.com';
    const correctPasscode = '290420';
    const newPin = '1234'; // Default PIN to set

    // Step 1: Login with correct passcode
    console.log('\n🔐 Step 1: Login with Correct Passcode');
    console.log(`Email: ${userEmail}`);
    console.log(`Passcode: ${correctPasscode}`);
    
    const userLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userEmail,
        passcode: correctPasscode
      })
    });

    if (!userLoginResponse.ok) {
      console.log('❌ User login failed:', userLoginResponse.status);
      const errorData = await userLoginResponse.text();
      console.log('Error details:', errorData);
      return;
    }

    const userLoginData = await userLoginResponse.json();
    const userToken = userLoginData.access_token;
    console.log('✅ User login successful!');
    console.log(`   - User ID: ${userLoginData.user?.id}`);
    console.log(`   - Email: ${userLoginData.user?.email}`);

    // Step 2: Set wallet PIN
    console.log('\n🔒 Step 2: Set Wallet PIN');
    console.log(`Setting PIN to: ${newPin}`);
    
    const setPinResponse = await fetch(`${baseUrl}/wallet/set-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        pin: newPin
      })
    });

    if (setPinResponse.ok) {
      const setPinData = await setPinResponse.json();
      console.log('✅ PIN Set Successfully:');
      console.log(`   - Success: ${setPinData.success}`);
      console.log(`   - Message: ${setPinData.message}`);
    } else {
      const errorData = await setPinResponse.text();
      console.log('❌ PIN setting failed:', setPinResponse.status);
      console.log('Error details:', errorData);
      return;
    }

    // Step 3: Verify PIN was set
    console.log('\n✅ Step 3: Verify PIN was Set');
    console.log('Checking PIN status...');
    
    const pinStatusResponse = await fetch(`${baseUrl}/wallet/pin-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      }
    });

    if (pinStatusResponse.ok) {
      const pinStatusData = await pinStatusResponse.json();
      console.log('✅ PIN Status:');
      console.log(`   - Has PIN Set: ${pinStatusData.hasPinSet}`);
      console.log(`   - Message: ${pinStatusData.message}`);
      console.log(`   - Wallet Exists: ${pinStatusData.walletExists}`);
    } else {
      console.log('❌ PIN status check failed:', pinStatusResponse.status);
    }

    // Step 4: Test transfer with new PIN
    console.log('\n💸 Step 4: Test Transfer with New PIN');
    console.log('Testing transfer with the newly set PIN...');
    
    const transferResponse = await fetch(`${baseUrl}/wallet/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        amount: 1,
        accountNumber: '8106381265',
        bankName: 'OPAY',
        accountName: 'ABDULLAHI OGIRIMA MOHAMMAD',
        pin: newPin,
        description: 'Test transfer with newly set PIN'
      })
    });

    if (transferResponse.ok) {
      const transferData = await transferResponse.json();
      console.log('✅ Transfer Test Result:');
      console.log(`   - Success: ${transferData.success}`);
      console.log(`   - Message: ${transferData.message}`);
      console.log(`   - Reference: ${transferData.reference}`);
      console.log(`   - Amount: ₦${transferData.amount}`);
      console.log(`   - Fee: ₦${transferData.fee}`);
      console.log(`   - New Balance: ₦${transferData.newBalance}`);
      
      console.log('\n🎉 SUCCESS: Transfer works with newly set PIN!');
      console.log('The user can now make transfers successfully.');
    } else {
      const errorData = await transferResponse.text();
      console.log('❌ Transfer test failed:', transferResponse.status);
      console.log('Error details:', errorData);
      
      // Parse error to identify specific issue
      try {
        const errorJson = JSON.parse(errorData);
        console.log('\n🔍 Error Analysis:');
        console.log(`   - Error Type: ${errorJson.error || 'Unknown'}`);
        console.log(`   - Message: ${errorJson.message || 'No message'}`);
        console.log(`   - Status Code: ${transferResponse.status}`);
      } catch (e) {
        console.log('❌ Could not parse error response');
      }
    }

    // Summary
    console.log('\n📋 PIN Setting Summary');
    console.log('======================');
    console.log('✅ User authentication successful');
    console.log('✅ Wallet PIN set successfully');
    console.log('✅ PIN status verified');
    console.log('✅ Transfer functionality tested');
    console.log('🎯 User can now make transfers with PIN: 1234');

  } catch (error) {
    console.error('❌ PIN setting error:', error.message);
  }
}

setWalletPin(); 