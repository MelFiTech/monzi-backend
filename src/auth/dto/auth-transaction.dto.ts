import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

// Transaction Source DTO
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

// Transaction Destination DTO
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

// Transaction Fee DTO
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

// Transaction Balance Impact DTO
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

// Transaction Timeline DTO
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

// Transaction Detail DTO
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

// Transaction Detail Response DTO
export class TransactionDetailResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ 
    type: TransactionDetailDto, 
    description: 'Transaction detail information' 
  })
  transaction: TransactionDetailDto;
}

// Report Transaction DTO
export class ReportTransactionDto {
  @ApiProperty({ 
    example: 'UNAUTHORIZED_TRANSACTION', 
    description: 'Reason for reporting the transaction',
    enum: ['UNAUTHORIZED_TRANSACTION', 'INCORRECT_AMOUNT', 'DUPLICATE_TRANSACTION', 'TECHNICAL_ISSUE', 'FRAUD_SUSPICION', 'OTHER']
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({ 
    example: 'I did not authorize this transaction. Please investigate.', 
    description: 'Detailed description of the issue' 
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description: string;
}

// Report Transaction Response DTO
export class ReportTransactionResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ example: 'Transaction reported successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ example: 'report123', description: 'Report ID' })
  reportId: string;
}

// Transaction Report DTO
export class TransactionReportDto {
  @ApiProperty({ example: 'report123', description: 'Report ID' })
  id: string;

  @ApiProperty({ example: 'UNAUTHORIZED_TRANSACTION', description: 'Report reason' })
  reason: string;

  @ApiProperty({ example: 'I did not authorize this transaction', description: 'Report description' })
  description: string;

  @ApiProperty({ example: 'PENDING', description: 'Report status' })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Report creation date' })
  createdAt: string;

  @ApiProperty({ 
    type: TransactionDetailDto, 
    description: 'Transaction details' 
  })
  transaction: TransactionDetailDto;
}

// Get Transaction Reports Response DTO
export class GetTransactionReportsResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ 
    type: [TransactionReportDto], 
    description: 'List of transaction reports' 
  })
  reports: TransactionReportDto[];

  @ApiProperty({ example: 10, description: 'Total number of reports' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 20, description: 'Reports per page' })
  limit: number;
}

// Update Report Status DTO
export class UpdateReportStatusDto {
  @ApiProperty({ 
    example: 'RESOLVED', 
    description: 'New status for the report',
    enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']
  })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({ 
    example: 'Issue resolved. Transaction was legitimate.', 
    description: 'Admin notes about the resolution',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  adminNotes?: string;
}

// Update Report Status Response DTO
export class UpdateReportStatusResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ example: 'Report status updated successfully', description: 'Response message' })
  message: string;
} 