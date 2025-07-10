import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  IWalletProvider,
  WalletCreationData,
  WalletCreationResult,
  WalletBalanceData,
  WalletBalanceResult,
  WalletTransactionData,
  WalletTransactionResult,
} from '../base/wallet-provider.interface';

// BudPay API Interfaces
interface BudPayCreateCustomerPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  metadata?: string;
}

interface BudPayCreateCustomerResponse {
  status: boolean;
  message: string;
  data: {
    email: string;
    domain: string;
    customer_code: string;
    id: number;
    created_at: string;
    updated_at: string;
  };
}

interface BudPayCreateDedicatedAccountPayload {
  customer: string; // customer_code from customer creation
}

interface BudPayCreateDedicatedAccountResponse {
  status: boolean;
  message: string;
  data: {
    bank: {
      name: string;
      id: number;
      bank_code: string;
      prefix: string;
    };
    account_name: string;
    account_number: string;
    currency: string;
    status: string | null;
    reference: string;
    assignment: string;
    id: number;
    created_at: string;
    updated_at: string;
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
    };
  };
}

@Injectable()
export class BudPayWalletProvider implements IWalletProvider {
  private readonly logger = new Logger(BudPayWalletProvider.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('BUDPAY_BASE_URL');
    this.secretKey = this.configService.get<string>('BUDPAY_SECRET_KEY');
    this.publicKey = this.configService.get<string>('BUDPAY_PUBLIC_KEY');

    this.logger.log('BudPay Wallet Provider initialized');
  }

  getProviderName(): string {
    return 'BUDPAY';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.secretKey}`,
    };
  }

  async createWallet(data: WalletCreationData): Promise<WalletCreationResult> {
    this.logger.log(`Creating BudPay wallet for: ${data.firstName} ${data.lastName}`);

    try {
      // Step 1: Create Customer
      const customerPayload: BudPayCreateCustomerPayload = {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phoneNumber,
        metadata: JSON.stringify({
          bvn: data.bvn,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
        }),
      };

      this.logger.log('Creating BudPay customer...');
      const customerResponse = await firstValueFrom(
        this.httpService.post<BudPayCreateCustomerResponse>(
          `${this.baseUrl}/customer`,
          customerPayload,
          { headers: this.getHeaders() }
        )
      );

      if (!customerResponse.data.status) {
        this.logger.error(`BudPay customer creation failed: ${customerResponse.data.message}`);
        return {
          success: false,
          message: 'Customer creation failed',
          error: customerResponse.data.message,
        };
      }

      const customerCode = customerResponse.data.data.customer_code;
      this.logger.log(`BudPay customer created with code: ${customerCode}`);

      // Step 2: Create Dedicated Virtual Account
      const accountPayload: BudPayCreateDedicatedAccountPayload = {
        customer: customerCode,
      };

      this.logger.log('Creating BudPay dedicated virtual account...');
      const accountResponse = await firstValueFrom(
        this.httpService.post<BudPayCreateDedicatedAccountResponse>(
          `${this.baseUrl}/dedicated_virtual_account`,
          accountPayload,
          { headers: this.getHeaders() }
        )
      );

      if (!accountResponse.data.status) {
        this.logger.error(`BudPay virtual account creation failed: ${accountResponse.data.message}`);
        return {
          success: false,
          message: 'Virtual account creation failed',
          error: accountResponse.data.message,
        };
      }

      const accountData = accountResponse.data.data;
      this.logger.log(`BudPay virtual account created: ${accountData.account_number}`);

      return {
        success: true,
        message: 'Wallet created successfully',
        data: {
          accountNumber: accountData.account_number,
          accountName: accountData.account_name,
          customerId: customerCode,
          bankName: accountData.bank.name,
          bankCode: accountData.bank.bank_code,
          currency: accountData.currency,
          status: accountData.status || 'active',
          providerReference: accountData.reference,
          metadata: {
            budPayAccountId: accountData.id,
            budPayCustomerId: accountData.customer.id,
            bankPrefix: accountData.bank.prefix,
            assignment: accountData.assignment,
            createdAt: accountData.created_at,
          },
        },
      };

    } catch (error) {
      this.logger.error('BudPay wallet creation error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        return {
          success: false,
          message: 'Wallet creation failed',
          error: errorData.message || errorData.error || 'Unknown error occurred',
        };
      }

      return {
        success: false,
        message: 'Wallet creation failed',
        error: error.message || 'Network error occurred',
      };
    }
  }

  async getWalletBalance(data: WalletBalanceData): Promise<WalletBalanceResult> {
    // BudPay balance inquiry implementation would go here
    // For now, return a placeholder implementation
    this.logger.log(`Getting wallet balance for account: ${data.accountNumber}`);
    
    return {
      success: false,
      balance: 0,
      currency: 'NGN',
      accountNumber: data.accountNumber,
      error: 'Balance inquiry not implemented for BudPay provider',
    };
  }

  async processTransaction(data: WalletTransactionData): Promise<WalletTransactionResult> {
    // BudPay transaction processing implementation would go here
    // For now, return a placeholder implementation
    this.logger.log(`Processing transaction: ${data.reference}`);
    
    return {
      success: false,
      message: 'Transaction processing not implemented for BudPay provider',
      error: 'Transaction processing not implemented for BudPay provider',
    };
  }
} 