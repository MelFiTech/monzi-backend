const axios = require('axios');
require('dotenv').config();

async function getNyraBusinesses() {
  try {
    console.log('🔍 Fetching NYRA businesses...');
    
    const baseUrl = 'https://api.usemelon.co/api/v1';
    const jwtToken = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVU0VSLTAxSjgwMkhKOVRFWlc5NERNOEJWQzVFNlo5IiwiZW1haWwiOiJnb29kbmVzc29iYWplQGdtYWlsLmNvbSIsIm5vbmNlIjoiMDFLMTVFWFlKTUFRMUQxSzIzSzZGMERRN1EiLCJ1c2VyIjp7ImNyZWF0ZWRfYXQiOiIyMDI0LTA5LTE3VDEzOjI1OjI1Ljk1MVoiLCJ1cGRhdGVkX2F0IjoiMjAyNS0wNi0yOVQwNTowMjoyNi4yMTRaIiwiX3YiOjQsInVzZXJfaWQiOiJVU0VSLTAxSjgwMkhKOVRFWlc5NERNOEJWQzVFNlo5IiwiZW1haWwiOiJnb29kbmVzc29iYWplQGdtYWlsLmNvbSIsInBob25lX251bWJlciI6IjA3MDU5OTU3MTMxIiwidXNlcm5hbWUiOiJlbnlvIiwiZmlyc3RuYW1lIjoiZ29vZG5lc3MiLCJtaWRkbGVuYW1lIjoiZW55by1vam8iLCJsYXN0bmFtZSI6Im9iYWplIiwiY29ubmVjdGlvbl90eXBlIjoxLCJyb2xlIjoiU1VETyIsImFjdGl2ZV9zdGF0dXMiOiJBQ1RJVkUiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOnRydWUsImxhc3RfbG9naW4iOm51bGwsImFjY291bnRfdGllciI6MX0sImlhdCI6MTc1MzYwMzgzMiwiZXhwIjoxNzUzOTYzODMyLCJpc3MiOiJueXJhIn0.eUAhoMhtXEu5FU3LdCrKx_g_xNyILYWoFWTDb9F6GDpI3CIhYdiG8mqOTfaPuOjUBzQWr7cRxW0LWaxyR98XtA';
    
    console.log('✅ Using provided JWT token');

    // Fetch businesses using JWT token
    console.log('🏢 Fetching businesses...');
    const businessesResponse = await axios.get(`${baseUrl}/business/all`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ NYRA businesses retrieved successfully');
    
    // Extract business account numbers
    if (businessesResponse.data.success && businessesResponse.data.data) {
      console.log('\n🏢 Business Account Numbers:');
      businessesResponse.data.data.forEach((business, index) => {
        console.log(`${index + 1}. Business ID: ${business.id}`);
        console.log(`   Business Name: ${business.name || 'N/A'}`);
        console.log(`   Status: ${business.verification_status || 'N/A'}`);
        console.log('');
      });
      
      // Get parent wallet details for the first business
      if (businessesResponse.data.data.length > 0) {
        const firstBusiness = businessesResponse.data.data[0];
        console.log(`🔍 Getting parent wallet for business: ${firstBusiness.id}`);
        
        try {
          const walletResponse = await axios.get(`${baseUrl}/business/${firstBusiness.id}/wallet`, {
            headers: {
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          });
          
          console.log('✅ Parent wallet retrieved successfully');
          
          if (walletResponse.data.success && walletResponse.data.data) {
            const walletData = walletResponse.data.data;
            console.log('\n🏦 Parent Wallet Details:');
            console.log(`   Wallet ID: ${walletData.wallet_id || 'N/A'}`);
            console.log(`   Account Number: ${walletData.account_number || 'N/A'}`);
            console.log(`   Balance: ${walletData.balance || 'N/A'}`);
            console.log(`   Frozen: ${walletData.frozen || 'N/A'}`);
            console.log(`   Created: ${walletData.created_at || 'N/A'}`);
            
            if (walletData.account_number) {
              console.log('\n💡 Found account number!');
              console.log('💡 Suggested NYRA_SOURCE_ACCOUNT_NUMBER:');
              console.log(`NYRA_SOURCE_ACCOUNT_NUMBER=${walletData.account_number}`);
            } else if (walletData.wallet_id) {
              console.log('\n💡 No account number found, but we have a wallet ID');
              console.log('💡 You can try using the wallet ID as the source account number:');
              console.log(`NYRA_SOURCE_ACCOUNT_NUMBER=${walletData.wallet_id}`);
              console.log('\n⚠️ Note: This is experimental - NYRA might require a proper account number');
            } else {
              console.log('\n⚠️ No account number or wallet ID found');
            }
            
            // Try to check if there's a wallet activation endpoint
            console.log('\n🔍 Checking for wallet activation endpoints...');
            const activationEndpoints = [
              `/wallet/${walletData.wallet_id}/activate`,
              `/business/${firstBusiness.id}/wallet/activate`,
              `/wallet/activate`,
            ];
            
            for (const endpoint of activationEndpoints) {
              try {
                console.log(`🔍 Trying activation endpoint: ${endpoint}`);
                const response = await axios.get(`${baseUrl}${endpoint}`, {
                  headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json',
                  },
                  timeout: 5000,
                });
                
                console.log(`✅ Success for ${endpoint}:`);
                console.log(JSON.stringify(response.data, null, 2));
              } catch (error) {
                console.log(`❌ Failed for ${endpoint}: ${error.response?.status || error.message}`);
              }
            }
          }
        } catch (walletError) {
          console.error('❌ Error fetching parent wallet:');
          if (walletError.response) {
            console.error('Status:', walletError.response.status);
            console.error('Data:', JSON.stringify(walletError.response.data, null, 2));
          } else {
            console.error('Error:', walletError.message);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error fetching NYRA businesses:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the script
getNyraBusinesses(); 