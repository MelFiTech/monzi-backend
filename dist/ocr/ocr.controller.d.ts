import { OcrService } from './ocr.service';
import { ExtractTextDto, UploadImageDto } from './dto/ocr.dto';
export declare class OcrController {
    private readonly ocrService;
    constructor(ocrService: OcrService);
    uploadImage(file: Express.Multer.File, req: any, uploadImageDto: UploadImageDto): Promise<{
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
    extractText(extractTextDto: ExtractTextDto, req: any): Promise<{
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
    getOcrHistory(req: any): Promise<({
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
    getOcrScan(id: string, req: any): Promise<{
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
