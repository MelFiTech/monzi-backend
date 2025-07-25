import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, IsEnum } from 'class-validator';

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PAYMENT = 'PAYMENT',
}

export class CreateTransactionDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Transfer to John Doe' })
  @IsString()
  description: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  toAccountNumber: string;

  @ApiProperty({ example: 'GTBank' })
  @IsString()
  toBankName: string;

  @ApiProperty({ example: '0987654321', required: false })
  @IsOptional()
  @IsString()
  fromAccountNumber?: string;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  reference: string;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  fromAccount?: any;

  @ApiProperty()
  toAccount?: any;
}

export class CalculateFeeDto {
  @ApiProperty({
    example: 1000,
    description: 'Transfer amount in Naira',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'TRANSFER',
    description: 'Type of transaction (TRANSFER, WITHDRAWAL, etc.)',
    enum: ['TRANSFER', 'WITHDRAWAL', 'FUNDING', 'INTERNATIONAL_TRANSFER'],
  })
  @IsString()
  transactionType: string;

  @ApiProperty({
    example: 'NYRA',
    description: 'Provider for the transaction (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;
}

export class FeeCalculationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Fee calculated successfully' })
  message: string;

  @ApiProperty({
    example: {
      amount: 1000,
      transactionType: 'TRANSFER',
      provider: 'NYRA',
      feeAmount: 50,
      feeType: 'FIXED',
      totalAmount: 1050,
      breakdown: {
        transferAmount: 1000,
        fee: 50,
        total: 1050,
      },
    },
  })
  data: {
    amount: number;
    transactionType: string;
    provider?: string;
    feeAmount: number;
    feeType: 'PERCENTAGE' | 'FIXED' | 'TIERED';
    totalAmount: number;
    breakdown: {
      transferAmount: number;
      fee: number;
      total: number;
    };
  };
}

export class FeeTierDto {
  @ApiProperty({ example: 'Small Transfer' })
  name: string;

  @ApiProperty({ example: 0 })
  minAmount: number;

  @ApiProperty({ example: 1000 })
  maxAmount?: number;

  @ApiProperty({ example: 50 })
  feeAmount: number;

  @ApiProperty({ example: 'NYRA' })
  provider?: string;
}

export class GetFeeTiersResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Fee tiers retrieved successfully' })
  message: string;

  @ApiProperty({
    example: [
      {
        name: 'Small Transfer',
        minAmount: 0,
        maxAmount: 1000,
        feeAmount: 50,
        provider: 'NYRA',
      },
    ],
  })
  data: FeeTierDto[];
}
