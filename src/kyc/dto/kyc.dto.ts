import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

// BVN Verification DTO
export class VerifyBvnDto {
  @ApiProperty({ 
    example: '22234567890',
    description: 'Bank Verification Number (11 digits)'
  })
  @IsString()
  @IsNotEmpty()
  bvn: string;
}

// Selfie Upload DTO
export class UploadSelfieDto {
  @ApiProperty({ 
    type: 'string', 
    format: 'binary',
    description: 'User selfie image file (jpg, png)'
  })
  selfie: any;
}

// Complete KYC DTO (if needed for final step)
export class CompleteKycDto {
  @ApiProperty({ 
    example: '22234567890',
    description: 'Verified BVN'
  })
  @IsString()
  @IsNotEmpty()
  bvn: string;

  @ApiProperty({ 
    example: 'path/to/selfie.jpg',
    description: 'Uploaded selfie URL'
  })
  @IsString()
  @IsNotEmpty()
  selfieUrl: string;
}

// BVN Verification Response DTO
export class BvnVerificationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  bvnData?: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    lgaOfOrigin?: string;
    residentialAddress?: string;
    stateOfOrigin?: string;
  };

  @ApiProperty({ required: false, enum: ['VERIFIED', 'REJECTED'] })
  kycStatus?: string;

  @ApiProperty({ required: false })
  walletCreated?: boolean;

  @ApiProperty({ required: false, type: [String] })
  verificationErrors?: string[];

  @ApiProperty({ required: false })
  error?: string;
}

// Selfie Upload Response DTO
export class SelfieUploadResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  selfieUrl?: string;

  @ApiProperty({ required: false })
  verificationScore?: number; // AI confidence score

  @ApiProperty({ required: false })
  aiApprovalId?: string; // AI approval record ID

  @ApiProperty({ required: false })
  walletCreated?: boolean; // Whether wallet was created

  @ApiProperty({ required: false })
  error?: string;
}

// KYC Status Response DTO
export class KycStatusResponseDto {
  @ApiProperty({ example: 'VERIFIED' })
  kycStatus: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty({ required: false })
  verifiedAt?: Date;

  @ApiProperty({ required: false })
  bvnVerified?: boolean;

  @ApiProperty({ required: false })
  selfieVerified?: boolean;

  @ApiProperty({ required: false })
  message?: string;
}

// Complete KYC Response DTO
export class CompleteKycResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  kycStatus?: string;

  @ApiProperty({ required: false })
  walletCreated?: boolean;

  @ApiProperty({ required: false })
  virtualAccountNumber?: string;

  @ApiProperty({ required: false })
  error?: string;
} 