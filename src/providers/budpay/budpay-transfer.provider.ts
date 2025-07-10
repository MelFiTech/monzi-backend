import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  TransferProviderInterface, 
  BankTransferData, 
  BankTransferResult,
  BankListResult,
  AccountVerificationData,
  AccountVerificationResult
} from '../base/transfer-provider.interface';
import * as crypto from 'crypto';

@Injectable()
export class BudPayTransferProvider implements TransferProviderInterface {
  private readonly logger = new Logger(BudPayTransferProvider.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('BUDPAY_BASE_URL') || 'https://api.budpay.com/api/v2';
    this.secretKey = this.configService.get<string>('BUDPAY_SECRET_KEY');
    this.publicKey = this.configService.get<string>('BUDPAY_PUBLIC_KEY');
    
    if (!this.secretKey || !this.publicKey) {
      this.logger.warn('BudPay configuration incomplete - some features may not work');
    }
    
    this.logger.log('BudPay Transfer Provider initialized');
  }

  /**
   * Transfer money to bank account
   */
  async transferToBank(data: BankTransferData): Promise<BankTransferResult> {
    this.logger.log(`Initiating BudPay bank transfer: ${data.amount} ${data.currency} to ${data.accountNumber}`);
    
    // Check if public key is available
    if (!this.publicKey) {
      this.logger.error('BudPay public key not configured - cannot process transfers');
      return {
        success: false,
        message: 'BudPay public key not configured',
        error: 'PUBLIC_KEY_MISSING'
      };
    }
    
    try {
      // Create payload with alphabetical ordering as required by BudPay
      const transferPayload = {
        account_number: data.accountNumber,
        amount: data.amount.toString(),
        bank_code: data.bankCode,
        bank_name: data.bankName,
        currency: data.currency,
        meta_data: data.metadata || {},
        narration: data.narration,
        reference: data.reference
      };

      // Create HMAC signature for security using public key
      const signature = this.generateSignature(JSON.stringify(transferPayload));

      const response = await fetch(`${this.baseUrl}/bank_transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          'Encryption': signature
        },
        body: JSON.stringify(transferPayload)
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`BudPay transfer failed: ${result.message}`);
        return {
          success: false,
          message: result.message || 'Transfer failed',
          error: result.error || 'TRANSFER_FAILED'
        };
      }

      this.logger.log(`BudPay transfer successful: ${result.data?.reference}`);
      
      return {
        success: true,
        message: result.message,
        data: {
          reference: result.data.reference,
          amount: parseFloat(result.data.amount),
          fee: parseFloat(result.data.fee),
          currency: result.data.currency,
          bankCode: result.data.bank_code,
          bankName: result.data.bank_name,
          accountNumber: result.data.account_number,
          accountName: result.data.account_name,
          narration: result.data.narration,
          status: result.data.status,
          providerReference: result.data.reference,
          metadata: {
            domain: result.data.domain,
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at
          }
        }
      };

    } catch (error) {
      this.logger.error(`BudPay transfer error: ${error.message}`);
      return {
        success: false,
        message: 'Transfer failed',
        error: error.message
      };
    }
  }

  /**
   * Get list of supported banks
   */
  async getBankList(): Promise<BankListResult> {
    this.logger.log('Fetching BudPay bank list');
    
    try {
      const response = await fetch(`${this.baseUrl}/bank_list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`BudPay bank list failed: ${result.message}`);
        return {
          success: false,
          message: result.message || 'Failed to fetch bank list',
          currency: 'NGN',
          error: result.error || 'BANK_LIST_FAILED'
        };
      }

      this.logger.log(`BudPay bank list retrieved: ${result.data?.length || 0} banks`);
      
      return {
        success: true,
        message: result.message,
        currency: result.currency,
        data: result.data.map(bank => ({
          bankName: bank.bank_name,
          bankCode: bank.bank_code
        }))
      };

    } catch (error) {
      this.logger.error(`BudPay bank list error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch bank list',
        currency: 'NGN',
        error: error.message
      };
    }
  }

  /**
   * Verify account name
   */
  async verifyAccount(data: AccountVerificationData): Promise<AccountVerificationResult> {
    this.logger.log(`Verifying BudPay account: ${data.accountNumber} at bank ${data.bankCode}`);
    
    try {
      const verifyPayload = {
        bank_code: data.bankCode,
        account_number: data.accountNumber,
        currency: data.currency || 'NGN'
      };

      const response = await fetch(`${this.baseUrl}/account_name_verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verifyPayload)
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`BudPay account verification failed: ${result.message}`);
        return {
          success: false,
          message: result.message || 'Account verification failed',
          error: result.error || 'ACCOUNT_VERIFY_FAILED'
        };
      }

      this.logger.log(`BudPay account verified: ${result.data}`);
      
      return {
        success: true,
        message: result.message,
        data: {
          accountName: result.data,
          accountNumber: data.accountNumber,
          bankName: '', // BudPay doesn't return bank name in verification
          bankCode: data.bankCode
        }
      };

    } catch (error) {
      this.logger.error(`BudPay account verification error: ${error.message}`);
      return {
        success: false,
        message: 'Account verification failed',
        error: error.message
      };
    }
  }

  /**
   * Generate HMAC-SHA512 signature for BudPay API using public key
   */
  private generateSignature(payload: string): string {
    if (!this.publicKey) {
      throw new Error('Public key not configured');
    }
    
    return crypto
      .createHmac('sha512', this.publicKey)
      .update(payload)
      .digest('hex');
  }
} 