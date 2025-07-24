const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransactionMetadata() {
  try {
    console.log('🔍 Checking transaction metadata in database...');
    
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: 'cmdeujymi000lsbm3qeift2nm'
      },
      select: {
        id: true,
        type: true,
        amount: true,
        reference: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!transaction) {
      console.log('❌ Transaction not found');
      return;
    }

    console.log('\n📊 Transaction Details:');
    console.log('=======================');
    console.log(`ID: ${transaction.id}`);
    console.log(`Type: ${transaction.type}`);
    console.log(`Amount: ${transaction.amount}`);
    console.log(`Reference: ${transaction.reference}`);
    console.log(`Created: ${transaction.createdAt}`);
    console.log(`Updated: ${transaction.updatedAt}`);

    console.log('\n📝 Raw Metadata:');
    console.log('================');
    console.dir(transaction.metadata, { depth: 6 });

    if (transaction.metadata) {
      const metadata = transaction.metadata;
      console.log('\n🔍 Sender Information Check:');
      console.log('===========================');
      console.log(`sender_name: ${metadata.sender_name || 'NOT FOUND'}`);
      console.log(`sender_account_number: ${metadata.sender_account_number || 'NOT FOUND'}`);
      console.log(`sender_bank: ${metadata.sender_bank || 'NOT FOUND'}`);
      console.log(`bankCode: ${metadata.bankCode || 'NOT FOUND'}`);
      
      console.log('\n🔍 Other Relevant Fields:');
      console.log('========================');
      console.log(`provider: ${metadata.provider || 'NOT FOUND'}`);
      console.log(`accountNumber: ${metadata.accountNumber || 'NOT FOUND'}`);
      console.log(`eventType: ${metadata.eventType || 'NOT FOUND'}`);
      
      // Check if there are any other fields that might contain sender info
      console.log('\n🔍 All Metadata Keys:');
      console.log('=====================');
      console.log(Object.keys(metadata).join(', '));
    }

  } catch (error) {
    console.error('❌ Error checking transaction metadata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactionMetadata(); 