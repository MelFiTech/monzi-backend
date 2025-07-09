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
exports.TransactionSummaryDto = exports.AiResponseDto = exports.StructuredQueryDto = exports.AiQueryDto = exports.AiModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var AiModel;
(function (AiModel) {
    AiModel["GPT4"] = "gpt-4";
    AiModel["GPT35_TURBO"] = "gpt-3.5-turbo";
    AiModel["GEMINI_PRO"] = "gemini-pro";
})(AiModel || (exports.AiModel = AiModel = {}));
class AiQueryDto {
}
exports.AiQueryDto = AiQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Show my last 3 GTBank transfers' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AiQueryDto.prototype, "prompt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: AiModel, required: false, default: AiModel.GEMINI_PRO }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AiModel),
    __metadata("design:type", String)
], AiQueryDto.prototype, "model", void 0);
class StructuredQueryDto {
}
exports.StructuredQueryDto = StructuredQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'GTBank', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StructuredQueryDto.prototype, "bank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'TRANSFER', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StructuredQueryDto.prototype, "transactionType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], StructuredQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000, required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], StructuredQueryDto.prototype, "minAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50000, required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], StructuredQueryDto.prototype, "maxAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StructuredQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-12-31', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StructuredQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StructuredQueryDto.prototype, "recipient", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], StructuredQueryDto.prototype, "metadata", void 0);
class AiResponseDto {
}
exports.AiResponseDto = AiResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AiResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AiResponseDto.prototype, "prompt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AiResponseDto.prototype, "response", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", StructuredQueryDto)
], AiResponseDto.prototype, "structured", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: AiModel }),
    __metadata("design:type", String)
], AiResponseDto.prototype, "model", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], AiResponseDto.prototype, "tokens", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AiResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AiResponseDto.prototype, "createdAt", void 0);
class TransactionSummaryDto {
}
exports.TransactionSummaryDto = TransactionSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionSummaryDto.prototype, "totalTransactions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionSummaryDto.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionSummaryDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], TransactionSummaryDto.prototype, "transactions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionSummaryDto.prototype, "summary", void 0);
//# sourceMappingURL=ai.dto.js.map