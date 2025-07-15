const axios = require('axios');

// Check user KYC status on live server
async function checkUserKYC() {
  try {
    console.log('🔍 Checking KYC status for: muhammadbukarakai@gmail.com');
    
    // First, let's get a valid admin JWT token
    const loginData = {
      email: 'talktomelfi@gmail.com',
      passcode: '199699'
    };

    console.log('🔐 Getting admin token...');
    
    const authResponse = await axios.post('https://monzi-backend.onrender.com/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const adminToken = authResponse.data.access_token;
    console.log('✅ Admin token obtained');

    // Check user KYC status
    console.log('📋 Checking KYC submissions...');
    
    const kycResponse = await axios.get('https://monzi-backend.onrender.com/admin/kyc/submissions', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 KYC Submissions:', kycResponse.data);

    // Find the specific user
    const user = kycResponse.data.submissions?.find(sub => 
      sub.email === 'muhammadbukarakai@gmail.com'
    );

    if (user) {
      console.log('👤 User found:', {
        id: user.userId,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        kycStatus: user.kycStatus,
        bvn: user.bvn,
        bvnVerifiedAt: user.bvnVerifiedAt,
        selfieUrl: user.selfieUrl,
        submittedAt: user.submittedAt,
        createdAt: user.createdAt
      });

      if (user.kycStatus === 'PENDING') {
        console.log('🔄 User has pending KYC - ready for approval');
        return { user, adminToken };
      } else {
        console.log(`ℹ️ User KYC status: ${user.kycStatus}`);
        return { user, adminToken };
      }
    } else {
      console.log('❌ User not found in KYC submissions');
      return { user: null, adminToken };
    }

  } catch (error) {
    console.error('❌ Error checking user KYC:', error.response?.data || error.message);
    return { user: null, adminToken: null };
  }
}

// Approve user KYC
async function approveUserKYC(userId, adminToken) {
  try {
    console.log('✅ Approving KYC for user:', userId);
    
    const approvalData = {
      userId: userId,
      action: 'APPROVE',
      reason: 'BVN verification completed successfully'
    };

    const response = await axios.post('https://monzi-backend.onrender.com/admin/kyc/approve', approvalData, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('🎉 KYC approval successful:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error approving KYC:', error.response?.data || error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('🚀 Checking user KYC status on live server...');
  
  const { user, adminToken } = await checkUserKYC();
  
  if (user && user.kycStatus === 'PENDING' && adminToken) {
    console.log('\n🔄 Proceeding with KYC approval...');
    await approveUserKYC(user.userId, adminToken);
  } else if (user) {
    console.log(`\nℹ️ User KYC status is: ${user.kycStatus}`);
    console.log('No action needed.');
  } else {
    console.log('\n❌ User not found or error occurred.');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkUserKYC, approveUserKYC }; 