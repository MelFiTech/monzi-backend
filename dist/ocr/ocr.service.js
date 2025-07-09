"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OcrService = class OcrService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async processImage(file, userId) {
        if (!file) {
            throw new common_1.BadRequestException('No image file provided');
        }
        const ocrScan = await this.prisma.ocrScan.create({
            data: {
                originalText: 'Simulated OCR text - Transfer to John Doe Account: 1234567890 Amount: 50000 Bank: GTBank',
                imageUrl: `uploads/${file.filename}`,
                confidence: 0.95,
                status: 'PROCESSING',
                userId,
            },
        });
        setTimeout(() => {
            this.processOcrText(ocrScan.id);
        }, 1000);
        return ocrScan;
    }
    async extractText(extractTextDto, userId) {
        const { rawText, confidence } = extractTextDto;
        const ocrScan = await this.prisma.ocrScan.create({
            data: {
                originalText: rawText,
                confidence: confidence || 0.8,
                status: 'PROCESSING',
                userId,
            },
        });
        const processedData = this.extractStructuredData(rawText);
        const updatedScan = await this.prisma.ocrScan.update({
            where: { id: ocrScan.id },
            data: {
                cleanedText: this.cleanText(rawText),
                extractedData: { ...processedData },
                status: 'COMPLETED',
            },
        });
        return updatedScan;
    }
    async processOcrText(scanId) {
        const scan = await this.prisma.ocrScan.findUnique({
            where: { id: scanId },
        });
        if (!scan)
            return;
        const processedData = this.extractStructuredData(scan.originalText);
        await this.prisma.ocrScan.update({
            where: { id: scanId },
            data: {
                cleanedText: this.cleanText(scan.originalText),
                extractedData: { ...processedData },
                status: 'COMPLETED',
            },
        });
    }
    cleanText(rawText) {
        return rawText
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,:-]/g, '')
            .trim();
    }
    extractStructuredData(text) {
        const data = {};
        const accountMatch = text.match(/(?:account|acc|a\/c)[\s:]*(\d{10,})/i);
        if (accountMatch) {
            data.accountNumber = accountMatch[1];
        }
        const bankMatch = text.match(/(?:bank|bnk)[\s:]*([a-zA-Z\s]+)/i);
        if (bankMatch) {
            data.bankName = bankMatch[1].trim();
        }
        const amountMatch = text.match(/(?:amount|amt|₦|#)[\s:]*([0-9,]+(?:\.\d{2})?)/i);
        if (amountMatch) {
            data.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
            data.currency = 'NGN';
        }
        if (text.toLowerCase().includes('transfer')) {
            data.transactionType = 'TRANSFER';
        }
        else if (text.toLowerCase().includes('payment')) {
            data.transactionType = 'PAYMENT';
        }
        else if (text.toLowerCase().includes('withdrawal')) {
            data.transactionType = 'WITHDRAWAL';
        }
        else if (text.toLowerCase().includes('deposit')) {
            data.transactionType = 'DEPOSIT';
        }
        const recipientMatch = text.match(/(?:to|recipient|beneficiary)[\s:]*([a-zA-Z\s]+)/i);
        if (recipientMatch) {
            data.recipient = recipientMatch[1].trim();
        }
        const refMatch = text.match(/(?:ref|reference)[\s:]*([a-zA-Z0-9]+)/i);
        if (refMatch) {
            data.reference = refMatch[1];
        }
        return data;
    }
    async getOcrHistory(userId) {
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
    async getOcrScan(id, userId) {
        const scan = await this.prisma.ocrScan.findFirst({
            where: { id, userId },
            include: {
                transactions: true,
            },
        });
        if (!scan) {
            throw new common_1.BadRequestException('OCR scan not found');
        }
        return scan;
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OcrService);
//# sourceMappingURL=ocr.service.js.map