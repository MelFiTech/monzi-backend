import { AiService } from './ai.service';
import { AiQueryDto } from './dto/ai.dto';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    processQuery(aiQueryDto: AiQueryDto, req: any): Promise<{
        results: {
            totalTransactions: number;
            totalAmount: number;
            currency: string;
            transactions: ({
                fromAccount: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    accountNumber: string;
                    bankName: string;
                    accountName: string;
                    bankCode: string | null;
                    routingNumber: string | null;
                };
                toAccount: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    accountNumber: string;
                    bankName: string;
                    accountName: string;
                    bankCode: string | null;
                    routingNumber: string | null;
                };
            } & {
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
            })[];
            summary: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        userId: string | null;
        metadata: import("generated/prisma/runtime/library").JsonValue | null;
        prompt: string;
        model: string | null;
        response: string | null;
        structured: import("generated/prisma/runtime/library").JsonValue | null;
        tokens: number | null;
    }>;
    getQueryHistory(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        userId: string | null;
        metadata: import("generated/prisma/runtime/library").JsonValue | null;
        prompt: string;
        model: string | null;
        response: string | null;
        structured: import("generated/prisma/runtime/library").JsonValue | null;
        tokens: number | null;
    }[]>;
}
