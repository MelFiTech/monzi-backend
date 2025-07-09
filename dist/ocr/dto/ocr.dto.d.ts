export declare enum OcrStatus {
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export declare class UploadImageDto {
    image: any;
}
export declare class ExtractTextDto {
    rawText: string;
    confidence?: number;
}
export declare class OcrResponseDto {
    id: string;
    originalText: string;
    cleanedText?: string;
    extractedData?: any;
    imageUrl?: string;
    confidence?: number;
    status: OcrStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ProcessedOcrDataDto {
    accountNumber?: string;
    bankName?: string;
    amount?: number;
    currency?: string;
    description?: string;
    recipient?: string;
    reference?: string;
    transactionType?: string;
}
