import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractTextDto, ProcessedOcrDataDto } from './dto/ocr.dto';
import { OcrProviderManagerService } from '../providers/ocr-provider-manager.service';
import { extname } from 'path';

// Type definition for multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private prisma: PrismaService,
    private ocrProviderManager: OcrProviderManagerService,
  ) {}

  async processImage(file: MulterFile, userId: string) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    this.logger.log(`Processing OCR image for user: ${userId}`);

    // Generate filename for storage
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    const filename = `${randomName}${extname(file.originalname)}`;
    const imageUrl = `uploads/${filename}`;

    // Save file to disk for reference
    const fs = require('fs');
    const path = require('path');
    const uploadDir = './uploads';

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);

    // Create initial OCR scan record
    const ocrScan = await this.prisma.ocrScan.create({
      data: {
        originalText: '', // Will be populated after OCR processing
        imageUrl,
        confidence: 0,
        status: 'PROCESSING',
        userId,
      },
    });

    // Process OCR asynchronously to avoid blocking the response
    this.processOcrTextAsync(ocrScan.id, file.buffer);

    return ocrScan;
  }

  async extractText(extractTextDto: ExtractTextDto, userId: string) {
    const { rawText, confidence } = extractTextDto;

    const ocrScan = await this.prisma.ocrScan.create({
      data: {
        originalText: rawText,
        confidence: confidence || 0.8,
        status: 'PROCESSING',
        userId,
      },
    });

    // Process the text to extract structured data
    const processedData = this.extractStructuredData(rawText);

    const updatedScan = await this.prisma.ocrScan.update({
      where: { id: ocrScan.id },
      data: {
        cleanedText: this.cleanText(rawText),
        extractedData: { ...processedData } as any,
        status: 'COMPLETED',
      },
    });

    return updatedScan;
  }

  private async processOcrTextAsync(scanId: string, imageBuffer: Buffer) {
    try {
      this.logger.debug(`Starting OCR processing for scan: ${scanId}`);

      // Validate image buffer
      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        this.logger.error(`Invalid image buffer for scan ${scanId}`);
        await this.updateOcrScanStatus(scanId, 'FAILED', '', 0);
        return;
      }

      this.logger.debug(`Image buffer size: ${imageBuffer.length} bytes`);

      // Use OCR provider manager to extract text
      const ocrResult = await this.ocrProviderManager.extractText(imageBuffer, {
        preprocess: true,
        language: 'eng',
      });

      if (!ocrResult.success) {
        this.logger.error(`OCR failed for scan ${scanId}:`, ocrResult.error);
        await this.updateOcrScanStatus(scanId, 'FAILED', '', 0);
        return;
      }

      // Extract structured data from OCR text
      const processedData = this.extractStructuredData(ocrResult.text);

      // Update OCR scan with results
      await this.prisma.ocrScan.update({
        where: { id: scanId },
        data: {
          originalText: ocrResult.text,
          cleanedText: this.cleanText(ocrResult.text),
          extractedData: { ...processedData } as any,
          confidence: ocrResult.confidence,
          status: 'COMPLETED',
        },
      });

      this.logger.log(`OCR processing completed for scan: ${scanId}`);
    } catch (error) {
      this.logger.error(`Error processing OCR for scan ${scanId}:`, error);
      await this.updateOcrScanStatus(scanId, 'FAILED', '', 0);
    }
  }

  private async updateOcrScanStatus(
    scanId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
    text: string,
    confidence: number,
  ) {
    try {
      await this.prisma.ocrScan.update({
        where: { id: scanId },
        data: {
          originalText: text,
          confidence,
          status,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update OCR scan status for ${scanId}:`,
        error,
      );
    }
  }

  private cleanText(rawText: string): string {
    // Remove extra whitespace, special characters, and normalize text
    return rawText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,:-]/g, '')
      .trim();
  }

  private extractStructuredData(text: string): ProcessedOcrDataDto {
    const data: ProcessedOcrDataDto = {};

    // Extract account number
    const accountMatch = text.match(/(?:account|acc|a\/c)[\s:]*(\d{10,})/i);
    if (accountMatch) {
      data.accountNumber = accountMatch[1];
    }

    // Extract bank name
    const bankMatch = text.match(/(?:bank|bnk)[\s:]*([a-zA-Z\s]+)/i);
    if (bankMatch) {
      data.bankName = bankMatch[1].trim();
    }

    // Extract amount
    const amountMatch = text.match(
      /(?:amount|amt|₦|#)[\s:]*([0-9,]+(?:\.\d{2})?)/i,
    );
    if (amountMatch) {
      data.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      data.currency = 'NGN';
    }

    // Extract transaction type
    if (text.toLowerCase().includes('transfer')) {
      data.transactionType = 'TRANSFER';
    } else if (text.toLowerCase().includes('payment')) {
      data.transactionType = 'PAYMENT';
    } else if (text.toLowerCase().includes('withdrawal')) {
      data.transactionType = 'WITHDRAWAL';
    } else if (text.toLowerCase().includes('deposit')) {
      data.transactionType = 'DEPOSIT';
    }

    // Extract recipient name
    const recipientMatch = text.match(
      /(?:to|recipient|beneficiary)[\s:]*([a-zA-Z\s]+)/i,
    );
    if (recipientMatch) {
      data.recipient = recipientMatch[1].trim();
    }

    // Extract reference
    const refMatch = text.match(/(?:ref|reference)[\s:]*([a-zA-Z0-9]+)/i);
    if (refMatch) {
      data.reference = refMatch[1];
    }

    return data;
  }

  async getOcrHistory(userId: string) {
    return this.prisma.ocrScan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          select: {
            id: true,
            amount: true,
            status: true,
            reference: true,
          },
        },
      },
    });
  }

  async getOcrScan(id: string, userId: string) {
    const scan = await this.prisma.ocrScan.findFirst({
      where: { id, userId },
      include: {
        transactions: true,
      },
    });

    if (!scan) {
      throw new BadRequestException('OCR scan not found');
    }

    return scan;
  }

  async getOcrHealth() {
    return {
      available: this.ocrProviderManager.isOcrAvailable(),
      providers: this.ocrProviderManager.getAvailableProviders(),
      fallbackEnabled: true,
      timestamp: new Date().toISOString(),
    };
  }
}
