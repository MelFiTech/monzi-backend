const fetch = require('node-fetch');

async function loginAdmin() {
  const baseUrl = 'http://localhost:3000';
  
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

async function getUsers(token) {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('\n👥 Getting all users...');
    
    const response = await fetch(`${baseUrl}/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Users retrieved successfully');
      console.log(`📊 Total users: ${data.users.length}`);
      
      // Show first 10 users
      data.users.slice(0, 10).forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Verified: ${user.isVerified}`);
        console.log(`   Active: ${user.isActive}`);
        console.log('---');
      });
      
      return data.users;
    } else {
      console.log('❌ Failed to get users:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return [];
    }
  } catch (error) {
    console.error('❌ Get users error:', error.message);
    return [];
  }
}

async function checkUserByEmail(token, email) {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log(`\n🔍 Checking user by email: ${email}`);
    
    const response = await fetch(`${baseUrl}/admin/users/search?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ User found');
      console.log('📄 User data:', {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isVerified: data.isVerified,
        isActive: data.isActive
      });
      return data;
    } else {
      console.log('❌ User not found:', response.status);
      const errorData = await response.text();
      console.log('Error details:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ User search error:', error.message);
    return null;
  }
}

async function runUserChecks() {
  console.log('🔍 Starting User Database Check');
  console.log('=' .repeat(60));
  
  // Step 1: Login as admin
  const token = await loginAdmin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    return;
  }
  
  // Step 2: Get all users
  const users = await getUsers(token);
  
  // Step 3: Check specific user by email
  await checkUserByEmail(token, 'ibrahimoyiza198@gmail.com');
  
  console.log('\n🎯 User checks completed!');
  console.log('=' .repeat(60));
}

// Run the user checks
runUserChecks().catch(console.error); 