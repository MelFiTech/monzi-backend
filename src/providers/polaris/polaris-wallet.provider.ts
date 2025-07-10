import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { 
  IWalletProvider, 
  WalletCreationData, 
  WalletCreationResult,
  WalletBalanceData,
  WalletBalanceResult,
  WalletTransactionData,
  WalletTransactionResult
} from '../base/wallet-provider.interface';

interface PolarisCreateWalletPayload {
  request_ref: string;
  request_type: 'open_account';
  auth: {
    type: 'bvn' | null;
    secure: string | null;
    auth_provider: 'Polaris';
    route_mode: null;
  };
  transaction: {
    mock_mode: 'Live' | 'Test';
    transaction_ref: string;
    transaction_desc: string;
    transaction_ref_parent: string | null;
    amount: number;
    customer: {
      customer_ref: string;
      firstname: string;
      surname: string;
      email: string;
      mobile_no: string;
    };
    meta: {};
    details: {
      name_on_account: string;
      middlename: string;
      dob: string;
      gender: string;
      title: string;
      address_line_1: string;
      address_line_2: string;
      city: string;
      state: string;
      country: string;
    };
  };
}

interface PolarisCreateWalletResponse {
  status: string;
  message: string;
  data: {
    provider_response_code: string;
    provider: string;
    errors: string | null;
    error: string | null;
    provider_response: {
      reference: string;
      account_number: string;
      contract_code: string;
      account_reference: string;
      account_name: string;
      currency_code: string;
      customer_email: string;
      bank_name: string;
      bank_code: string;
      account_type: string;
      status: string;
      createdOn: string;
      meta: any;
    };
    client_info: any;
  };
}

@Injectable()
export class PolarisWalletProvider implements IWalletProvider {
  private readonly logger = new Logger(PolarisWalletProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly clientSecret: string;
  private readonly clientConfig: any;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('POLARIS_BANK_BASE_URL');
    this.apiKey = this.configService.get<string>('POLARIS_API_KEY');
    this.clientSecret = this.configService.get<string>('POLARIS_CLIENT_SECRET');
    
    this.clientConfig = {
      clientRef: this.configService.get<string>('POLARIS_CLIENT_REF'),
      clientFirstName: this.configService.get<string>('POLARIS_CLIENT_FIRST_NAME'),
      clientLastName: this.configService.get<string>('POLARIS_CLIENT_LAST_NAME'),
      clientMobileNumber: this.configService.get<string>('POLARIS_CLIENT_MOBILE_NUMBER'),
      clientEmails: [
        this.configService.get<string>('POLARIS_CLIENT_EMAIL_1'),
        this.configService.get<string>('POLARIS_CLIENT_EMAIL_2'),
        this.configService.get<string>('POLARIS_CLIENT_EMAIL_3'),
      ],
      bankCode: this.configService.get<string>('POLARIS_BANK_CODE'),
    };

    this.logger.log('Polaris Wallet Provider initialized');
  }

  getProviderName(): string {
    return 'POLARIS';
  }

  private generateRequestRef(): string {
    return `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionRef(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSignature(requestRef: string): string {
    const signatureString = `${requestRef};${this.clientSecret}`;
    return createHash('md5').update(signatureString).digest('hex');
  }

  private getHeaders(requestRef: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'Signature': this.generateSignature(requestRef),
    };
  }

  async createWallet(data: WalletCreationData): Promise<WalletCreationResult> {
    this.logger.log(`Creating Polaris wallet for: ${data.firstName} ${data.lastName}`);

    try {
      const requestRef = this.generateRequestRef();
      const transactionRef = this.generateTransactionRef();

      const payload: PolarisCreateWalletPayload = {
        request_ref: requestRef,
        request_type: 'open_account',
        auth: {
          type: 'bvn',
          secure: data.bvn, // BVN as provided
          auth_provider: 'Polaris',
          route_mode: null,
        },
        transaction: {
          mock_mode: 'Live',
          transaction_ref: transactionRef,
          transaction_desc: 'Create wallet account',
          transaction_ref_parent: null,
          amount: 0,
          customer: {
            customer_ref: data.phoneNumber.replace(/^\+234/, '').replace(/^0/, ''), // Remove +234 and leading 0
            firstname: data.firstName,
            surname: data.lastName,
            email: data.email,
            mobile_no: data.phoneNumber.replace(/^\+234/, '').replace(/^0/, ''), // Remove +234 and leading 0
          },
          meta: {},
          details: {
            name_on_account: data.accountName,
            middlename: data.middleName || '',
            dob: data.dateOfBirth, // Keep format as provided
            gender: data.gender, // Gender already converted to M/F format
            title: data.gender === 'F' ? 'Ms' : 'Mr',
            address_line_1: data.address,
            address_line_2: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
          },
        },
      };

      const headers = this.getHeaders(requestRef);

      this.logger.log(`Making Polaris API request with ref: ${requestRef}`);
      
      const response = await firstValueFrom(
        this.httpService.post<PolarisCreateWalletResponse>(
          `${this.baseUrl}/v2/transact`,
          payload,
          { headers }
        )
      );

      const responseData = response.data as PolarisCreateWalletResponse;
      this.logger.log(`Polaris API response status: ${responseData.status}`);

      if (responseData.status === 'Successful' && responseData.data.provider_response) {
        const accountData = responseData.data.provider_response;
        
        return {
          success: true,
          message: 'Wallet created successfully',
          data: {
            accountNumber: accountData.account_number,
            accountName: accountData.account_name,
            customerId: accountData.account_reference,
            bankName: accountData.bank_name,
            bankCode: accountData.bank_code,
            currency: accountData.currency_code,
            status: accountData.status,
            providerReference: accountData.reference,
            metadata: {
              contractCode: accountData.contract_code,
              accountType: accountData.account_type,
              createdOn: accountData.createdOn,
              customerEmail: accountData.customer_email,
            },
          },
        };
      } else {
        const errorMessage = responseData.data?.error || responseData.message || 'Wallet creation failed';
        this.logger.error(`Polaris wallet creation failed: ${errorMessage}`);
        
        return {
          success: false,
          message: 'Wallet creation failed',
          error: errorMessage,
        };
      }

    } catch (error) {
      this.logger.error('Polaris wallet creation error:', error);
      
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
    // Polaris balance inquiry implementation would go here
    // For now, return a placeholder implementation
    this.logger.log(`Getting wallet balance for account: ${data.accountNumber}`);
    
    return {
      success: false,
      balance: 0,
      currency: 'NGN',
      accountNumber: data.accountNumber,
      error: 'Balance inquiry not implemented for Polaris provider',
    };
  }

  async processTransaction(data: WalletTransactionData): Promise<WalletTransactionResult> {
    // Polaris transaction processing implementation would go here
    // For now, return a placeholder implementation
    this.logger.log(`Processing transaction: ${data.reference}`);
    
    return {
      success: false,
      message: 'Transaction processing not implemented for Polaris provider',
      error: 'Transaction processing not implemented for Polaris provider',
    };
  }
} 