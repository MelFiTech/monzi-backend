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
exports.KycSubmissionDetailResponse = exports.KycReviewResponse = exports.KycReviewDto = exports.GetKycSubmissionsResponse = exports.KycSubmissionDto = exports.DeleteFeeResponse = exports.GetFeesResponse = exports.SetFeeResponse = exports.FeeConfigurationResponse = exports.SetFeeDto = exports.KycDecision = exports.FeeType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var FeeType;
(function (FeeType) {
    FeeType["TRANSFER"] = "TRANSFER";
    FeeType["WITHDRAWAL"] = "WITHDRAWAL";
    FeeType["FUNDING"] = "FUNDING";
    FeeType["CURRENCY_EXCHANGE"] = "CURRENCY_EXCHANGE";
    FeeType["MONTHLY_MAINTENANCE"] = "MONTHLY_MAINTENANCE";
})(FeeType || (exports.FeeType = FeeType = {}));
var KycDecision;
(function (KycDecision) {
    KycDecision["APPROVE"] = "APPROVE";
    KycDecision["REJECT"] = "REJECT";
})(KycDecision || (exports.KycDecision = KycDecision = {}));
class SetFeeDto {
}
exports.SetFeeDto = SetFeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: FeeType,
        example: 'TRANSFER',
        description: 'Type of fee to configure'
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(FeeType),
    __metadata("design:type", String)
], SetFeeDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 0.015,
        description: 'Fee percentage (e.g., 0.015 for 1.5%)',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Percentage must be non-negative' }),
    (0, class_validator_1.Max)(1, { message: 'Percentage cannot exceed 100%' }),
    __metadata("design:type", Number)
], SetFeeDto.prototype, "percentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 25.00,
        description: 'Fixed fee amount in NGN',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Fixed amount must be non-negative' }),
    __metadata("design:type", Number)
], SetFeeDto.prototype, "fixedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 25.00,
        description: 'Minimum fee amount in NGN',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Minimum fee must be non-negative' }),
    __metadata("design:type", Number)
], SetFeeDto.prototype, "minimumFee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 5000.00,
        description: 'Maximum fee amount in NGN',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Maximum fee must be non-negative' }),
    __metadata("design:type", Number)
], SetFeeDto.prototype, "maximumFee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: true,
        description: 'Whether this fee configuration is active',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SetFeeDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Transfer fee for wallet-to-bank transfers',
        description: 'Description of the fee',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SetFeeDto.prototype, "description", void 0);
class FeeConfigurationResponse {
}
exports.FeeConfigurationResponse = FeeConfigurationResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid123', description: 'Fee configuration ID' }),
    __metadata("design:type", String)
], FeeConfigurationResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: FeeType, example: 'TRANSFER', description: 'Fee type' }),
    __metadata("design:type", String)
], FeeConfigurationResponse.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.015, description: 'Fee percentage' }),
    __metadata("design:type", Number)
], FeeConfigurationResponse.prototype, "percentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 25.00, description: 'Fixed fee amount' }),
    __metadata("design:type", Number)
], FeeConfigurationResponse.prototype, "fixedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 25.00, description: 'Minimum fee amount' }),
    __metadata("design:type", Number)
], FeeConfigurationResponse.prototype, "minimumFee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000.00, description: 'Maximum fee amount' }),
    __metadata("design:type", Number)
], FeeConfigurationResponse.prototype, "maximumFee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Whether fee is active' }),
    __metadata("design:type", Boolean)
], FeeConfigurationResponse.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Transfer fee for wallet-to-bank transfers', description: 'Fee description' }),
    __metadata("design:type", String)
], FeeConfigurationResponse.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z', description: 'Creation timestamp' }),
    __metadata("design:type", String)
], FeeConfigurationResponse.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z', description: 'Last update timestamp' }),
    __metadata("design:type", String)
], FeeConfigurationResponse.prototype, "updatedAt", void 0);
class SetFeeResponse {
}
exports.SetFeeResponse = SetFeeResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], SetFeeResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Fee configuration updated successfully', description: 'Response message' }),
    __metadata("design:type", String)
], SetFeeResponse.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: FeeConfigurationResponse, description: 'Updated fee configuration' }),
    __metadata("design:type", FeeConfigurationResponse)
], SetFeeResponse.prototype, "feeConfiguration", void 0);
class GetFeesResponse {
}
exports.GetFeesResponse = GetFeesResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], GetFeesResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [FeeConfigurationResponse], description: 'List of fee configurations' }),
    __metadata("design:type", Array)
], GetFeesResponse.prototype, "fees", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5, description: 'Total number of fee configurations' }),
    __metadata("design:type", Number)
], GetFeesResponse.prototype, "total", void 0);
class DeleteFeeResponse {
}
exports.DeleteFeeResponse = DeleteFeeResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], DeleteFeeResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Fee configuration deleted successfully', description: 'Response message' }),
    __metadata("design:type", String)
], DeleteFeeResponse.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'TRANSFER', description: 'Deleted fee type' }),
    __metadata("design:type", String)
], DeleteFeeResponse.prototype, "deletedType", void 0);
class KycSubmissionDto {
}
exports.KycSubmissionDto = KycSubmissionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid123', description: 'User ID' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@example.com', description: 'User email' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+2348123456789', description: 'User phone number' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'User full name (if available)' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'IN_PROGRESS', description: 'Current KYC status' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "kycStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '22234567890', description: 'BVN number' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "bvn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z', description: 'BVN verification date' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "bvnVerifiedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '/uploads/kyc/user-123-selfie.jpg', description: 'Uploaded selfie URL' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "selfieUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z', description: 'Submission date' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "submittedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z', description: 'User registration date' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "createdAt", void 0);
class GetKycSubmissionsResponse {
}
exports.GetKycSubmissionsResponse = GetKycSubmissionsResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], GetKycSubmissionsResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [KycSubmissionDto], description: 'List of KYC submissions' }),
    __metadata("design:type", Array)
], GetKycSubmissionsResponse.prototype, "submissions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 15, description: 'Total number of submissions' }),
    __metadata("design:type", Number)
], GetKycSubmissionsResponse.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5, description: 'Number of pending submissions' }),
    __metadata("design:type", Number)
], GetKycSubmissionsResponse.prototype, "pending", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8, description: 'Number of verified submissions' }),
    __metadata("design:type", Number)
], GetKycSubmissionsResponse.prototype, "verified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2, description: 'Number of rejected submissions' }),
    __metadata("design:type", Number)
], GetKycSubmissionsResponse.prototype, "rejected", void 0);
class KycReviewDto {
}
exports.KycReviewDto = KycReviewDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: KycDecision,
        example: 'APPROVE',
        description: 'Admin decision: APPROVE or REJECT'
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(KycDecision, { message: 'Decision must be APPROVE or REJECT' }),
    __metadata("design:type", String)
], KycReviewDto.prototype, "decision", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Documents verified successfully',
        description: 'Admin comment/reason for the decision',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], KycReviewDto.prototype, "comment", void 0);
class KycReviewResponse {
}
exports.KycReviewResponse = KycReviewResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], KycReviewResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'KYC submission approved successfully', description: 'Response message' }),
    __metadata("design:type", String)
], KycReviewResponse.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'VERIFIED', description: 'New KYC status' }),
    __metadata("design:type", String)
], KycReviewResponse.prototype, "newStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Whether wallet was created (on approval)' }),
    __metadata("design:type", Boolean)
], KycReviewResponse.prototype, "walletCreated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '9038123456', description: 'Virtual account number (if wallet created)' }),
    __metadata("design:type", String)
], KycReviewResponse.prototype, "virtualAccountNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid123', description: 'User ID that was reviewed' }),
    __metadata("design:type", String)
], KycReviewResponse.prototype, "userId", void 0);
class KycSubmissionDetailResponse {
}
exports.KycSubmissionDetailResponse = KycSubmissionDetailResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], KycSubmissionDetailResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KycSubmissionDto, description: 'Detailed KYC submission information' }),
    __metadata("design:type", KycSubmissionDto)
], KycSubmissionDetailResponse.prototype, "submission", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'http://localhost:3000/uploads/kyc/user-123-selfie.jpg',
        description: 'Full URL to access the selfie image'
    }),
    __metadata("design:type", String)
], KycSubmissionDetailResponse.prototype, "selfieImageUrl", void 0);
//# sourceMappingURL=admin.dto.js.map