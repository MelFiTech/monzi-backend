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
  Length,
  Matches,
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

export class DeleteUserDto {
  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID to delete',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email to delete',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class DeleteUserResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'User deleted successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'ID of the deleted user',
  })
  deletedUserId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email of the deleted user',
  })
  deletedUserEmail: string;

  @ApiProperty({
    example: true,
    description: 'Whether associated wallet was also deleted',
  })
  walletDeleted: boolean;

  @ApiProperty({
    example: 5,
    description: 'Number of associated transactions deleted',
  })
  transactionsDeleted: number;
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

// ==================== WALLET MANAGEMENT DTOs ====================

export class FundWalletDto {
  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID to fund wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email to fund wallet for',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '9038123456',
    description: 'Account number to fund wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({
    example: 5000.00,
    description: 'Amount to fund wallet with',
  })
  @IsNumber()
  @Min(1, { message: 'Amount must be at least 1' })
  amount: number;

  @ApiProperty({
    example: 'Admin wallet funding',
    description: 'Description for the funding transaction',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class DebitWalletDto {
  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID to debit wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email to debit wallet for',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '9038123456',
    description: 'Account number to debit wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({
    example: 1000.00,
    description: 'Amount to debit from wallet',
  })
  @IsNumber()
  @Min(1, { message: 'Amount must be at least 1' })
  amount: number;

  @ApiProperty({
    example: 'Admin wallet debit',
    description: 'Description for the debit transaction',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class WalletOperationResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Wallet funded successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID',
  })
  userId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  userEmail: string;

  @ApiProperty({
    example: 5000.00,
    description: 'Previous wallet balance',
  })
  previousBalance: number;

  @ApiProperty({
    example: 10000.00,
    description: 'New wallet balance',
  })
  newBalance: number;

  @ApiProperty({
    example: 5000.00,
    description: 'Amount that was funded/debited',
  })
  amount: number;

  @ApiProperty({
    example: 'TXN_ADMIN_FUND_1234567890',
    description: 'Transaction reference',
  })
  reference: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Transaction timestamp',
  })
  timestamp: string;
}

export class EditUserDto {
  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID to edit',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'newemail@example.com',
    description: 'New email address',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '+2348123456789',
    description: 'New phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'John',
    description: 'New first name',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'New last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    example: 'MALE',
    description: 'New gender',
    required: false,
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({
    example: '1990-01-15',
    description: 'New date of birth',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    example: '22234567890',
    description: 'New BVN number',
    required: false,
  })
  @IsOptional()
  @IsString()
  bvn?: string;

  @ApiProperty({
    example: 'VERIFIED',
    description: 'New KYC status',
    required: false,
  })
  @IsOptional()
  @IsString()
  kycStatus?: string;

  @ApiProperty({
    example: true,
    description: 'New verification status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({
    example: true,
    description: 'New onboarding status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isOnboarded?: boolean;

  @ApiProperty({
    example: true,
    description: 'New active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class EditUserResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'User updated successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'Updated user ID',
  })
  userId: string;

  @ApiProperty({
    example: ['email', 'phone', 'firstName'],
    description: 'Fields that were updated',
  })
  updatedFields: string[];

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Update timestamp',
  })
  updatedAt: string;
}

export enum WalletProvider {
  BUDPAY = 'BUDPAY',
  SMEPLUG = 'SMEPLUG',
  POLARIS = 'POLARIS',
}

export class CreateWalletDto {
  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID to create wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email to create wallet for',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    enum: WalletProvider,
    example: 'BUDPAY',
    description: 'Wallet provider to use',
  })
  @IsEnum(WalletProvider)
  provider: WalletProvider;

  @ApiProperty({
    example: '1234',
    description: 'Initial wallet PIN (4 digits)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only numbers' })
  pin?: string;
}

export class CreateWalletResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Wallet created successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID',
  })
  userId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  userEmail: string;

  @ApiProperty({
    example: 'wallet123',
    description: 'Created wallet ID',
  })
  walletId: string;

  @ApiProperty({
    example: '9038123456',
    description: 'Virtual account number',
  })
  virtualAccountNumber: string;

  @ApiProperty({
    example: 'BUDPAY',
    description: 'Wallet provider',
  })
  provider: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Creation timestamp',
  })
  createdAt: string;
}

// Admin Role Management DTOs
export enum AdminRole {
  ADMIN = 'ADMIN',
  CUSTOMER_REP = 'CUSTOMER_REP',
  DEVELOPER = 'DEVELOPER',
  SUDO_ADMIN = 'SUDO_ADMIN',
}

// Permission-based access control
export enum Permission {
  // User Management
  VIEW_USERS = 'VIEW_USERS',
  EDIT_USERS = 'EDIT_USERS',
  DELETE_USERS = 'DELETE_USERS',
  CREATE_USERS = 'CREATE_USERS',
  
  // Transaction Management
  VIEW_TRANSACTIONS = 'VIEW_TRANSACTIONS',
  APPROVE_TRANSACTIONS = 'APPROVE_TRANSACTIONS',
  REVERSE_TRANSACTIONS = 'REVERSE_TRANSACTIONS',
  
  // KYC Management
  VIEW_KYC = 'VIEW_KYC',
  APPROVE_KYC = 'APPROVE_KYC',
  REJECT_KYC = 'REJECT_KYC',
  
  // Wallet Management
  VIEW_WALLETS = 'VIEW_WALLETS',
  FUND_WALLETS = 'FUND_WALLETS',
  DEBIT_WALLETS = 'DEBIT_WALLETS',
  CREATE_WALLETS = 'CREATE_WALLETS',
  
  // Fee Management
  VIEW_FEES = 'VIEW_FEES',
  SET_FEES = 'SET_FEES',
  DELETE_FEES = 'DELETE_FEES',
  
  // Provider Management
  VIEW_PROVIDERS = 'VIEW_PROVIDERS',
  SWITCH_PROVIDERS = 'SWITCH_PROVIDERS',
  TEST_PROVIDERS = 'TEST_PROVIDERS',
  
  // System Management
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  VIEW_LOGS = 'VIEW_LOGS',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  
  // Admin Management (SUDO only)
  CREATE_ADMINS = 'CREATE_ADMINS',
  EDIT_ADMINS = 'EDIT_ADMINS',
  DELETE_ADMINS = 'DELETE_ADMINS',
  VIEW_ADMINS = 'VIEW_ADMINS',
}

export class CreateAdminDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email of existing user to promote to admin',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    enum: AdminRole,
    example: 'ADMIN',
    description: 'Admin role to assign',
  })
  @IsEnum(AdminRole, { message: 'Role must be ADMIN, CUSTOMER_REP, DEVELOPER, or SUDO_ADMIN' })
  role: AdminRole;

  @ApiProperty({
    example: ['VIEW_USERS', 'VIEW_TRANSACTIONS', 'VIEW_KYC'],
    description: 'Specific permissions to grant (optional - will use role defaults if not provided)',
    required: false,
    type: [String],
    enum: Permission,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  customPermissions?: Permission[];
}

export class CreateAdminResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'User promoted to admin successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'user123',
    description: 'User ID',
  })
  userId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  fullName: string;

  @ApiProperty({
    example: 'ADMIN',
    description: 'Assigned admin role',
  })
  role: string;

  @ApiProperty({
    example: ['VIEW_USERS', 'VIEW_TRANSACTIONS', 'VIEW_KYC'],
    description: 'Granted permissions',
    type: [String],
  })
  permissions: string[];

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Promotion timestamp',
  })
  promotedAt: string;
}

export class AdminDto {
  @ApiProperty({ example: 'admin123', description: 'Admin ID' })
  id: string;

  @ApiProperty({ example: 'admin@example.com', description: 'Admin email' })
  email: string;

  @ApiProperty({ example: '+2348123456789', description: 'Admin phone number' })
  phone: string;

  @ApiProperty({ example: 'John', description: 'Admin first name' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Admin last name' })
  lastName: string;

  @ApiProperty({ example: 'ADMIN', description: 'Admin role' })
  role: string;

  @ApiProperty({ example: 'MALE', description: 'Admin gender' })
  gender: string;

  @ApiProperty({ example: '1990-01-15T00:00:00.000Z', description: 'Date of birth' })
  dateOfBirth: string;

  @ApiProperty({ example: true, description: 'Account active status' })
  isActive: boolean;

  @ApiProperty({ example: true, description: 'Email verification status' })
  isVerified: boolean;

  @ApiProperty({ 
    example: ['VIEW_USERS', 'VIEW_TRANSACTIONS', 'VIEW_KYC'],
    description: 'Admin permissions',
    type: [String],
  })
  permissions: string[];

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Account creation date' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: string;
}

export class GetAdminsResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Admins retrieved successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    type: [AdminDto],
    description: 'List of admins',
  })
  admins: AdminDto[];

  @ApiProperty({ example: 5, description: 'Total number of admins' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit: number;
}

export class UpdateAdminDto {
  @ApiProperty({
    example: 'admin123',
    description: 'Admin ID to update',
  })
  @IsString()
  @IsNotEmpty()
  adminId: string;

  @ApiProperty({
    example: 'John',
    description: 'Admin first name',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Admin last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    example: '+2348123456789',
    description: 'Admin phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+234[789][01]\d{8}$/, {
    message: 'Phone number must be a valid Nigerian number starting with +234 followed by 10 digits',
  })
  phone?: string;

  @ApiProperty({
    enum: AdminRole,
    example: 'ADMIN',
    description: 'Admin role',
    required: false,
  })
  @IsOptional()
  @IsEnum(AdminRole, { message: 'Role must be ADMIN, CUSTOMER_REP, DEVELOPER, or SUDO_ADMIN' })
  role?: AdminRole;

  @ApiProperty({
    example: ['VIEW_USERS', 'VIEW_TRANSACTIONS'],
    description: 'Permissions to update',
    required: false,
    type: [String],
    enum: Permission,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  @ApiProperty({
    example: true,
    description: 'Account active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAdminResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Admin updated successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    type: AdminDto,
    description: 'Updated admin information',
  })
  admin: AdminDto;
}

export class DeleteAdminDto {
  @ApiProperty({
    example: 'admin123',
    description: 'Admin ID to delete',
  })
  @IsString()
  @IsNotEmpty()
  adminId: string;

  @ApiProperty({
    example: 'Performance issues',
    description: 'Reason for deletion',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class DeleteAdminResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Admin deleted successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'admin123',
    description: 'Deleted admin ID',
  })
  adminId: string;
}

export class AdminActionLogDto {
  @ApiProperty({ example: 'log123', description: 'Log ID' })
  id: string;

  @ApiProperty({ example: 'admin123', description: 'Admin ID who performed the action' })
  adminId: string;

  @ApiProperty({ example: 'admin@example.com', description: 'Admin email' })
  adminEmail: string;

  @ApiProperty({ example: 'CREATE_ADMIN', description: 'Action performed' })
  action: string;

  @ApiProperty({ example: 'USER', description: 'Type of resource affected', required: false })
  targetType?: string;

  @ApiProperty({ example: 'user123', description: 'ID of affected resource', required: false })
  targetId?: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email of affected user', required: false })
  targetEmail?: string;

  @ApiProperty({ 
    example: { role: 'ADMIN', permissions: ['VIEW_USERS'] }, 
    description: 'Additional action details',
    required: false 
  })
  details?: any;

  @ApiProperty({ example: '192.168.1.1', description: 'IP address', required: false })
  ipAddress?: string;

  @ApiProperty({ example: 'Mozilla/5.0...', description: 'User agent', required: false })
  userAgent?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Action timestamp' })
  createdAt: string;
}

export class GetAdminLogsResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Admin logs retrieved successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    type: [AdminActionLogDto],
    description: 'List of admin action logs',
  })
  logs: AdminActionLogDto[];

  @ApiProperty({ example: 50, description: 'Total number of logs' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit: number;
}

export class GetAdminLogsQueryDto {
  @ApiProperty({
    example: 'CREATE_ADMIN',
    description: 'Filter by action type',
    required: false,
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'Filter by admin email',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminEmail?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Filter by target user email',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetEmail?: string;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Filter logs from this date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    example: '2024-01-31',
    description: 'Filter logs until this date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    example: 20,
    description: 'Number of logs to return',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({
    example: 0,
    description: 'Number of logs to skip',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  offset?: number;
}

// ==================== WALLET FREEZE/UNFREEZE DTOs ====================

export class FreezeWalletDto {
  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID to freeze wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email to freeze wallet for',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '9038123456',
    description: 'Account number to freeze wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({
    example: 'Suspicious activity detected',
    description: 'Reason for freezing the wallet',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UnfreezeWalletDto {
  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID to unfreeze wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email to unfreeze wallet for',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '9038123456',
    description: 'Account number to unfreeze wallet for',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({
    example: 'Issue resolved',
    description: 'Reason for unfreezing the wallet',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class WalletFreezeResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Wallet frozen successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'cmcypf6hk00001gk3itv4ybwo',
    description: 'User ID',
  })
  userId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  userEmail: string;

  @ApiProperty({
    example: 'wallet123',
    description: 'Wallet ID',
  })
  walletId: string;

  @ApiProperty({
    example: '9038123456',
    description: 'Virtual account number',
  })
  accountNumber: string;

  @ApiProperty({
    example: true,
    description: 'New freeze status',
  })
  isFrozen: boolean;

  @ApiProperty({
    example: 'Suspicious activity detected',
    description: 'Freeze reason',
  })
  reason?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Operation timestamp',
  })
  timestamp: string;
}

// ==================== TOTAL WALLET BALANCE DTOs ====================

export class TotalWalletBalanceResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({
    example: 'Total wallet balance retrieved successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 25000000.00,
    description: 'Total balance across all wallets',
  })
  totalBalance: number;

  @ApiProperty({
    example: '₦25,000,000.00',
    description: 'Formatted total balance',
  })
  formattedTotalBalance: string;

  @ApiProperty({
    example: 1200,
    description: 'Total number of wallets',
  })
  totalWallets: number;

  @ApiProperty({
    example: 1150,
    description: 'Number of active wallets',
  })
  activeWallets: number;

  @ApiProperty({
    example: 50,
    description: 'Number of frozen wallets',
  })
  frozenWallets: number;

  @ApiProperty({
    example: 20833.33,
    description: 'Average balance per wallet',
  })
  averageBalance: number;

  @ApiProperty({
    example: '₦20,833.33',
    description: 'Formatted average balance',
  })
  formattedAverageBalance: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Calculation timestamp',
  })
  timestamp: string;
}
