import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  TransferProviderInterface,
  BankTransferData,
  BankTransferResult,
  BankListResult,
  AccountVerificationData,
  AccountVerificationResult,
} from '../base/transfer-provider.interface';

export interface NyraBusinessTransferRequest {
  beneficiary: {
    account_name: string;
    account_number: string;
    bank_code: string;
  };
  source_account_number: string;
  amount: number;
  description: string;
  sender_name: string;
}

export interface NyraBusinessTransferResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    reference: string;
    amount: number;
    fee: number;
    status: string;
    beneficiary: {
      account_name: string;
      account_number: string;
      bank_code: string;
    };
    created_at: string;
    updated_at: string;
  };
}

export interface NyraBankListResponse {
  success: boolean;
  message: string;
  data: Array<{
    bank_name: string;
    bank_code: string;
  }>;
}

export interface NyraNameEnquiryRequest {
  account_number: string;
  bank_code: string;
}

export interface NyraNameEnquiryResponse {
  success: boolean;
  message: string;
  data: {
    account: {
      name: string;
      number: string;
    };
    bank_name: string;
  };
}

@Injectable()
export class NyraTransferProvider implements TransferProviderInterface {
  private readonly logger = new Logger(NyraTransferProvider.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly sourceAccountNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('NYRA_BASE_URL');
    this.clientId = this.configService.get<string>('NYRA_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('NYRA_CLIENT_SECRET');
    this.sourceAccountNumber =
      this.configService.get<string>('NYRA_SOURCE_ACCOUNT_NUMBER') || '';

    if (!this.baseUrl || !this.clientId || !this.clientSecret) {
      this.logger.error('Nyra configuration missing');
      throw new Error(
        'Nyra configuration incomplete - missing baseUrl, clientId, or clientSecret',
      );
    }
    if (!this.sourceAccountNumber) {
      this.logger.warn(
        'NYRA_SOURCE_ACCOUNT_NUMBER not set - transfers will fail until configured',
      );
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // Increased to 60 seconds
    });

    this.logger.log('Nyra Transfer Provider initialized');
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
      const response = await this.axiosInstance.get('/business/wallets/float', {
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
      this.logger.log(`Initiating NYRA business transfer: ${data.reference}`);

      if (!this.sourceAccountNumber) {
        return {
          success: false,
          message: 'NYRA source account number not configured',
          error: 'NYRA_SOURCE_ACCOUNT_NUMBER environment variable is required',
        };
      }

      const nyraRequest: NyraBusinessTransferRequest = {
        beneficiary: {
          account_name: data.accountName,
          account_number: data.accountNumber,
          bank_code: data.bankCode,
        },
        source_account_number: this.sourceAccountNumber, // Use environment variable as primary source
        amount: data.amount,
        description: data.narration,
        sender_name: data.senderName,
      };

      this.logger.log(
        `NYRA transfer request:`,
        JSON.stringify(nyraRequest, null, 2),
      );

      const response =
        await this.axiosInstance.post<NyraBusinessTransferResponse>(
          '/business/transfers',
          nyraRequest,
          {
            headers: this.getAuthHeaders(),
          },
        );

      this.logger.log(`NYRA business transfer successful: ${data.reference}`);
      this.logger.log(
        `NYRA response data:`,
        JSON.stringify(response.data, null, 2),
      );

      // Handle different possible response structures
      const responseData = response.data.data || (response.data as any);
      const beneficiary = responseData.beneficiary || {
        account_name: data.accountName,
        account_number: data.accountNumber,
        bank_code: data.bankCode,
      };

      return {
        success: true,
        message: 'Transfer initiated successfully',
        data: {
          reference: responseData.reference || data.reference,
          amount: responseData.amount || data.amount,
          fee: responseData.fee || 0,
          currency: 'NGN',
          bankCode: beneficiary.bank_code || data.bankCode,
          bankName: data.bankName,
          accountNumber: beneficiary.account_number || data.accountNumber,
          accountName: beneficiary.account_name || data.accountName,
          narration: data.narration,
          status: responseData.status || 'PENDING',
          providerReference: responseData.id || responseData.reference,
          metadata: responseData,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate NYRA business transfer ${data.reference}:`,
        error.message,
      );

      // Handle specific NYRA error responses
      let errorMessage = 'Transfer initiation failed';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  async getBankList(): Promise<BankListResult> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Getting bank list from NYRA (attempt ${attempt}/${maxRetries})`,
        );

        const response = await this.axiosInstance.get<NyraBankListResponse>(
          '/business/transfers/bank/list',
          {
            headers: this.getAuthHeaders(),
            timeout: 60000, // 60 seconds timeout
          },
        );

        this.logger.log('NYRA bank list retrieved successfully');
        return {
          success: true,
          message: 'Bank list retrieved successfully',
          currency: 'NGN',
          data:
            response.data.data?.map((bank) => ({
              bankName: bank.bank_name,
              bankCode: bank.bank_code,
            })) || [],
        };
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${attempt}/${maxRetries} failed to get NYRA bank list:`,
          error.message,
        );

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          this.logger.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      'Failed to get NYRA bank list after all retries:',
      lastError.message,
    );
    return {
      success: false,
      message: 'Failed to get bank list after multiple attempts',
      currency: 'NGN',
      error: lastError.message,
    };
  }

  async verifyAccount(
    data: AccountVerificationData,
  ): Promise<AccountVerificationResult> {
    try {
      this.logger.log(
        `Verifying account with NYRA: ${data.accountNumber} with bank: ${data.bankCode}`,
      );
      this.logger.log(`Raw verification data:`, JSON.stringify(data, null, 2));

      const nyraRequest: NyraNameEnquiryRequest = {
        account_number: data.accountNumber,
        bank_code: data.bankCode,
      };

      this.logger.log(
        `NYRA request payload:`,
        JSON.stringify(nyraRequest, null, 2),
      );

      const response = await this.axiosInstance.post<NyraNameEnquiryResponse>(
        `/business/transfers/name-enquiry?account_number=${data.accountNumber}&bank_code=${data.bankCode}`,
        {}, // Empty body as per documentation for query params
        {
          headers: this.getAuthHeaders(),
        },
      );

      // Check if we got a meaningful account name
      const accountName = response.data.data.account.name;
      const accountNumber = response.data.data.account.number;
      
      // If account name is null, undefined, empty string, or "Account Name Not Available", 
      // treat it as a failed verification
      if (!accountName || accountName.trim() === '' || accountName === 'Account Name Not Available') {
        this.logger.warn(
          `NYRA returned empty/null account name for: ${data.accountNumber} with bank: ${data.bankCode}`,
        );
        return {
          success: false,
          message: 'Account not found or name not available',
          error: 'ACCOUNT_NOT_FOUND',
        };
      }

      this.logger.log(
        `NYRA account verification successful for: ${data.accountNumber} - Name: ${accountName}`,
      );
      return {
        success: true,
        message: 'Account verification successful',
        data: {
          accountName: accountName,
          accountNumber: accountNumber,
          bankName: response.data.data.bank_name || 'Bank Name Not Available',
          bankCode: data.bankCode,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify account with NYRA: ${data.accountNumber}`,
        error.message,
      );

      // Handle specific NYRA error responses
      let errorMessage = 'Account verification failed';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
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
