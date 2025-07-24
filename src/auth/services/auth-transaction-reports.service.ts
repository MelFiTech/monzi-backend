import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReportTransactionDto,
  ReportTransactionResponseDto,
  GetTransactionReportsResponseDto,
} from '../dto/auth.dto';

@Injectable()
export class AuthTransactionReportsService {
  constructor(private prisma: PrismaService) {}

  // Report transaction
  async reportTransaction(
    userId: string,
    transactionId: string,
    reportDto: ReportTransactionDto,
  ): Promise<ReportTransactionResponseDto> {
    const { reason, description } = reportDto;

    console.log('🔍 [AUTH] Report transaction request:', { userId, transactionId, reason });

    // Check if transaction exists and belongs to user
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if transaction is already reported
    const existingReport = await this.prisma.transactionReport.findFirst({
      where: {
        transactionId,
        userId,
      },
    });

    if (existingReport) {
      throw new BadRequestException('Transaction has already been reported');
    }

    // Create transaction report
    const report = await this.prisma.transactionReport.create({
      data: {
        userId,
        transactionId,
        reason: reason as any,
        description,
        status: 'PENDING',
      },
    });

    console.log('✅ [AUTH] Transaction reported successfully');

    return {
      success: true,
      message: 'Transaction reported successfully',
      reportId: report.id,
    };
  }

  // Get user transaction reports
  async getUserTransactionReports(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<GetTransactionReportsResponseDto> {
    console.log('🔍 [AUTH] Get user transaction reports:', { userId, limit, offset });

    const [reports, total] = await Promise.all([
      this.prisma.transactionReport.findMany({
        where: { userId },
        include: {
          transaction: {
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
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.transactionReport.count({ where: { userId } }),
    ]);

    const formattedReports = await Promise.all(reports.map(async (report) => {
      // Get transaction details
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: report.transactionId },
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
        console.warn('Transaction not found for report:', report.id);
        return null;
      }
      const metadata = transaction.metadata || {};
      const user = transaction.user;
      
      // Get wallet separately since it's not included in transaction
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: user.id },
      });

      return {
        id: report.id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          status: transaction.status,
          reference: transaction.reference,
          description: transaction.description,
          source: this.buildTransactionSource(transaction, metadata, user, wallet),
          destination: this.buildTransactionDestination(transaction, metadata, user, wallet),
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
        },
      };
    }));

    // Filter out null reports
    const validReports = formattedReports.filter(report => report !== null);

    console.log('✅ [AUTH] User transaction reports retrieved successfully');

    return {
      success: true,
      reports: validReports,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  // Build transaction source
  private buildTransactionSource(transaction: any, metadata: any, user: any, wallet: any) {
    if (transaction.type === 'WITHDRAWAL' || transaction.type === 'TRANSFER') {
      return {
        type: 'WALLET',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
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
  private buildTransactionDestination(transaction: any, metadata: any, user: any, wallet: any) {
    if (transaction.type === 'DEPOSIT') {
      return {
        type: 'WALLET',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
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
      effectiveAmount: metadata.balanceImpact.effectiveAmount || transaction.amount,
    };
  }
} 