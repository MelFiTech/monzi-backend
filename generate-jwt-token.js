const jwt = require('jsonwebtoken');

function generateJWTToken() {
  try {
    console.log('🔐 Generating JWT token for testing...');
    
    // User ID from the logs
    const userId = 'cmd04phr6000j1gmlv0b3zbu3';
    const email = 'talktomelfi@gmail.com';
    
    // JWT secret (you may need to adjust this based on your environment)
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    
    // Create payload
    const payload = {
      sub: userId,
      email: email,
      role: 'USER',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    // Generate token
    const token = jwt.sign(payload, jwtSecret);
    
    console.log('✅ JWT token generated successfully!');
    console.log('🔑 Token:', token);
    console.log('👤 User ID:', userId);
    console.log('📧 Email:', email);
    
    return token;
    
  } catch (error) {
    console.error('❌ Failed to generate JWT token:', error.message);
    return null;
  }
}

// Export for use in other scripts
module.exports = { generateJWTToken };

// Run if called directly
if (require.main === module) {
  generateJWTToken();
} 