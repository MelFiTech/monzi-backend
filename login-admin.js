const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function loginAdmin() {
  console.log('🔐 Logging in as admin...\n');

  try {
    // Login with admin credentials
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    });

    console.log('✅ Login successful!');
    console.log('📋 Full Login Response:', loginResponse.data);
    
    // Check for token in different possible fields
    const token = loginResponse.data.token || loginResponse.data.access_token || loginResponse.data.jwt;
    
    if (token) {
      console.log('\n🔑 Admin Token:');
      console.log(token);
      
      // Test the token with a simple admin endpoint
      console.log('\n🧪 Testing token with admin endpoint...');
      const testResponse = await axios.get(`${BASE_URL}/admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Token test successful:', {
        success: testResponse.data.success,
        stats: testResponse.data.stats
      });

      return loginResponse.data.token;
    }

  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

// Run the login
loginAdmin(); 