const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Nigerian names and data
const users = [
  {
    firstName: 'Chioma',
    lastName: 'Adebayo',
    email: 'chioma.adebayo@gmail.com',
    phone: '+2348123456789',
    gender: 'FEMALE',
    dateOfBirth: new Date('1995-03-15'),
    passcode: '123456',
    bvn: '22234567890',
    selfieUrl: '/uploads/kyc/chioma-selfie.jpg'
  },
  {
    firstName: 'Kemi',
    lastName: 'Okonkwo',
    email: 'kemi.okonkwo@yahoo.com',
    phone: '+2348134567890',
    gender: 'FEMALE',
    dateOfBirth: new Date('1992-07-22'),
    passcode: '234567',
    bvn: '22234567891',
    selfieUrl: '/uploads/kyc/kemi-selfie.jpg'
  },
  {
    firstName: 'Emeka',
    lastName: 'Nwankwo',
    email: 'emeka.nwankwo@gmail.com',
    phone: '+2348145678901',
    gender: 'MALE',
    dateOfBirth: new Date('1988-11-08'),
    passcode: '345678',
    bvn: '22234567892',
    selfieUrl: '/uploads/kyc/emeka-selfie.jpg'
  },
  {
    firstName: 'Funmi',
    lastName: 'Adesanya',
    email: 'funmi.adesanya@outlook.com',
    phone: '+2348156789012',
    gender: 'FEMALE',
    dateOfBirth: new Date('1990-05-30'),
    passcode: '456789',
    bvn: '22234567893',
    selfieUrl: '/uploads/kyc/funmi-selfie.jpg'
  },
  {
    firstName: 'Chinedu',
    lastName: 'Okoro',
    email: 'chinedu.okoro@gmail.com',
    phone: '+2348167890123',
    gender: 'MALE',
    dateOfBirth: new Date('1993-12-12'),
    passcode: '567890',
    bvn: '22234567894',
    selfieUrl: '/uploads/kyc/chinedu-selfie.jpg'
  }
];

// Transaction data templates
const transactionTemplates = [
  { type: 'TRANSFER', description: 'Transfer to family member', amount: 5000 },
  { type: 'TRANSFER', description: 'Rent payment', amount: 150000 },
  { type: 'TRANSFER', description: 'School fees payment', amount: 75000 },
  { type: 'DEPOSIT', description: 'Salary payment', amount: 200000 },
  { type: 'DEPOSIT', description: 'Business income', amount: 50000 },
  { type: 'WITHDRAWAL', description: 'ATM withdrawal', amount: 20000 },
  { type: 'TRANSFER', description: 'Grocery shopping', amount: 15000 },
  { type: 'TRANSFER', description: 'Fuel purchase', amount: 25000 },
  { type: 'DEPOSIT', description: 'Freelance payment', amount: 80000 },
  { type: 'TRANSFER', description: 'Medical bills', amount: 35000 }
];

const bankAccounts = [
  { bankName: 'First Bank', bankCode: '000016', accountNumbers: ['3089415578', '3089415579', '3089415580'] },
  { bankName: 'GTBank', bankCode: '000013', accountNumbers: ['0123456789', '0123456790', '0123456791'] },
  { bankName: 'Access Bank', bankCode: '000014', accountNumbers: ['0987654321', '0987654322', '0987654323'] },
  { bankName: 'Zenith Bank', bankCode: '000015', accountNumbers: ['1234567890', '1234567891', '1234567892'] },
  { bankName: 'UBA', bankCode: '000033', accountNumbers: ['2345678901', '2345678902', '2345678903'] }
];

const getRandomStatus = (weights) => {
  const statuses = Object.keys(weights);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (const status of statuses) {
    if (random < weights[status]) return status;
    random -= weights[status];
  }
  return statuses[0];
};

const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

const generateReference = () => `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data
    console.log('🧹 Cleaning existing data...');
    await prisma.transaction.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    console.log('👥 Creating 5 users...');
    const createdUsers = [];
    
    for (const userData of users) {
      const hashedPasscode = await bcrypt.hash(userData.passcode, 10);
      
      const user = await prisma.user.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          gender: userData.gender,
          dateOfBirth: userData.dateOfBirth,
          passcode: hashedPasscode,
          isVerified: true,
          isOnboarded: true,
          kycStatus: Math.random() > 0.3 ? 'APPROVED' : 'PENDING',
          bvn: userData.bvn,
          bvnVerifiedAt: new Date(),
          selfieUrl: userData.selfieUrl,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        }
      });
      
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`);
    }

    // Create wallets for verified users
    console.log('💰 Creating wallets...');
    const createdWallets = [];
    
    for (const user of createdUsers) {
      if (user.kycStatus === 'APPROVED') {
        const wallet = await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: Math.floor(Math.random() * 500000) + 50000,
            currency: 'NGN',
            virtualAccountNumber: `903${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
            provider: Math.random() > 0.5 ? 'BUDPAY' : 'POLARIS',
            isActive: true,
            createdAt: new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000),
          }
        });
        
        createdWallets.push({ ...wallet, user });
        console.log(`✅ Created wallet for ${user.firstName}: ${wallet.virtualAccountNumber} (₦${wallet.balance.toLocaleString()})`);
      }
    }

    // Create bank accounts for external transfers
    console.log('🏦 Creating bank accounts...');
    const createdAccounts = [];
    
    for (const bank of bankAccounts) {
      for (const accountNumber of bank.accountNumbers) {
        const randomUser = getRandomElement(createdUsers);
        const account = await prisma.account.create({
          data: {
            accountNumber,
            bankName: bank.bankName,
            bankCode: bank.bankCode,
            accountName: `${randomUser.firstName} ${randomUser.lastName}`,
            createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
          }
        });
        createdAccounts.push(account);
      }
    }

    // Create 10 KYC submissions (conceptual tracking)
    console.log('📋 Creating 10 KYC submissions...');
    const kycSubmissions = [];
    
    for (let i = 0; i < 10; i++) {
      const user = getRandomElement(createdUsers);
      const submissionDate = new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000);
      
      const isReviewed = Math.random() > 0.4;
      const reviewDecision = isReviewed ? (Math.random() > 0.2 ? 'APPROVED' : 'REJECTED') : null;
      
      const kycData = {
        userId: user.id,
        status: reviewDecision || 'PENDING',
        submittedAt: submissionDate,
        reviewedAt: isReviewed ? new Date(submissionDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) : null,
        bvn: user.bvn,
        selfieUrl: user.selfieUrl,
        email: user.email,
        phone: user.phone,
        fullName: `${user.firstName} ${user.lastName}`,
        kycStatus: reviewDecision || 'PENDING'
      };
      
      kycSubmissions.push(kycData);
      console.log(`✅ Created KYC submission for ${user.firstName} ${user.lastName}: ${kycData.status}`);
    }

    // Create transactions
    console.log('💸 Creating 30 transactions...');
    
    for (let i = 0; i < 30; i++) {
      const template = getRandomElement(transactionTemplates);
      const user = getRandomElement(createdUsers);
      const userWallet = createdWallets.find(w => w.userId === user.id);
      
      if (!userWallet && (template.type === 'TRANSFER' || template.type === 'WITHDRAWAL')) {
        continue;
      }
      
      const status = getRandomStatus({
        'COMPLETED': 0.7,
        'PENDING': 0.15,
        'FAILED': 0.1,
        'CANCELLED': 0.05
      });
      
      const amount = template.amount + Math.floor(Math.random() * template.amount * 0.5);
      const fee = template.type === 'TRANSFER' ? Math.floor(amount * 0.015) + 25 : 0;
      
      let fromAccountId = null;
      let toAccountId = null;
      
      if (template.type === 'TRANSFER' || template.type === 'WITHDRAWAL') {
        toAccountId = getRandomElement(createdAccounts).id;
      } else if (template.type === 'DEPOSIT') {
        fromAccountId = getRandomElement(createdAccounts).id;
      }
      
      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          amount,
          currency: 'NGN',
          type: template.type,
          status,
          reference: generateReference(),
          description: template.description,
          fromAccountId,
          toAccountId,
          metadata: {
            fee,
            provider: userWallet?.provider || 'BUDPAY',
            channel: 'mobile_app',
            ip_address: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            user_agent: 'Monzi Mobile App v1.0.0'
          },
          createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        }
      });
      
      console.log(`✅ Created transaction: ${transaction.type} - ₦${transaction.amount.toLocaleString()} (${transaction.status}) for ${user.firstName}`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users created: ${createdUsers.length}`);
    console.log(`💰 Wallets created: ${createdWallets.length}`);
    console.log(`🏦 Bank accounts created: ${createdAccounts.length}`);
    console.log(`📋 KYC submissions: ${kycSubmissions.length}`);
    console.log(`💸 Transactions created: 30`);
    
    console.log('\n🔍 User Details:');
    for (const user of createdUsers) {
      const wallet = createdWallets.find(w => w.userId === user.id);
      console.log(`📧 ${user.email} | 📱 ${user.phone} | 🆔 KYC: ${user.kycStatus} | 💰 Wallet: ${wallet ? `₦${wallet.balance.toLocaleString()}` : 'None'}`);
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase()
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase }; 