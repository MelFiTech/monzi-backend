const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
  email: 'talktomelfi@gmail.com',
  passcode: '199699'
};

let adminToken = null;

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function checkKudaBanks() {
  console.log('🔍 Checking for Kuda banks in SMEPlug...\n');
  
  // Authenticate
  const authResponse = await makeRequest('POST', '/auth/login', ADMIN_CREDENTIALS);
  if (!authResponse.success) {
    console.log('❌ Authentication failed');
    return;
  }
  adminToken = authResponse.data.access_token;
  
  // Get bank list
  const bankResponse = await makeRequest('GET', '/admin/test/bank-list', null, {
    'Authorization': `Bearer ${adminToken}`
  });
  
  if (!bankResponse.success) {
    console.log('❌ Failed to get bank list');
    return;
  }
  
  const banks = bankResponse.data.banks;
  console.log(`📊 Total banks available: ${banks.length}\n`);
  
  // Find all Kuda-related banks
  const kudaBanks = banks.filter(bank => 
    bank.bankName.toLowerCase().includes('kuda') ||
    bank.bankCode === '50211' ||
    bank.bankCode === '090267'
  );
  
  console.log(`🏦 Found ${kudaBanks.length} Kuda-related banks:\n`);
  
  kudaBanks.forEach((bank, index) => {
    console.log(`${index + 1}. ${bank.bankName} (Code: ${bank.bankCode})`);
  });
  
  // Also check for any banks with "50211" code (common Kuda code)
  const bank50211 = banks.find(bank => bank.bankCode === '50211');
  if (bank50211) {
    console.log(`\n🏦 Bank with code 50211: ${bank50211.bankName} (${bank50211.bankCode})`);
  }
  
  // Check for any banks with "090267" code
  const bank090267 = banks.find(bank => bank.bankCode === '090267');
  if (bank090267) {
    console.log(`🏦 Bank with code 090267: ${bank090267.bankName} (${bank090267.bankCode})`);
  }
  
  // Show first 20 banks for reference
  console.log('\n📋 First 20 banks in the list:');
  banks.slice(0, 20).forEach((bank, index) => {
    console.log(`${index + 1}. ${bank.bankName} (${bank.bankCode})`);
  });
}

checkKudaBanks(); 