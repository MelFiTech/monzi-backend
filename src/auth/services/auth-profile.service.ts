import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileDto, TransactionDetailResponseDto } from '../dto/auth.dto';

@Injectable()
export class AuthProfileService {
  constructor(private prisma: PrismaService) {}

  // Validate user
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        pushTokens: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return user;
  }

  // Get user profile
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get KYC status from user model
    const kycStatus = user.kycStatus;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth.toISOString(),
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      isVerified: user.isVerified,
      isOnboarded: user.isOnboarded,
      role: user.role,
      kycStatus,
      bvn: user.bvn || undefined,
      bvnVerifiedAt: user.bvnVerifiedAt?.toISOString() || undefined,
      selfieUrl: user.selfieUrl || undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      wallet: user.wallet
        ? {
            id: user.wallet.id,
            balance: user.wallet.balance,
            currency: user.wallet.currency,
            virtualAccountNumber: user.wallet.virtualAccountNumber,
            provider: user.wallet.provider,
            isActive: user.wallet.isActive,
            createdAt: user.wallet.createdAt.toISOString(),
            updatedAt: user.wallet.updatedAt.toISOString(),
          }
        : undefined,
    };
  }

  // Get user transactions
  async getUserTransactions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    type?: string,
    status?: string,
  ) {
    const where: any = {
      userId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
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
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
      metadata: transaction.metadata,
      providerReference: null, // Not available in current schema
      providerResponse: null, // Not available in current schema
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    }));

    return {
      transactions: formattedTransactions,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + limit < total,
    };
  }

  // Get user transaction detail
  async getUserTransactionDetail(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDetailResponseDto> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
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

    const metadata = transaction.metadata || {};
    const user = transaction.user;
    // Get wallet from user relationship
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    // Build transaction detail
    const transactionDetail = {
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
      source: this.buildTransactionSource(transaction, metadata, user, wallet),
      destination: this.buildTransactionDestination(
        transaction,
        metadata,
        user,
        wallet,
      ),
      fee: this.buildTransactionFee(transaction, metadata),
      balanceImpact: this.buildBalanceImpact(transaction, metadata),
      timeline: {
        createdAt: transaction.createdAt.toISOString(),
        processingAt: undefined, // Not available in current schema
        completedAt: undefined, // Not available in current schema
        updatedAt: transaction.updatedAt.toISOString(),
      },
      metadata,
      providerReference: null, // Not available in current schema
      providerResponse: null, // Not available in current schema
    };

    return {
      success: true,
      transaction: transactionDetail,
    };
  }

  // Build transaction source
  private buildTransactionSource(
    transaction: any,
    metadata: any,
    user: any,
    wallet: any,
  ) {
    if (transaction.type === 'WITHDRAWAL' || transaction.type === 'TRANSFER') {
      return {
        type: 'WALLET',
        name:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        accountNumber: wallet?.virtualAccountNumber,
        provider: wallet?.provider,
      };
    }

    if (transaction.type === 'DEPOSIT') {
      // Check for sender information from webhook metadata
      if (metadata.sender_name) {
        return {
          type: 'BANK',
          name: metadata.sender_name,
          accountNumber: metadata.sender_account_number,
          bankName: metadata.sender_bank,
          bankCode: metadata.bankCode,
        };
      }

      // Fallback to old metadata structure
      if (metadata.sourceType === 'BANK') {
        return {
          type: 'BANK',
          name: metadata.sourceName,
          accountNumber: metadata.sourceAccountNumber,
          bankName: metadata.sourceBankName,
          bankCode: metadata.sourceBankCode,
        };
      }

      // If no sender info available, provide meaningful external source
      if (metadata.provider) {
        return {
          type: 'EXTERNAL',
          name: `${metadata.provider} Bank Transfer`,
          accountNumber: metadata.accountNumber || 'External Account',
          provider: metadata.provider,
        };
      }

      return {
        type: 'EXTERNAL',
        name: 'External Bank Transfer',
        accountNumber: 'External Account',
      };
    }

    return undefined;
  }

  // Build transaction destination
  private buildTransactionDestination(
    transaction: any,
    metadata: any,
    user: any,
    wallet: any,
  ) {
    if (transaction.type === 'DEPOSIT') {
      return {
        type: 'WALLET',
        name:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        accountNumber: wallet?.virtualAccountNumber,
        provider: wallet?.provider,
      };
    }

    if (transaction.type === 'WITHDRAWAL' || transaction.type === 'TRANSFER') {
      if (metadata.destinationType === 'BANK') {
        return {
          type: 'BANK',
          name: metadata.destinationName,
          accountNumber: metadata.destinationAccountNumber,
          bankName: metadata.destinationBankName,
          bankCode: metadata.destinationBankCode,
        };
      }
      return {
        type: metadata.destinationType || 'EXTERNAL',
        name: metadata.destinationName,
        accountNumber: metadata.destinationAccountNumber,
      };
    }

    return undefined;
  }

  // Build transaction fee
  private buildTransactionFee(transaction: any, metadata: any) {
    if (!metadata.fee) return undefined;

    return {
      amount: metadata.fee.amount || 0,
      currency: metadata.fee.currency || 'NGN',
      breakdown: metadata.fee.breakdown,
    };
  }

  // Build balance impact
  private buildBalanceImpact(transaction: any, metadata: any) {
    if (!metadata.balanceImpact) return undefined;

    return {
      previousBalance: metadata.balanceImpact.previousBalance || 0,
      newBalance: metadata.balanceImpact.newBalance || 0,
      balanceChange: metadata.balanceImpact.balanceChange || 0,
      effectiveAmount:
        metadata.balanceImpact.effectiveAmount || transaction.amount,
    };
  }
}
