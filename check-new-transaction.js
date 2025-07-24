const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNewTransaction() {
  try {
    console.log('🔍 Checking new transaction in database...');
    
    // Check both Transaction and WalletTransaction tables
    const transaction = await prisma.transaction.findFirst({
      where: {
        reference: 'TXN-TEST-1753382897278'
      },
      select: {
        id: true,
        type: true,
        amount: true,
        reference: true,
        metadata: true,
        createdAt: true,
      }
    });

    const walletTransaction = await prisma.walletTransaction.findFirst({
      where: {
        reference: 'TXN-TEST-1753382897278'
      },
      select: {
        id: true,
        type: true,
        amount: true,
        reference: true,
        metadata: true,
        createdAt: true,
      }
    });

    console.log('\n📊 Transaction Table:');
    console.log('=====================');
    if (transaction) {
      console.log(`ID: ${transaction.id}`);
      console.log(`Type: ${transaction.type}`);
      console.log(`Amount: ${transaction.amount}`);
      console.log(`Reference: ${transaction.reference}`);
      console.log(`Created: ${transaction.createdAt}`);
      console.log('\n📝 Metadata:');
      console.dir(transaction.metadata, { depth: 6 });
    } else {
      console.log('❌ Not found in Transaction table');
    }

    console.log('\n📊 WalletTransaction Table:');
    console.log('===========================');
    if (walletTransaction) {
      console.log(`ID: ${walletTransaction.id}`);
      console.log(`Type: ${walletTransaction.type}`);
      console.log(`Amount: ${walletTransaction.amount}`);
      console.log(`Reference: ${walletTransaction.reference}`);
      console.log(`Created: ${walletTransaction.createdAt}`);
      console.log('\n📝 Metadata:');
      console.dir(walletTransaction.metadata, { depth: 6 });
    } else {
      console.log('❌ Not found in WalletTransaction table');
    }

    if (transaction && transaction.metadata) {
      console.log('\n🔍 Sender Information Check:');
      console.log('===========================');
      const metadata = transaction.metadata;
      console.log(`sender_name: ${metadata.sender_name || 'NOT FOUND'}`);
      console.log(`sender_account_number: ${metadata.sender_account_number || 'NOT FOUND'}`);
      console.log(`sender_bank: ${metadata.sender_bank || 'NOT FOUND'}`);
      console.log(`bankCode: ${metadata.bankCode || 'NOT FOUND'}`);
    }

  } catch (error) {
    console.error('❌ Error checking transaction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewTransaction(); 