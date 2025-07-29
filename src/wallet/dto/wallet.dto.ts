import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum LocationType {
  STORE = 'STORE',
  RESTAURANT = 'RESTAURANT',
  SERVICE = 'SERVICE',
  OFFICE = 'OFFICE',
  HOSPITAL = 'HOSPITAL',
  SCHOOL = 'SCHOOL',
  BANK = 'BANK',
  ATM = 'ATM',
  OTHER = 'OTHER',
}

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

  // Location data for payment intelligence
  @ApiProperty({
    example: 'KFC Victoria Island',
    description: 'Store/merchant name where payment is being made',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiProperty({
    example: '123 Ahmadu Bello Way, Victoria Island, Lagos',
    description: 'Full address of the location',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiProperty({
    example: 'Lagos',
    description: 'City of the location',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationCity?: string;

  @ApiProperty({
    example: 'Lagos State',
    description: 'State/Province of the location',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationState?: string;

  @ApiProperty({
    example: 6.5244,
    description: 'Latitude coordinate of the location',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLatitude?: number;

  @ApiProperty({
    example: 3.3792,
    description: 'Longitude coordinate of the location',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLongitude?: number;

  @ApiProperty({
    example: LocationType.RESTAURANT,
    description: 'Type of location',
    enum: LocationType,
    required: false,
  })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @ApiProperty({
    example: true,
    description:
      'Whether this payment is to a business account (optional - will auto-detect if not provided)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;
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

  @ApiProperty({ example: false, description: 'Whether wallet is frozen' })
  isFrozen: boolean;

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

  @ApiProperty({
    example: 'cuid123',
    description: 'Transaction ID for tagging purposes',
  })
  transactionId: string;

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

export class TagTransactionDto {
  @ApiProperty({
    example: 'cuid123',
    description: 'Transaction ID to tag',
  })
  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @ApiProperty({
    example: true,
    description: 'Whether this transaction was to a business account',
  })
  @IsNotEmpty()
  @IsBoolean()
  isBusiness: boolean;
}
