import { PrismaService } from '../prisma/prisma.service';
import { ExtractTextDto } from './dto/ocr.dto';
export declare class OcrService {
    private prisma;
    constructor(prisma: PrismaService);
    processImage(file: Express.Multer.File, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        confidence: number | null;
        originalText: string;
        cleanedText: string | null;
        extractedData: import("generated/prisma/runtime/library").JsonValue | null;
        imageUrl: string | null;
        status: import("generated/prisma").$Enums.OcrStatus;
        userId: string;
    }>;
    extractText(extractTextDto: ExtractTextDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        confidence: number | null;
        originalText: string;
        cleanedText: string | null;
        extractedData: import("generated/prisma/runtime/library").JsonValue | null;
        imageUrl: string | null;
        status: import("generated/prisma").$Enums.OcrStatus;
        userId: string;
    }>;
    private processOcrText;
    private cleanText;
    private extractStructuredData;
    getOcrHistory(userId: string): Promise<({
        transactions: {
            id: string;
            status: import("generated/prisma").$Enums.TransactionStatus;
            amount: number;
            reference: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        confidence: number | null;
        originalText: string;
        cleanedText: string | null;
        extractedData: import("generated/prisma/runtime/library").JsonValue | null;
        imageUrl: string | null;
        status: import("generated/prisma").$Enums.OcrStatus;
        userId: string;
    })[]>;
    getOcrScan(id: string, userId: string): Promise<{
        transactions: {
            type: import("generated/prisma").$Enums.TransactionType;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("generated/prisma").$Enums.TransactionStatus;
            amount: number;
            currency: string;
            reference: string;
            userId: string;
            fromAccountId: string | null;
            toAccountId: string | null;
            ocrScanId: string | null;
            metadata: import("generated/prisma/runtime/library").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        confidence: number | null;
        originalText: string;
        cleanedText: string | null;
        extractedData: import("generated/prisma/runtime/library").JsonValue | null;
        imageUrl: string | null;
        status: import("generated/prisma").$Enums.OcrStatus;
        userId: string;
    }>;
}
