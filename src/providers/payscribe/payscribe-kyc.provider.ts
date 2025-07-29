import { Injectable, BadRequestException } from '@nestjs/common';
import { PayscribeProvider } from './payscribe.provider';

export interface PayscribeKycResponse {
  success: boolean;
  message: string;
  data?: {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    date_of_birth?: string;
    gender?: string;
    phone_number?: string;
    email?: string;
    address?: string;
    state?: string;
    lga?: string;
    nationality?: string;
    nin?: string;
    bvn?: string;
    photo?: string;
    signature?: string;
    verification_level?: string;
    status?: string;
  };
}

@Injectable()
export class PayscribeKycProvider {
  constructor(private payscribeProvider: PayscribeProvider) {}

  async verifyNIN(nin: string): Promise<PayscribeKycResponse> {
    console.log('🔍 [PAYSCRIBE KYC] Verifying NIN:', nin);

    try {
      const response =
        await this.payscribeProvider.makeRequest<PayscribeKycResponse>(
          'GET',
          `/kyc/lookup?type=nin&value=${nin}`,
        );

      console.log('✅ [PAYSCRIBE KYC] NIN verification successful');
      return response;
    } catch (error) {
      console.error('❌ [PAYSCRIBE KYC] NIN verification failed:', error);
      throw new BadRequestException(
        'NIN verification failed. Please try again.',
      );
    }
  }

  async verifyBVN(bvn: string): Promise<PayscribeKycResponse> {
    console.log('🔍 [PAYSCRIBE KYC] Verifying BVN:', bvn);

    try {
      const response =
        await this.payscribeProvider.makeRequest<PayscribeKycResponse>(
          'GET',
          `/kyc/lookup?type=bvn&value=${bvn}`,
        );

      console.log('✅ [PAYSCRIBE KYC] BVN verification successful');
      return response;
    } catch (error) {
      console.error('❌ [PAYSCRIBE KYC] BVN verification failed:', error);
      throw new BadRequestException(
        'BVN verification failed. Please try again.',
      );
    }
  }

  async verifyDriversLicense(
    licenseNumber: string,
  ): Promise<PayscribeKycResponse> {
    console.log(
      "🔍 [PAYSCRIBE KYC] Verifying Driver's License:",
      licenseNumber,
    );

    try {
      const response =
        await this.payscribeProvider.makeRequest<PayscribeKycResponse>(
          'GET',
          `/kyc/lookup?type=drivers_license&value=${licenseNumber}`,
        );

      console.log(
        "✅ [PAYSCRIBE KYC] Driver's License verification successful",
      );
      return response;
    } catch (error) {
      console.error(
        "❌ [PAYSCRIBE KYC] Driver's License verification failed:",
        error,
      );
      throw new BadRequestException(
        "Driver's License verification failed. Please try again.",
      );
    }
  }

  async verifyVotersCard(cardNumber: string): Promise<PayscribeKycResponse> {
    console.log("🔍 [PAYSCRIBE KYC] Verifying Voter's Card:", cardNumber);

    try {
      const response =
        await this.payscribeProvider.makeRequest<PayscribeKycResponse>(
          'GET',
          `/kyc/lookup?type=voters_card&value=${cardNumber}`,
        );

      console.log("✅ [PAYSCRIBE KYC] Voter's Card verification successful");
      return response;
    } catch (error) {
      console.error(
        "❌ [PAYSCRIBE KYC] Voter's Card verification failed:",
        error,
      );
      throw new BadRequestException(
        "Voter's Card verification failed. Please try again.",
      );
    }
  }

  async verifyInternationalPassport(
    passportNumber: string,
  ): Promise<PayscribeKycResponse> {
    console.log(
      '🔍 [PAYSCRIBE KYC] Verifying International Passport:',
      passportNumber,
    );

    try {
      const response =
        await this.payscribeProvider.makeRequest<PayscribeKycResponse>(
          'GET',
          `/kyc/lookup?type=international_passport&value=${passportNumber}`,
        );

      console.log(
        '✅ [PAYSCRIBE KYC] International Passport verification successful',
      );
      return response;
    } catch (error) {
      console.error(
        '❌ [PAYSCRIBE KYC] International Passport verification failed:',
        error,
      );
      throw new BadRequestException(
        'International Passport verification failed. Please try again.',
      );
    }
  }
}
