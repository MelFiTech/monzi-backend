import { Injectable } from '@nestjs/common';
import { AuthRegistrationService } from './services/auth-registration.service';
import { AuthProfileService } from './services/auth-profile.service';
import { AuthSecurityService } from './services/auth-security.service';
import { AuthNotificationsService } from './services/auth-notifications.service';
import { AuthTransactionReportsService } from './services/auth-transaction-reports.service';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  RegisterResponseDto,
  OtpResponseDto,
  AuthResponseDto,
  UserProfileDto,
  SignOutDto,
  SignOutResponseDto,
  UpdateNotificationPreferencesDto,
  NotificationPreferencesResponseDto,
  ReportTransactionDto,
  ReportTransactionResponseDto,
  GetTransactionReportsResponseDto,
  TransactionDetailResponseDto,
  DeviceTokenUpdateResponseDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private authRegistrationService: AuthRegistrationService,
    private authProfileService: AuthProfileService,
    private authSecurityService: AuthSecurityService,
    private authNotificationsService: AuthNotificationsService,
    private authTransactionReportsService: AuthTransactionReportsService,
  ) {}

  // Registration and Authentication Methods
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authRegistrationService.register(registerDto);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authRegistrationService.login(loginDto);
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authRegistrationService.verifyOtp(verifyOtpDto);
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<OtpResponseDto> {
    return this.authRegistrationService.resendOtp(resendOtpDto);
  }

  // Profile and Transaction Methods
  async validateUser(userId: string) {
    return this.authProfileService.validateUser(userId);
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    return this.authProfileService.getProfile(userId);
  }

  async getUserTransactions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    type?: string,
    status?: string,
  ) {
    return this.authProfileService.getUserTransactions(userId, limit, offset, type, status);
  }

  async getUserTransactionDetail(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDetailResponseDto> {
    return this.authProfileService.getUserTransactionDetail(userId, transactionId);
  }

  // Security Methods
  async requestResetOtp(dto: { email: string }): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
  }> {
    return this.authSecurityService.requestResetOtp(dto);
  }

  async changeTransactionPin(
    userId: string,
    dto: {
      currentPin?: string;
      newPin: string;
      otpCode?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.authSecurityService.changeTransactionPin(userId, dto);
  }

  async changePasscode(
    userId: string,
    dto: {
      currentPasscode?: string;
      newPasscode: string;
      otpCode?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.authSecurityService.changePasscode(userId, dto);
  }

  async resetTransactionPin(dto: {
    email: string;
    otpCode: string;
    newPin: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.authSecurityService.resetTransactionPin(dto);
  }

  async resetPasscode(dto: {
    email: string;
    otpCode: string;
    newPasscode: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.authSecurityService.resetPasscode(dto);
  }

  async requestAccountDeletion(
    userId: string,
    dto: { reason: string },
  ): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
  }> {
    return this.authSecurityService.requestAccountDeletion(userId, dto);
  }

  async confirmAccountDeletion(
    userId: string,
    dto: { otpCode: string },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.authSecurityService.confirmAccountDeletion(userId, dto);
  }

  // Notification Methods
  async updateDeviceTokenOnLogin(
    userId: string,
    deviceToken: string,
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      platform?: string;
      osVersion?: string;
      appVersion?: string;
      buildVersion?: string;
      appOwnership?: string;
      executionEnvironment?: string;
      isDevice?: boolean;
      brand?: string;
      manufacturer?: string;
    },
  ): Promise<DeviceTokenUpdateResponseDto> {
    return this.authNotificationsService.updateDeviceTokenOnLogin(userId, deviceToken, deviceInfo);
  }

  async signOut(
    userId: string,
    dto: SignOutDto,
  ): Promise<SignOutResponseDto> {
    return this.authNotificationsService.signOut(userId, dto);
  }

  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.authNotificationsService.updateNotificationPreferences(userId, dto);
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferencesResponseDto> {
    return this.authNotificationsService.getNotificationPreferences(userId);
  }

  // Transaction Reports Methods
  async reportTransaction(
    userId: string,
    transactionId: string,
    reportDto: ReportTransactionDto,
  ): Promise<ReportTransactionResponseDto> {
    return this.authTransactionReportsService.reportTransaction(userId, transactionId, reportDto);
  }

  async getUserTransactionReports(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<GetTransactionReportsResponseDto> {
    return this.authTransactionReportsService.getUserTransactionReports(userId, limit, offset);
  }
}
