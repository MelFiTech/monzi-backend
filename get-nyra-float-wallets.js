const axios = require('axios');
require('dotenv').config();

async function getNyraFloatWallets() {
  try {
    console.log('🔍 Fetching NYRA business float wallets...');
    
    const baseUrl = process.env.NYRA_BASE_URL || 'https://api.usemelon.co/api/v1';
    const clientId = process.env.NYRA_CLIENT_ID;
    const clientSecret = process.env.NYRA_CLIENT_SECRET;
    
    if (!baseUrl || !clientId || !clientSecret) {
      console.error('❌ Missing NYRA configuration in .env file');
      console.error('Required: NYRA_BASE_URL, NYRA_CLIENT_ID, NYRA_CLIENT_SECRET');
      return;
    }
    
    console.log('✅ Using NYRA configuration from .env');
    console.log(`🔗 Base URL: ${baseUrl}`);
    console.log(`🆔 Client ID: ${clientId}`);
    console.log(`🔐 Client Secret: ${clientSecret.substring(0, 10)}...`);
    
    const headers = {
      'x-client-id': clientId,
      'Authorization': `Bearer ${clientSecret}`,
      'Content-Type': 'application/json',
    };
    
    console.log('\n🏦 Fetching float wallets...');
    const response = await axios.get(`${baseUrl}/business/wallets/float`, {
      headers,
      timeout: 10000,
    });
    
    console.log('✅ Float wallets retrieved successfully');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data && response.data.data.length > 0) {
      console.log('\n🏦 Available Float Wallets:');
      response.data.data.forEach((wallet, index) => {
        console.log(`\n${index + 1}. Wallet Details:`);
        console.log(`   Wallet ID: ${wallet.wallet_id}`);
        console.log(`   Account Number: ${wallet.account_number}`);
        console.log(`   Bank Name: ${wallet.bank_name}`);
        console.log(`   Owner: ${wallet.owners_fullname}`);
        console.log(`   Frozen: ${wallet.frozen}`);
        console.log(`   Business ID: ${wallet.business_id}`);
        console.log(`   Is Float: ${wallet.isFloat}`);
        console.log(`   Created: ${wallet.created_at}`);
        console.log(`   Updated: ${wallet.updated_at}`);
      });
      
      // Suggest the first available account number
      const firstWallet = response.data.data[0];
      if (firstWallet.account_number) {
        console.log('\n💡 Suggested NYRA_SOURCE_ACCOUNT_NUMBER:');
        console.log(`NYRA_SOURCE_ACCOUNT_NUMBER=${firstWallet.account_number}`);
      } else if (firstWallet.wallet_id) {
        console.log('\n💡 No account number found, but we have a wallet ID:');
        console.log(`NYRA_SOURCE_ACCOUNT_NUMBER=${firstWallet.wallet_id}`);
      }
    } else {
      console.log('\n⚠️ No float wallets found');
    }
    
  } catch (error) {
    console.error('❌ Error fetching NYRA float wallets:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

getNyraFloatWallets(); 