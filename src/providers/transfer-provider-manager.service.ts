import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { 
  TransferProviderInterface, 
  TransferProvider,
  BankTransferData,
  BankTransferResult,
  BankListResult,
  AccountVerificationData,
  AccountVerificationResult
} from './base/transfer-provider.interface';
import { BudPayTransferProvider } from './budpay/budpay-transfer.provider';
import { SmePlugTransferProvider } from './smeplug/smeplug-transfer.provider';

@Injectable()
export class TransferProviderManagerService {
  private readonly logger = new Logger(TransferProviderManagerService.name);
  private readonly providers: Map<TransferProvider, TransferProviderInterface> = new Map();

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    private budPayTransferProvider: BudPayTransferProvider,
    private smePlugTransferProvider: SmePlugTransferProvider,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Register all available transfer providers
    this.providers.set(TransferProvider.BUDPAY, this.budPayTransferProvider);
    this.providers.set(TransferProvider.SMEPLUG, this.smePlugTransferProvider);
    
    this.logger.log(`Initialized ${this.providers.size} transfer providers`);
  }

  /**
   * Get the currently active transfer provider based on global configuration
   * Priority: 1. Database admin-configured > 2. Environment variable > 3. SME Plug fallback
   */
  async getActiveTransferProvider(): Promise<TransferProviderInterface> {
    try {
      // First priority: Database admin-configured provider
      const adminProvider = await this.getAdminConfiguredProvider();
      if (adminProvider) {
        const provider = this.providers.get(adminProvider);
        if (provider) {
          this.logger.log(`Using admin-configured transfer provider: ${adminProvider}`);
          return provider;
        }
      }

      // Second priority: Environment variable
      const envProvider = this.configService.get<string>('DEFAULT_TRANSFER_PROVIDER', 'SMEPLUG') as TransferProvider;
      const provider = this.providers.get(envProvider);
      
      if (provider) {
        this.logger.log(`Using environment-configured transfer provider: ${envProvider}`);
        return provider;
      }

      // Ultimate fallback to SME Plug
      this.logger.warn('No valid transfer provider configuration found, falling back to SME Plug');
      return this.providers.get(TransferProvider.SMEPLUG);

    } catch (error) {
      this.logger.error('Error getting active transfer provider, falling back to SME Plug:', error);
      return this.providers.get(TransferProvider.SMEPLUG);
    }
  }

  /**
   * Get admin-configured provider from database
   */
  private async getAdminConfiguredProvider(): Promise<TransferProvider | null> {
    try {
      const config = await this.prismaService.systemConfiguration.findUnique({
        where: { key: 'ACTIVE_TRANSFER_PROVIDER' }
      });
      
      if (config && config.value) {
        return config.value as TransferProvider;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error fetching admin-configured provider:', error);
      return null;
    }
  }

  /**
   * Get current transfer provider name
   */
  async getCurrentProviderName(): Promise<string> {
    const adminProvider = await this.getAdminConfiguredProvider();
    if (adminProvider) {
      return adminProvider;
    }
    return this.configService.get<string>('DEFAULT_TRANSFER_PROVIDER', 'SMEPLUG');
  }

  /**
   * Switch the global transfer provider (Admin function)
   */
  async switchTransferProvider(newProvider: TransferProvider): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Switching transfer provider to: ${newProvider}`);

    if (!this.providers.has(newProvider)) {
      throw new BadRequestException(`Transfer provider ${newProvider} is not available`);
    }

    try {
      // Store in database for persistence
      await this.prismaService.systemConfiguration.upsert({
        where: { key: 'ACTIVE_TRANSFER_PROVIDER' },
        update: { 
          value: newProvider,
          description: `Active transfer provider set by admin`,
          updatedAt: new Date()
        },
        create: {
          key: 'ACTIVE_TRANSFER_PROVIDER',
          value: newProvider,
          description: `Active transfer provider set by admin`
        }
      });
      
      this.logger.log(`Successfully switched transfer provider to: ${newProvider} (admin override - persisted to database)`);
      
      return {
        success: true,
        message: `Transfer provider successfully switched to ${newProvider}`,
      };

    } catch (error) {
      this.logger.error('Error switching transfer provider:', error);
      throw new BadRequestException('Failed to switch transfer provider');
    }
  }

  /**
   * Get list of available transfer providers
   */
  getAvailableProviders(): TransferProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Transfer money using the active provider
   */
  async transferToBank(data: BankTransferData): Promise<BankTransferResult> {
    const provider = await this.getActiveTransferProvider();
    const currentProvider = await this.getCurrentProviderName();
    this.logger.log(`Executing bank transfer via ${currentProvider}`);
    return provider.transferToBank(data);
  }

  /**
   * Get bank list using the active provider
   */
  async getBankList(): Promise<BankListResult> {
    const provider = await this.getActiveTransferProvider();
    const currentProvider = await this.getCurrentProviderName();
    this.logger.log(`Fetching bank list via ${currentProvider}`);
    return provider.getBankList();
  }

  /**
   * Verify account using the active provider
   */
  async verifyAccount(data: AccountVerificationData): Promise<AccountVerificationResult> {
    const provider = await this.getActiveTransferProvider();
    const currentProvider = await this.getCurrentProviderName();
    this.logger.log(`Verifying account via ${currentProvider}`);
    return provider.verifyAccount(data);
  }

  /**
   * Get provider-specific information
   */
  async getProviderInfo() {
    const currentProvider = await this.getCurrentProviderName();
    const availableProviders = this.getAvailableProviders();
    const isAdminConfigured = !!(await this.getAdminConfiguredProvider());

    return {
      currentProvider,
      availableProviders,
      isAdminConfigured,
    };
  }
} 