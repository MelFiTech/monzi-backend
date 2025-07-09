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
exports.ProcessedOcrDataDto = exports.OcrResponseDto = exports.ExtractTextDto = exports.UploadImageDto = exports.OcrStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var OcrStatus;
(function (OcrStatus) {
    OcrStatus["PROCESSING"] = "PROCESSING";
    OcrStatus["COMPLETED"] = "COMPLETED";
    OcrStatus["FAILED"] = "FAILED";
})(OcrStatus || (exports.OcrStatus = OcrStatus = {}));
class UploadImageDto {
}
exports.UploadImageDto = UploadImageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: 'string', format: 'binary' }),
    __metadata("design:type", Object)
], UploadImageDto.prototype, "image", void 0);
class ExtractTextDto {
}
exports.ExtractTextDto = ExtractTextDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'raw OCR text output...' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtractTextDto.prototype, "rawText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.95, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ExtractTextDto.prototype, "confidence", void 0);
class OcrResponseDto {
}
exports.OcrResponseDto = OcrResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OcrResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OcrResponseDto.prototype, "originalText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], OcrResponseDto.prototype, "cleanedText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], OcrResponseDto.prototype, "extractedData", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], OcrResponseDto.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], OcrResponseDto.prototype, "confidence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: OcrStatus }),
    __metadata("design:type", String)
], OcrResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], OcrResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], OcrResponseDto.prototype, "updatedAt", void 0);
class ProcessedOcrDataDto {
}
exports.ProcessedOcrDataDto = ProcessedOcrDataDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProcessedOcrDataDto.prototype, "accountNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProcessedOcrDataDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ProcessedOcrDataDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProcessedOcrDataDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProcessedOcrDataDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProcessedOcrDataDto.prototype, "recipient", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProcessedOcrDataDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProcessedOcrDataDto.prototype, "transactionType", void 0);
//# sourceMappingURL=ocr.dto.js.map