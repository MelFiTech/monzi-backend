import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private prisma: PrismaService) {}

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

      console.log('✅ [TRANSACTION SERVICE] Transactions retrieved successfully');
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
      console.error('❌ [TRANSACTION SERVICE] Error getting transactions:', error);
      throw new BadRequestException('Failed to get transactions');
    }
  }

  async getTransactionDetail(transactionId: string): Promise<GetTransactionDetailResponse> {
    console.log('🔍 [TRANSACTION SERVICE] Getting transaction details for:', transactionId);

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

      console.log('✅ [TRANSACTION SERVICE] Transaction details retrieved successfully');

      return {
        success: true,
        transaction: transactionDetail,
      };
    } catch (error) {
      console.error('❌ [TRANSACTION SERVICE] Error getting transaction details:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get transaction details');
    }
  }

  async getTransactionStats(): Promise<AdminTransactionStatsDto> {
    console.log('📊 [TRANSACTION SERVICE] Getting transaction statistics');

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
        this.prisma.transaction.count({ where: { status: 'SUCCESSFUL' as any } }),
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
      console.error('❌ [TRANSACTION SERVICE] Error getting transaction statistics:', error);
      throw new BadRequestException('Failed to get transaction statistics');
    }
  }

  async fundWallet(dto: FundWalletDto): Promise<WalletOperationResponse> {
    console.log('💰 [TRANSACTION SERVICE] Funding wallet:', dto.accountNumber);

    try {
      const wallet = await this.prisma.wallet.findUnique({
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

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.isFrozen) {
        throw new BadRequestException('Cannot fund frozen wallet');
      }

      // Create credit transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          userId: wallet.userId,
          type: 'CREDIT' as any,
          amount: dto.amount,
          currency: wallet.currency,
          status: 'SUCCESSFUL' as any,
          reference: `ADMIN_FUND_${Date.now()}`,
          description: dto.description || 'Admin wallet funding',
          metadata: {
            adminFunding: true,
            adminId: 'admin', // Placeholder
          },
        },
      });

      // Update wallet balance
      const updatedWallet = await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: dto.amount } },
        include: { user: true },
      });

      console.log('✅ [TRANSACTION SERVICE] Wallet funded successfully');

      return {
        success: true,
        message: 'Wallet funded successfully',
        userId: wallet.userId,
        userEmail: wallet.user?.email || '',
        previousBalance: wallet.balance,
        newBalance: wallet.balance + dto.amount,
        amount: dto.amount,
        reference: transaction.reference,
        timestamp: transaction.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [TRANSACTION SERVICE] Error funding wallet:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fund wallet');
    }
  }

  async debitWallet(dto: DebitWalletDto): Promise<WalletOperationResponse> {
    console.log('💸 [TRANSACTION SERVICE] Debiting wallet:', dto.accountNumber);

    try {
      const wallet = await this.prisma.wallet.findUnique({
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

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.isFrozen) {
        throw new BadRequestException('Cannot debit frozen wallet');
      }

      if (wallet.balance < dto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Create debit transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          userId: wallet.userId,
          type: 'DEBIT' as any,
          amount: dto.amount,
          currency: wallet.currency,
          status: 'SUCCESSFUL' as any,
          reference: `ADMIN_DEBIT_${Date.now()}`,
          description: dto.description || 'Admin wallet debit',
          metadata: {
            adminDebit: true,
            adminId: 'admin', // Placeholder
          },
        },
      });

      // Update wallet balance
      const updatedWallet = await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: dto.amount } },
        include: { user: true },
      });

      console.log('✅ [TRANSACTION SERVICE] Wallet debited successfully');

      return {
        success: true,
        message: 'Wallet debited successfully',
        userId: wallet.userId,
        userEmail: wallet.user?.email || '',
        previousBalance: wallet.balance,
        newBalance: wallet.balance - dto.amount,
        amount: dto.amount,
        reference: transaction.reference,
        timestamp: transaction.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [TRANSACTION SERVICE] Error debiting wallet:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to debit wallet');
    }
  }
} 