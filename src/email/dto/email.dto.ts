import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';

export enum EmailType {
  OTP = 'OTP',
  WELCOME = 'WELCOME',
  TRANSACTION = 'TRANSACTION',
  PROMOTIONAL = 'PROMOTIONAL',
}

export class SendOtpEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Recipient email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'Recipient name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123456', description: 'OTP code' })
  @IsString()
  otpCode: string;

  @ApiPropertyOptional({ example: 5, description: 'OTP expiration in minutes' })
  @IsOptional()
  @IsString()
  expirationMinutes?: string;
}

export class SendWelcomeEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Recipient email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '9038123456', description: 'Virtual account number' })
  @IsOptional()
  @IsString()
  virtualAccountNumber?: string;
}

export class SendTransactionEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Recipient email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'TRANSFER', description: 'Transaction type' })
  @IsString()
  transactionType: string;

  @ApiProperty({ example: 5000.00, description: 'Transaction amount' })
  @IsString()
  amount: string;

  @ApiProperty({ example: 'TXN_123456', description: 'Transaction reference' })
  @IsString()
  reference: string;

  @ApiProperty({ example: 'COMPLETED', description: 'Transaction status' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: 'Transfer to savings account', description: 'Transaction description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z', description: 'Transaction date' })
  @IsOptional()
  @IsString()
  transactionDate?: string;
}

export class SendPromotionalEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Recipient email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'New Feature Launch', description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'Check out our new feature...', description: 'Email content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Additional data for template' })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;
}

export class EmailSendResponse {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Email sent successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ example: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794', description: 'Resend email ID' })
  emailId?: string;

  @ApiPropertyOptional({ example: 'OTP', description: 'Email type sent' })
  type?: EmailType;
}

export class BulkEmailDto {
  @ApiProperty({ type: [String], example: ['user1@example.com', 'user2@example.com'], description: 'Recipient email addresses' })
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiProperty({ example: 'Monthly Newsletter', description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'newsletter', description: 'Email template name' })
  @IsString()
  templateName: string;

  @ApiPropertyOptional({ description: 'Template data for personalization' })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;
}

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
} 