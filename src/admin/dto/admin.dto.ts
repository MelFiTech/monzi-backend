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
