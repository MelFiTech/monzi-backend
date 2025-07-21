const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reconcileWalletBalance() {
  try {
    console.log('🔧 Reconciling wallet balance...');
    
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: 'talktomelfi@gmail.com' },
      include: { 
        wallet: {
          include: {
            receivedTransactions: true,
            sentTransactions: true,
          }
        } 
      },
    });

    if (!user || !user.wallet) {
      console.log('❌ User or wallet not found');
      return;
    }

    console.log('👤 User:', user.email);
    console.log('💰 Current balance:', user.wallet.balance);
    console.log('📊 Received transactions:', user.wallet.receivedTransactions.length);
    console.log('📊 Sent transactions:', user.wallet.sentTransactions.length);

    // Calculate expected balance from transactions
    const receivedTotal = user.wallet.receivedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const sentTotal = user.wallet.sentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const expectedBalance = receivedTotal - sentTotal;

    console.log('💰 Received total:', receivedTotal);
    console.log('💰 Sent total:', sentTotal);
    console.log('💰 Expected balance:', expectedBalance);

    // Update the wallet balance to match expected
    const updatedWallet = await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: {
        balance: expectedBalance,
      },
    });

    console.log('✅ Wallet balance reconciled!');
    console.log('🆕 New balance:', updatedWallet.balance);

    return updatedWallet;
  } catch (error) {
    console.error('❌ Error reconciling wallet:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reconciliation
reconcileWalletBalance()
  .then(() => {
    console.log('🏁 Wallet reconciliation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Wallet reconciliation failed:', error);
    process.exit(1);
  }); 