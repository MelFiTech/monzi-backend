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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const wallet_service_1 = require("./wallet.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const wallet_dto_1 = require("./dto/wallet.dto");
let WalletController = class WalletController {
    constructor(walletService) {
        this.walletService = walletService;
    }
    async getWalletDetails(req) {
        console.log('📊 [WALLET API] GET /wallet/details - Request received');
        console.log('👤 [WALLET API] User ID:', req.user.userId);
        const walletDetails = await this.walletService.getWalletDetails(req.user.userId);
        console.log('✅ [WALLET API] Wallet details retrieved successfully');
        console.log('📄 Response Data:', {
            balance: walletDetails.balance,
            virtualAccountNumber: walletDetails.virtualAccountNumber,
            isActive: walletDetails.isActive
        });
        return walletDetails;
    }
    async setWalletPin(req, setPinDto) {
        console.log('🔐 [WALLET API] POST /wallet/set-pin - Request received');
        console.log('👤 [WALLET API] User ID:', req.user.userId);
        const result = await this.walletService.setWalletPin(req.user.userId, setPinDto.pin);
        console.log('✅ [WALLET API] PIN set successfully');
        console.log('📄 Response Data:', result);
        return result;
    }
    async transferToBank(req, transferDto) {
        console.log('💸 [WALLET API] POST /wallet/transfer - Request received');
        console.log('👤 [WALLET API] User ID:', req.user.userId);
        console.log('💰 [WALLET API] Transfer amount:', transferDto.amount);
        console.log('🏦 [WALLET API] Recipient:', transferDto.accountName, '-', transferDto.accountNumber);
        const transferResult = await this.walletService.transferToBank(req.user.userId, transferDto);
        console.log('✅ [WALLET API] Transfer completed successfully');
        console.log('📄 Response Data:', {
            success: transferResult.success,
            reference: transferResult.reference,
            amount: transferResult.amount,
            fee: transferResult.fee,
            newBalance: transferResult.newBalance
        });
        return transferResult;
    }
    async getTransactions(req, limit, offset) {
        console.log('📊 [WALLET API] GET /wallet/transactions - Request received');
        console.log('👤 [WALLET API] User ID:', req.user.userId);
        console.log('📊 [WALLET API] Query params:', { limit, offset });
        const transactions = await this.walletService.getWalletTransactions(req.user.userId, limit ? Number(limit) : 20, offset ? Number(offset) : 0);
        console.log('✅ [WALLET API] Transactions retrieved successfully');
        console.log('📄 Response Data:', `${transactions.length} transactions`);
        return transactions;
    }
    async getBalance(req) {
        console.log('💰 [WALLET API] GET /wallet/balance - Request received');
        console.log('👤 [WALLET API] User ID:', req.user.userId);
        const walletDetails = await this.walletService.getWalletDetails(req.user.userId);
        const balanceInfo = {
            balance: walletDetails.balance,
            currency: walletDetails.currency,
            formattedBalance: `₦${walletDetails.balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        };
        console.log('✅ [WALLET API] Balance retrieved successfully');
        console.log('📄 Response Data:', balanceInfo);
        return balanceInfo;
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)('details'),
    (0, swagger_1.ApiOperation)({ summary: 'Get wallet details including balance and account info' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Wallet details retrieved successfully',
        type: wallet_dto_1.WalletDetailsResponse
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Wallet not found' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getWalletDetails", null);
__decorate([
    (0, common_1.Post)('set-pin'),
    (0, swagger_1.ApiOperation)({ summary: 'Set or update wallet PIN' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Wallet PIN set successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Wallet PIN set successfully' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid PIN format' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Wallet not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, wallet_dto_1.SetWalletPinDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "setWalletPin", null);
__decorate([
    (0, common_1.Post)('transfer'),
    (0, swagger_1.ApiOperation)({ summary: 'Transfer money from wallet to bank account' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transfer completed successfully',
        type: wallet_dto_1.TransferResponse
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Insufficient balance or invalid transfer details' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid wallet PIN' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Wallet not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, wallet_dto_1.TransferDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "transferToBank", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get wallet transaction history' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Number of transactions to return (default: 20)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Number of transactions to skip (default: 0)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction history retrieved successfully',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'cuid123' },
                    amount: { type: 'number', example: 1000.00 },
                    type: { type: 'string', example: 'WITHDRAWAL' },
                    status: { type: 'string', example: 'COMPLETED' },
                    reference: { type: 'string', example: 'TXN_1234567890' },
                    description: { type: 'string', example: 'Transfer to John Doe' },
                    fee: { type: 'number', example: 50.00 },
                    createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
                    sender: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', example: 'John Doe' },
                            accountNumber: { type: 'string', example: '9038123456' }
                        }
                    },
                    receiver: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', example: 'Jane Smith' },
                            accountNumber: { type: 'string', example: '9038654321' }
                        }
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Wallet not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current wallet balance' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Wallet balance retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                balance: { type: 'number', example: 5000.00 },
                currency: { type: 'string', example: 'NGN' },
                formattedBalance: { type: 'string', example: '₦5,000.00' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Wallet not found' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getBalance", null);
exports.WalletController = WalletController = __decorate([
    (0, swagger_1.ApiTags)('Wallet'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('wallet'),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map