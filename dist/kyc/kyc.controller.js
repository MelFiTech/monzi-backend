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
exports.KycController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const kyc_service_1 = require("./kyc.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const kyc_dto_1 = require("./dto/kyc.dto");
let KycController = class KycController {
    constructor(kycService) {
        this.kycService = kycService;
    }
    async verifyBvn(verifyBvnDto, req) {
        console.log('🔍 [KYC API] POST /kyc/verify-bvn - Request received');
        console.log('📝 Request Data:', JSON.stringify(verifyBvnDto, null, 2));
        try {
            const userId = req.user.id;
            const result = await this.kycService.verifyBvn(verifyBvnDto, userId);
            console.log('✅ [KYC API] BVN verification completed');
            console.log('📄 Response Data:', JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.log('❌ [KYC API] BVN verification failed');
            console.log('🚨 Error:', error.message);
            throw error;
        }
    }
    async uploadSelfie(file, req) {
        console.log('📸 [KYC API] POST /kyc/upload-selfie - Request received');
        console.log('📁 File info:', {
            filename: file?.originalname,
            size: file?.size,
            mimetype: file?.mimetype
        });
        try {
            const userId = req.user.id;
            const result = await this.kycService.uploadSelfie(file, userId);
            console.log('✅ [KYC API] Selfie upload completed');
            console.log('📄 Response Data:', JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.log('❌ [KYC API] Selfie upload failed');
            console.log('🚨 Error:', error.message);
            throw error;
        }
    }
    async getKycStatus(req) {
        console.log('📊 [KYC API] GET /kyc/status - Request received');
        try {
            const userId = req.user.id;
            const result = await this.kycService.getKycStatus(userId);
            console.log('✅ [KYC API] KYC status retrieved');
            console.log('📄 Response Data:', JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.log('❌ [KYC API] Failed to get KYC status');
            console.log('🚨 Error:', error.message);
            throw error;
        }
    }
};
exports.KycController = KycController;
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Verify user BVN',
        description: 'Verify Bank Verification Number (BVN) to start KYC process'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'BVN verification completed',
        type: kyc_dto_1.BvnVerificationResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid BVN or user already verified' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, common_1.Post)('verify-bvn'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kyc_dto_1.VerifyBvnDto, Object]),
    __metadata("design:returntype", Promise)
], KycController.prototype, "verifyBvn", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Upload selfie for verification',
        description: 'Upload selfie image for face verification against BVN data'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Selfie uploaded and verified successfully',
        type: kyc_dto_1.SelfieUploadResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid file or BVN not verified' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.Post)('upload-selfie'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('selfie', {
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
                return cb(new Error('Only image files (jpg, jpeg, png) are allowed!'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], KycController.prototype, "uploadSelfie", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get KYC status',
        description: 'Check current KYC verification status for the user'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'KYC status retrieved successfully',
        type: kyc_dto_1.KycStatusResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KycController.prototype, "getKycStatus", null);
exports.KycController = KycController = __decorate([
    (0, swagger_1.ApiTags)('KYC'),
    (0, common_1.Controller)('kyc'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [kyc_service_1.KycService])
], KycController);
//# sourceMappingURL=kyc.controller.js.map