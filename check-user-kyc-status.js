const fetch = require('node-fetch');

async function loginAdmin() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔐 Logging in as admin...');
    
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'talktomelfi@gmail.com',
        passcode: '199699'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Admin login successful');
      return loginData.access_token;
    } else {
      console.log('❌ Admin login failed:', loginResponse.status);
      const errorData = await loginResponse.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

async function checkUserKycStatus() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  const userId = 'cmdgb0pbw000wld3s2jqu5tmv';

  try {
    console.log('🔍 Checking user KYC status for:', userId);

    // Login as admin first
    const adminToken = await loginAdmin();
    if (!adminToken) {
      console.log('❌ Cannot proceed without admin token');
      return;
    }

    // 1. Get user KYC details
    console.log('\n📋 1. Getting user KYC details...');
    const userResponse = await fetch(`${baseUrl}/admin/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User KYC details retrieved successfully');
      
      const user = userData.user;
      console.log('\n👤 User KYC Status:');
      console.log('- KYC Status:', user.kycStatus);
      console.log('- Is Verified:', user.isVerified);
      console.log('- Is Onboarded:', user.isOnboarded);
      console.log('- BVN:', user.bvn || 'Not provided');
      console.log('- BVN Verified At:', user.bvnVerifiedAt || 'Not verified');
      console.log('- KYC Verified At:', user.kycVerifiedAt || 'Not verified');
      console.log('- Selfie URL:', user.selfieUrl || 'Not uploaded');
      console.log('- Created At:', user.createdAt);
      console.log('- Updated At:', user.updatedAt);

      // Check if user can make transfers
      console.log('\n🔍 Transfer Eligibility Analysis:');
      
      if (user.kycStatus !== 'VERIFIED' && user.kycStatus !== 'APPROVED') {
        console.log('❌ KYC not verified - transfers blocked');
      } else {
        console.log('✅ KYC verified - transfers allowed');
      }

      if (!user.isVerified) {
        console.log('❌ User not verified - transfers blocked');
      } else {
        console.log('✅ User verified - transfers allowed');
      }

      if (!user.isOnboarded) {
        console.log('❌ User not onboarded - transfers blocked');
      } else {
        console.log('✅ User onboarded - transfers allowed');
      }

      if (!user.wallet) {
        console.log('❌ No wallet found - transfers blocked');
      } else {
        console.log('✅ Wallet exists - transfers allowed');
        
        if (user.wallet.isFrozen) {
          console.log('❌ Wallet is frozen - transfers blocked');
        } else {
          console.log('✅ Wallet not frozen - transfers allowed');
        }

        if (!user.wallet.isActive) {
          console.log('❌ Wallet not active - transfers blocked');
        } else {
          console.log('✅ Wallet is active - transfers allowed');
        }

        if (user.wallet.balance <= 0) {
          console.log('❌ Insufficient balance - transfers blocked');
        } else {
          console.log('✅ Sufficient balance - transfers allowed');
        }
      }

    } else {
      console.log('❌ Failed to get user details:', userResponse.status);
    }

    // 2. Get KYC submission details if available
    console.log('\n📋 2. Getting KYC submission details...');
    const kycResponse = await fetch(`${baseUrl}/admin/kyc/submissions/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (kycResponse.ok) {
      const kycData = await kycResponse.json();
      console.log('✅ KYC submission details retrieved successfully');
      console.log('📄 KYC data:', JSON.stringify(kycData, null, 2));
    } else {
      console.log('❌ Failed to get KYC submission details:', kycResponse.status);
    }

    console.log('\n🔍 Summary of Potential Transfer Issues:');
    console.log('1. KYC Status must be VERIFIED or APPROVED');
    console.log('2. User must be verified (isVerified: true)');
    console.log('3. User must be onboarded (isOnboarded: true)');
    console.log('4. Wallet must exist and be active');
    console.log('5. Wallet must not be frozen');
    console.log('6. User must have sufficient balance');
    console.log('7. No pending transactions should be blocking');

  } catch (error) {
    console.error('❌ Error checking user KYC status:', error.message);
  }
}

// Run the check
checkUserKycStatus(); 