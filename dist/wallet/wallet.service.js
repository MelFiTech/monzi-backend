"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const admin_dto_1 = require("../admin/dto/admin.dto");
const prisma_1 = require("../../generated/prisma");
const bcrypt = require("bcrypt");
let WalletService = class WalletService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async createWallet(userId, userFirstName, userLastName) {
        console.log('💳 [WALLET CREATE] Creating wallet for user:', userId);
        const existingWallet = await this.prisma.wallet.findUnique({
            where: { userId }
        });
        if (existingWallet) {
            console.log('⚠️ [WALLET CREATE] Wallet already exists for user:', userId);
            return existingWallet;
        }
        const virtualAccountNumber = '903' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        const providerAccountName = `${userFirstName} ${userLastName}`.trim();
        try {
            const wallet = await this.prisma.wallet.create({
                data: {
                    userId,
                    virtualAccountNumber,
                    providerAccountName,
                    providerId: `SNAP_${userId}_${Date.now()}`,
                }
            });
            console.log('✅ [WALLET CREATE] Wallet created with account number:', virtualAccountNumber);
            return wallet;
        }
        catch (error) {
            console.error('❌ [WALLET CREATE] Error creating wallet:', error);
            throw new common_1.BadRequestException('Failed to create wallet');
        }
    }
    async calculateFee(feeType, amount) {
        console.log('💰 [FEE CALCULATION] Calculating fee for type:', feeType, 'amount:', amount);
        try {
            const feeConfig = await this.prisma.feeConfiguration.findUnique({
                where: { type: feeType, isActive: true }
            });
            if (!feeConfig) {
                console.log('⚠️ [FEE CALCULATION] No fee configuration found for type:', feeType);
                return 25;
            }
            let calculatedFee = 0;
            if (feeConfig.percentage) {
                calculatedFee = amount * feeConfig.percentage;
            }
            if (feeConfig.fixedAmount) {
                calculatedFee += feeConfig.fixedAmount;
            }
            if (feeConfig.minimumFee && calculatedFee < feeConfig.minimumFee) {
                calculatedFee = feeConfig.minimumFee;
            }
            if (feeConfig.maximumFee && calculatedFee > feeConfig.maximumFee) {
                calculatedFee = feeConfig.maximumFee;
            }
            console.log('✅ [FEE CALCULATION] Fee calculated:', calculatedFee);
            return calculatedFee;
        }
        catch (error) {
            console.error('❌ [FEE CALCULATION] Error calculating fee:', error);
            return 25;
        }
    }
    async getWalletDetails(userId) {
        console.log('📊 [WALLET DETAILS] Getting wallet details for user:', userId);
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { firstName: true, lastName: true }
                }
            }
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        console.log('✅ [WALLET DETAILS] Wallet details retrieved successfully');
        return {
            id: wallet.id,
            balance: wallet.balance,
            currency: wallet.currency,
            virtualAccountNumber: wallet.virtualAccountNumber,
            providerAccountName: wallet.providerAccountName,
            isActive: wallet.isActive,
            dailyLimit: wallet.dailyLimit,
            monthlyLimit: wallet.monthlyLimit,
            lastTransactionAt: wallet.lastTransactionAt?.toISOString(),
            createdAt: wallet.createdAt.toISOString(),
        };
    }
    async setWalletPin(userId, pin) {
        console.log('🔐 [SET PIN] Setting wallet PIN for user:', userId);
        if (!/^\d{4}$/.test(pin)) {
            throw new common_1.BadRequestException('PIN must be exactly 4 digits');
        }
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId }
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        const hashedPin = await bcrypt.hash(pin, 10);
        await this.prisma.wallet.update({
            where: { userId },
            data: { pin: hashedPin }
        });
        console.log('✅ [SET PIN] Wallet PIN set successfully');
        return {
            success: true,
            message: 'Wallet PIN set successfully'
        };
    }
    async verifyWalletPin(userId, pin) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId }
        });
        if (!wallet || !wallet.pin) {
            throw new common_1.UnauthorizedException('Wallet PIN not set');
        }
        const isValidPin = await bcrypt.compare(pin, wallet.pin);
        if (!isValidPin) {
            throw new common_1.UnauthorizedException('Invalid wallet PIN');
        }
        return true;
    }
    async checkSufficientBalance(userId, amount) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId }
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        return wallet.balance >= amount;
    }
    async transferToBank(userId, transferDto) {
        console.log('💸 [TRANSFER] Processing bank transfer for user:', userId);
        console.log('💸 [TRANSFER] Transfer details:', {
            amount: transferDto.amount,
            accountNumber: transferDto.accountNumber,
            bankName: transferDto.bankName,
            accountName: transferDto.accountName
        });
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true }
                }
            }
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (!wallet.isActive) {
            throw new common_1.ForbiddenException('Wallet is inactive');
        }
        await this.verifyWalletPin(userId, transferDto.pin);
        const fee = await this.calculateFee(admin_dto_1.FeeType.TRANSFER, transferDto.amount);
        const totalDeduction = transferDto.amount + fee;
        if (wallet.balance < totalDeduction) {
            throw new common_1.BadRequestException(`Insufficient balance. Required: ₦${totalDeduction.toFixed(2)}, Available: ₦${wallet.balance.toFixed(2)}`);
        }
        const reference = `TXN_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
        try {
            const bankCode = await this.getBankCode(transferDto.bankName);
            const providerResponse = await this.sendTransferToProvider({
                amount: transferDto.amount,
                accountNumber: transferDto.accountNumber,
                bankCode,
                accountName: transferDto.accountName,
                reference,
                narration: transferDto.description || `Transfer from ${wallet.user.firstName} ${wallet.user.lastName}`,
                senderName: `${wallet.user.firstName} ${wallet.user.lastName}`,
                senderEmail: wallet.user.email,
            });
            console.log('🏦 [TRANSFER] Provider response:', providerResponse);
            const transaction = await this.prisma.walletTransaction.create({
                data: {
                    amount: transferDto.amount,
                    type: prisma_1.WalletTransactionType.WITHDRAWAL,
                    status: prisma_1.TransactionStatus.COMPLETED,
                    reference,
                    description: transferDto.description || `Transfer to ${transferDto.accountName}`,
                    fee,
                    senderWalletId: wallet.id,
                    senderBalanceBefore: wallet.balance,
                    senderBalanceAfter: wallet.balance - totalDeduction,
                    providerReference: providerResponse.reference,
                    providerResponse: providerResponse,
                    metadata: {
                        recipientBank: transferDto.bankName,
                        recipientAccount: transferDto.accountNumber,
                        recipientName: transferDto.accountName,
                        bankCode
                    }
                }
            });
            const updatedWallet = await this.prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: wallet.balance - totalDeduction,
                    lastTransactionAt: new Date()
                }
            });
            console.log('✅ [TRANSFER] Transfer completed successfully');
            console.log('💰 [TRANSFER] New balance:', updatedWallet.balance);
            return {
                success: true,
                message: 'Transfer completed successfully',
                reference,
                amount: transferDto.amount,
                fee,
                newBalance: updatedWallet.balance,
                recipientName: transferDto.accountName,
                recipientAccount: transferDto.accountNumber,
                recipientBank: transferDto.bankName,
            };
        }
        catch (error) {
            console.error('❌ [TRANSFER] Transfer failed:', error);
            await this.prisma.walletTransaction.create({
                data: {
                    amount: transferDto.amount,
                    type: prisma_1.WalletTransactionType.WITHDRAWAL,
                    status: prisma_1.TransactionStatus.FAILED,
                    reference,
                    description: transferDto.description || `Failed transfer to ${transferDto.accountName}`,
                    fee,
                    senderWalletId: wallet.id,
                    senderBalanceBefore: wallet.balance,
                    senderBalanceAfter: wallet.balance,
                    metadata: {
                        recipientBank: transferDto.bankName,
                        recipientAccount: transferDto.accountNumber,
                        recipientName: transferDto.accountName,
                        error: error.message
                    }
                }
            });
            throw new common_1.BadRequestException(`Transfer failed: ${error.message}`);
        }
    }
    async getBankCode(bankName) {
        const bankCodeMapping = {
            'First Bank of Nigeria': '011',
            'First Bank': '011',
            'FirstBank': '011',
            'GTBank': '058',
            'GTBank Plc': '058',
            'Guaranty Trust Bank': '058',
            'Access Bank': '044',
            'Access Bank Plc': '044',
            'Zenith Bank': '057',
            'Zenith Bank Plc': '057',
            'UBA': '033',
            'United Bank for Africa': '033',
            'Union Bank': '032',
            'Union Bank of Nigeria': '032',
            'Sterling Bank': '232',
            'Sterling Bank Plc': '232',
            'Fidelity Bank': '070',
            'Fidelity Bank Plc': '070',
            'FCMB': '214',
            'First City Monument Bank': '214',
            'Wema Bank': '035',
            'Wema Bank Plc': '035',
            'Ecobank': '050',
            'Ecobank Nigeria': '050',
            'Keystone Bank': '082',
            'Keystone Bank Limited': '082',
            'Polaris Bank': '076',
            'Polaris Bank Limited': '076',
            'Stanbic IBTC Bank': '221',
            'Stanbic IBTC': '221',
            'Standard Chartered': '068',
            'Standard Chartered Bank': '068',
            'Providus Bank': '101',
            'Providus Bank Limited': '101',
            'Jaiz Bank': '301',
            'Jaiz Bank Plc': '301',
            'SunTrust Bank': '100',
            'SunTrust Bank Nigeria Limited': '100',
            'Kuda Bank': '50211',
            'Kuda': '50211',
            'VFD Microfinance Bank': '566',
            'VFD': '566',
            'Opay': '305',
            'OPay Digital Services Limited': '305',
            'PalmPay': '304',
            'Palm Pay': '304',
            'Moniepoint': '50515',
            'Moniepoint Microfinance Bank': '50515',
        };
        const bankCode = bankCodeMapping[bankName];
        if (!bankCode) {
            throw new common_1.BadRequestException(`Bank code not found for: ${bankName}`);
        }
        return bankCode;
    }
    async sendTransferToProvider(transferData) {
        console.log('🏦 [PROVIDER] Sending transfer request to provider');
        console.log('🏦 [PROVIDER] Transfer data:', transferData);
        const providerEndpoint = this.configService.get('SMEPLUG_TRANSFER_ENDPOINT') || 'https://api.smeplug.ng/v1/transfer';
        const apiKey = this.configService.get('SMEPLUG_API_KEY');
        try {
            console.log('🏦 [PROVIDER] Simulating transfer to provider...');
            const mockFee = await this.calculateFee(admin_dto_1.FeeType.TRANSFER, transferData.amount);
            const mockResponse = {
                status: 'success',
                message: 'Transfer completed successfully',
                reference: `SMEPLUG_${transferData.reference}`,
                amount: transferData.amount,
                fee: mockFee,
                recipient: {
                    accountNumber: transferData.accountNumber,
                    accountName: transferData.accountName,
                    bankCode: transferData.bankCode
                },
                timestamp: new Date().toISOString()
            };
            console.log('✅ [PROVIDER] Transfer successful:', mockResponse);
            return mockResponse;
        }
        catch (error) {
            console.error('❌ [PROVIDER] Transfer failed:', error);
            if (error.response) {
                throw new Error(`Provider error: ${error.response.data.message || error.response.statusText}`);
            }
            else if (error.request) {
                throw new Error('Provider timeout: Please try again later');
            }
            else {
                throw new Error(`Transfer failed: ${error.message}`);
            }
        }
    }
    async getWalletTransactions(userId, limit = 20, offset = 0) {
        console.log('📊 [TRANSACTIONS] Getting wallet transactions for user:', userId);
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId }
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        const transactions = await this.prisma.walletTransaction.findMany({
            where: {
                OR: [
                    { senderWalletId: wallet.id },
                    { receiverWalletId: wallet.id }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                senderWallet: {
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    }
                },
                receiverWallet: {
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    }
                },
                bankAccount: true
            }
        });
        console.log('✅ [TRANSACTIONS] Retrieved', transactions.length, 'transactions');
        return transactions.map(transaction => ({
            id: transaction.id,
            amount: transaction.amount,
            type: transaction.type,
            status: transaction.status,
            reference: transaction.reference,
            description: transaction.description,
            fee: transaction.fee,
            createdAt: transaction.createdAt.toISOString(),
            metadata: transaction.metadata,
            sender: transaction.senderWallet ? {
                name: `${transaction.senderWallet.user.firstName} ${transaction.senderWallet.user.lastName}`,
                accountNumber: transaction.senderWallet.virtualAccountNumber
            } : null,
            receiver: transaction.receiverWallet ? {
                name: `${transaction.receiverWallet.user.firstName} ${transaction.receiverWallet.user.lastName}`,
                accountNumber: transaction.receiverWallet.virtualAccountNumber
            } : null,
            bankAccount: transaction.bankAccount,
        }));
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map