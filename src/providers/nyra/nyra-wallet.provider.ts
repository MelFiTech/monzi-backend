import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  WalletProvider,
  IWalletProvider,
  WalletCreationData,
  WalletCreationResult,
  WalletBalanceData,
  WalletBalanceResult,
  WalletTransactionData,
  WalletTransactionResult,
} from '../base/wallet-provider.interface';

export interface NyraVirtualAccount {
  id: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface NyraAccountBalance {
  balance: number;
  currency: string;
  account_number: string;
  status: string;
}

@Injectable()
export class NyraWalletProvider implements IWalletProvider {
  private readonly logger = new Logger(NyraWalletProvider.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('NYRA_BASE_URL');
    this.clientId = this.configService.get<string>('NYRA_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('NYRA_CLIENT_SECRET');

    if (!this.baseUrl || !this.clientId || !this.clientSecret) {
      this.logger.error('Nyra configuration missing');
      throw new Error('Nyra configuration incomplete');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    this.logger.log('Nyra Wallet Provider initialized');
  }

  private getAuthHeaders(): { [key: string]: string } {
    return {
      'x-client-id': this.clientId,
      Authorization: `Bearer ${this.clientSecret}`,
      'Content-Type': 'application/json',
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test the connection by making a simple API call
      const response = await this.axiosInstance.get('/business', {
        headers: this.getAuthHeaders(),
      });
      return response.status === 200;
    } catch (error) {
      this.logger.warn('Nyra provider not available:', error.message);
      return false;
    }
  }

  async createWallet(data: WalletCreationData): Promise<WalletCreationResult> {
    try {
      this.logger.log(`Creating wallet for user: ${data.email}`);

      const requestBody: any = {
        first_name: data.firstName,
        last_name: data.lastName,
        name_on_account: `${data.firstName} ${data.lastName}`,
        middlename: data.middleName,
        dob: data.dateOfBirth,
        gender: data.gender,
        title: data.title || 'Mr',
        address_line_1: data.address,
        address_line_2: '',
        city: data.city,
        country: data.country,
        phone_number: data.phoneNumber,
        email: data.email,
      };

      // Add BVN if provided
      if (data.bvn) {
        requestBody.bvn = data.bvn;
        this.logger.log(
          `Including BVN in wallet creation for user: ${data.email}`,
        );
      }

      const response = await this.axiosInstance.post(
        '/business/wallets',
        requestBody,
        {
          headers: this.getAuthHeaders(),
        },
      );

      this.logger.log(`Wallet created successfully for user: ${data.email}`);
      return {
        success: true,
        message: 'Wallet created successfully',
        data: {
          accountNumber: response.data.data.account_number,
          accountName: response.data.data.owners_fullname,
          customerId: response.data.data.wallet_id,
          bankName: response.data.data.bank_name || 'Unknown Bank',
          bankCode: 'NYRA',
          currency: 'NGN',
          status: response.data.data.frozen ? 'FROZEN' : 'ACTIVE',
          providerReference: response.data.data.wallet_id,
          metadata: response.data.data,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create wallet for user ${data.email}:`,
        error.message,
      );
      return {
        success: false,
        message: 'Wallet creation failed',
        error: error.message,
      };
    }
  }

  async getWalletBalance(
    data: WalletBalanceData,
  ): Promise<WalletBalanceResult> {
    try {
      this.logger.log(`Getting balance for account: ${data.accountNumber}`);

      // Get wallet balance by account number - first get all wallets to find the wallet ID
      const allWalletsResponse = await this.axiosInstance.get(
        '/business/wallets/all',
        {
          headers: this.getAuthHeaders(),
        },
      );

      // Find the wallet with matching account number
      const wallet = allWalletsResponse.data.data.find(
        (w: any) => w.account_number === data.accountNumber,
      );

      if (!wallet) {
        throw new Error(
          `Wallet with account number ${data.accountNumber} not found`,
        );
      }

      // Get specific wallet details
      const response = await this.axiosInstance.get(
        `/business/wallets/${wallet.wallet_id}`,
        {
          headers: this.getAuthHeaders(),
        },
      );

      this.logger.log(
        `Balance retrieved successfully for account: ${data.accountNumber}`,
      );
      return {
        success: true,
        balance: response.data.balance,
        currency: 'NGN',
        accountNumber: data.accountNumber,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get balance for account ${data.accountNumber}:`,
        error.message,
      );
      return {
        success: false,
        balance: 0,
        currency: 'NGN',
        accountNumber: data.accountNumber,
        error: error.message,
      };
    }
  }

  async getWalletDetails(accountNumber: string): Promise<{
    success: boolean;
    data?: {
      accountNumber: string;
      accountName: string;
      bankName: string;
      balance: number;
      status: string;
      providerReference: string;
    };
    error?: string;
  }> {
    try {
      this.logger.log(`Getting wallet details for account: ${accountNumber}`);

      // Get wallet details by account number - first get all wallets to find the wallet ID
      const allWalletsResponse = await this.axiosInstance.get(
        '/business/wallets/all',
        {
          headers: this.getAuthHeaders(),
        },
      );

      // Find the wallet with matching account number
      const wallet = allWalletsResponse.data.data.find(
        (w: any) => w.account_number === accountNumber,
      );

      if (!wallet) {
        throw new Error(
          `Wallet with account number ${accountNumber} not found`,
        );
      }

      // Get specific wallet details
      const response = await this.axiosInstance.get(
        `/business/wallets/${wallet.wallet_id}`,
        {
          headers: this.getAuthHeaders(),
        },
      );

      this.logger.log(
        `Wallet details retrieved successfully for account: ${accountNumber}`,
      );
      return {
        success: true,
        data: {
          accountNumber: response.data.account_number,
          accountName: response.data.owners_fullname,
          bankName: response.data.bank_name,
          balance: parseFloat(response.data.balance),
          status: response.data.frozen ? 'FROZEN' : 'ACTIVE',
          providerReference: response.data.wallet_id,
        },
      };
    } catch (error: any) {
      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        this.logger.warn(
          `Rate limited by NYRA API for account ${accountNumber}. Using cached data.`,
        );
        return {
          success: false,
          error: 'Rate limited - using cached data',
        };
      }

      this.logger.error(
        `Failed to get wallet details for account ${accountNumber}:`,
        error.message,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async processTransaction(
    data: WalletTransactionData,
  ): Promise<WalletTransactionResult> {
    try {
      this.logger.log(`Processing transaction: ${data.reference}`);

      // TODO: Replace with actual Nyra transfer endpoint
      const response = await this.axiosInstance.post(
        '/transfers',
        {
          amount: data.amount,
          from_account: data.fromAccountNumber,
          to_account: data.toAccountNumber,
          to_bank_code: data.toBankCode,
          reference: data.reference,
          description: data.description,
        },
        {
          headers: this.getAuthHeaders(),
        },
      );

      this.logger.log(`Transaction processed successfully: ${data.reference}`);
      return {
        success: true,
        message: 'Transaction processed successfully',
        transactionId: response.data.id,
        reference: response.data.reference,
        status: response.data.status,
        fee: response.data.fee,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process transaction ${data.reference}:`,
        error.message,
      );
      return {
        success: false,
        message: 'Transaction processing failed',
        error: error.message,
      };
    }
  }

  getProviderName(): string {
    return 'nyra';
  }

  getProviderDisplayName(): string {
    return 'Nyra';
  }
}
