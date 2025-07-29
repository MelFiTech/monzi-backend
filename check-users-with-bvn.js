const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let adminToken = '';

async function loginAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    });
    
    adminToken = response.data.access_token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkUsersWithBvn() {
  try {
    console.log('\n🔍 Checking users with BVN data...');
    
    const usersResponse = await axios.get(`${BASE_URL}/admin/users?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('📊 Total users found:', usersResponse.data.users.length);
    
    const usersWithBvn = usersResponse.data.users.filter(user => user.bvn);
    console.log('📊 Users with BVN:', usersWithBvn.length);
    
    if (usersWithBvn.length > 0) {
      console.log('👤 Users with BVN:');
      usersWithBvn.forEach(user => {
        console.log(`- ${user.email}: BVN=${user.bvn}, KYC Status=${user.kycStatus}`);
      });
      
      // Test KYC details for a user with BVN
      const testUser = usersWithBvn[0];
      console.log(`\n🔍 Testing KYC details for user with BVN: ${testUser.email}`);
      await testKycSubmissionDetails(testUser.id);
    } else {
      console.log('⚠️ No users with BVN found - users haven\'t completed BVN verification yet');
    }
    
    // Check for users with metadata
    const usersWithMetadata = usersResponse.data.users.filter(user => 
      user.metadata && Object.keys(user.metadata).length > 0
    );
    console.log('📊 Users with metadata:', usersWithMetadata.length);
    
    if (usersWithMetadata.length > 0) {
      console.log('👤 Users with metadata:');
      usersWithMetadata.forEach(user => {
        console.log(`- ${user.email}: Metadata keys=${Object.keys(user.metadata).join(', ')}`);
      });
    }
    
    // Check for users with bvnProviderResponse
    const usersWithProviderResponse = usersResponse.data.users.filter(user => 
      user.bvnProviderResponse
    );
    console.log('📊 Users with BVN provider response:', usersWithProviderResponse.length);
    
    if (usersWithProviderResponse.length > 0) {
      console.log('👤 Users with BVN provider response:');
      usersWithProviderResponse.forEach(user => {
        console.log(`- ${user.email}: Has provider response`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check users with BVN failed:', error.response?.data || error.message);
  }
}

async function testKycSubmissionDetails(userId) {
  try {
    console.log(`\n🔍 Testing KYC submission details for user: ${userId}`);
    const response = await axios.get(`${BASE_URL}/admin/kyc/submissions/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ KYC submission details response:');
    const submission = response.data.submission;
    console.log('User ID:', submission.userId);
    console.log('Email:', submission.email);
    console.log('Phone:', submission.phone);
    console.log('Full Name:', submission.fullName);
    console.log('KYC Status:', submission.kycStatus);
    console.log('Has Selfie:', submission.hasSelfie);
    console.log('Selfie URL:', submission.selfieUrl);
    console.log('Selfie Image URL:', response.data.selfieImageUrl);
    console.log('BVN:', submission.bvn);
    console.log('BVN Verified At:', submission.bvnVerifiedAt);
    
    // Check Identity Pass data
    console.log('\n🔐 Identity Pass Data:');
    console.log('BVN Provider Response:', response.data.bvnProviderResponse ? 'Available' : 'Not available');
    console.log('BVN Cloudinary URL:', response.data.bvnCloudinaryUrl || 'Not available');
    console.log('BVN Base64 Image:', response.data.bvnBase64Image ? 'Available' : 'Not available');
    console.log('BVN Full Data:', response.data.bvnFullData ? 'Available' : 'Not available');
    
    if (response.data.bvnProviderResponse) {
      console.log('Provider Used:', response.data.bvnProviderResponse.provider);
      console.log('Verification Status:', response.data.bvnProviderResponse.verification?.status);
    }
    
    if (response.data.bvnFullData) {
      console.log('BVN Data - First Name:', response.data.bvnFullData.firstName);
      console.log('BVN Data - Last Name:', response.data.bvnFullData.lastName);
      console.log('BVN Data - Gender:', response.data.bvnFullData.gender);
      console.log('BVN Data - Date of Birth:', response.data.bvnFullData.dateOfBirth);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ KYC submission details test failed:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting BVN Data Check...\n');
  
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without admin login');
    return;
  }
  
  await checkUsersWithBvn();
  
  console.log('\n✅ BVN Data Check completed!');
}

main().catch(console.error); 