import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsDateString,
  IsEnum,
  Matches,
  Length,
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
