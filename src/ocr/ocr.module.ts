import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TesseractOcrProvider } from '../providers/tesseract/tesseract-ocr.provider';
import { OcrProviderManagerService } from '../providers/ocr-provider-manager.service';

@Module({
  imports: [ConfigModule],
  controllers: [OcrController],
  providers: [
    OcrService,
    PrismaService,
    TesseractOcrProvider,
    OcrProviderManagerService,
  ],
  exports: [OcrService],
})
export class OcrModule {}
