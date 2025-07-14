import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsDateString,
  IsEnum,
  Matches,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';

// Gender enum for validation
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

// Step 1: Register new account
export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: '+2348123456789',
    description: 'Nigerian phone number in format +234XXXXXXXXXX',
  })
  @IsString()
  @Matches(/^\+234[789][01]\d{8}$/, {
    message:
      'Phone number must be a valid Nigerian number starting with +234 followed by 10 digits',
  })
  phone: string;

  @ApiProperty({
    enum: Gender,
    example: 'MALE',
    description: 'User gender',
  })
  @IsEnum(Gender, { message: 'Gender must be MALE, FEMALE, or OTHER' })
  gender: Gender;

  @ApiProperty({
    example: '1990-01-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsDateString(
    {},
    { message: 'Date of birth must be a valid date in YYYY-MM-DD format' },
  )
  dateOfBirth: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit numeric passcode',
  })
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Passcode must contain only numbers' })
  passcode: string;
}

// Step 2: Login for existing users
export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit numeric passcode',
  })
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Passcode must contain only numbers' })
  passcode: string;
}

// Step 3: Verify Email OTP
export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address where OTP was sent',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received via email',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode: string;
}

// Resend OTP
export class ResendOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to resend OTP to',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

// Request OTP for PIN/Passcode reset
export class RequestPinResetOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to send OTP to',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

// Change Transaction PIN (for authenticated users)
export class ChangeTransactionPinDto {
  @ApiProperty({
    example: '1234',
    description: 'Current 4-digit transaction PIN (only required if not using OTP)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only numbers' })
  currentPin?: string;

  @ApiProperty({
    example: '5678',
    description: 'New 4-digit transaction PIN',
  })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only numbers' })
  newPin: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code (only required if forgot current PIN)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode?: string;
}

// Reset Transaction PIN (using OTP, no auth required)
export class ResetTransactionPinDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to identify the user',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received via email',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode: string;

  @ApiProperty({
    example: '5678',
    description: 'New 4-digit transaction PIN',
  })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only numbers' })
  newPin: string;
}

// Change Passcode (for authenticated users)
export class ChangePasscodeDto {
  @ApiProperty({
    example: '123456',
    description: 'Current 6-digit passcode (only required if not using OTP)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Passcode must contain only numbers' })
  currentPasscode?: string;

  @ApiProperty({
    example: '789012',
    description: 'New 6-digit passcode',
  })
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Passcode must contain only numbers' })
  newPasscode: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code (only required if forgot current passcode)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode?: string;
}

// Reset Passcode (using OTP, no auth required)
export class ResetPasscodeDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to identify the user',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received via email',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode: string;

  @ApiProperty({
    example: '789012',
    description: 'New 6-digit passcode',
  })
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Passcode must contain only numbers' })
  newPasscode: string;
}

// Request Account Deletion
export class RequestAccountDeletionDto {
  @ApiProperty({
    example: 'No longer needed',
    description: 'Reason for account deletion',
  })
  @IsString()
  reason: string;
}

// Confirm Account Deletion
export class ConfirmAccountDeletionDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code sent to email',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode: string;
}

// Sign Out
export class SignOutDto {
  @ApiProperty({
    example: true,
    description: 'Whether to disable transaction notifications during sign out',
    required: false,
    default: true,
  })
  disableTransactionNotifications?: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether to disable promotional notifications during sign out',
    required: false,
    default: false,
  })
  disablePromotionalNotifications?: boolean;
}

// Update Notification Preferences
export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    example: true,
    description: 'Enable/disable all push notifications (does not affect real-time websocket notifications)',
    required: false,
  })
  notificationsEnabled?: boolean;

  @ApiProperty({
    example: true,
    description: 'Enable/disable transaction push notifications (does not affect real-time websocket notifications)',
    required: false,
  })
  transactionNotificationsEnabled?: boolean;

  @ApiProperty({
    example: true,
    description: 'Enable/disable promotional push notifications (does not affect real-time websocket notifications)',
    required: false,
  })
  promotionalNotificationsEnabled?: boolean;
}

// Update Device Token on Login
export class UpdateDeviceTokenOnLoginDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push notification token for the current device',
  })
  @IsString()
  deviceToken: string;

  @ApiPropertyOptional({
    example: 'iPhone12,1',
    description: 'Device identifier',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    example: "John's iPhone",
    description: 'Device name as set by the user',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    example: 'ios',
    description: 'Platform (ios, android, web)',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    example: '17.0',
    description: 'Operating system version',
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'App version',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'App build version',
  })
  @IsOptional()
  @IsString()
  buildVersion?: string;

  @ApiPropertyOptional({
    example: 'standalone',
    description: 'App ownership (standalone, expo, guest)',
  })
  @IsOptional()
  @IsString()
  appOwnership?: string;

  @ApiPropertyOptional({
    example: 'storeClient',
    description: 'Execution environment (storeClient, standalone, bareWorkflow)',
  })
  @IsOptional()
  @IsString()
  executionEnvironment?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether running on a physical device',
  })
  @IsOptional()
  @IsBoolean()
  isDevice?: boolean;

  @ApiPropertyOptional({
    example: 'Apple',
    description: 'Device brand',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    example: 'Apple',
    description: 'Device manufacturer',
  })
  @IsOptional()
  @IsString()
  manufacturer?: string;
}

// Device Token Update Response
export class DeviceTokenUpdateResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Device token updated to new device',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: true,
    description: 'Whether the device was actually updated (different from previous)',
  })
  deviceUpdated: boolean;
}

// Response DTOs
export class RegisterResponseDto {
  @ApiProperty({ example: true, description: 'Registration success status' })
  success: boolean;

  @ApiProperty({
    example: 'Registration successful. Email OTP sent to your email.',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address where OTP was sent',
  })
  email: string;

  @ApiProperty({
    example: '2024-01-01T12:05:00Z',
    description: 'OTP expiration time',
  })
  otpExpiresAt: string;
}

export class OtpResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Email OTP sent successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: '2024-01-01T12:05:00Z',
    description: 'OTP expiration time',
  })
  expiresAt: string;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cuid123' },
      email: { type: 'string', example: 'user@example.com' },
      phone: { type: 'string', example: '+2348123456789' },
      gender: { type: 'string', example: 'MALE' },
      dateOfBirth: { type: 'string', example: '1990-01-15T00:00:00Z' },
      isVerified: { type: 'boolean', example: true },
      isOnboarded: { type: 'boolean', example: true },
      role: { type: 'string', example: 'CUSTOMER', description: 'User role' },
    },
  })
  user: {
    id: string;
    email: string;
    phone: string;
    gender: string;
    dateOfBirth: string;
    isVerified: boolean;
    isOnboarded: boolean;
    role: string;
  };
}

export class UserProfileDto {
  @ApiProperty({ example: 'cuid123', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({ example: '+2348123456789', description: 'Phone number' })
  phone: string;

  @ApiProperty({ example: 'MALE', description: 'Gender' })
  gender: string;

  @ApiProperty({
    example: '1990-01-15T00:00:00Z',
    description: 'Date of birth',
  })
  dateOfBirth: string;

  @ApiProperty({ example: 'John', description: 'First name (optional)' })
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'Last name (optional)' })
  lastName?: string;

  @ApiProperty({ example: true, description: 'Email verification status' })
  isVerified: boolean;

  @ApiProperty({
    example: true,
    description: 'Account setup completion status',
  })
  isOnboarded: boolean;

  @ApiProperty({ example: 'CUSTOMER', description: 'User role' })
  role: string;

  @ApiProperty({ example: 'VERIFIED', description: 'KYC verification status' })
  kycStatus: string;

  @ApiProperty({ example: '22234567890', description: 'BVN number' })
  bvn?: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'BVN verification date',
  })
  bvnVerifiedAt?: string;

  @ApiProperty({
    example: '/uploads/kyc/user-selfie.jpg',
    description: 'Selfie URL',
  })
  selfieUrl?: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Account creation date',
  })
  createdAt: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Last update date',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'User wallet information',
    required: false,
    example: {
      id: 'wallet123',
      balance: 1500.00,
      currency: 'NGN',
      virtualAccountNumber: '9038123456',
      provider: 'BUDPAY',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  })
  wallet?: {
    id: string;
    balance: number;
    currency: string;
    virtualAccountNumber: string;
    provider: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export class OtpRequestResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'OTP sent successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: '2024-01-01T12:05:00Z',
    description: 'OTP expiration time',
  })
  expiresAt: string;
}

export class SecurityOperationResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Operation completed successfully',
    description: 'Response message',
  })
  message: string;
}

// Sign Out Response
export class SignOutResponseDto {
  @ApiProperty({ example: true, description: 'Sign out success status' })
  success: boolean;

  @ApiProperty({
    example: 'Successfully signed out',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: true,
    description: 'Whether transaction notifications were disabled',
  })
  transactionNotificationsDisabled: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether promotional notifications were disabled',
  })
  promotionalNotificationsDisabled: boolean;
}

// Notification Preferences Response
export class NotificationPreferencesResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Push notification preferences updated successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    description: 'Updated push notification preferences (does not affect real-time websocket notifications)',
    type: 'object',
    properties: {
      notificationsEnabled: { type: 'boolean', example: true },
      transactionNotificationsEnabled: { type: 'boolean', example: true },
      promotionalNotificationsEnabled: { type: 'boolean', example: true },
    },
  })
  preferences: {
    notificationsEnabled: boolean;
    transactionNotificationsEnabled: boolean;
    promotionalNotificationsEnabled: boolean;
  };
}

// Transaction Detail DTOs
export class TransactionSourceDto {
  @ApiProperty({ example: 'WALLET', description: 'Source type (WALLET, BANK, PROVIDER)' })
  type: string;

  @ApiProperty({ example: 'GOODNESS OBAJE', description: 'Account name' })
  name?: string;

  @ApiProperty({ example: '9191155496', description: 'Account number' })
  accountNumber?: string;

  @ApiProperty({ example: 'Kuda Bank', description: 'Bank name' })
  bankName?: string;

  @ApiProperty({ example: '044', description: 'Bank code' })
  bankCode?: string;

  @ApiProperty({ example: 'BUDPAY', description: 'Provider name' })
  provider?: string;
}

export class TransactionDestinationDto {
  @ApiProperty({ example: 'WALLET', description: 'Destination type (WALLET, BANK, PROVIDER)' })
  type: string;

  @ApiProperty({ example: 'JOHN DOE', description: 'Account name' })
  name?: string;

  @ApiProperty({ example: '9038123456', description: 'Account number' })
  accountNumber?: string;

  @ApiProperty({ example: 'Access Bank', description: 'Bank name' })
  bankName?: string;

  @ApiProperty({ example: '044', description: 'Bank code' })
  bankCode?: string;

  @ApiProperty({ example: 'BUDPAY', description: 'Provider name' })
  provider?: string;
}

export class TransactionFeeDto {
  @ApiProperty({ example: 50, description: 'Fee amount' })
  amount: number;

  @ApiProperty({ example: 'NGN', description: 'Fee currency' })
  currency: string;

  @ApiProperty({ 
    example: { 
      processingFee: 25, 
      serviceFee: 15, 
      vatFee: 10 
    }, 
    description: 'Fee breakdown' 
  })
  breakdown?: any;
}

export class TransactionBalanceImpactDto {
  @ApiProperty({ example: 5000, description: 'Balance before transaction' })
  previousBalance: number;

  @ApiProperty({ example: 4950, description: 'Balance after transaction' })
  newBalance: number;

  @ApiProperty({ example: -50, description: 'Net balance change' })
  balanceChange: number;

  @ApiProperty({ example: 4950, description: 'Effective amount after fees' })
  effectiveAmount: number;
}

export class TransactionTimelineDto {
  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Transaction created' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:05Z', description: 'Transaction started processing' })
  processingAt?: string;

  @ApiProperty({ example: '2024-01-15T10:32:00Z', description: 'Transaction completed' })
  completedAt?: string;

  @ApiProperty({ example: '2024-01-15T10:32:00Z', description: 'Last update' })
  updatedAt: string;
}

export class TransactionDetailDto {
  @ApiProperty({ example: 'txn123', description: 'Transaction ID' })
  id: string;

  @ApiProperty({ example: 5000, description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ example: 'NGN', description: 'Transaction currency' })
  currency: string;

  @ApiProperty({ example: 'WITHDRAWAL', description: 'Transaction type' })
  type: string;

  @ApiProperty({ example: 'COMPLETED', description: 'Transaction status' })
  status: string;

  @ApiProperty({ example: 'TXN_1234567890', description: 'Transaction reference' })
  reference: string;

  @ApiProperty({ example: 'Transfer to John Doe', description: 'Transaction description' })
  description?: string;

  @ApiProperty({ 
    type: TransactionSourceDto, 
    description: 'Transaction source details' 
  })
  source?: TransactionSourceDto;

  @ApiProperty({ 
    type: TransactionDestinationDto, 
    description: 'Transaction destination details' 
  })
  destination?: TransactionDestinationDto;

  @ApiProperty({ 
    type: TransactionFeeDto, 
    description: 'Transaction fee details' 
  })
  fee?: TransactionFeeDto;

  @ApiProperty({ 
    type: TransactionBalanceImpactDto, 
    description: 'Balance impact details' 
  })
  balanceImpact?: TransactionBalanceImpactDto;

  @ApiProperty({ 
    type: TransactionTimelineDto, 
    description: 'Transaction timeline' 
  })
  timeline: TransactionTimelineDto;

  @ApiProperty({ 
    example: { 
      adminFunding: true, 
      provider: 'BUDPAY', 
      sessionId: 'sess123' 
    }, 
    description: 'Transaction metadata' 
  })
  metadata?: any;

  @ApiProperty({ 
    example: 'BUDPAY_REF_123', 
    description: 'Provider reference' 
  })
  providerReference?: string;

  @ApiProperty({ 
    example: { 
      status: 'success', 
      message: 'Transaction successful' 
    }, 
    description: 'Provider response' 
  })
  providerResponse?: any;
}

export class TransactionDetailResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ 
    type: TransactionDetailDto, 
    description: 'Transaction detail information' 
  })
  transaction: TransactionDetailDto;
}
