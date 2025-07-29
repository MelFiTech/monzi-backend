import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';

// Change Transaction PIN
export class ChangeTransactionPinDto {
  @ApiProperty({
    example: '1234',
    description:
      'Current 4-digit transaction PIN (only required if not using OTP)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only numbers' })
  currentPin?: string;

  @ApiProperty({
    example: '5678',
    description: 'New 4-digit transaction PIN',
  })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only numbers' })
  newPin: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code (only required if forgot current PIN)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode?: string;
}

// Reset Transaction PIN
export class ResetTransactionPinDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to identify the user',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received via email',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode: string;

  @ApiProperty({
    example: '5678',
    description: 'New 4-digit transaction PIN',
  })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only numbers' })
  newPin: string;
}

// Change Passcode
export class ChangePasscodeDto {
  @ApiProperty({
    example: '123456',
    description: 'Current 6-digit passcode (only required if not using OTP)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Passcode must contain only numbers' })
  currentPasscode?: string;

  @ApiProperty({
    example: '789012',
    description: 'New 6-digit passcode',
  })
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Passcode must contain only numbers' })
  newPasscode: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code (only required if forgot current passcode)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode?: string;
}

// Reset Passcode
export class ResetPasscodeDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to identify the user',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received via email',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode: string;

  @ApiProperty({
    example: '789012',
    description: 'New 6-digit passcode',
  })
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Passcode must contain only numbers' })
  newPasscode: string;
}

// Request Account Deletion
export class RequestAccountDeletionDto {
  @ApiProperty({
    example: 'No longer needed',
    description: 'Reason for account deletion',
  })
  @IsString()
  reason: string;
}

// Confirm Account Deletion
export class ConfirmAccountDeletionDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code sent to email',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otpCode: string;
}
