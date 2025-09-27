const axios = require('axios');

const BASE_URL = 'https://monzi-backend.onrender.com';
const LOGIN_CREDENTIALS = {
  email: 'talktomelfi@gmail.com',
  passcode: '199699'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 [PROD] Attempting to login...');
    
    const response = await axios.post(`${BASE_URL}/auth/login`, LOGIN_CREDENTIALS);
    
    if (response.data.access_token) {
      authToken = response.data.access_token;
      console.log('✅ [PROD] Login successful!');
      console.log('👤 User:', response.data.user?.email || 'Unknown');
      console.log('🔑 Token received');
      return true;
    } else {
      console.log('❌ [PROD] Login failed - no token received');
      return false;
    }
  } catch (error) {
    console.error('❌ [PROD] Login error:', error.response?.data || error.message);
    return false;
  }
}

async function fetchAllTransactions() {
  if (!authToken) {
    console.log('❌ [PROD] No auth token available');
    return null;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('📊 [PROD] Fetching all transactions...');
    
    // Fetch transactions with pagination to get all
    const response = await axios.get(`${BASE_URL}/admin/transactions?limit=10000&offset=0`, { headers });
    
    if (response.data.success) {
      console.log('✅ [PROD] Transactions fetched successfully');
      console.log('📊 [PROD] Total transactions in response:', response.data.total);
      console.log('📊 [PROD] Transactions array length:', response.data.transactions?.length || 0);
      return response.data.transactions || [];
    } else {
      console.log('❌ [PROD] Failed to fetch transactions:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ [PROD] Error fetching transactions:', error.response?.data || error.message);
    return null;
  }
}

async function fetchTotalWalletBalance() {
  if (!authToken) {
    console.log('❌ [PROD] No auth token available');
    return null;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('💰 [PROD] Fetching total wallet balance...');
    
    const response = await axios.get(`${BASE_URL}/admin/wallet/total-balance`, { headers });
    
    if (response.data.success) {
      console.log('✅ [PROD] Total wallet balance fetched successfully');
      return response.data;
    } else {
      console.log('❌ [PROD] Failed to fetch wallet balance:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ [PROD] Error fetching wallet balance:', error.response?.data || error.message);
    return null;
  }
}

async function analyzeData() {
  console.log('🚀 [PROD] Starting Production Data Analysis...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ [PROD] Cannot proceed without authentication');
    return;
  }

  // Step 2: Fetch transactions
  const transactions = await fetchAllTransactions();
  
  // Step 3: Fetch wallet balance
  const walletBalance = await fetchTotalWalletBalance();

  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCTION DATA ANALYSIS RESULTS');
  console.log('='.repeat(80));

  if (transactions && transactions.length > 0) {
    console.log('\n💳 TRANSACTIONS SUMMARY:');
    console.log(`📈 Total Transactions: ${transactions.length}`);
    
    // Calculate totals
    const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalFees = transactions.reduce((sum, tx) => sum + (tx.fee || 0), 0);
    
    console.log(`💰 Total Transaction Amount: ₦${totalAmount.toLocaleString()}`);
    console.log(`💸 Total Fees: ₦${totalFees.toLocaleString()}`);
    console.log(`📊 Net Amount: ₦${(totalAmount - totalFees).toLocaleString()}`);
    
    // Status breakdown
    const statusCount = transactions.reduce((acc, tx) => {
      const status = tx.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📋 Transaction Status Breakdown:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Type breakdown
    const typeCount = transactions.reduce((acc, tx) => {
      const type = tx.type || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n🏷️  Transaction Type Breakdown:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  } else {
    console.log('\n❌ [PROD] No transactions data available');
  }

  if (walletBalance) {
    console.log('\n💰 WALLET BALANCE SUMMARY:');
    console.log(`🏦 Total User Wallet Balance: ₦${walletBalance.totalBalance?.toLocaleString() || 'N/A'}`);
    console.log(`👥 Total Active Wallets: ${walletBalance.totalWallets || 'N/A'}`);
    console.log(`📊 Average Balance per Wallet: ₦${walletBalance.averageBalance?.toLocaleString() || 'N/A'}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analysis Complete!');
  console.log('='.repeat(80));
}

// Run the analysis
analyzeData().catch(console.error);
