const fetch = require('node-fetch');

async function debugBulkPinError() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🔍 Debugging Bulk PIN Status 400 Error');
    console.log('======================================');
    
    // Login as admin
    console.log('\n🔐 Logging in as admin...');
    const adminLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'talktomelfi@gmail.com',
        passcode: '199699'
      })
    });

    if (!adminLoginResponse.ok) {
      console.log('❌ Admin login failed:', adminLoginResponse.status);
      return;
    }

    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.access_token;
    console.log('✅ Admin login successful');

    // Test different variations of the bulk endpoint
    console.log('\n🔍 Testing Different Endpoint Variations');
    console.log('=========================================');
    
    const endpoints = [
      '/admin/users/pin-status/bulk',
      '/admin/users/pin-status/bulk?limit=10',
      '/admin/users/pin-status/bulk?limit=5&offset=0',
      '/admin/users/pin-status/bulk?limit=1',
    ];

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      console.log(`\n🔍 Testing endpoint ${i + 1}: ${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success: ${data.total} users`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText}`);
      }
    }

    // Test with different query parameter formats
    console.log('\n🔍 Testing Query Parameter Formats');
    console.log('===================================');
    
    const queryTests = [
      '?limit=10',
      '?limit=10&offset=0',
      '?offset=0&limit=10',
      '?limit=',
      '?limit=abc',
    ];

    for (let i = 0; i < queryTests.length; i++) {
      const query = queryTests[i];
      console.log(`\n🔍 Testing query ${i + 1}: ${query}`);
      
      const response = await fetch(`${baseUrl}/admin/users/pin-status/bulk${query}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });

      console.log(`   Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugBulkPinError(); 