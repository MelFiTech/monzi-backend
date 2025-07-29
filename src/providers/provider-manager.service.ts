import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  IWalletProvider,
  WalletProvider,
} from './base/wallet-provider.interface';
import { PolarisWalletProvider } from './polaris/polaris-wallet.provider';
import { SmePlugWalletProvider } from './smeplug/smeplug-wallet.provider';
import { BudPayWalletProvider } from './budpay/budpay-wallet.provider';
import { NyraWalletProvider } from './nyra/nyra-wallet.provider';

export interface ProviderConfiguration {
  id: string;
  name: string;
  provider: WalletProvider;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProviderManagerService {
  private readonly logger = new Logger(ProviderManagerService.name);
  private readonly providers: Map<WalletProvider, IWalletProvider> = new Map();
  private adminConfiguredProvider: WalletProvider | null = null; // Admin-set provider takes precedence

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private polarisWalletProvider: PolarisWalletProvider,
    private smePlugWalletProvider: SmePlugWalletProvider,
    private budPayWalletProvider: BudPayWalletProvider,
    private nyraWalletProvider: NyraWalletProvider,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Register all available providers
    this.providers.set(WalletProvider.POLARIS, this.polarisWalletProvider);
    this.providers.set(WalletProvider.SMEPLUG, this.smePlugWalletProvider);
    this.providers.set(WalletProvider.BUDPAY, this.budPayWalletProvider);
    this.providers.set(WalletProvider.NYRA, this.nyraWalletProvider);

    this.logger.log(`Initialized ${this.providers.size} wallet providers`);
  }

  /**
   * Get the currently active wallet provider based on global configuration
   * Priority: 1. Admin-configured > 2. Environment variable > 3. SME Plug fallback
   */
  async getActiveWalletProvider(): Promise<IWalletProvider> {
    try {
      // First priority: Admin-configured provider
      if (this.adminConfiguredProvider) {
        const provider = this.providers.get(this.adminConfiguredProvider);
        if (provider) {
          this.logger.log(
            `Using admin-configured provider: ${this.adminConfiguredProvider}`,
          );
          return provider;
        }
      }

      // Second priority: Environment variable
      const envProvider = this.configService.get<string>(
        'DEFAULT_WALLET_PROVIDER',
        'SMEPLUG',
      ) as WalletProvider;
      const provider = this.providers.get(envProvider);

      if (provider) {
        this.logger.log(
          `Using environment-configured provider: ${envProvider}`,
        );
        return provider;
      }

      // Ultimate fallback to SME Plug
      this.logger.warn(
        'No valid provider configuration found, falling back to SME Plug',
      );
      return this.providers.get(WalletProvider.SMEPLUG);
    } catch (error) {
      this.logger.error(
        'Error getting active provider, falling back to SME Plug:',
        error,
      );
      return this.providers.get(WalletProvider.SMEPLUG);
    }
  }

  /**
   * Switch the global wallet provider (Admin function)
   */
  async switchWalletProvider(
    newProvider: WalletProvider,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Switching wallet provider to: ${newProvider}`);

    if (!this.providers.has(newProvider)) {
      throw new BadRequestException(`Provider ${newProvider} is not available`);
    }

    try {
      // Store admin-configured provider (takes precedence over environment)
      this.adminConfiguredProvider = newProvider;

      this.logger.log(
        `Successfully switched wallet provider to: ${newProvider} (admin override)`,
      );

      return {
        success: true,
        message: `Wallet provider successfully switched to ${newProvider}`,
      };
    } catch (error) {
      this.logger.error('Error switching wallet provider:', error);
      throw new BadRequestException('Failed to switch wallet provider');
    }
  }

  /**
   * Clear admin override and revert to environment configuration
   */
  async clearAdminOverride(): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      'Clearing admin provider override, reverting to environment configuration',
    );

    this.adminConfiguredProvider = null;

    const envProvider = this.configService.get<string>(
      'DEFAULT_WALLET_PROVIDER',
      'SMEPLUG',
    );
    this.logger.log(`Reverted to environment provider: ${envProvider}`);

    return {
      success: true,
      message: `Reverted to environment-configured provider: ${envProvider}`,
    };
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<
    Array<{ name: string; provider: WalletProvider; isActive: boolean }>
  > {
    // Get the actual active provider using our priority logic
    const activeProvider = await this.getActiveWalletProvider();
    const activeProviderName = activeProvider.getProviderName();

    return Array.from(this.providers.entries()).map(([provider, instance]) => ({
      name: instance.getProviderName(),
      provider,
      isActive: instance.getProviderName() === activeProviderName,
    }));
  }

  /**
   * Get current active provider name
   */
  async getCurrentProviderName(): Promise<string> {
    const provider = await this.getActiveWalletProvider();
    return provider.getProviderName();
  }

  /**
   * Get a specific wallet provider by name
   */
  async getWalletProvider(
    providerName: WalletProvider,
  ): Promise<IWalletProvider> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BadRequestException(
        `Provider ${providerName} is not available`,
      );
    }
    return provider;
  }

  /**
   * Validate provider configuration
   */
  async validateProviderConfiguration(
    provider: WalletProvider,
  ): Promise<boolean> {
    try {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        return false;
      }

      // Test the provider by attempting to get its name
      const providerName = providerInstance.getProviderName();
      return !!providerName;
    } catch (error) {
      this.logger.error(`Error validating provider ${provider}:`, error);
      return false;
    }
  }

  async getWalletBalance(accountNumber: string): Promise<number> {
    try {
      const activeProvider = await this.getActiveWalletProvider();
      const result = await activeProvider.getWalletBalance({ accountNumber });
      return result.balance;
    } catch (error) {
      this.logger.error(
        `Error getting wallet balance for ${accountNumber}:`,
        error,
      );
      throw new BadRequestException(
        'Failed to get wallet balance from provider',
      );
    }
  }
}
