export declare enum TransactionStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare enum TransactionType {
    TRANSFER = "TRANSFER",
    DEPOSIT = "DEPOSIT",
    WITHDRAWAL = "WITHDRAWAL",
    PAYMENT = "PAYMENT"
}
export declare class CreateTransactionDto {
    amount: number;
    description: string;
    type: TransactionType;
    toAccountNumber: string;
    toBankName: string;
    fromAccountNumber?: string;
}
export declare class TransactionResponseDto {
    id: string;
    amount: number;
    currency: string;
    description: string;
    reference: string;
    status: TransactionStatus;
    type: TransactionType;
    createdAt: Date;
    fromAccount?: any;
    toAccount?: any;
}
