import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiQueryDto } from './dto/ai.dto';
export declare class AiService {
    private prisma;
    private configService;
    private gemini;
    private openai;
    constructor(prisma: PrismaService, configService: ConfigService);
    processQuery(queryDto: AiQueryDto, userId?: string): Promise<{
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
    private generateStructuredQuery;
    private parseQueryKeywords;
    private executeQuery;
    private generateResponse;
    getQueryHistory(userId?: string): Promise<{
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
