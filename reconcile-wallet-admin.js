const axios = require('axios');

// Configuration
const BACKEND_URL = 'https://7fb1e0a8e412.ngrok-free.app';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWQwNHBocjYwMDBqMWdtbHYwYjN6YnUzIiwiZW1haWwiOiJ0YWxrdG9tZWxmaUBnbWFpbC5jb20iLCJyb2xlIjoiU1VET19BRE1JTiIsImlhdCI6MTc1Mjk5ODkxMywiZXhwIjoxNzUzNjAzNzEzfQ.7aTGxeVkEH6dJFKhZnV4ocSHoap7fjaHkrNc80apR74';

class WalletReconciliationTester {
  constructor() {
    this.baseUrl = BACKEND_URL;
    this.headers = {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async validateWallet(walletId) {
    console.log('🔍 Validating wallet balance...');
    console.log('🆔 Wallet ID:', walletId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/admin/validate-wallet/${walletId}`, {
        headers: this.headers,
      });

      console.log('✅ Validation Response:');
      console.log(JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      console.log('❌ Validation Error:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
      return null;
    }
  }

  async reconcileWallet(walletId) {
    console.log('\n🔧 Reconciling wallet balance...');
    console.log('🆔 Wallet ID:', walletId);
    
    try {
      const response = await axios.post(`${this.baseUrl}/admin/reconcile-wallet/${walletId}`, {}, {
        headers: this.headers,
      });

      console.log('✅ Reconciliation Response:');
      console.log(JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      console.log('❌ Reconciliation Error:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
      return null;
    }
  }

  async runTests() {
    console.log('🚀 Starting Wallet Reconciliation Tests...');
    console.log('📍 Backend URL:', this.baseUrl);
    console.log('='.repeat(60));

    const walletId = 'cmd0c7585000p1gml2cvog60r'; // talktomelfi@gmail.com wallet ID

    // Step 1: Validate wallet
    await this.validateWallet(walletId);
    
    // Step 2: Reconcile wallet
    await this.reconcileWallet(walletId);

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Wallet Reconciliation Tests Completed!');
  }
}

// Run the tests
const tester = new WalletReconciliationTester();
tester.runTests().catch(console.error); 