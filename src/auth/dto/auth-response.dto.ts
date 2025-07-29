import { ApiProperty } from '@nestjs/swagger';

// Register Response
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

  @ApiProperty({
    example: false,
    description: 'Whether the account was restored from archive',
  })
  restored: boolean;
}

// OTP Response
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

// Auth Response
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

// User Profile
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
      balance: 1500.0,
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

// OTP Request Response
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

// Security Operation Response
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
    description:
      'Updated push notification preferences (does not affect real-time websocket notifications)',
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
    description:
      'Whether the device was actually updated (different from previous)',
  })
  deviceUpdated: boolean;
}
