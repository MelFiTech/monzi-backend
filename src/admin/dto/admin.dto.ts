import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeType } from '@prisma/client';

export { FeeType } from '@prisma/client';

export enum KycDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

// ==================== FEE MANAGEMENT DTOs ====================

export class CreateFeeConfigurationDto {
  @ApiProperty({ enum: FeeType, description: 'Type of fee' })
  @IsEnum(FeeType)
  feeType: FeeType;

  @ApiPropertyOptional({ description: 'Fixed amount fee' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedAmount?: number;

  @ApiPropertyOptional({
    description: 'Percentage fee (as decimal, e.g., 0.01 for 1%)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  percentage?: number;

  @ApiPropertyOptional({ description: 'Minimum fee amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum fee amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Fee description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether fee is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFeeConfigurationDto {
  @ApiPropertyOptional({ enum: FeeType, description: 'Type of fee' })
  @IsOptional()
  @IsEnum(FeeType)
  feeType?: FeeType;

  @ApiPropertyOptional({ description: 'Fixed amount fee' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedAmount?: number;

  @ApiPropertyOptional({
    description: 'Percentage fee (as decimal, e.g., 0.01 for 1%)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  percentage?: number;

  @ApiPropertyOptional({ description: 'Minimum fee amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum fee amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Fee description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether fee is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FeeConfigurationResponse {
  @ApiProperty({ example: 'cuid123', description: 'Fee configuration ID' })
  id: string;

  @ApiProperty({ enum: FeeType, example: 'TRANSFER', description: 'Fee type' })
  feeType: FeeType;

  @ApiProperty({ example: 0.015, description: 'Fee percentage' })
  percentage?: number;

  @ApiProperty({ example: 25.0, description: 'Fixed fee amount' })
  fixedAmount?: number;

  @ApiProperty({ example: 25.0, description: 'Minimum fee amount' })
  minAmount?: number;

  @ApiProperty({ example: 5000.0, description: 'Maximum fee amount' })
  maxAmount?: number;

  @ApiProperty({ example: true, description: 'Whether fee is active' })
  isActive: boolean;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Creation timestamp',
  })
  createdAt: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Last update timestamp',
  })
  updatedAt: string;
}

export class SetFeeResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Fee configuration updated successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    type: FeeConfigurationResponse,
    description: 'Updated fee configuration',
  })
  feeConfiguration: FeeConfigurationResponse;
}

export class GetFeesResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    type: [FeeConfigurationResponse],
    description: 'List of fee configurations',
  })
  fees: FeeConfigurationResponse[];

  @ApiProperty({
    example: 5,
    description: 'Total number of fee configurations',
  })
  total: number;
}

export class DeleteFeeResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Fee configuration deleted successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({ example: 'TRANSFER', description: 'Deleted fee type' })
  deletedType: string;
}

// ==================== KYC MANAGEMENT DTOs ====================

export class KycSubmissionDto {
  @ApiProperty({ example: 'cuid123', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: '+2348123456789', description: 'User phone number' })
  phone: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name (if available)',
  })
  fullName?: string;

  @ApiProperty({ example: 'IN_PROGRESS', description: 'Current KYC status' })
  kycStatus: string;

  @ApiProperty({ example: '22234567890', description: 'BVN number' })
  bvn?: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'BVN verification date',
  })
  bvnVerifiedAt?: string;

  @ApiProperty({
    example: '/uploads/kyc/user-123-selfie.jpg',
    description: 'Uploaded selfie URL',
  })
  selfieUrl?: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Submission date',
  })
  submittedAt: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'User registration date',
  })
  createdAt: string;
}

export class GetKycSubmissionsResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    type: [KycSubmissionDto],
    description: 'List of KYC submissions',
  })
  submissions: KycSubmissionDto[];

  @ApiProperty({ example: 15, description: 'Total number of submissions' })
  total: number;

  @ApiProperty({ example: 5, description: 'Number of pending submissions' })
  pending: number;

  @ApiProperty({ example: 8, description: 'Number of verified submissions' })
  verified: number;

  @ApiProperty({ example: 2, description: 'Number of rejected submissions' })
  rejected: number;
}

export class KycReviewDto {
  @ApiProperty({
    enum: KycDecision,
    example: 'APPROVE',
    description: 'Admin decision: APPROVE or REJECT',
  })
  @IsNotEmpty()
  @IsEnum(KycDecision, { message: 'Decision must be APPROVE or REJECT' })
  decision: KycDecision;

  @ApiProperty({
    example: 'Documents verified successfully',
    description: 'Admin comment/reason for the decision',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class KycReviewResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'KYC submission approved successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({ example: 'VERIFIED', description: 'New KYC status' })
  newStatus: string;

  @ApiProperty({
    example: true,
    description: 'Whether wallet was created (on approval)',
  })
  walletCreated?: boolean;

  @ApiProperty({
    example: '9038123456',
    description: 'Virtual account number (if wallet created)',
  })
  virtualAccountNumber?: string;

  @ApiProperty({ example: 'cuid123', description: 'User ID that was reviewed' })
  userId: string;
}

export class KycSubmissionDetailResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    type: KycSubmissionDto,
    description: 'Detailed KYC submission information',
  })
  submission: KycSubmissionDto;

  @ApiProperty({
    example: 'http://localhost:3000/uploads/kyc/user-123-selfie.jpg',
    description: 'Full URL to access the selfie image',
  })
  selfieImageUrl?: string;
}

// Legacy SetFeeDto - keeping for backward compatibility
export class SetFeeDto {
  @ApiProperty({
    enum: FeeType,
    example: 'TRANSFER',
    description: 'Type of fee to configure',
  })
  @IsNotEmpty()
  @IsEnum(FeeType)
  type: FeeType;

  @ApiProperty({
    example: 0.015,
    description: 'Fee percentage (e.g., 0.015 for 1.5%)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Percentage must be non-negative' })
  @Max(1, { message: 'Percentage cannot exceed 100%' })
  percentage?: number;

  @ApiProperty({
    example: 25.0,
    description: 'Fixed fee amount in NGN',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Fixed amount must be non-negative' })
  fixedAmount?: number;

  @ApiProperty({
    example: 25.0,
    description: 'Minimum fee amount in NGN',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Minimum fee must be non-negative' })
  minAmount?: number;

  @ApiProperty({
    example: 5000.0,
    description: 'Maximum fee amount in NGN',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Maximum fee must be non-negative' })
  maxAmount?: number;

  @ApiProperty({
    example: true,
    description: 'Whether this fee configuration is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== USER MANAGEMENT DTOs ====================

export class AdminUserDto {
  @ApiProperty({ example: 'cmcypf6hk00001gk3itv4ybwo', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: '+2348123456789', description: 'User phone number' })
  phone: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  lastName?: string;

  @ApiProperty({ example: 'MALE', description: 'User gender' })
  gender: string;

  @ApiProperty({ example: '1996-09-09T00:00:00.000Z', description: 'Date of birth' })
  dateOfBirth: string;

  @ApiProperty({ example: 'PENDING', description: 'KYC status' })
  kycStatus: string;

  @ApiProperty({ example: true, description: 'Email verification status' })
  isVerified: boolean;

  @ApiProperty({ example: true, description: 'Onboarding completion status' })
  isOnboarded: boolean;

  @ApiProperty({ example: 'ACTIVE', description: 'Wallet status' })
  walletStatus?: string;

  @ApiProperty({ example: 1500.00, description: 'Wallet balance' })
  walletBalance?: number;

  @ApiProperty({ example: '9038123456', description: 'Virtual account number' })
  virtualAccountNumber?: string;

  @ApiProperty({ example: 'BUDPAY', description: 'Wallet provider' })
  walletProvider?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Account creation date' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: string;
}

export class AdminUserStatsDto {
  @ApiProperty({ example: 150, description: 'Total number of users' })
  total: number;

  @ApiProperty({ example: 120, description: 'Number of verified users' })
  verified: number;

  @ApiProperty({ example: 25, description: 'Number of pending users' })
  pending: number;

  @ApiProperty({ example: 5, description: 'Number of rejected users' })
  rejected: number;

  @ApiProperty({ example: 140, description: 'Number of onboarded users' })
  onboarded: number;

  @ApiProperty({ example: 120, description: 'Number of users with wallets' })
  withWallets: number;
}

export class GetUsersResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    type: [AdminUserDto],
    description: 'List of users',
  })
  users: AdminUserDto[];

  @ApiProperty({ example: 150, description: 'Total number of users' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Number of users per page' })
  limit: number;

  @ApiProperty({
    type: AdminUserStatsDto,
    description: 'User statistics',
  })
  stats: AdminUserStatsDto;
}

export class AdminUserDetailDto {
  @ApiProperty({ example: 'cmcypf6hk00001gk3itv4ybwo', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: '+2348123456789', description: 'User phone number' })
  phone: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  lastName?: string;

  @ApiProperty({ example: 'MALE', description: 'User gender' })
  gender: string;

  @ApiProperty({ example: '1996-09-09T00:00:00.000Z', description: 'Date of birth' })
  dateOfBirth: string;

  @ApiProperty({ example: 'VERIFIED', description: 'KYC status' })
  kycStatus: string;

  @ApiProperty({ example: true, description: 'Email verification status' })
  isVerified: boolean;

  @ApiProperty({ example: true, description: 'Onboarding completion status' })
  isOnboarded: boolean;

  @ApiProperty({ example: '22347795339', description: 'BVN number' })
  bvn?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'BVN verification date' })
  bvnVerifiedAt?: string;

  @ApiProperty({ example: '/uploads/kyc/user-selfie.jpg', description: 'Selfie URL' })
  selfieUrl?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Account creation date' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: string;

  @ApiProperty({ description: 'Wallet information', required: false })
  wallet?: {
    id: string;
    balance: number;
    currency: string;
    virtualAccountNumber: string;
    provider: string;
    isActive: boolean;
    createdAt: string;
  };
}

export class GetUserDetailResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    type: AdminUserDetailDto,
    description: 'Detailed user information',
  })
  user: AdminUserDetailDto;
}

// ==================== TRANSACTION MANAGEMENT DTOs ====================

export class AdminTransactionUserDto {
  @ApiProperty({ example: 'cmcypf6hk00001gk3itv4ybwo', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  lastName?: string;
}

export class AdminTransactionSenderDto {
  @ApiProperty({ example: 'wallet123', description: 'Sender wallet ID' })
  walletId?: string;

  @ApiProperty({ example: '9038123456', description: 'Sender account number' })
  accountNumber?: string;

  @ApiProperty({ example: 'John Doe', description: 'Sender account name' })
  accountName?: string;

  @ApiProperty({ example: 'First Bank', description: 'Sender bank name' })
  bankName?: string;

  @ApiProperty({ example: '000016', description: 'Sender bank code' })
  bankCode?: string;

  @ApiProperty({ example: 6000.00, description: 'Balance before transaction' })
  balanceBefore?: number;

  @ApiProperty({ example: 1000.00, description: 'Balance after transaction' })
  balanceAfter?: number;
}

export class AdminTransactionReceiverDto {
  @ApiProperty({ example: 'wallet456', description: 'Receiver wallet ID' })
  walletId?: string;

  @ApiProperty({ example: '3089415578', description: 'Receiver account number' })
  accountNumber?: string;

  @ApiProperty({ example: 'Jane Smith', description: 'Receiver account name' })
  accountName?: string;

  @ApiProperty({ example: 'First Bank', description: 'Receiver bank name' })
  bankName?: string;

  @ApiProperty({ example: '000016', description: 'Receiver bank code' })
  bankCode?: string;

  @ApiProperty({ example: 500.00, description: 'Balance before transaction' })
  balanceBefore?: number;

  @ApiProperty({ example: 1500.00, description: 'Balance after transaction' })
  balanceAfter?: number;
}

export class AdminTransactionDto {
  @ApiProperty({ example: 'txn123', description: 'Transaction ID' })
  id: string;

  @ApiProperty({ example: 5000.00, description: 'Transaction amount' })
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

  @ApiProperty({ example: 50.00, description: 'Transaction fee' })
  fee: number;

  @ApiProperty({ example: 'BUDPAY_REF_123', description: 'Provider reference' })
  providerReference?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Transaction creation date' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:32:00Z', description: 'Transaction update date' })
  updatedAt: string;

  @ApiProperty({
    type: AdminTransactionUserDto,
    description: 'User who initiated the transaction',
  })
  user: AdminTransactionUserDto;

  @ApiProperty({
    type: AdminTransactionSenderDto,
    description: 'Sender information',
    required: false,
  })
  sender?: AdminTransactionSenderDto;

  @ApiProperty({
    type: AdminTransactionReceiverDto,
    description: 'Receiver information',
    required: false,
  })
  receiver?: AdminTransactionReceiverDto;
}

export class AdminTransactionStatsDto {
  @ApiProperty({ example: 2500000.00, description: 'Total transaction amount' })
  totalAmount: number;

  @ApiProperty({ example: 125000.00, description: 'Total fees collected' })
  totalFees: number;

  @ApiProperty({ example: 4500, description: 'Number of completed transactions' })
  completed: number;

  @ApiProperty({ example: 300, description: 'Number of pending transactions' })
  pending: number;

  @ApiProperty({ example: 200, description: 'Number of failed transactions' })
  failed: number;

  @ApiProperty({ example: 50, description: 'Number of cancelled transactions' })
  cancelled: number;
}

export class GetTransactionsResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    type: [AdminTransactionDto],
    description: 'List of transactions',
  })
  transactions: AdminTransactionDto[];

  @ApiProperty({ example: 5000, description: 'Total number of transactions' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Number of transactions per page' })
  limit: number;

  @ApiProperty({
    type: AdminTransactionStatsDto,
    description: 'Transaction statistics',
  })
  stats: AdminTransactionStatsDto;
}

export class AdminTransactionDetailDto {
  @ApiProperty({ example: 'txn123', description: 'Transaction ID' })
  id: string;

  @ApiProperty({ example: 5000.00, description: 'Transaction amount' })
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

  @ApiProperty({ example: 50.00, description: 'Transaction fee' })
  fee: number;

  @ApiProperty({ example: 'BUDPAY_REF_123', description: 'Provider reference' })
  providerReference?: string;

  @ApiProperty({ description: 'Provider response data', required: false })
  providerResponse?: any;

  @ApiProperty({ description: 'Transaction metadata', required: false })
  metadata?: any;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Transaction creation date' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:32:00Z', description: 'Transaction update date' })
  updatedAt: string;

  @ApiProperty({
    type: AdminTransactionUserDto,
    description: 'User who initiated the transaction',
  })
  user: AdminTransactionUserDto;

  @ApiProperty({
    type: AdminTransactionSenderDto,
    description: 'Sender information',
    required: false,
  })
  sender?: AdminTransactionSenderDto;

  @ApiProperty({
    type: AdminTransactionReceiverDto,
    description: 'Receiver information',
    required: false,
  })
  receiver?: AdminTransactionReceiverDto;
}

export class GetTransactionDetailResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    type: AdminTransactionDetailDto,
    description: 'Detailed transaction information',
  })
  transaction: AdminTransactionDetailDto;
}

// ==================== DASHBOARD STATS DTOs ====================

export class DashboardUserStatsDto {
  @ApiProperty({ example: 1500, description: 'Total users' })
  total: number;

  @ApiProperty({ example: 1200, description: 'Verified users' })
  verified: number;

  @ApiProperty({ example: 250, description: 'Pending users' })
  pending: number;

  @ApiProperty({ example: 50, description: 'Rejected users' })
  rejected: number;

  @ApiProperty({ example: 120, description: 'New users this month' })
  newThisMonth: number;
}

export class DashboardTransactionStatsDto {
  @ApiProperty({ example: 15000, description: 'Total transactions' })
  total: number;

  @ApiProperty({ example: 13500, description: 'Completed transactions' })
  completed: number;

  @ApiProperty({ example: 1000, description: 'Pending transactions' })
  pending: number;

  @ApiProperty({ example: 500, description: 'Failed transactions' })
  failed: number;

  @ApiProperty({ example: 45000000.00, description: 'Total transaction volume' })
  totalVolume: number;

  @ApiProperty({ example: 2500000.00, description: 'Today\'s transaction volume' })
  todayVolume: number;
}

export class DashboardWalletStatsDto {
  @ApiProperty({ example: 1200, description: 'Total wallets' })
  total: number;

  @ApiProperty({ example: 1150, description: 'Active wallets' })
  active: number;

  @ApiProperty({ example: 50, description: 'Inactive wallets' })
  inactive: number;

  @ApiProperty({ example: 25000000.00, description: 'Total wallet balance' })
  totalBalance: number;
}

export class DashboardStatsDto {
  @ApiProperty({
    type: DashboardUserStatsDto,
    description: 'User statistics',
  })
  users: DashboardUserStatsDto;

  @ApiProperty({
    type: DashboardTransactionStatsDto,
    description: 'Transaction statistics',
  })
  transactions: DashboardTransactionStatsDto;

  @ApiProperty({
    type: DashboardWalletStatsDto,
    description: 'Wallet statistics',
  })
  wallets: DashboardWalletStatsDto;
}

export class GetDashboardStatsResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    type: DashboardStatsDto,
    description: 'Dashboard statistics',
  })
  stats: DashboardStatsDto;
}
