const axios = require('axios');

async function approveUserBVN() {
  try {
    // Admin credentials
    const loginData = {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    };

    // Get admin token
    const authResponse = await axios.post('https://monzi-backend.onrender.com/auth/login', loginData, {
      headers: { 'Content-Type': 'application/json' }
    });
    const adminToken = authResponse.data.access_token;
    console.log('✅ Admin token obtained');

    // User info
    const userId = 'cmd3c7ns80000kz3r4akpid32'; // muhammadbukarakai@gmail.com

    // Approve KYC (should set BVN verified and isVerified)
    const approvalData = {
      userId: userId,
      action: 'APPROVE',
      reason: 'BVN manually verified by admin'
    };
    const response = await axios.post('https://monzi-backend.onrender.com/admin/kyc/approve', approvalData, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('🎉 KYC approval response:', response.data);

    // Optionally, fetch user profile to confirm
    const userProfile = await axios.get(`https://monzi-backend.onrender.com/admin/users?search=muhammadbukarakai@gmail.com`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('👤 Updated user profile:', userProfile.data);

  } catch (error) {
    console.error('❌ Error approving BVN:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  approveUserBVN();
} 