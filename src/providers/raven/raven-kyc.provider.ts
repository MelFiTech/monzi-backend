import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IKycProvider, BvnVerificationResult } from '../base/provider.interface';

interface RavenBvnResponse {
  status: string;
  message: string;
  data: {
    firstname: string;
    lastname: string;
    lgaOfOrigin?: string;
    residentialAddress?: string;
    stateOfOrigin?: string;
    state_of_origin?: string;
    phone_number?: string;
    date_of_birth?: string;
    state_of_residence?: string;
    gender?: string;
    middlename?: string;
    lga_of_residence?: string;
    email?: string;
  };
}

@Injectable()
export class RavenKycProvider implements IKycProvider {
  private readonly logger = new Logger(RavenKycProvider.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('RAVEN_BASE_URL');
    this.secretKey = this.configService.get<string>('RAVEN_SECRET_KEY');

    if (!this.baseUrl || !this.secretKey) {
      throw new Error('Raven API credentials not configured properly');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
    });

    this.logger.log('Raven KYC Provider initialized successfully');
  }

  async verifyBvn(bvn: string): Promise<BvnVerificationResult> {
    this.logger.log(`🔍 [RAVEN KYC] Starting BVN verification for: ${bvn}`);

    try {
      // Validate BVN format
      if (!bvn || bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
        return {
          success: false,
          message: 'Invalid BVN format. BVN must be 11 digits.',
          error: 'INVALID_BVN_FORMAT'
        };
      }

      // Prepare request data as JSON
      const requestData = {
        bvn: bvn
      };

      this.logger.log(`📤 [RAVEN KYC] Sending BVN verification request to Raven API`);

      const response = await this.axiosInstance.post<RavenBvnResponse>(
        '/bvn/verify',
        requestData
      );

      this.logger.log(`📥 [RAVEN KYC] Response received from Raven API`);
      this.logger.log(`📊 [RAVEN KYC] Response status: ${response.data.status}`);

      if (response.data.status === 'success') {
        const { data } = response.data;

        const result: BvnVerificationResult = {
          success: true,
          message: response.data.message,
          data: {
            firstName: data.firstname,
            lastName: data.lastname,
            phoneNumber: data.phone_number,
            dateOfBirth: data.date_of_birth,
            gender: data.gender,
            lgaOfOrigin: data.lgaOfOrigin,
            residentialAddress: data.residentialAddress,
            stateOfOrigin: data.stateOfOrigin || data.state_of_origin,
          }
        };

        this.logger.log(`✅ [RAVEN KYC] BVN verification successful for: ${data.firstname} ${data.lastname}`);
        this.logger.log(`📱 [RAVEN KYC] Phone: ${data.phone_number}, DOB: ${data.date_of_birth}, Gender: ${data.gender}`);
        return result;
      } else {
        this.logger.warn(`⚠️ [RAVEN KYC] BVN verification failed: ${response.data.message}`);
        return {
          success: false,
          message: response.data.message,
          error: 'BVN_VERIFICATION_FAILED'
        };
      }

    } catch (error) {
      this.logger.error(`❌ [RAVEN KYC] Error during BVN verification:`, error);

      if (error.response) {
        // HTTP error response
        const status = error.response.status;
        const message = error.response.data?.message || 'BVN verification failed';
        
        this.logger.error(`🚨 [RAVEN KYC] HTTP Error ${status}: ${message}`);
        
        return {
          success: false,
          message: `BVN verification failed: ${message}`,
          error: `HTTP_${status}`
        };
      } else if (error.request) {
        // Network error
        this.logger.error(`🌐 [RAVEN KYC] Network error: ${error.message}`);
        return {
          success: false,
          message: 'Network error occurred during BVN verification',
          error: 'NETWORK_ERROR'
        };
      } else {
        // Other error
        this.logger.error(`🔥 [RAVEN KYC] Unexpected error: ${error.message}`);
        return {
          success: false,
          message: 'An unexpected error occurred during BVN verification',
          error: 'UNEXPECTED_ERROR'
        };
      }
    }
  }
} 