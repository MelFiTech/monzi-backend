import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

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