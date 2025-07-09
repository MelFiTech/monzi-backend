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
exports.ResolveAccountResponseDto = exports.BanksListResponseDto = exports.BankDto = exports.ResolveAccountDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class ResolveAccountDto {
}
exports.ResolveAccountDto = ResolveAccountDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '3089415578',
        description: 'Bank account number to resolve'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ResolveAccountDto.prototype, "account_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'First Bank of Nigeria',
        description: 'Bank name to resolve the account with'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ResolveAccountDto.prototype, "bank_name", void 0);
class BankDto {
}
exports.BankDto = BankDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '000016' }),
    __metadata("design:type", String)
], BankDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'First Bank of Nigeria' }),
    __metadata("design:type", String)
], BankDto.prototype, "name", void 0);
class BanksListResponseDto {
}
exports.BanksListResponseDto = BanksListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], BanksListResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [BankDto] }),
    __metadata("design:type", Array)
], BanksListResponseDto.prototype, "banks", void 0);
class ResolveAccountResponseDto {
}
exports.ResolveAccountResponseDto = ResolveAccountResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ResolveAccountResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'JOHN DOE' }),
    __metadata("design:type", String)
], ResolveAccountResponseDto.prototype, "account_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3089415578' }),
    __metadata("design:type", String)
], ResolveAccountResponseDto.prototype, "account_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'First Bank of Nigeria' }),
    __metadata("design:type", String)
], ResolveAccountResponseDto.prototype, "bank_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '000016' }),
    __metadata("design:type", String)
], ResolveAccountResponseDto.prototype, "bank_code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Account resolved successfully' }),
    __metadata("design:type", String)
], ResolveAccountResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], ResolveAccountResponseDto.prototype, "error", void 0);
//# sourceMappingURL=accounts.dto.js.map