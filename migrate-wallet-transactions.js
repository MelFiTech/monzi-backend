const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateWalletTransactions() {
  console.log('🔄 [MIGRATION] Starting wallet transaction migration...');
  
  try {
    // Get all wallet transactions
    const walletTransactions = await prisma.walletTransaction.findMany({
      include: {
        senderWallet: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        receiverWallet: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        bankAccount: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            bankName: true,
            bankCode: true,
          },
        },
      },
    });

    console.log(`📊 [MIGRATION] Found ${walletTransactions.length} wallet transactions to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const walletTx of walletTransactions) {
      try {
        // Check if this transaction already exists in the main table
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            OR: [
              { reference: walletTx.reference },
              { 
                metadata: {
                  path: ['walletTransactionId'],
                  equals: walletTx.id
                }
              },
            ],
          },
        });

        if (existingTransaction) {
          console.log(`⏭️  [MIGRATION] Skipping duplicate transaction: ${walletTx.reference}`);
          skippedCount++;
          continue;
        }

        // Determine the user (sender for withdrawals/transfers, receiver for deposits)
        const primaryUser = walletTx.senderWallet?.user || walletTx.receiverWallet?.user;
        
        if (!primaryUser) {
          console.log(`⚠️  [MIGRATION] No user found for transaction: ${walletTx.reference}`);
          skippedCount++;
          continue;
        }

        // Convert wallet transaction type to admin transaction type
        const adminType = walletTx.type === 'WITHDRAWAL' ? 'WITHDRAWAL' :
                         walletTx.type === 'FUNDING' ? 'DEPOSIT' :
                         'TRANSFER';

        // Create the transaction record
        await prisma.transaction.create({
          data: {
            amount: walletTx.amount,
            currency: 'NGN',
            type: adminType,
            status: walletTx.status,
            reference: walletTx.reference,
            description: walletTx.description,
            userId: primaryUser.id,
            createdAt: walletTx.createdAt,
            updatedAt: walletTx.updatedAt,
            metadata: {
              // Copy existing metadata
              ...(walletTx.metadata || {}),
              // Add additional info
              fee: walletTx.fee || 0,
              providerReference: walletTx.providerReference,
              walletTransactionId: walletTx.id,
              migratedAt: new Date().toISOString(),
              // Add bank account info if available
              ...(walletTx.bankAccount && {
                recipientAccount: walletTx.bankAccount.accountNumber,
                recipientName: walletTx.bankAccount.accountName,
                recipientBank: walletTx.bankAccount.bankName,
                bankCode: walletTx.bankAccount.bankCode,
              }),
            },
          },
        });

        console.log(`✅ [MIGRATION] Migrated transaction: ${walletTx.reference} (${adminType})`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ [MIGRATION] Error migrating transaction ${walletTx.reference}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n🎉 [MIGRATION] Migration completed!`);
    console.log(`✅ Migrated: ${migratedCount} transactions`);
    console.log(`⏭️  Skipped: ${skippedCount} transactions`);
    console.log(`📊 Total processed: ${walletTransactions.length} transactions`);
    
  } catch (error) {
    console.error('❌ [MIGRATION] Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateWalletTransactions()
  .catch((error) => {
    console.error('❌ [MIGRATION] Fatal error:', error);
    process.exit(1);
  }); 