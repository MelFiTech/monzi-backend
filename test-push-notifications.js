const jwt = require('jsonwebtoken');
const axios = require('axios');

// Real user from the logs - ABDULLAHI MOHAMMAD
const realUserId = 'cmcxa2mf300021gyta5dk7ryx';
const realUserEmail = 'abdulldsgnr@gmail.com';
const jwtSecret = '9cl4nCRgv0dz3QAKtQe8NempfhWkY99154tpfDoy68k=';

// Generate JWT token for Abdullahi
const token = jwt.sign(
  {
    sub: realUserId,
    email: realUserEmail,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  },
  jwtSecret
);

console.log('🔐 Generated JWT Token for Abdullahi Mohammad:');
console.log('==================================================');
console.log(token);
console.log('==================================================');

async function testPushNotifications() {
  const baseUrl = 'http://localhost:3000';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('\n📱 Testing Push Notification Endpoints with BOTH Real Expo Tokens...\n');

  try {
    // Test 1: Check current push tokens
    console.log('1️⃣ Testing GET /push-notifications/tokens');
    const tokensResponse = await axios.get(`${baseUrl}/push-notifications/tokens`, { headers });
    console.log('✅ Response:', tokensResponse.data);
    console.log(`📊 Total tokens: ${tokensResponse.data.data.length}`);

    // Test 2: Ensure both real tokens are registered
    console.log('\n2️⃣ Ensuring both real tokens are registered');
    
    // Register first token if needed
    const registerResponse1 = await axios.post(`${baseUrl}/push-notifications/register`, {
      token: 'ExponentPushToken[XxNcEGCmJdsxaVzyYIBIpC]', // First real token
      deviceId: 'Abdullahi-iPhone-1',
      platform: 'ios'
    }, { headers });
    console.log('✅ Token 1 Response:', registerResponse1.data);

    // Register second token if needed
    const registerResponse2 = await axios.post(`${baseUrl}/push-notifications/register`, {
      token: 'ExponentPushToken[cK3Av-Nq8w32UZh99Y9mjU]', // Second real token
      deviceId: 'Abdullahi-iPhone-2',
      platform: 'ios'
    }, { headers });
    console.log('✅ Token 2 Response:', registerResponse2.data);

    // Test 3: Send test wallet funding notification
    console.log('\n3️⃣ Testing POST /push-notifications/test/wallet-funding');
    const walletNotificationResponse = await axios.post(`${baseUrl}/push-notifications/test/wallet-funding`, {}, { headers });
    console.log('✅ Response:', walletNotificationResponse.data);

    // Test 4: Send custom test notification
    console.log('\n4️⃣ Testing POST /push-notifications/send');
    const customNotificationResponse = await axios.post(`${baseUrl}/push-notifications/send`, {
      title: '📱💫 Multi-Device Test!',
      body: 'This notification should appear on BOTH of Abdullahi\'s iPhones! 🚀',
      data: { 
        type: 'multi_device_test', 
        timestamp: new Date().toISOString(),
        message: 'Testing multiple devices for the same user',
        devices: ['iPhone-1', 'iPhone-2']
      }
    }, { headers });
    console.log('✅ Response:', customNotificationResponse.data);

    // Test 5: Send transaction notification
    console.log('\n5️⃣ Testing POST /push-notifications/test/transaction');
    const transactionNotificationResponse = await axios.post(`${baseUrl}/push-notifications/test/transaction?type=TRANSFER&amount=500&status=COMPLETED`, {}, { headers });
    console.log('✅ Response:', transactionNotificationResponse.data);

    // Test 6: Check final token status
    console.log('\n6️⃣ Final token check');
    const tokensResponse2 = await axios.get(`${baseUrl}/push-notifications/tokens`, { headers });
    console.log('✅ Final tokens:', tokensResponse2.data);

    console.log('\n🎯 Multi-device testing completed! Check BOTH iPhones for notifications.');
    console.log('📱 Abdullahi should receive notifications on both devices!');

  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

// Start testing
testPushNotifications(); 