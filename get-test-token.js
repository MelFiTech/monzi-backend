const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function getTestToken() {
  try {
    console.log('🔐 Getting test JWT token...\n');

    // Login with provided credentials
    const loginCredentials = {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    };

    // Try to login
    console.log('1️⃣ Attempting to login with talktomelfi@gmail.com...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginCredentials);

    if (loginResponse.data.access_token) {
      console.log('✅ Login successful!');
      console.log('🔑 Access Token:', loginResponse.data.access_token);
      console.log('\n📋 Copy this token and update the TEST_TOKEN in test-nyra-bill-payment.js');
      return loginResponse.data.access_token;
    } else {
      console.log('❌ No access token in response:', loginResponse.data);
    }

  } catch (error) {
    console.error('❌ Error getting token:', error.response?.data || error.message);
  }
}

getTestToken().catch(console.error);
