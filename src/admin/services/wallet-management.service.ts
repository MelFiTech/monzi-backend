import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderManagerService } from '../../providers/provider-manager.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import {
  WalletFreezeResponse,
  TotalWalletBalanceResponse,
  ProviderWalletDetailsResponse,
  GetProviderWalletDetailsQueryDto,
} from '../dto/admin.dto';

@Injectable()
export class WalletManagementService {
  constructor(
    private prisma: PrismaService,
    private providerManager: ProviderManagerService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async getWalletBalance(params: {
    userId?: string;
    email?: string;
    accountNumber?: string;
  }): Promise<{
    success: boolean;
    userId: string;
    userEmail: string;
    balance: number;
    currency: string;
    formattedBalance: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    provider: string;
  }> {
    console.log('💰 [WALLET SERVICE] Getting wallet balance for:', params);

    try {
      let wallet;

      if (params.userId) {
        wallet = await this.prisma.wallet.findFirst({
          where: { userId: params.userId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });
      } else if (params.email) {
        const user = await this.prisma.user.findUnique({
          where: { email: params.email },
        });
        if (user) {
          wallet = await this.prisma.wallet.findFirst({
            where: { userId: user.id },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          });
        }
      } else if (params.accountNumber) {
        wallet = await this.prisma.wallet.findUnique({
          where: { virtualAccountNumber: params.accountNumber },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });
      }

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const formattedBalance = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }).format(wallet.balance);

      console.log('✅ [WALLET SERVICE] Wallet balance retrieved successfully');

      return {
        success: true,
        userId: wallet.user.id,
        userEmail: wallet.user.email,
        balance: wallet.balance,
        currency: 'NGN',
        formattedBalance,
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName,
        bankName: wallet.bankName,
        provider: wallet.provider,
      };
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error getting wallet balance:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get wallet balance');
    }
  }

  async getTotalWalletBalance(): Promise<TotalWalletBalanceResponse> {
    console.log('📊 [WALLET SERVICE] Getting total wallet balance');

    try {
      const [totalBalance, totalWallets, activeWallets, frozenWallets] =
        await Promise.all([
          this.prisma.wallet.aggregate({
            _sum: { balance: true },
          }),
          this.prisma.wallet.count(),
          this.prisma.wallet.count({
            where: { isFrozen: false },
          }),
          this.prisma.wallet.count({
            where: { isFrozen: true },
          }),
        ]);

      const total = totalBalance._sum.balance || 0;
      const averageBalance = totalWallets > 0 ? total / totalWallets : 0;

      const formattedTotalBalance = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }).format(total);

      const formattedAverageBalance = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }).format(averageBalance);

      console.log(
        '✅ [WALLET SERVICE] Total wallet balance retrieved successfully',
      );

      return {
        success: true,
        message: 'Total wallet balance retrieved successfully',
        totalBalance: total,
        formattedTotalBalance,
        totalWallets,
        activeWallets,
        frozenWallets,
        averageBalance,
        formattedAverageBalance,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        '❌ [WALLET SERVICE] Error getting total wallet balance:',
        error,
      );
      throw new BadRequestException('Failed to get total wallet balance');
    }
  }

  async freezeWallet(
    freezeWalletDto: {
      userId?: string;
      email?: string;
      accountNumber?: string;
      reason?: string;
    },
    adminId: string,
    adminEmail: string,
  ): Promise<WalletFreezeResponse> {
    console.log('❄️ [WALLET SERVICE] Freezing wallet:', freezeWalletDto);

    try {
      let wallet;

      if (freezeWalletDto.userId) {
        wallet = await this.prisma.wallet.findFirst({
          where: { userId: freezeWalletDto.userId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });
      } else if (freezeWalletDto.email) {
        const user = await this.prisma.user.findUnique({
          where: { email: freezeWalletDto.email },
        });
        if (user) {
          wallet = await this.prisma.wallet.findFirst({
            where: { userId: user.id },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          });
        }
      } else if (freezeWalletDto.accountNumber) {
        wallet = await this.prisma.wallet.findUnique({
          where: { virtualAccountNumber: freezeWalletDto.accountNumber },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });
      }

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.isFrozen) {
        throw new BadRequestException('Wallet is already frozen');
      }

      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          isFrozen: true,
          metadata: {
            frozenAt: new Date().toISOString(),
            freezeReason: freezeWalletDto.reason,
          },
        },
      });

      console.log('✅ [WALLET SERVICE] Wallet frozen successfully');

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // General notification for wallet freeze
        this.notificationsGateway.emitNotification(wallet.user.id, {
          title: 'Wallet Frozen by Admin',
          message: `Your wallet has been frozen by an administrator. Reason: ${freezeWalletDto.reason || 'No reason provided'}`,
          type: 'warning',
          data: {
            walletId: wallet.id,
            accountNumber: wallet.virtualAccountNumber,
            freezeReason: freezeWalletDto.reason,
            adminAction: true,
          },
        });
      }

      return {
        success: true,
        message: 'Wallet frozen successfully',
        userId: wallet.user.id,
        userEmail: wallet.user.email,
        walletId: wallet.id,
        accountNumber: wallet.accountNumber,
        isFrozen: true,
        reason: freezeWalletDto.reason,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error freezing wallet:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to freeze wallet');
    }
  }

  async unfreezeWallet(
    unfreezeWalletDto: {
      userId?: string;
      email?: string;
      accountNumber?: string;
      reason?: string;
    },
    adminId: string,
    adminEmail: string,
  ): Promise<WalletFreezeResponse> {
    console.log('🔥 [WALLET SERVICE] Unfreezing wallet:', unfreezeWalletDto);

    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { virtualAccountNumber: unfreezeWalletDto.accountNumber },
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

      if (!wallet.isFrozen) {
        throw new BadRequestException('Wallet is not frozen');
      }

      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          isFrozen: false,
          metadata: {
            unfrozenAt: new Date().toISOString(),
            freezeReason: null,
          },
        },
      });

      console.log('✅ [WALLET SERVICE] Wallet unfrozen successfully');

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // General notification for wallet unfreeze
        this.notificationsGateway.emitNotification(wallet.user.id, {
          title: 'Wallet Unfrozen by Admin',
          message: `Your wallet has been unfrozen by an administrator. You can now use your wallet normally.`,
          type: 'success',
          data: {
            walletId: wallet.id,
            accountNumber: wallet.virtualAccountNumber,
            unfreezeReason: unfreezeWalletDto.reason,
            adminAction: true,
          },
        });
      }

      return {
        success: true,
        message: 'Wallet unfrozen successfully',
        userId: wallet.user.id,
        userEmail: wallet.user.email,
        walletId: wallet.id,
        accountNumber: wallet.virtualAccountNumber,
        isFrozen: false,
        reason: unfreezeWalletDto.reason,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error unfreezing wallet:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to unfreeze wallet');
    }
  }

  async getProviderWalletDetails(
    provider?: string,
  ): Promise<ProviderWalletDetailsResponse> {
    console.log(
      '🏦 [WALLET SERVICE] Getting provider wallet details for:',
      provider,
    );

    try {
      const where: any = {};
      if (provider) {
        where.provider = provider;
      }

      const wallets = await this.prisma.wallet.findMany({
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
      });

      const providerStats = await this.prisma.wallet.groupBy({
        by: ['provider'],
        _count: { id: true },
        _sum: { balance: true },
        where: provider ? { provider } : undefined,
      });

      const details = {
        provider: provider || 'ALL',
        totalWallets: wallets.length,
        totalBalance: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
        averageBalance:
          wallets.length > 0
            ? wallets.reduce((sum, wallet) => sum + wallet.balance, 0) /
              wallets.length
            : 0,
        frozenWallets: wallets.filter((wallet) => wallet.isFrozen).length,
        activeWallets: wallets.filter((wallet) => !wallet.isFrozen).length,
        providerStats,
        wallets: wallets.map((wallet) => ({
          id: wallet.id,
          accountNumber: wallet.virtualAccountNumber,
          accountName: wallet.providerAccountName,
          bankName: wallet.bankName,
          balance: wallet.balance,
          isFrozen: wallet.isFrozen,
          provider: wallet.provider,
          user: wallet.user,
        })),
      };

      console.log(
        '✅ [WALLET SERVICE] Provider wallet details retrieved successfully',
      );

      return {
        success: true,
        message: 'Provider wallet details retrieved successfully',
        provider: provider || 'ALL',
        businessId: '2c0a64ab4da2c10abfff0971',
        walletId: wallets[0]?.id || 'wallet_123456789',
        accountNumber: wallets[0]?.virtualAccountNumber || '',
        ownersFullname: wallets[0]?.user
          ? `${wallets[0].user.firstName} ${wallets[0].user.lastName}`
          : 'MONZI Business Account',
        balance: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
        formattedBalance: `₦${wallets.reduce((sum, wallet) => sum + wallet.balance, 0).toLocaleString()}`,
        frozen: wallets.some((wallet) => wallet.isFrozen),
        currency: 'NGN',
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        '❌ [WALLET SERVICE] Error getting provider wallet details:',
        error,
      );
      throw new BadRequestException('Failed to get provider wallet details');
    }
  }

  async validateWalletBalance(walletId: string) {
    console.log('🔍 [WALLET SERVICE] Validating wallet balance for:', walletId);

    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: walletId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Placeholder - implement in provider manager service
      const providerBalance = await this.providerManager.getWalletBalance(
        wallet.virtualAccountNumber,
      );

      const balanceMatch = Math.abs(wallet.balance - providerBalance) < 0.01;

      console.log('✅ [WALLET SERVICE] Wallet balance validation completed');

      return {
        success: true,
        walletId,
        localBalance: wallet.balance,
        providerBalance,
        balanceMatch,
        difference: wallet.balance - providerBalance,
        user: wallet.user,
      };
    } catch (error) {
      console.error(
        '❌ [WALLET SERVICE] Error validating wallet balance:',
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to validate wallet balance');
    }
  }

  async reconcileWalletBalance(walletId: string) {
    console.log(
      '🔄 [WALLET SERVICE] Reconciling wallet balance for:',
      walletId,
    );

    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: walletId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Get current balance from provider
      const providerBalance = await this.providerManager.getWalletBalance(
        wallet.virtualAccountNumber,
      );

      // Update local balance to match provider
      await this.prisma.wallet.update({
        where: { id: walletId },
        data: { balance: providerBalance },
      });

      console.log('✅ [WALLET SERVICE] Wallet balance reconciled successfully');

      return {
        success: true,
        walletId,
        oldBalance: wallet.balance,
        newBalance: providerBalance,
        difference: providerBalance - wallet.balance,
        user: wallet.user,
      };
    } catch (error) {
      console.error(
        '❌ [WALLET SERVICE] Error reconciling wallet balance:',
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to reconcile wallet balance');
    }
  }
}
