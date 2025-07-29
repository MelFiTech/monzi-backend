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

async function checkKycSubmissions() {
  try {
    console.log('\n📋 Checking all KYC submissions...\n');

    // Get all KYC submissions
    const submissionsResponse = await axios.get(`${BASE_URL}/admin/kyc/submissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`📊 Total KYC submissions: ${submissionsResponse.data.submissions.length}\n`);
    
    // Display all submissions
    submissionsResponse.data.submissions.forEach((submission, index) => {
      console.log(`${index + 1}. User: ${submission.email}`);
      console.log(`   - User ID: ${submission.userId}`);
      console.log(`   - Full Name: ${submission.fullName}`);
      console.log(`   - KYC Status: ${submission.kycStatus}`);
      console.log(`   - BVN: ${submission.bvn || 'None'}`);
      console.log(`   - Has Selfie: ${submission.hasSelfie}`);
      console.log(`   - BVN Verified At: ${submission.bvnVerifiedAt || 'Not verified'}`);
      console.log(`   - Submitted At: ${submission.submittedAt}`);
      console.log(`   - Verified At: ${submission.verifiedAt || 'Not verified'}`);
      console.log('');
    });

    // Group by status
    const statusGroups = {};
    submissionsResponse.data.submissions.forEach(submission => {
      if (!statusGroups[submission.kycStatus]) {
        statusGroups[submission.kycStatus] = [];
      }
      statusGroups[submission.kycStatus].push(submission);
    });

    console.log('📊 KYC Submissions by Status:');
    Object.keys(statusGroups).forEach(status => {
      console.log(`- ${status}: ${statusGroups[status].length} users`);
    });

    console.log('\n📊 Detailed Analysis:');
    
    // Users with BVN but no selfie
    const usersWithBvnNoSelfie = submissionsResponse.data.submissions.filter(
      submission => submission.bvn && !submission.hasSelfie
    );
    console.log(`- Users with BVN but no selfie: ${usersWithBvnNoSelfie.length}`);
    
    // Users with selfie but no BVN
    const usersWithSelfieNoBvn = submissionsResponse.data.submissions.filter(
      submission => !submission.bvn && submission.hasSelfie
    );
    console.log(`- Users with selfie but no BVN: ${usersWithSelfieNoBvn.length}`);
    
    // Users with both BVN and selfie
    const usersWithBoth = submissionsResponse.data.submissions.filter(
      submission => submission.bvn && submission.hasSelfie
    );
    console.log(`- Users with both BVN and selfie: ${usersWithBoth.length}`);
    
    // Users with neither BVN nor selfie
    const usersWithNeither = submissionsResponse.data.submissions.filter(
      submission => !submission.bvn && !submission.hasSelfie
    );
    console.log(`- Users with neither BVN nor selfie: ${usersWithNeither.length}`);

    // Check if we have any users that could be used for testing admin approval
    const testableUsers = submissionsResponse.data.submissions.filter(
      submission => 
        (submission.kycStatus === 'PENDING' || submission.kycStatus === 'UNDER_REVIEW') &&
        submission.bvn &&
        !submission.hasSelfie
    );

    console.log(`\n🧪 Testable Users for Admin Approval: ${testableUsers.length}`);
    if (testableUsers.length > 0) {
      console.log('These users have BVN verification but no selfie upload and can be approved by admin:');
      testableUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.kycStatus})`);
      });
    } else {
      console.log('No users available for testing admin approval functionality.');
      console.log('You would need a user with BVN verification but no selfie upload.');
    }

  } catch (error) {
    console.error('❌ Error checking KYC submissions:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Starting KYC Submissions Check...\n');
  
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without admin login');
    return;
  }
  
  await checkKycSubmissions();
  
  console.log('\n✅ KYC Submissions Check completed!');
}

main().catch(console.error); 