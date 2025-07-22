require('dotenv').config();
const axios = require('axios');

async function setNyraWebhook() {
  try {
    console.log('🔧 Setting NYRA webhook URL...');
    
    // NYRA configuration
    const baseUrl = process.env.NYRA_BASE_URL || 'https://api.usemelon.co/api/v1';
    const clientId = process.env.NYRA_CLIENT_ID;
    const clientSecret = process.env.NYRA_CLIENT_SECRET;
    
    // New webhook URL
    const webhookUrl = 'https://655f12858ff3.ngrok-free.app/webhooks/nyra';
    
    if (!clientId || !clientSecret) {
      console.error('❌ NYRA_CLIENT_ID and NYRA_CLIENT_SECRET must be set in environment variables');
      console.log('Current values:');
      console.log('- NYRA_CLIENT_ID:', clientId ? '***' + clientId.slice(-4) : 'NOT SET');
      console.log('- NYRA_CLIENT_SECRET:', clientSecret ? '***' + clientSecret.slice(-4) : 'NOT SET');
      return;
    }

    console.log('📋 Configuration:');
    console.log('- Base URL:', baseUrl);
    console.log('- Webhook URL:', webhookUrl);

    // Try different authentication methods
    const authMethods = [
      {
        name: 'Method 1: x-client-id + Bearer',
        headers: {
          'x-client-id': clientId,
          'Authorization': `Bearer ${clientSecret}`,
          'Content-Type': 'application/json',
        }
      },
      {
        name: 'Method 2: x-client-id + x-client-secret',
        headers: {
          'x-client-id': clientId,
          'x-client-secret': clientSecret,
          'Content-Type': 'application/json',
        }
      },
      {
        name: 'Method 3: Authorization Basic',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        }
      }
    ];

    // Try different endpoint variations (without business ID)
    const endpoints = [
      `/webhooks`,
      `/webhook`,
      `/business/webhooks`,
      `/business/webhook`,
      `/api/webhooks`,
      `/api/webhook`
    ];

    for (const authMethod of authMethods) {
      console.log(`\n🔍 Trying ${authMethod.name}...`);
      
      for (const endpoint of endpoints) {
        console.log(`  📍 Testing endpoint: ${endpoint}`);
        
        try {
          // First try to get current webhook configuration
          const getResponse = await axios.get(`${baseUrl}${endpoint}`, {
            headers: authMethod.headers,
          });

          console.log(`  ✅ GET ${endpoint} successful:`, JSON.stringify(getResponse.data, null, 2));
          
          // If GET works, try POST
          console.log(`  🔧 Setting webhook URL via POST ${endpoint}...`);
          const setResponse = await axios.post(`${baseUrl}${endpoint}`, {
            url: webhookUrl
          }, {
            headers: authMethod.headers,
          });

          console.log(`  ✅ POST ${endpoint} successful:`, JSON.stringify(setResponse.data, null, 2));
          
          // If we get here, it worked!
          console.log('\n🎉 SUCCESS! Webhook URL set successfully!');
          
          // If this is a new configuration, save the secret key
          if (setResponse.data.data?.secret) {
            console.log('\n🔐 IMPORTANT: Save this webhook secret key (it will not be shown again):');
            console.log('Secret:', setResponse.data.data.secret);
            console.log('\n💡 Add this to your .env file as NYRA_WEBHOOK_SECRET');
          }
          
          return; // Exit successfully
          
        } catch (error) {
          if (error.response?.status === 404) {
            console.log(`  ℹ️ Endpoint ${endpoint} not found`);
          } else if (error.response?.status === 401) {
            console.log(`  🔒 Unauthorized for ${endpoint}`);
          } else if (error.response?.status === 403) {
            console.log(`  🚫 Forbidden for ${endpoint}`);
          } else {
            console.log(`  ❌ Error for ${endpoint}:`, error.response?.data?.message || error.message);
          }
        }
      }
    }

    console.log('\n❌ All authentication methods and endpoints failed');
    console.log('💡 Please check the NYRA API documentation for the correct webhook configuration endpoint');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

// Run the script
setNyraWebhook(); 