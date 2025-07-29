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

// Sign Out
export class SignOutDto {
  @ApiProperty({
    example: true,
    description: 'Whether to disable transaction notifications during sign out',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  disableTransactionNotifications?: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether to disable promotional notifications during sign out',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  disablePromotionalNotifications?: boolean;
}

// Update Notification Preferences
export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    example: true,
    description:
      'Enable/disable all push notifications (does not affect real-time websocket notifications)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ApiProperty({
    example: true,
    description:
      'Enable/disable transaction push notifications (does not affect real-time websocket notifications)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  transactionNotificationsEnabled?: boolean;

  @ApiProperty({
    example: true,
    description:
      'Enable/disable promotional push notifications (does not affect real-time websocket notifications)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
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
    description:
      'Execution environment (storeClient, standalone, bareWorkflow)',
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
