import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractTextDto, ProcessedOcrDataDto } from './dto/ocr.dto';

@Injectable()
export class OcrService {
  constructor(private prisma: PrismaService) {}

  async processImage(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // In a real implementation, you would:
    // 1. Upload file to cloud storage (AWS S3, Google Cloud Storage, etc.)
    // 2. Use OCR service like Google Vision API or AWS Textract
    // For demo purposes, we'll simulate OCR processing

    const ocrScan = await this.prisma.ocrScan.create({
      data: {
        originalText:
          'Simulated OCR text - Transfer to John Doe Account: 1234567890 Amount: 50000 Bank: GTBank',
        imageUrl: `uploads/${file.filename}`, // In real app, this would be cloud storage URL
        confidence: 0.95,
        status: 'PROCESSING',
        userId,
      },
    });

    // Simulate processing delay
    setTimeout(() => {
      this.processOcrText(ocrScan.id);
    }, 1000);

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

  private async processOcrText(scanId: string) {
    const scan = await this.prisma.ocrScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) return;

    const processedData = this.extractStructuredData(scan.originalText);

    await this.prisma.ocrScan.update({
      where: { id: scanId },
      data: {
        cleanedText: this.cleanText(scan.originalText),
        extractedData: { ...processedData } as any,
        status: 'COMPLETED',
      },
    });
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
}
