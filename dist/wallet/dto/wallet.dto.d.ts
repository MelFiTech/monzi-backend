export declare class TransferDto {
    amount: number;
    accountNumber: string;
    bankName: string;
    accountName: string;
    description?: string;
    pin: string;
}
export declare class WalletDetailsResponse {
    id: string;
    balance: number;
    currency: string;
    virtualAccountNumber: string;
    providerAccountName: string;
    isActive: boolean;
    dailyLimit: number;
    monthlyLimit: number;
    lastTransactionAt: string;
    createdAt: string;
}
export declare class TransferResponse {
    success: boolean;
    message: string;
    reference: string;
    amount: number;
    fee: number;
    newBalance: number;
    recipientName: string;
    recipientAccount: string;
    recipientBank: string;
}
export declare class SetWalletPinDto {
    pin: string;
}
