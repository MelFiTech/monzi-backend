import { WalletService } from './wallet.service';
import { TransferDto, WalletDetailsResponse, TransferResponse, SetWalletPinDto } from './dto/wallet.dto';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    getWalletDetails(req: any): Promise<WalletDetailsResponse>;
    setWalletPin(req: any, setPinDto: SetWalletPinDto): Promise<{
        success: boolean;
        message: string;
    }>;
    transferToBank(req: any, transferDto: TransferDto): Promise<TransferResponse>;
    getTransactions(req: any, limit?: number, offset?: number): Promise<{
        id: string;
        amount: number;
        type: import("generated/prisma").$Enums.WalletTransactionType;
        status: import("generated/prisma").$Enums.TransactionStatus;
        reference: string;
        description: string;
        fee: number;
        createdAt: string;
        metadata: import("generated/prisma/runtime/library").JsonValue;
        sender: {
            name: string;
            accountNumber: string;
        };
        receiver: {
            name: string;
            accountNumber: string;
        };
        bankAccount: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            bankName: string;
            accountName: string;
            bankCode: string | null;
            routingNumber: string | null;
        };
    }[]>;
    getBalance(req: any): Promise<{
        balance: number;
        currency: string;
        formattedBalance: string;
    }>;
}
