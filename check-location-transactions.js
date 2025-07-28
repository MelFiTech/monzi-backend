const { PrismaClient } = require('@prisma/client');

async function checkLocationTransactions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking location transactions...');
    
    const locationId = 'cmdm0mzdg00041gj10pie2d7o';
    
    // Get the location with all transactions
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        transactions: {
          include: {
            toAccount: true,
            fromAccount: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
    
    if (!location) {
      console.log('❌ Location not found');
      return;
    }
    
    console.log('📍 Location Details:');
    console.log(`   ID: ${location.id}`);
    console.log(`   Name: ${location.name}`);
    console.log(`   Address: ${location.address}`);
    console.log(`   Total Transactions: ${location.transactions.length}`);
    
    if (location.transactions.length === 0) {
      console.log('⚠️ No transactions found for this location');
      return;
    }
    
    console.log('\n📊 Transaction Details:');
    location.transactions.forEach((transaction, index) => {
      console.log(`\n   Transaction ${index + 1}:`);
      console.log(`     ID: ${transaction.id}`);
      console.log(`     Amount: ${transaction.amount}`);
      console.log(`     Status: ${transaction.status}`);
      console.log(`     Type: ${transaction.type}`);
      console.log(`     Created: ${transaction.createdAt}`);
      console.log(`     Has toAccount: ${!!transaction.toAccount}`);
      console.log(`     Has fromAccount: ${!!transaction.fromAccount}`);
      
      if (transaction.toAccount) {
        console.log(`     To Account: ${transaction.toAccount.accountNumber} - ${transaction.toAccount.bankName} - ${transaction.toAccount.accountName}`);
      }
      
      if (transaction.fromAccount) {
        console.log(`     From Account: ${transaction.fromAccount.accountNumber} - ${transaction.fromAccount.bankName} - ${transaction.fromAccount.accountName}`);
      }
    });
    
    // Check completed transactions specifically
    const completedTransactions = location.transactions.filter(t => t.status === 'COMPLETED');
    console.log(`\n✅ Completed Transactions: ${completedTransactions.length}`);
    
    const transactionsWithToAccount = completedTransactions.filter(t => t.toAccount);
    console.log(`✅ Completed Transactions with toAccount: ${transactionsWithToAccount.length}`);
    
    if (transactionsWithToAccount.length > 0) {
      console.log('\n💳 Payment Suggestions that should be extracted:');
      transactionsWithToAccount.forEach((transaction, index) => {
        console.log(`   ${index + 1}. ${transaction.toAccount.accountNumber} - ${transaction.toAccount.bankName} - ${transaction.toAccount.accountName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLocationTransactions(); 