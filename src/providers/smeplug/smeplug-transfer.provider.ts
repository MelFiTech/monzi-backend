import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TransferProviderInterface,
  BankTransferData,
  BankTransferResult,
  BankListResult,
  AccountVerificationData,
  AccountVerificationResult,
} from '../base/transfer-provider.interface';

@Injectable()
export class SmePlugTransferProvider implements TransferProviderInterface {
  private readonly logger = new Logger(SmePlugTransferProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const baseUrl =
      this.configService.get<string>('SMEPLUG_BASE_URL') ||
      'https://smeplug.ng/api';
    // Ensure we use the v1 API endpoint
    this.baseUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
    this.apiKey = this.configService.get<string>('SMEPLUG_API_KEY');

    if (!this.apiKey) {
      this.logger.warn(
        'SME Plug API key not configured - transfer features may not work',
      );
    }

    this.logger.log(
      `SME Plug Transfer Provider initialized with base URL: ${this.baseUrl}`,
    );
  }

  /**
   * Transfer money to bank account
   */
  async transferToBank(data: BankTransferData): Promise<BankTransferResult> {
    this.logger.log(
      `Initiating SME Plug bank transfer: ${data.amount} ${data.currency} to ${data.accountNumber}`,
    );

    try {
      const transferPayload = {
        bank_code: data.bankCode,
        account_number: data.accountNumber,
        amount: data.amount.toString(),
        description: data.narration,
        customer_reference: data.reference,
      };

      const response = await fetch(`${this.baseUrl}/transfer/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        this.logger.error(
          `SME Plug transfer failed: ${result.message || result.msg || 'Transfer failed'}`,
        );
        return {
          success: false,
          message: result.message || result.msg || 'Transfer failed',
          error: result.error || 'TRANSFER_FAILED',
        };
      }

      // SME Plug /transfer/send response structure: { status: true, data: { reference, msg } }
      const transferReference = result.data?.reference || data.reference;
      this.logger.log(`SME Plug transfer successful: ${transferReference}`);

      return {
        success: true,
        message: result.data?.msg || result.message || 'Transfer successful',
        data: {
          reference: transferReference,
          amount: parseFloat(data.amount.toString()),
          fee: parseFloat(result.data?.fee || result.fee || '0'),
          currency: data.currency || 'NGN',
          bankCode: data.bankCode,
          bankName: data.bankName || '',
          accountNumber: data.accountNumber,
          accountName: data.accountName || '',
          narration: data.narration,
          status: result.data?.status || 'completed',
          providerReference: transferReference,
          metadata: {
            response: result,
            timestamp: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error(`SME Plug transfer error: ${error.message}`);
      return {
        success: false,
        message: 'Transfer failed',
        error: error.message,
      };
    }
  }

  /**
   * Get list of supported banks
   */
  async getBankList(): Promise<BankListResult> {
    this.logger.log('Fetching SME Plug bank list');

    try {
      const response = await fetch(`${this.baseUrl}/transfer/banks`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`SME Plug bank list failed: ${result.message}`);
        return {
          success: false,
          message: result.message || 'Failed to fetch bank list',
          currency: 'NGN',
          error: result.error || 'BANK_LIST_FAILED',
        };
      }

      this.logger.log(
        `SME Plug bank list retrieved: ${result.banks?.length || 0} banks`,
      );

      return {
        success: true,
        message: 'Bank list retrieved successfully',
        currency: 'NGN',
        data: result.banks.map((bank) => ({
          bankName: bank.name,
          bankCode: bank.code,
        })),
      };
    } catch (error) {
      this.logger.error(`SME Plug bank list error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch bank list',
        currency: 'NGN',
        error: error.message,
      };
    }
  }

  /**
   * Verify account name
   */
  async verifyAccount(
    data: AccountVerificationData,
  ): Promise<AccountVerificationResult> {
    this.logger.log(
      `Verifying SME Plug account: ${data.accountNumber} at bank ${data.bankCode}`,
    );

    try {
      const verifyPayload = {
        bank_code: data.bankCode,
        account_number: data.accountNumber,
      };

      const response = await fetch(`${this.baseUrl}/transfer/resolveaccount`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(
          `SME Plug account verification failed: ${result.message}`,
        );
        return {
          success: false,
          message: result.message || 'Account verification failed',
          error: result.error || 'ACCOUNT_VERIFY_FAILED',
        };
      }

      this.logger.log(`SME Plug account verified: ${result.name}`);

      return {
        success: true,
        message: 'Account verified successfully',
        data: {
          accountName: result.name,
          accountNumber: data.accountNumber,
          bankName: '', // SME Plug doesn't return bank name in verification
          bankCode: data.bankCode,
        },
      };
    } catch (error) {
      this.logger.error(
        `SME Plug account verification error: ${error.message}`,
      );
      return {
        success: false,
        message: 'Account verification failed',
        error: error.message,
      };
    }
  }
}
