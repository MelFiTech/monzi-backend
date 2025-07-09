import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { FeeType } from '../admin/dto/admin.dto';
import { TransferDto, WalletDetailsResponse, TransferResponse } from './dto/wallet.dto';
export declare class WalletService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    createWallet(userId: string, userFirstName: string, userLastName: string): Promise<any>;
    calculateFee(feeType: FeeType, amount: number): Promise<number>;
    getWalletDetails(userId: string): Promise<WalletDetailsResponse>;
    setWalletPin(userId: string, pin: string): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyWalletPin(userId: string, pin: string): Promise<boolean>;
    checkSufficientBalance(userId: string, amount: number): Promise<boolean>;
    transferToBank(userId: string, transferDto: TransferDto): Promise<TransferResponse>;
    private getBankCode;
    private sendTransferToProvider;
    getWalletTransactions(userId: string, limit?: number, offset?: number): Promise<{
        id: string;
        amount: number;
        type: import("../../generated/prisma").$Enums.WalletTransactionType;
        status: import("../../generated/prisma").$Enums.TransactionStatus;
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
}
