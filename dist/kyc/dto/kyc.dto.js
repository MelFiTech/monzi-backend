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
exports.CompleteKycResponseDto = exports.KycStatusResponseDto = exports.SelfieUploadResponseDto = exports.BvnVerificationResponseDto = exports.CompleteKycDto = exports.UploadSelfieDto = exports.VerifyBvnDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class VerifyBvnDto {
}
exports.VerifyBvnDto = VerifyBvnDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '22234567890',
        description: 'Bank Verification Number (11 digits)'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], VerifyBvnDto.prototype, "bvn", void 0);
class UploadSelfieDto {
}
exports.UploadSelfieDto = UploadSelfieDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        type: 'string',
        format: 'binary',
        description: 'User selfie image file (jpg, png)'
    }),
    __metadata("design:type", Object)
], UploadSelfieDto.prototype, "selfie", void 0);
class CompleteKycDto {
}
exports.CompleteKycDto = CompleteKycDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '22234567890',
        description: 'Verified BVN'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "bvn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'path/to/selfie.jpg',
        description: 'Uploaded selfie URL'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "selfieUrl", void 0);
class BvnVerificationResponseDto {
}
exports.BvnVerificationResponseDto = BvnVerificationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], BvnVerificationResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BvnVerificationResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], BvnVerificationResponseDto.prototype, "bvnData", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, enum: ['VERIFIED', 'REJECTED'] }),
    __metadata("design:type", String)
], BvnVerificationResponseDto.prototype, "kycStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Boolean)
], BvnVerificationResponseDto.prototype, "walletCreated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    __metadata("design:type", Array)
], BvnVerificationResponseDto.prototype, "verificationErrors", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], BvnVerificationResponseDto.prototype, "error", void 0);
class SelfieUploadResponseDto {
}
exports.SelfieUploadResponseDto = SelfieUploadResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], SelfieUploadResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SelfieUploadResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], SelfieUploadResponseDto.prototype, "selfieUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], SelfieUploadResponseDto.prototype, "verificationScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], SelfieUploadResponseDto.prototype, "aiApprovalId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Boolean)
], SelfieUploadResponseDto.prototype, "walletCreated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], SelfieUploadResponseDto.prototype, "error", void 0);
class KycStatusResponseDto {
}
exports.KycStatusResponseDto = KycStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'VERIFIED' }),
    __metadata("design:type", String)
], KycStatusResponseDto.prototype, "kycStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], KycStatusResponseDto.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Date)
], KycStatusResponseDto.prototype, "verifiedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Boolean)
], KycStatusResponseDto.prototype, "bvnVerified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Boolean)
], KycStatusResponseDto.prototype, "selfieVerified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], KycStatusResponseDto.prototype, "message", void 0);
class CompleteKycResponseDto {
}
exports.CompleteKycResponseDto = CompleteKycResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], CompleteKycResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKycResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], CompleteKycResponseDto.prototype, "kycStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Boolean)
], CompleteKycResponseDto.prototype, "walletCreated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], CompleteKycResponseDto.prototype, "virtualAccountNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], CompleteKycResponseDto.prototype, "error", void 0);
//# sourceMappingURL=kyc.dto.js.map