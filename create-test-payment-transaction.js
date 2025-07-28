const { PrismaClient } = require('@prisma/client');

async function createTestPaymentTransaction() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Creating test payment transaction...');
    
    const locationId = 'cmdm0mzdg00041gj10pie2d7o';
    const userId = 'cmd04phr6000j1gmlv0b3zbu3'; // The user from the logs
    
    // First, let's create a test account for the business
    console.log('🏦 Creating test business account...');
    const businessAccount = await prisma.account.create({
      data: {
        accountName: 'GOODNESS ENYO OBAJE',
        accountNumber: '1100104861',
        bankName: 'Kuda Microfinance bank',
        bankCode: '090267',
      },
    });
    
    console.log('✅ Business account created:', {
      id: businessAccount.id,
      accountName: businessAccount.accountName,
      accountNumber: businessAccount.accountNumber,
      bankName: businessAccount.bankName,
    });
    
    // Now create a payment transaction
    console.log('💳 Creating payment transaction...');
    const paymentTransaction = await prisma.transaction.create({
      data: {
        amount: 500,
        currency: 'NGN',
        description: 'Payment to business',
        reference: `PAY_${Date.now()}_TEST`,
        status: 'COMPLETED',
        type: 'PAYMENT',
        userId: userId,
        locationId: locationId,
        toAccountId: businessAccount.id,
        metadata: {
          test: true,
          purpose: 'Demonstrate payment suggestions'
        }
      },
    });
    
    console.log('✅ Payment transaction created:', {
      id: paymentTransaction.id,
      amount: paymentTransaction.amount,
      status: paymentTransaction.status,
      type: paymentTransaction.type,
      toAccountId: paymentTransaction.toAccountId,
    });
    
    // Let's also create another payment to a different business account
    console.log('🏦 Creating second business account...');
    const businessAccount2 = await prisma.account.create({
      data: {
        accountName: 'JOHN DOE STORE',
        accountNumber: '1234567890',
        bankName: 'GTBank',
        bankCode: '058',
      },
    });
    
    console.log('✅ Second business account created:', {
      id: businessAccount2.id,
      accountName: businessAccount2.accountName,
      accountNumber: businessAccount2.accountNumber,
      bankName: businessAccount2.bankName,
    });
    
    // Create another payment transaction
    console.log('💳 Creating second payment transaction...');
    const paymentTransaction2 = await prisma.transaction.create({
      data: {
        amount: 1000,
        currency: 'NGN',
        description: 'Payment to store',
        reference: `PAY_${Date.now()}_TEST2`,
        status: 'COMPLETED',
        type: 'PAYMENT',
        userId: userId,
        locationId: locationId,
        toAccountId: businessAccount2.id,
        metadata: {
          test: true,
          purpose: 'Demonstrate multiple payment suggestions'
        }
      },
    });
    
    console.log('✅ Second payment transaction created:', {
      id: paymentTransaction2.id,
      amount: paymentTransaction2.amount,
      status: paymentTransaction2.status,
      type: paymentTransaction2.type,
      toAccountId: paymentTransaction2.toAccountId,
    });
    
    console.log('\n🎉 Test payment transactions created successfully!');
    console.log('Now you can test the payment suggestions API again.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPaymentTransaction(); 