import { Injectable, Logger } from '@nestjs/common';
import {
  IWalletProvider,
  WalletCreationData,
  WalletCreationResult,
  WalletBalanceData,
  WalletBalanceResult,
  WalletTransactionData,
  WalletTransactionResult,
} from '../base/wallet-provider.interface';

@Injectable()
export class SmePlugWalletProvider implements IWalletProvider {
  private readonly logger = new Logger(SmePlugWalletProvider.name);

  constructor() {
    this.logger.log('SME Plug Wallet Provider initialized');
  }

  getProviderName(): string {
    return 'SMEPLUG';
  }

  async createWallet(data: WalletCreationData): Promise<WalletCreationResult> {
    this.logger.log(
      `Creating SME Plug wallet for: ${data.firstName} ${data.lastName}`,
    );

    try {
      // Generate virtual account number (10 digits starting with 903)
      const accountNumber =
        '903' +
        Math.floor(Math.random() * 10000000)
          .toString()
          .padStart(7, '0');
      const accountName = data.accountName;

      return {
        success: true,
        message: 'Wallet created successfully',
        data: {
          accountNumber,
          accountName,
          customerId: `SMEPLUG_${Date.now()}`,
          bankName: 'SME Plug Virtual Bank',
          bankCode: '000',
          currency: 'NGN',
          status: 'ACTIVE',
          providerReference: `REF_${Date.now()}`,
          metadata: {
            provider: 'SMEPLUG',
            accountType: 'VIRTUAL',
            createdOn: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error('SME Plug wallet creation error:', error);

      return {
        success: false,
        message: 'Wallet creation failed',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  async getWalletBalance(
    data: WalletBalanceData,
  ): Promise<WalletBalanceResult> {
    this.logger.log(
      `Getting wallet balance for account: ${data.accountNumber}`,
    );

    // For now, return a mock balance
    return {
      success: true,
      balance: 0.0,
      currency: 'NGN',
      accountNumber: data.accountNumber,
    };
  }

  async processTransaction(
    data: WalletTransactionData,
  ): Promise<WalletTransactionResult> {
    this.logger.log(`Processing transaction: ${data.reference}`);

    return {
      success: false,
      message:
        'Transaction processing not fully implemented for SME Plug provider',
      error: 'Transaction processing requires additional integration',
    };
  }
}
