import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TransactionStatus,
  TransactionType,
  WalletTransactionType,
} from '@prisma/client';
import { CreateAuditorMetricsDto } from '../dto/auditor.dto';

interface MetricsData {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  averageTransaction: number;
  successRate: number;
  failureRate: number;
  fraudAlerts: number;
  systemHealth: number;
  metadata: {
    transactionsByType: Record<string, number>;
    transactionsByStatus: Record<string, number>;
    walletTransactionsByType: Record<string, number>;
    topUsers: Array<{
      userId: string;
      transactionCount: number;
      totalVolume: number;
    }>;
    timeSeriesData: Array<{ date: string; count: number; volume: number }>;
    systemStats: {
      avgProcessingTime: number;
      errorRate: number;
      uptime: number;
    };
  };
}

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collect comprehensive metrics for a given period
   */
  async collectMetrics(
    period: string,
    periodType: string = 'daily',
    options?: {
      realTime?: boolean;
      userIds?: string[];
      transactionTypes?: TransactionType[];
    },
  ): Promise<MetricsData> {
    try {
      this.logger.debug(`📊 Collecting metrics for ${period} (${periodType})`);

      const { startDate, endDate } = this.parsePeriod(period, periodType);

      const [userMetrics, transactionMetrics, walletMetrics, systemMetrics] =
        await Promise.all([
          this.collectUserMetrics(startDate, endDate, options),
          this.collectTransactionMetrics(startDate, endDate, options),
          this.collectWalletMetrics(startDate, endDate, options),
          this.collectSystemMetrics(startDate, endDate),
        ]);

      const metrics: MetricsData = {
        totalUsers: userMetrics.totalUsers,
        totalTransactions: transactionMetrics.totalTransactions,
        totalVolume: transactionMetrics.totalVolume,
        averageTransaction: transactionMetrics.averageTransaction,
        successRate: transactionMetrics.successRate,
        failureRate: transactionMetrics.failureRate,
        fraudAlerts: systemMetrics.fraudAlerts,
        systemHealth: systemMetrics.systemHealth,
        metadata: {
          transactionsByType: transactionMetrics.transactionsByType,
          transactionsByStatus: transactionMetrics.transactionsByStatus,
          walletTransactionsByType: walletMetrics.walletTransactionsByType,
          topUsers: userMetrics.topUsers,
          timeSeriesData: transactionMetrics.timeSeriesData,
          systemStats: systemMetrics.systemStats,
        },
      };

      this.logger.debug('✅ Metrics collection completed');
      return metrics;
    } catch (error) {
      this.logger.error('❌ Error collecting metrics:', error);
      throw error;
    }
  }

  /**
   * Collect user-related metrics
   */
  private async collectUserMetrics(
    startDate: Date,
    endDate: Date,
    options?: any,
  ): Promise<{
    totalUsers: number;
    topUsers: Array<{
      userId: string;
      transactionCount: number;
      totalVolume: number;
    }>;
  }> {
    const userFilter = options?.userIds?.length
      ? { id: { in: options.userIds } }
      : {};

    const [totalUsers, topUsers] = await Promise.all([
      this.prisma.user.count({
        where: {
          ...userFilter,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          ...userFilter,
          transactions: {
            some: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        select: {
          id: true,
          transactions: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            select: {
              amount: true,
            },
          },
        },
        take: 10,
      }),
    ]);

    const processedTopUsers = topUsers.map((user) => ({
      userId: user.id,
      transactionCount: user.transactions.length,
      totalVolume: user.transactions.reduce((sum, tx) => sum + tx.amount, 0),
    }));

    return {
      totalUsers,
      topUsers: processedTopUsers,
    };
  }

  /**
   * Collect transaction-related metrics
   */
  private async collectTransactionMetrics(
    startDate: Date,
    endDate: Date,
    options?: any,
  ): Promise<{
    totalTransactions: number;
    totalVolume: number;
    averageTransaction: number;
    successRate: number;
    failureRate: number;
    transactionsByType: Record<string, number>;
    transactionsByStatus: Record<string, number>;
    timeSeriesData: Array<{ date: string; count: number; volume: number }>;
  }> {
    const transactionFilter: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (options?.userIds?.length) {
      transactionFilter.userId = { in: options.userIds };
    }

    if (options?.transactionTypes?.length) {
      transactionFilter.type = { in: options.transactionTypes };
    }

    const [
      totalTransactions,
      transactionSummary,
      transactionsByType,
      transactionsByStatus,
      timeSeriesData,
    ] = await Promise.all([
      this.prisma.transaction.count({ where: transactionFilter }),
      this.prisma.transaction.aggregate({
        where: transactionFilter,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: transactionFilter,
        _count: { _all: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: transactionFilter,
        _count: { _all: true },
      }),
      this.collectTimeSeriesData(startDate, endDate, transactionFilter),
    ]);

    const totalVolume = transactionSummary._sum.amount || 0;
    const averageTransaction = transactionSummary._avg.amount || 0;

    const typeBreakdown = transactionsByType.reduce(
      (acc, item) => {
        acc[item.type] = item._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    const statusBreakdown = transactionsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    const completedCount = statusBreakdown[TransactionStatus.COMPLETED] || 0;
    const failedCount = statusBreakdown[TransactionStatus.FAILED] || 0;
    const successRate =
      totalTransactions > 0 ? (completedCount / totalTransactions) * 100 : 0;
    const failureRate =
      totalTransactions > 0 ? (failedCount / totalTransactions) * 100 : 0;

    return {
      totalTransactions,
      totalVolume,
      averageTransaction,
      successRate,
      failureRate,
      transactionsByType: typeBreakdown,
      transactionsByStatus: statusBreakdown,
      timeSeriesData,
    };
  }

  /**
   * Collect wallet transaction metrics
   */
  private async collectWalletMetrics(
    startDate: Date,
    endDate: Date,
    options?: any,
  ): Promise<{
    walletTransactionsByType: Record<string, number>;
  }> {
    const walletTransactionsByType =
      await this.prisma.walletTransaction.groupBy({
        by: ['type'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { _all: true },
      });

    const typeBreakdown = walletTransactionsByType.reduce(
      (acc, item) => {
        acc[item.type] = item._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      walletTransactionsByType: typeBreakdown,
    };
  }

  /**
   * Collect system health metrics
   */
  private async collectSystemMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    fraudAlerts: number;
    systemHealth: number;
    systemStats: {
      avgProcessingTime: number;
      errorRate: number;
      uptime: number;
    };
  }> {
    // For now, simulate fraud alerts based on failed transactions
    const fraudAlerts = await this.prisma.transaction.count({
      where: {
        status: TransactionStatus.FAILED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate system health based on various factors
    const totalTransactions = await this.prisma.transaction.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const failedTransactions = await this.prisma.transaction.count({
      where: {
        status: TransactionStatus.FAILED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const errorRate =
      totalTransactions > 0
        ? (failedTransactions / totalTransactions) * 100
        : 0;
    const systemHealth = Math.max(0, 100 - errorRate);

    return {
      fraudAlerts,
      systemHealth,
      systemStats: {
        avgProcessingTime: 2.5, // Simulated
        errorRate,
        uptime: 99.9, // Simulated
      },
    };
  }

  /**
   * Collect time series data for transactions
   */
  private async collectTimeSeriesData(
    startDate: Date,
    endDate: Date,
    transactionFilter: any,
  ): Promise<Array<{ date: string; count: number; volume: number }>> {
    const timeSeriesData = await this.prisma.transaction.groupBy({
      by: ['createdAt'],
      where: transactionFilter,
      _count: { _all: true },
      _sum: { amount: true },
    });

    // Group by date and aggregate
    const dateGroups = timeSeriesData.reduce(
      (acc, item) => {
        const date = item.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { count: 0, volume: 0 };
        }
        acc[date].count += item._count._all;
        acc[date].volume += item._sum.amount || 0;
        return acc;
      },
      {} as Record<string, { count: number; volume: number }>,
    );

    return Object.entries(dateGroups).map(([date, data]) => ({
      date,
      count: data.count,
      volume: data.volume,
    }));
  }

  /**
   * Parse period string into start and end dates
   */
  private parsePeriod(
    period: string,
    periodType: string,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);

    if (period === 'current') {
      switch (periodType) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
    } else {
      // Try to parse as date range
      const matches = period.match(/last_(\d+)_(\w+)/);
      if (matches) {
        const amount = parseInt(matches[1]);
        const unit = matches[2];

        switch (unit) {
          case 'days':
            startDate.setDate(now.getDate() - amount);
            break;
          case 'weeks':
            startDate.setDate(now.getDate() - amount * 7);
            break;
          case 'months':
            startDate.setMonth(now.getMonth() - amount);
            break;
          case 'years':
            startDate.setFullYear(now.getFullYear() - amount);
            break;
        }
      } else {
        // Default to last 30 days
        startDate.setDate(now.getDate() - 30);
      }
    }

    return { startDate, endDate };
  }

  /**
   * Store metrics in database
   */
  async storeMetrics(
    metricsData: MetricsData,
    period: string,
    periodType: string,
  ): Promise<void> {
    try {
      await this.prisma.auditorMetrics.upsert({
        where: {
          period_periodType: {
            period,
            periodType,
          },
        },
        update: {
          ...metricsData,
          updatedAt: new Date(),
        },
        create: {
          period,
          periodType,
          ...metricsData,
        },
      });

      this.logger.debug(`📊 Stored metrics for ${period} (${periodType})`);
    } catch (error) {
      this.logger.error('❌ Error storing metrics:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<MetricsData> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    return this.collectMetrics('current', 'daily', { realTime: true });
  }

  /**
   * Get stored metrics
   */
  async getStoredMetrics(
    period: string,
    periodType: string,
  ): Promise<MetricsData | null> {
    try {
      const storedMetrics = await this.prisma.auditorMetrics.findUnique({
        where: {
          period_periodType: {
            period,
            periodType,
          },
        },
      });

      if (!storedMetrics) {
        return null;
      }

      return {
        totalUsers: storedMetrics.totalUsers,
        totalTransactions: storedMetrics.totalTransactions,
        totalVolume: storedMetrics.totalVolume,
        averageTransaction: storedMetrics.averageTransaction,
        successRate: storedMetrics.successRate,
        failureRate: storedMetrics.failureRate,
        fraudAlerts: storedMetrics.fraudAlerts,
        systemHealth: storedMetrics.systemHealth,
        metadata: storedMetrics.metadata as any,
      };
    } catch (error) {
      this.logger.error('❌ Error getting stored metrics:', error);
      return null;
    }
  }

  /**
   * Get system health summary
   */
  async getSystemHealthSummary(): Promise<{
    overallHealth: number;
    uptime: number;
    errorRate: number;
    activeUsers: number;
    transactionVolume: number;
  }> {
    const metrics = await this.getRealTimeMetrics();

    return {
      overallHealth: metrics.systemHealth,
      uptime: metrics.metadata.systemStats.uptime,
      errorRate: metrics.metadata.systemStats.errorRate,
      activeUsers: metrics.totalUsers,
      transactionVolume: metrics.totalVolume,
    };
  }
}
