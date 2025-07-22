import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { TransferProviderInterface, BankTransferData, BankTransferResult, BankListResult, AccountVerificationData, AccountVerificationResult } from '../base/transfer-provider.interface';

export interface NyraTransferRequest {
  amount: number;
  recipient_account: string;
  recipient_bank: string;
  recipient_name: string;
  narration?: string;
  reference?: string;
}

export interface NyraTransferResponse {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  status: string;
  recipient_account: string;
  recipient_name: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class NyraTransferProvider implements TransferProviderInterface {
  private readonly logger = new Logger(NyraTransferProvider.name);
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

    this.logger.log('Nyra Transfer Provider initialized');
  }

  private getAuthHeaders(): { [key: string]: string } {
    return {
      'x-client-id': this.clientId,
      'Authorization': `Bearer ${this.clientSecret}`,
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
      this.logger.warn('Nyra transfer provider not available:', error.message);
      return false;
    }
  }

  async transferToBank(data: BankTransferData): Promise<BankTransferResult> {
    try {
      this.logger.log(`Initiating bank transfer: ${data.reference}`);

      // TODO: Replace with actual Nyra transfer endpoint
      const response = await this.axiosInstance.post('/transfers', {
        amount: data.amount,
        currency: data.currency,
        account_number: data.accountNumber,
        bank_code: data.bankCode,
        bank_name: data.bankName,
        account_name: data.accountName,
        narration: data.narration,
        reference: data.reference,
        sender_name: data.senderName,
        sender_email: data.senderEmail,
        metadata: data.metadata,
      }, {
        headers: this.getAuthHeaders(),
      });

      this.logger.log(`Bank transfer initiated successfully: ${data.reference}`);
      return {
        success: true,
        message: 'Transfer initiated successfully',
        data: {
          reference: response.data.reference,
          amount: response.data.amount,
          fee: response.data.fee,
          currency: response.data.currency,
          bankCode: response.data.bank_code,
          bankName: response.data.bank_name,
          accountNumber: response.data.account_number,
          accountName: response.data.account_name,
          narration: response.data.narration,
          status: response.data.status,
          providerReference: response.data.id,
          metadata: response.data,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to initiate bank transfer ${data.reference}:`, error.message);
      return {
        success: false,
        message: 'Transfer initiation failed',
        error: error.message,
      };
    }
  }

  async getBankList(): Promise<BankListResult> {
    try {
      this.logger.log('Getting bank list from Nyra');

      // TODO: Replace with actual Nyra bank list endpoint
      const response = await this.axiosInstance.get('/banks', {
        headers: this.getAuthHeaders(),
      });

      this.logger.log('Bank list retrieved successfully');
      return {
        success: true,
        message: 'Bank list retrieved successfully',
        currency: 'NGN',
        data: response.data.banks?.map(bank => ({
          bankName: bank.name,
          bankCode: bank.code,
        })) || [],
      };
    } catch (error) {
      this.logger.error('Failed to get bank list:', error.message);
      return {
        success: false,
        message: 'Failed to get bank list',
        currency: 'NGN',
        error: error.message,
      };
    }
  }

  async verifyAccount(data: AccountVerificationData): Promise<AccountVerificationResult> {
    try {
      this.logger.log(`Verifying account: ${data.accountNumber} with bank: ${data.bankCode}`);

      // TODO: Replace with actual Nyra account verification endpoint
      const response = await this.axiosInstance.post('/verify-account', {
        account_number: data.accountNumber,
        bank_code: data.bankCode,
        currency: data.currency || 'NGN',
      }, {
        headers: this.getAuthHeaders(),
      });

      this.logger.log(`Account verification successful for: ${data.accountNumber}`);
      return {
        success: true,
        message: 'Account verification successful',
        data: {
          accountName: response.data.account_name,
          accountNumber: response.data.account_number,
          bankName: response.data.bank_name,
          bankCode: response.data.bank_code,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to verify account ${data.accountNumber}:`, error.message);
      return {
        success: false,
        message: 'Account verification failed',
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