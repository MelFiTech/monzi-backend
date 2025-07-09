import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FeeType {
  TRANSFER = 'TRANSFER',
  WITHDRAWAL = 'WITHDRAWAL',
  FUNDING = 'FUNDING',
  CURRENCY_EXCHANGE = 'CURRENCY_EXCHANGE',
  MONTHLY_MAINTENANCE = 'MONTHLY_MAINTENANCE',
}

export enum KycDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

// ==================== FEE MANAGEMENT DTOs ====================

export class SetFeeDto {
  @ApiProperty({ 
    enum: FeeType, 
    example: 'TRANSFER', 
    description: 'Type of fee to configure' 
  })
  @IsNotEmpty()
  @IsEnum(FeeType)
  type: FeeType;

  @ApiProperty({ 
    example: 0.015, 
    description: 'Fee percentage (e.g., 0.015 for 1.5%)', 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Percentage must be non-negative' })
  @Max(1, { message: 'Percentage cannot exceed 100%' })
  percentage?: number;

  @ApiProperty({ 
    example: 25.00, 
    description: 'Fixed fee amount in NGN', 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Fixed amount must be non-negative' })
  fixedAmount?: number;

  @ApiProperty({ 
    example: 25.00, 
    description: 'Minimum fee amount in NGN', 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Minimum fee must be non-negative' })
  minimumFee?: number;

  @ApiProperty({ 
    example: 5000.00, 
    description: 'Maximum fee amount in NGN', 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Maximum fee must be non-negative' })
  maximumFee?: number;

  @ApiProperty({ 
    example: true, 
    description: 'Whether this fee configuration is active',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ 
    example: 'Transfer fee for wallet-to-bank transfers', 
    description: 'Description of the fee',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class FeeConfigurationResponse {
  @ApiProperty({ example: 'cuid123', description: 'Fee configuration ID' })
  id: string;

  @ApiProperty({ enum: FeeType, example: 'TRANSFER', description: 'Fee type' })
  type: FeeType;

  @ApiProperty({ example: 0.015, description: 'Fee percentage' })
  percentage?: number;

  @ApiProperty({ example: 25.00, description: 'Fixed fee amount' })
  fixedAmount?: number;

  @ApiProperty({ example: 25.00, description: 'Minimum fee amount' })
  minimumFee?: number;

  @ApiProperty({ example: 5000.00, description: 'Maximum fee amount' })
  maximumFee?: number;

  @ApiProperty({ example: true, description: 'Whether fee is active' })
  isActive: boolean;

  @ApiProperty({ example: 'Transfer fee for wallet-to-bank transfers', description: 'Fee description' })
  description?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Last update timestamp' })
  updatedAt: string;
}

export class SetFeeResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ example: 'Fee configuration updated successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ type: FeeConfigurationResponse, description: 'Updated fee configuration' })
  feeConfiguration: FeeConfigurationResponse;
}

export class GetFeesResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ type: [FeeConfigurationResponse], description: 'List of fee configurations' })
  fees: FeeConfigurationResponse[];

  @ApiProperty({ example: 5, description: 'Total number of fee configurations' })
  total: number;
}

export class DeleteFeeResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ example: 'Fee configuration deleted successfully', description: 'Response message' })
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

  @ApiProperty({ example: 'John Doe', description: 'User full name (if available)' })
  fullName?: string;

  @ApiProperty({ example: 'IN_PROGRESS', description: 'Current KYC status' })
  kycStatus: string;

  @ApiProperty({ example: '22234567890', description: 'BVN number' })
  bvn?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'BVN verification date' })
  bvnVerifiedAt?: string;

  @ApiProperty({ example: '/uploads/kyc/user-123-selfie.jpg', description: 'Uploaded selfie URL' })
  selfieUrl?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Submission date' })
  submittedAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'User registration date' })
  createdAt: string;
}

export class GetKycSubmissionsResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ type: [KycSubmissionDto], description: 'List of KYC submissions' })
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
    description: 'Admin decision: APPROVE or REJECT' 
  })
  @IsNotEmpty()
  @IsEnum(KycDecision, { message: 'Decision must be APPROVE or REJECT' })
  decision: KycDecision;

  @ApiProperty({ 
    example: 'Documents verified successfully', 
    description: 'Admin comment/reason for the decision',
    required: false
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class KycReviewResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ example: 'KYC submission approved successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ example: 'VERIFIED', description: 'New KYC status' })
  newStatus: string;

  @ApiProperty({ example: true, description: 'Whether wallet was created (on approval)' })
  walletCreated?: boolean;

  @ApiProperty({ example: '9038123456', description: 'Virtual account number (if wallet created)' })
  virtualAccountNumber?: string;

  @ApiProperty({ example: 'cuid123', description: 'User ID that was reviewed' })
  userId: string;
}

export class KycSubmissionDetailResponse {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ type: KycSubmissionDto, description: 'Detailed KYC submission information' })
  submission: KycSubmissionDto;

  @ApiProperty({ 
    example: 'http://localhost:3000/uploads/kyc/user-123-selfie.jpg', 
    description: 'Full URL to access the selfie image' 
  })
  selfieImageUrl?: string;
} 