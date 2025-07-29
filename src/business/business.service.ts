import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { BusinessWalletBalanceResponse } from './dto/business.dto';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('NYRA_BASE_URL');
    this.clientId = this.configService.get<string>('NYRA_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('NYRA_CLIENT_SECRET');

    if (!this.baseUrl || !this.clientId || !this.clientSecret) {
      this.logger.error('NYRA configuration missing for business service');
      throw new Error('NYRA configuration incomplete');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    this.logger.log('Business Service initialized');
  }

  private getAuthHeaders(): { [key: string]: string } {
    return {
      'x-client-id': this.clientId,
      Authorization: `Bearer ${this.clientSecret}`,
      'Content-Type': 'application/json',
    };
  }

  async getBusinessWalletBalance(): Promise<BusinessWalletBalanceResponse> {
    this.logger.log('🏦 [BUSINESS SERVICE] Getting business wallet balance from NYRA API');

    try {
      // Get the business wallet balance directly from the wallet_balance endpoint
      this.logger.log('💰 [BUSINESS SERVICE] Getting business wallet balance...');
      const balanceResponse = await this.axiosInstance.get('/business/wallets/wallet_balance', {
        headers: this.getAuthHeaders(),
      });

      this.logger.log('💰 [BUSINESS SERVICE] Balance API response:', JSON.stringify(balanceResponse.data, null, 2));

      if (!balanceResponse.data.success || !balanceResponse.data.data) {
        throw new NotFoundException('Business wallet balance not found');
      }

      const balanceData = balanceResponse.data.data;
      this.logger.log(`💰 [BUSINESS SERVICE] Wallet balance: ${balanceData.balance}`);

      return {
        success: true,
        message: 'Wallet balance fetched successfully',
        data: {
          businessId: balanceData.businessId,
          businessName: balanceData.businessName || 'Monzi Business',
          balance: parseFloat(balanceData.balance) || 0,
        },
      };

    } catch (error) {
      this.logger.error('❌ [BUSINESS SERVICE] Error getting business wallet balance:', error.message);

      if (error.response?.status === 401) {
        throw new ForbiddenException('API client is not authorized for the business');
      }

      if (error.response?.status === 404) {
        throw new NotFoundException('Business or its wallet is not found');
      }

      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      // Handle network errors or other issues
      throw new Error('Failed to retrieve business wallet balance');
    }
  }
} 