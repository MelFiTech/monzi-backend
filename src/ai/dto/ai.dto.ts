import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum AiModel {
  GPT4 = 'gpt-4',
  GPT35_TURBO = 'gpt-3.5-turbo',
  GEMINI_PRO = 'gemini-pro',
}

export class AiQueryDto {
  @ApiProperty({ example: 'Show my last 3 GTBank transfers' })
  @IsString()
  prompt: string;

  @ApiProperty({ enum: AiModel, required: false, default: AiModel.GEMINI_PRO })
  @IsOptional()
  @IsEnum(AiModel)
  model?: AiModel;
}

export class StructuredQueryDto {
  @ApiProperty({ example: 'GTBank', required: false })
  @IsOptional()
  @IsString()
  bank?: string;

  @ApiProperty({ example: 'TRANSFER', required: false })
  @IsOptional()
  @IsString()
  transactionType?: string;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  limit?: number;

  @ApiProperty({ example: 1000, required: false })
  @IsOptional()
  minAmount?: number;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  maxAmount?: number;

  @ApiProperty({ example: '2024-01-01', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class AiResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  prompt: string;

  @ApiProperty()
  response: string;

  @ApiProperty()
  structured: StructuredQueryDto;

  @ApiProperty({ enum: AiModel })
  model: AiModel;

  @ApiProperty({ required: false })
  tokens?: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;
}

export class TransactionSummaryDto {
  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  transactions: any[];

  @ApiProperty()
  summary: string;
}
