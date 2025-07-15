const axios = require('axios');

async function editUserBVN() {
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
    const now = new Date().toISOString();

    // Edit user (set bvnVerifiedAt)
    const editData = {
      userId: userId,
      bvnVerifiedAt: now
    };
    const response = await axios.put('https://monzi-backend.onrender.com/admin/edit-user', editData, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('🎉 Edit user response:', response.data);

    // Optionally, fetch user profile to confirm
    const userProfile = await axios.get(`https://monzi-backend.onrender.com/admin/users?search=muhammadbukarakai@gmail.com`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('👤 Updated user profile:', userProfile.data);

  } catch (error) {
    console.error('❌ Error editing user BVN:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  editUserBVN();
} 