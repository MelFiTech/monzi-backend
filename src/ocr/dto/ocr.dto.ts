import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum OcrStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class UploadImageDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  image: any;
}

export class ExtractTextDto {
  @ApiProperty({ example: 'raw OCR text output...' })
  @IsString()
  rawText: string;

  @ApiProperty({ example: 0.95, required: false })
  @IsOptional()
  @IsNumber()
  confidence?: number;
}

export class OcrResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  originalText: string;

  @ApiProperty({ required: false })
  cleanedText?: string;

  @ApiProperty({ required: false })
  extractedData?: any;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty({ required: false })
  confidence?: number;

  @ApiProperty({ enum: OcrStatus })
  status: OcrStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ProcessedOcrDataDto {
  @ApiProperty()
  accountNumber?: string;

  @ApiProperty()
  bankName?: string;

  @ApiProperty()
  amount?: number;

  @ApiProperty()
  currency?: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  recipient?: string;

  @ApiProperty()
  reference?: string;

  @ApiProperty()
  transactionType?: string;
} 