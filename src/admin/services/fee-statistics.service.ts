import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FeeStatistics {
  totalFees: number;
  totalTransactions: number;
  averageFee: number;
  feesByType: Record<string, number>;
  feesByStatus: Record<string, number>;
  feesByProvider: Record<string, number>;
}

export interface PeriodFeeStatistics extends FeeStatistics {
  period: string;
  startDate: Date;
  endDate: Date;
  dailyBreakdown: Array<{
    date: string;
    fees: number;
    transactions: number;
  }>;
}

@Injectable()
export class FeeStatisticsService {
  private readonly logger = new Logger(FeeStatisticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overall fee statistics (all time)
   */
  async getOverallFeeStatistics(): Promise<FeeStatistics> {
    try {
      this.logger.log('📊 [FEE STATS] Getting overall fee statistics');

      const [
        walletTransactionStats,
        transactionStats,
        feesByType,
        feesByStatus,
        feesByProvider,
      ] = await Promise.all([
        // Get wallet transaction fee statistics
        this.prisma.walletTransaction.aggregate({
          _sum: { fee: true },
          _count: { _all: true },
          _avg: { fee: true },
        }),
        // Get main transaction count
        this.prisma.transaction.count(),
        // Get fees by transaction type
        this.prisma.walletTransaction.groupBy({
          by: ['type'],
          _sum: { fee: true },
          _count: { _all: true },
        }),
        // Get fees by transaction status
        this.prisma.walletTransaction.groupBy({
          by: ['status'],
          _sum: { fee: true },
          _count: { _all: true },
        }),
        // Get fees by provider (from metadata)
        this.getFeesByProvider(),
      ]);

      const totalFees = walletTransactionStats._sum.fee || 0;
      const totalTransactions = walletTransactionStats._count._all;
      const averageFee = walletTransactionStats._avg.fee || 0;

      // Process type breakdown
      const typeBreakdown = feesByType.reduce((acc, item) => {
        acc[item.type] = item._sum.fee || 0;
        return acc;
      }, {} as Record<string, number>);

      // Process status breakdown
      const statusBreakdown = feesByStatus.reduce((acc, item) => {
        acc[item.status] = item._sum.fee || 0;
        return acc;
      }, {} as Record<string, number>);

      this.logger.log('✅ [FEE STATS] Overall fee statistics calculated successfully');

      return {
        totalFees,
        totalTransactions,
        averageFee,
        feesByType: typeBreakdown,
        feesByStatus: statusBreakdown,
        feesByProvider,
      };
    } catch (error) {
      this.logger.error('❌ [FEE STATS] Error getting overall fee statistics:', error);
      throw error;
    }
  }

  /**
   * Get fee statistics for a specific period
   */
  async getPeriodFeeStatistics(
    startDate: Date,
    endDate: Date,
    period: string = 'custom',
  ): Promise<PeriodFeeStatistics> {
    try {
      this.logger.log(`📊 [FEE STATS] Getting fee statistics for period: ${period}`);

      const [
        walletTransactionStats,
        transactionStats,
        feesByType,
        feesByStatus,
        feesByProvider,
        dailyBreakdown,
      ] = await Promise.all([
        // Get wallet transaction fee statistics for period
        this.prisma.walletTransaction.aggregate({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { fee: true },
          _count: { _all: true },
          _avg: { fee: true },
        }),
        // Get main transaction count for period
        this.prisma.transaction.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        // Get fees by transaction type for period
        this.prisma.walletTransaction.groupBy({
          by: ['type'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { fee: true },
          _count: { _all: true },
        }),
        // Get fees by transaction status for period
        this.prisma.walletTransaction.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { fee: true },
          _count: { _all: true },
        }),
        // Get fees by provider for period
        this.getFeesByProvider(startDate, endDate),
        // Get daily breakdown
        this.getDailyFeeBreakdown(startDate, endDate),
      ]);

      const totalFees = walletTransactionStats._sum.fee || 0;
      const totalTransactions = walletTransactionStats._count._all;
      const averageFee = walletTransactionStats._avg.fee || 0;

      // Process type breakdown
      const typeBreakdown = feesByType.reduce((acc, item) => {
        acc[item.type] = item._sum.fee || 0;
        return acc;
      }, {} as Record<string, number>);

      // Process status breakdown
      const statusBreakdown = feesByStatus.reduce((acc, item) => {
        acc[item.status] = item._sum.fee || 0;
        return acc;
      }, {} as Record<string, number>);

      this.logger.log(`✅ [FEE STATS] Period fee statistics calculated successfully for ${period}`);

      return {
        totalFees,
        totalTransactions,
        averageFee,
        feesByType: typeBreakdown,
        feesByStatus: statusBreakdown,
        feesByProvider,
        period,
        startDate,
        endDate,
        dailyBreakdown,
      };
    } catch (error) {
      this.logger.error(`❌ [FEE STATS] Error getting period fee statistics for ${period}:`, error);
      throw error;
    }
  }

  /**
   * Get today's fee statistics
   */
  async getTodayFeeStatistics(): Promise<PeriodFeeStatistics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getPeriodFeeStatistics(today, tomorrow, 'today');
  }

  /**
   * Get this week's fee statistics
   */
  async getThisWeekFeeStatistics(): Promise<PeriodFeeStatistics> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    return this.getPeriodFeeStatistics(startOfWeek, today, 'this_week');
  }

  /**
   * Get this month's fee statistics
   */
  async getThisMonthFeeStatistics(): Promise<PeriodFeeStatistics> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.getPeriodFeeStatistics(startOfMonth, today, 'this_month');
  }

  /**
   * Get last 30 days fee statistics
   */
  async getLast30DaysFeeStatistics(): Promise<PeriodFeeStatistics> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    return this.getPeriodFeeStatistics(thirtyDaysAgo, today, 'last_30_days');
  }

  /**
   * Get fees by provider from metadata
   */
  private async getFeesByProvider(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    try {
      const whereClause: any = {};
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Get wallet transactions with provider metadata
      const transactions = await this.prisma.walletTransaction.findMany({
        where: whereClause,
        select: {
          fee: true,
          metadata: true,
        },
      });

      const providerFees: Record<string, number> = {};

      transactions.forEach((tx) => {
        if (tx.metadata && typeof tx.metadata === 'object') {
          const metadata = tx.metadata as any;
          const provider = metadata.provider || metadata.feeType || 'UNKNOWN';
          
          if (!providerFees[provider]) {
            providerFees[provider] = 0;
          }
          
          providerFees[provider] += tx.fee || 0;
        }
      });

      return providerFees;
    } catch (error) {
      this.logger.error('❌ [FEE STATS] Error getting fees by provider:', error);
      return {};
    }
  }

  /**
   * Get daily fee breakdown for a period
   */
  private async getDailyFeeBreakdown(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; fees: number; transactions: number }>> {
    try {
      const dailyStats = await this.prisma.walletTransaction.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { fee: true },
        _count: { _all: true },
      });

      // Group by date (ignoring time)
      const dateMap = new Map<string, { fees: number; transactions: number }>();

      dailyStats.forEach((stat) => {
        const dateKey = stat.createdAt.toISOString().split('T')[0];
        
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { fees: 0, transactions: 0 });
        }
        
        const current = dateMap.get(dateKey)!;
        current.fees += stat._sum.fee || 0;
        current.transactions += stat._count._all;
      });

      // Convert to array and sort by date
      return Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date,
          fees: stats.fees,
          transactions: stats.transactions,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      this.logger.error('❌ [FEE STATS] Error getting daily fee breakdown:', error);
      return [];
    }
  }
}
