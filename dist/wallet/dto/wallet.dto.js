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
exports.SetWalletPinDto = exports.TransferResponse = exports.WalletDetailsResponse = exports.TransferDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class TransferDto {
}
exports.TransferDto = TransferDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1000.00', description: 'Amount to transfer' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1, { message: 'Amount must be greater than 0' }),
    __metadata("design:type", Number)
], TransferDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '0123456789', description: 'Recipient account number' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferDto.prototype, "accountNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'First Bank of Nigeria', description: 'Recipient bank name' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'Recipient account name' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Payment for services', description: 'Transfer description', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1234', description: 'Wallet PIN for authorization' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferDto.prototype, "pin", void 0);
class WalletDetailsResponse {
}
exports.WalletDetailsResponse = WalletDetailsResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid123', description: 'Wallet ID' }),
    __metadata("design:type", String)
], WalletDetailsResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000.00, description: 'Current wallet balance' }),
    __metadata("design:type", Number)
], WalletDetailsResponse.prototype, "balance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'NGN', description: 'Wallet currency' }),
    __metadata("design:type", String)
], WalletDetailsResponse.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '9038123456', description: 'Virtual account number' }),
    __metadata("design:type", String)
], WalletDetailsResponse.prototype, "virtualAccountNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'Account name' }),
    __metadata("design:type", String)
], WalletDetailsResponse.prototype, "providerAccountName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Whether wallet is active' }),
    __metadata("design:type", Boolean)
], WalletDetailsResponse.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100000, description: 'Daily spending limit' }),
    __metadata("design:type", Number)
], WalletDetailsResponse.prototype, "dailyLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000000, description: 'Monthly spending limit' }),
    __metadata("design:type", Number)
], WalletDetailsResponse.prototype, "monthlyLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z', description: 'Last transaction timestamp' }),
    __metadata("design:type", String)
], WalletDetailsResponse.prototype, "lastTransactionAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z', description: 'Wallet creation date' }),
    __metadata("design:type", String)
], WalletDetailsResponse.prototype, "createdAt", void 0);
class TransferResponse {
}
exports.TransferResponse = TransferResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Transfer success status' }),
    __metadata("design:type", Boolean)
], TransferResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Transfer completed successfully', description: 'Response message' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'TXN_1234567890', description: 'Transaction reference' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000.00, description: 'Transfer amount' }),
    __metadata("design:type", Number)
], TransferResponse.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50.00, description: 'Transfer fee' }),
    __metadata("design:type", Number)
], TransferResponse.prototype, "fee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4000.00, description: 'New wallet balance' }),
    __metadata("design:type", Number)
], TransferResponse.prototype, "newBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'Recipient name' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "recipientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '0123456789', description: 'Recipient account number' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "recipientAccount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'First Bank of Nigeria', description: 'Recipient bank' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "recipientBank", void 0);
class SetWalletPinDto {
}
exports.SetWalletPinDto = SetWalletPinDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1234', description: 'New 4-digit wallet PIN' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SetWalletPinDto.prototype, "pin", void 0);
//# sourceMappingURL=wallet.dto.js.map