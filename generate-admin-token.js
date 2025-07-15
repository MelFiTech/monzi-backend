const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// Admin user data - using the correct credentials
const adminUser = {
  id: 'cmd04phr6000j1gmlv0b3zbu3', // Correct admin user ID
  email: 'talktomelfi@gmail.com',
  role: 'SUDO_ADMIN'
};

// Generate token
const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '24h' });

console.log('🔑 Generated Admin Token:');
console.log(token);
console.log('\n📋 Token Details:');
console.log('- User ID:', adminUser.id);
console.log('- Email:', adminUser.email);
console.log('- Role:', adminUser.role);
console.log('- Expires In: 24 hours'); 