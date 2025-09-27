const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// This script creates a test transfer that we can later reverse
async function createTestTransfer() {
  try {
    console.log('🔧 [SETUP] Creating test transfer for reversal testing...');
    
    // First, you'll need to authenticate and get a user token
    // This is a placeholder - you'll need to implement actual auth
    const authResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com', // Replace with actual test user
      password: 'password123'     // Replace with actual password
    });
    
    const token = authResponse.data.token;
    
    // Create a test transfer
    const transferData = {
      amount: 1000,
      accountNumber: '0987654321',
      bankName: 'Access Bank',
      accountName: 'Test Recipient',
      description: 'Test transfer for reversal',
      pin: '1234' // Test PIN
    };
    
    console.log('💸 [SETUP] Creating transfer...');
    const transferResponse = await axios.post(`${BASE_URL}/wallet/transfer`, transferData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ [SETUP] Transfer created successfully!');
    console.log('📄 [SETUP] Transfer details:', JSON.stringify(transferResponse.data, null, 2));
    
    // Store the reference for reversal testing
    const reference = transferResponse.data.reference;
    console.log(`🔑 [SETUP] Use this reference for reversal testing: ${reference}`);
    
    return reference;
    
  } catch (error) {
    console.error('❌ [SETUP] Error creating test transfer:', error.response?.data || error.message);
    return null;
  }
}

// Alternative: Create a mock transfer record directly in database
async function createMockTransferRecord() {
  console.log('🔧 [SETUP] Creating mock transfer record...');
  console.log('📝 [SETUP] You can manually create a transfer record with:');
  console.log(`
    Reference: TXN_ORIGINAL_TRANSFER_001
    Amount: 1000
    Fee: 25
    Type: WITHDRAWAL
    Status: COMPLETED
  `);
  console.log('💡 [SETUP] This will allow the reversal webhook to find the original transfer');
}

// Run setup
async function runSetup() {
  console.log('🚀 [SETUP] Setting up reversal test environment...');
  
  // Try to create a real transfer first
  const reference = await createTestTransfer();
  
  if (!reference) {
    console.log('⚠️ [SETUP] Could not create real transfer, using mock approach...');
    await createMockTransferRecord();
  }
  
  console.log('\n✅ [SETUP] Test environment ready!');
  console.log('🧪 [NEXT] Run: node test-reversal-scenarios.js');
}

runSetup();
