export declare enum AiModel {
    GPT4 = "gpt-4",
    GPT35_TURBO = "gpt-3.5-turbo",
    GEMINI_PRO = "gemini-pro"
}
export declare class AiQueryDto {
    prompt: string;
    model?: AiModel;
}
export declare class StructuredQueryDto {
    bank?: string;
    transactionType?: string;
    limit?: number;
    minAmount?: number;
    maxAmount?: number;
    startDate?: string;
    endDate?: string;
    recipient?: string;
    metadata?: any;
}
export declare class AiResponseDto {
    id: string;
    prompt: string;
    response: string;
    structured: StructuredQueryDto;
    model: AiModel;
    tokens?: number;
    status: string;
    createdAt: Date;
}
export declare class TransactionSummaryDto {
    totalTransactions: number;
    totalAmount: number;
    currency: string;
    transactions: any[];
    summary: string;
}
