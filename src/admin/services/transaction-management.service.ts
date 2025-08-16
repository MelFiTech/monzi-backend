import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import {
  GetTransactionsResponse,
  GetTransactionDetailResponse,
  AdminTransactionStatsDto,
  FundWalletDto,
  WalletOperationResponse,
  DebitWalletDto,
} from '../dto/admin.dto';

@Injectable()
export class TransactionManagementService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async getTransactions(
    limit: number = 20,
    offset: number = 0,
    type?: string,
    status?: string,
    userId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<GetTransactionsResponse> {
    console.log('🔍 [TRANSACTION SERVICE] Getting transactions with filters:', {
      limit,
      offset,
      type,
      status,
      userId,
      startDate,
      endDate,
    });

    try {
      const where: any = {};

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const transactions = await this.prisma.transaction.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await this.prisma.transaction.count({ where });

      const formattedTransactions = transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        reference: tx.reference,
        fee: 0, // Placeholder
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        user: tx.user,
        metadata: tx.metadata,
      }));

      console.log(
        '✅ [TRANSACTION SERVICE] Transactions retrieved successfully',
      );
      console.log('📊 Total transactions:', total);
      console.log('📄 Retrieved transactions:', formattedTransactions.length);

      return {
        success: true,
        transactions: formattedTransactions,
        total,
        limit,
        page: Math.floor(offset / limit) + 1,
        stats: {
          totalAmount: 0, // Placeholder
          totalFees: 0, // Placeholder
          completed: 0, // Placeholder
          pending: 0, // Placeholder
          failed: 0, // Placeholder
          cancelled: 0, // Placeholder
        },
      };
    } catch (error) {
      console.error(
        '❌ [TRANSACTION SERVICE] Error getting transactions:',
        error,
      );
      throw new BadRequestException('Failed to get transactions');
    }
  }

  async getTransactionDetail(
    transactionId: string,
  ): Promise<GetTransactionDetailResponse> {
    console.log(
      '🔍 [TRANSACTION SERVICE] Getting transaction details for:',
      transactionId,
    );

    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
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
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const transactionDetail = {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        reference: transaction.reference,
        fee: 0, // Placeholder
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        user: transaction.user,
        metadata: transaction.metadata,
      };

      console.log(
        '✅ [TRANSACTION SERVICE] Transaction details retrieved successfully',
      );

      return {
        success: true,
        transaction: transactionDetail,
      };
    } catch (error) {
      console.error(
        '❌ [TRANSACTION SERVICE] Error getting transaction details:',
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get transaction details');
    }
  }

  async getTransactionStats(): Promise<AdminTransactionStatsDto> {
    try {
      const [
        totalTransactions,
        totalAmount,
        completedTransactions,
        pendingTransactions,
        failedTransactions,
        cancelledTransactions,
      ] = await Promise.all([
        this.prisma.transaction.count(),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
        }),
        this.prisma.transaction.count({
          where: { status: 'COMPLETED' },
        }),
        this.prisma.transaction.count({ where: { status: 'PENDING' } }),
        this.prisma.transaction.count({ where: { status: 'FAILED' } }),
        this.prisma.transaction.count({ where: { status: 'CANCELLED' } }),
      ]);

      return {
        totalAmount: totalAmount._sum.amount || 0,
        totalFees: 0, // Placeholder
        completed: completedTransactions,
        pending: pendingTransactions,
        failed: failedTransactions,
        cancelled: cancelledTransactions,
      };
    } catch (error) {
      console.error(
        '❌ [TRANSACTION SERVICE] Error getting transaction statistics:',
        error,
      );
      throw new BadRequestException('Failed to get transaction statistics');
    }
  }

  async fundWallet(dto: FundWalletDto): Promise<WalletOperationResponse> {
    console.log('💰 [TRANSACTION SERVICE] Funding wallet:', dto);

    try {
      let wallet;

      // Find wallet by userId, email, or accountNumber
      if (dto.userId) {
        wallet = await this.prisma.wallet.findFirst({
          where: { userId: dto.userId },
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
        });
      } else if (dto.email) {
        const user = await this.prisma.user.findUnique({
          where: { email: dto.email },
        });
        if (user) {
          wallet = await this.prisma.wallet.findFirst({
            where: { userId: user.id },
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
          });
        }
      } else if (dto.accountNumber) {
        wallet = await this.prisma.wallet.findUnique({
          where: { virtualAccountNumber: dto.accountNumber },
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
        });
      } else {
        throw new BadRequestException('Must provide userId, email, or accountNumber');
      }

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.isFrozen) {
        throw new BadRequestException('Cannot fund frozen wallet');
      }

      // Generate unique reference
      const reference = `ADMIN_FUND_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

      // ==================== ATOMIC DATABASE TRANSACTION ====================
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create wallet transaction record
        const walletTransaction = await tx.walletTransaction.create({
          data: {
            amount: dto.amount,
            type: 'FUNDING',
            status: 'COMPLETED',
            reference,
            description: dto.description || 'Admin wallet funding',
            fee: 0,
            receiverWalletId: wallet.id,
            receiverBalanceBefore: wallet.balance,
            receiverBalanceAfter: wallet.balance + dto.amount,
            metadata: {
              adminFunding: true,
              adminId: 'admin', // Placeholder
              operationType: 'ADMIN_FUNDING',
            },
          },
        });

        // 2. Create main transaction record for admin queries
        const mainTransaction = await tx.transaction.create({
          data: {
            userId: wallet.userId,
            type: 'DEPOSIT',
            amount: dto.amount,
            currency: wallet.currency,
            status: 'COMPLETED',
            reference,
            description: dto.description || 'Admin wallet funding',
            metadata: {
              adminFunding: true,
              adminId: 'admin', // Placeholder
              walletTransactionId: walletTransaction.id,
              operationType: 'ADMIN_FUNDING',
              previousBalance: wallet.balance,
              newBalance: wallet.balance + dto.amount,
            },
          },
        });

        // 3. Update wallet balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { 
            balance: { increment: dto.amount },
            lastTransactionAt: new Date(),
          },
          include: { user: true },
        });

        return {
          walletTransaction,
          mainTransaction,
          updatedWallet,
          oldBalance: wallet.balance,
          newBalance: updatedWallet.balance,
        };
      });

      // Extract results from transaction
      const { walletTransaction, mainTransaction, updatedWallet } = result;

      console.log('✅ [TRANSACTION SERVICE] Wallet funded successfully');

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // Wallet balance update notification
        this.notificationsGateway.emitWalletBalanceUpdate(wallet.userId, {
          oldBalance: wallet.balance,
          newBalance: updatedWallet.balance,
          change: dto.amount,
          currency: wallet.currency,
          provider: 'ADMIN',
          accountNumber: wallet.virtualAccountNumber,
          grossAmount: dto.amount,
          fundingFee: 0,
          netAmount: dto.amount,
          transactionId: mainTransaction.id,
          reference: mainTransaction.reference,
        });

        // Transaction notification
        this.notificationsGateway.emitTransactionNotification(wallet.userId, {
          type: 'FUNDING',
          amount: dto.amount,
          grossAmount: dto.amount,
          fee: 0,
          currency: wallet.currency,
          description: dto.description || 'Admin wallet funding',
          reference: mainTransaction.reference,
          transactionId: mainTransaction.id,
          provider: 'ADMIN',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        });

        // General notification
        this.notificationsGateway.emitNotification(wallet.userId, {
          title: 'Wallet Funded by Admin',
          message: `₦${dto.amount.toLocaleString()} has been credited to your wallet by an administrator.`,
          type: 'success',
          data: {
            transactionId: mainTransaction.id,
            amount: dto.amount,
            reference: mainTransaction.reference,
            adminFunding: true,
          },
        });
      }

      return {
        success: true,
        message: 'Wallet funded successfully',
        userId: wallet.userId,
        userEmail: wallet.user?.email || '',
        previousBalance: wallet.balance,
        newBalance: wallet.balance + dto.amount,
        amount: dto.amount,
        reference: mainTransaction.reference,
        timestamp: mainTransaction.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [TRANSACTION SERVICE] Error funding wallet:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to fund wallet');
    }
  }

  async debitWallet(dto: DebitWalletDto): Promise<WalletOperationResponse> {
    console.log('💸 [TRANSACTION SERVICE] Debiting wallet:', dto);

    try {
      let wallet;

      // Find wallet by userId, email, or accountNumber
      if (dto.userId) {
        wallet = await this.prisma.wallet.findFirst({
          where: { userId: dto.userId },
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
        });
      } else if (dto.email) {
        const user = await this.prisma.user.findUnique({
          where: { email: dto.email },
        });
        if (user) {
          wallet = await this.prisma.wallet.findFirst({
            where: { userId: user.id },
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
          });
        }
      } else if (dto.accountNumber) {
        wallet = await this.prisma.wallet.findUnique({
          where: { virtualAccountNumber: dto.accountNumber },
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
        });
      } else {
        throw new BadRequestException('Must provide userId, email, or accountNumber');
      }

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.isFrozen) {
        throw new BadRequestException('Cannot debit frozen wallet');
      }

      if (wallet.balance < dto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Generate unique reference
      const reference = `ADMIN_DEBIT_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

      // ==================== ATOMIC DATABASE TRANSACTION ====================
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create wallet transaction record
        const walletTransaction = await tx.walletTransaction.create({
          data: {
            amount: dto.amount,
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            reference,
            description: dto.description || 'Admin wallet debit',
            fee: 0,
            senderWalletId: wallet.id,
            senderBalanceBefore: wallet.balance,
            senderBalanceAfter: wallet.balance - dto.amount,
            metadata: {
              adminDebit: true,
              adminId: 'admin', // Placeholder
              operationType: 'ADMIN_DEBIT',
            },
          },
        });

        // 2. Create main transaction record for admin queries
        const mainTransaction = await tx.transaction.create({
          data: {
            userId: wallet.userId,
            type: 'WITHDRAWAL',
            amount: dto.amount,
            currency: wallet.currency,
            status: 'COMPLETED',
            reference,
            description: dto.description || 'Admin wallet debit',
            metadata: {
              adminDebit: true,
              adminId: 'admin', // Placeholder
              walletTransactionId: walletTransaction.id,
              operationType: 'ADMIN_DEBIT',
              previousBalance: wallet.balance,
              newBalance: wallet.balance - dto.amount,
            },
          },
        });

        // 3. Update wallet balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { 
            balance: { decrement: dto.amount },
            lastTransactionAt: new Date(),
          },
          include: { user: true },
        });

        return {
          walletTransaction,
          mainTransaction,
          updatedWallet,
          oldBalance: wallet.balance,
          newBalance: updatedWallet.balance,
        };
      });

      // Extract results from transaction
      const { walletTransaction, mainTransaction, updatedWallet } = result;

      console.log('✅ [TRANSACTION SERVICE] Wallet debited successfully');

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // Wallet balance update notification
        this.notificationsGateway.emitWalletBalanceUpdate(wallet.userId, {
          oldBalance: wallet.balance,
          newBalance: updatedWallet.balance,
          change: -dto.amount,
          currency: wallet.currency,
          provider: 'ADMIN',
          accountNumber: wallet.virtualAccountNumber,
          grossAmount: dto.amount,
          fundingFee: 0,
          netAmount: -dto.amount,
          transactionId: mainTransaction.id,
          reference: mainTransaction.reference,
        });

        // Transaction notification
        this.notificationsGateway.emitTransactionNotification(wallet.userId, {
          type: 'WITHDRAWAL',
          amount: dto.amount,
          grossAmount: dto.amount,
          fee: 0,
          currency: wallet.currency,
          description: dto.description || 'Admin wallet debit',
          reference: mainTransaction.reference,
          transactionId: mainTransaction.id,
          provider: 'ADMIN',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        });

        // General notification
        this.notificationsGateway.emitNotification(wallet.userId, {
          title: 'Wallet Debited by Admin',
          message: `₦${dto.amount.toLocaleString()} has been debited from your wallet by an administrator.`,
          type: 'warning',
          data: {
            transactionId: mainTransaction.id,
            amount: dto.amount,
            reference: mainTransaction.reference,
            adminDebit: true,
          },
        });
      }

      return {
        success: true,
        message: 'Wallet debited successfully',
        userId: wallet.userId,
        userEmail: wallet.user?.email || '',
        previousBalance: wallet.balance,
        newBalance: wallet.balance - dto.amount,
        amount: dto.amount,
        reference: mainTransaction.reference,
        timestamp: mainTransaction.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [TRANSACTION SERVICE] Error debiting wallet:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to debit wallet');
    }
  }
}
