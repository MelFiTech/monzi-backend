import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ example: '1000.00', description: 'Amount to transfer' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    example: '0123456789',
    description: 'Recipient account number',
  })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({
    example: 'First Bank of Nigeria',
    description: 'Recipient bank name',
  })
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty({ example: 'John Doe', description: 'Recipient account name' })
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @ApiProperty({
    example: 'Payment for services',
    description: 'Transfer description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '1234', description: 'Wallet PIN for authorization' })
  @IsNotEmpty()
  @IsString()
  pin: string;
}

export class WalletDetailsResponse {
  @ApiProperty({ example: 'cuid123', description: 'Wallet ID' })
  id: string;

  @ApiProperty({ example: 5000.0, description: 'Current wallet balance' })
  balance: number;

  @ApiProperty({ example: 'NGN', description: 'Wallet currency' })
  currency: string;

  @ApiProperty({ example: '9038123456', description: 'Virtual account number' })
  virtualAccountNumber: string;

  @ApiProperty({ example: 'John Doe', description: 'Account name' })
  providerAccountName: string;

  @ApiProperty({ example: 'BUDPAY', description: 'Wallet provider name' })
  providerName: string;

  @ApiProperty({
    example: 'BudPay Bank',
    description: 'Bank name from provider',
  })
  bankName: string;

  @ApiProperty({ example: true, description: 'Whether wallet is active' })
  isActive: boolean;

  @ApiProperty({ example: 100000, description: 'Daily spending limit' })
  dailyLimit: number;

  @ApiProperty({ example: 1000000, description: 'Monthly spending limit' })
  monthlyLimit: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Last transaction timestamp',
  })
  lastTransactionAt: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Wallet creation date',
  })
  createdAt: string;
}

export class TransferResponse {
  @ApiProperty({ example: true, description: 'Transfer success status' })
  success: boolean;

  @ApiProperty({
    example: 'Transfer completed successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'TXN_1234567890',
    description: 'Transaction reference',
  })
  reference: string;

  @ApiProperty({ example: 1000.0, description: 'Transfer amount' })
  amount: number;

  @ApiProperty({ example: 50.0, description: 'Transfer fee' })
  fee: number;

  @ApiProperty({ example: 4000.0, description: 'New wallet balance' })
  newBalance: number;

  @ApiProperty({ example: 'John Doe', description: 'Recipient name' })
  recipientName: string;

  @ApiProperty({
    example: '0123456789',
    description: 'Recipient account number',
  })
  recipientAccount: string;

  @ApiProperty({
    example: 'First Bank of Nigeria',
    description: 'Recipient bank',
  })
  recipientBank: string;
}

export class SetWalletPinDto {
  @ApiProperty({ example: '1234', description: 'New 4-digit wallet PIN' })
  @IsNotEmpty()
  @IsString()
  pin: string;
}
