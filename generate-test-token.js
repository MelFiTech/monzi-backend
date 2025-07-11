"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("@nestjs/jwt");
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';
const jwtService = new jwt_1.JwtService({
    secret: JWT_SECRET,
    signOptions: {
        expiresIn: JWT_EXPIRATION,
    },
});
const testUsers = [
    {
        id: 'user-admin-001',
        email: 'admin@monzi.com',
        role: 'admin',
        description: 'Admin User'
    },
    {
        id: 'user-regular-002',
        email: 'john.doe@gmail.com',
        role: 'user',
        description: 'Regular User'
    },
    {
        id: 'user-test-003',
        email: 'test@example.com',
        role: 'user',
        description: 'Test User'
    }
];
console.log('🔐 JWT Token Generator for Monzi Backend');
console.log('='.repeat(60));
testUsers.forEach((user, index) => {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
    };
    const token = jwtService.sign(payload);
    console.log(`\n${index + 1}. ${user.description}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Token: ${token}`);
    console.log(`   Authorization Header: Bearer ${token}`);
    console.log('-'.repeat(40));
});
console.log('\n🚀 How to use these tokens:');
console.log('1. Copy any token above');
console.log('2. Add to your request headers:');
console.log('   Authorization: Bearer <token>');
console.log('3. Or use in Swagger UI by clicking "Authorize" button');
console.log('\n📱 API Endpoints you can test:');
console.log('• GET /auth/profile - Get user profile');
console.log('• GET /wallet/details - Get wallet information');
console.log('• POST /ai/query - Ask AI assistant');
console.log('• GET /wallet/transactions - Get transaction history');
console.log('\n⏰ Token Expiration: 7 days');
console.log(`🔑 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
//# sourceMappingURL=generate-test-token.js.map