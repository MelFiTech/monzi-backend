const axios = require('axios');

async function getAuthToken() {
  try {
    console.log('🔐 Getting auth token for testing...');
    
    const loginData = {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    };

    console.log('📤 Sending login request...');
    
    const response = await axios.post('http://localhost:3000/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login successful!');
    console.log('🔑 Access token:', response.data.access_token);
    
    return response.data.access_token;
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return null;
  }
}

// Export for use in other scripts
module.exports = { getAuthToken };

// Run if called directly
if (require.main === module) {
  getAuthToken();
} 