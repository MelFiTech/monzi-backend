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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const admin_dto_1 = require("./dto/admin.dto");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async setFee(setFeeDto) {
        console.log('⚙️ [ADMIN API] POST /admin/fees - Setting fee configuration');
        console.log('📝 Request Data:', setFeeDto);
        const result = await this.adminService.setFee(setFeeDto);
        console.log('✅ [ADMIN API] Fee configuration set successfully');
        console.log('📄 Response Data:', result);
        return result;
    }
    async getFees() {
        console.log('📊 [ADMIN API] GET /admin/fees - Retrieving all fee configurations');
        const result = await this.adminService.getFees();
        console.log('✅ [ADMIN API] Fee configurations retrieved successfully');
        console.log('📄 Response Data:', { ...result, fees: `${result.fees.length} fee configurations` });
        return result;
    }
    async getFeeByType(type) {
        console.log('🔍 [ADMIN API] GET /admin/fees/:type - Retrieving fee for type:', type);
        const result = await this.adminService.getFeeByType(type);
        if (result) {
            console.log('✅ [ADMIN API] Fee configuration found for type:', type);
            console.log('📄 Response Data:', result);
        }
        else {
            console.log('⚠️ [ADMIN API] No fee configuration found for type:', type);
        }
        return result;
    }
    async deleteFee(type) {
        console.log('🗑️ [ADMIN API] DELETE /admin/fees/:type - Deleting fee for type:', type);
        const result = await this.adminService.deleteFee(type);
        console.log('✅ [ADMIN API] Fee configuration deleted successfully');
        console.log('📄 Response Data:', result);
        return result;
    }
    async seedDefaultFees() {
        console.log('🌱 [ADMIN API] POST /admin/fees/seed - Seeding default fees');
        await this.adminService.seedDefaultFees();
        console.log('✅ [ADMIN API] Default fees seeded successfully');
        return {
            success: true,
            message: 'Default fee configurations seeded successfully'
        };
    }
    async calculateFee(type, body) {
        console.log('🧮 [ADMIN API] POST /admin/fees/:type/calculate - Calculating fee');
        console.log('📝 Type:', type, 'Amount:', body.amount);
        const fee = await this.adminService.calculateFee(type, body.amount);
        const totalAmount = body.amount + fee;
        console.log('✅ [ADMIN API] Fee calculated successfully');
        console.log('📄 Fee:', fee, 'Total:', totalAmount);
        return {
            success: true,
            amount: body.amount,
            fee,
            totalAmount,
            feeType: type
        };
    }
    async getKycSubmissions() {
        console.log('📋 [ADMIN API] GET /admin/kyc/submissions - Retrieving all KYC submissions');
        const result = await this.adminService.getKycSubmissions();
        console.log('✅ [ADMIN API] KYC submissions retrieved successfully');
        console.log('📊 [ADMIN API] Total:', result.total, 'Pending:', result.pending, 'Verified:', result.verified, 'Rejected:', result.rejected);
        return result;
    }
    async getPendingKycSubmissions() {
        console.log('⏳ [ADMIN API] GET /admin/kyc/submissions/pending - Retrieving pending KYC submissions');
        const result = await this.adminService.getPendingKycSubmissions();
        console.log('✅ [ADMIN API] Pending KYC submissions retrieved successfully');
        console.log('📊 [ADMIN API] Total pending:', result.total);
        return result;
    }
    async getKycSubmissionDetails(userId) {
        console.log('🔍 [ADMIN API] GET /admin/kyc/submissions/:userId - Retrieving KYC submission details');
        console.log('👤 User ID:', userId);
        const result = await this.adminService.getKycSubmissionDetails(userId);
        console.log('✅ [ADMIN API] KYC submission details retrieved successfully');
        console.log('📄 Status:', result.submission.kycStatus);
        return result;
    }
    async reviewKycSubmission(userId, reviewDto) {
        console.log('⚖️ [ADMIN API] PUT /admin/kyc/submissions/:userId/review - Reviewing KYC submission');
        console.log('👤 User ID:', userId);
        console.log('📝 Decision:', reviewDto.decision);
        console.log('💬 Comment:', reviewDto.comment);
        const result = await this.adminService.reviewKycSubmission(userId, reviewDto);
        console.log('✅ [ADMIN API] KYC submission reviewed successfully');
        console.log('📄 New Status:', result.newStatus);
        console.log('💳 Wallet Created:', result.walletCreated);
        return result;
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('fees'),
    (0, swagger_1.ApiOperation)({
        summary: 'Set or update fee configuration',
        description: 'Configure fees for different transaction types. Can set percentage-based or fixed amount fees with optional minimum and maximum limits.'
    }),
    (0, swagger_1.ApiBody)({ type: admin_dto_1.SetFeeDto }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Fee configuration created or updated successfully',
        type: admin_dto_1.SetFeeResponse,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid fee configuration data',
    }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.SetFeeDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setFee", null);
__decorate([
    (0, common_1.Get)('fees'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all fee configurations',
        description: 'Retrieve all configured fees for different transaction types'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Fee configurations retrieved successfully',
        type: admin_dto_1.GetFeesResponse,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getFees", null);
__decorate([
    (0, common_1.Get)('fees/:type'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get fee configuration by type',
        description: 'Retrieve fee configuration for a specific transaction type'
    }),
    (0, swagger_1.ApiParam)({
        name: 'type',
        enum: admin_dto_1.FeeType,
        description: 'Fee type to retrieve',
        example: 'TRANSFER'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Fee configuration retrieved successfully',
        type: admin_dto_1.FeeConfigurationResponse,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.NOT_FOUND,
        description: 'Fee configuration not found',
    }),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getFeeByType", null);
__decorate([
    (0, common_1.Delete)('fees/:type'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete fee configuration',
        description: 'Remove fee configuration for a specific transaction type'
    }),
    (0, swagger_1.ApiParam)({
        name: 'type',
        enum: admin_dto_1.FeeType,
        description: 'Fee type to delete',
        example: 'TRANSFER'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Fee configuration deleted successfully',
        type: admin_dto_1.DeleteFeeResponse,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.NOT_FOUND,
        description: 'Fee configuration not found',
    }),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteFee", null);
__decorate([
    (0, common_1.Post)('fees/seed'),
    (0, swagger_1.ApiOperation)({
        summary: 'Seed default fee configurations',
        description: 'Initialize the system with default fee configurations for common transaction types'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Default fee configurations seeded successfully',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "seedDefaultFees", null);
__decorate([
    (0, common_1.Post)('fees/:type/calculate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Calculate fee for amount',
        description: 'Calculate the fee that would be charged for a specific amount and fee type'
    }),
    (0, swagger_1.ApiParam)({
        name: 'type',
        enum: admin_dto_1.FeeType,
        description: 'Fee type to calculate',
        example: 'TRANSFER'
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                amount: {
                    type: 'number',
                    example: 1000,
                    description: 'Amount to calculate fee for'
                }
            },
            required: ['amount']
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Fee calculated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                amount: { type: 'number', example: 1000 },
                fee: { type: 'number', example: 25 },
                totalAmount: { type: 'number', example: 1025 },
                feeType: { type: 'string', example: 'TRANSFER' }
            }
        }
    }),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "calculateFee", null);
__decorate([
    (0, common_1.Get)('kyc/submissions'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all KYC submissions',
        description: 'Retrieve all KYC submissions with their current status (pending, verified, rejected)'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'KYC submissions retrieved successfully',
        type: admin_dto_1.GetKycSubmissionsResponse,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getKycSubmissions", null);
__decorate([
    (0, common_1.Get)('kyc/submissions/pending'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get pending KYC submissions',
        description: 'Retrieve only KYC submissions that are pending admin review'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Pending KYC submissions retrieved successfully',
        type: admin_dto_1.GetKycSubmissionsResponse,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPendingKycSubmissions", null);
__decorate([
    (0, common_1.Get)('kyc/submissions/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get KYC submission details',
        description: 'Retrieve detailed information about a specific user\'s KYC submission including uploaded images'
    }),
    (0, swagger_1.ApiParam)({
        name: 'userId',
        description: 'User ID to get KYC submission for',
        example: 'cuid123'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'KYC submission details retrieved successfully',
        type: admin_dto_1.KycSubmissionDetailResponse,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.NOT_FOUND,
        description: 'User not found',
    }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getKycSubmissionDetails", null);
__decorate([
    (0, common_1.Put)('kyc/submissions/:userId/review'),
    (0, swagger_1.ApiOperation)({
        summary: 'Review KYC submission',
        description: 'Approve or reject a user\'s KYC submission. When approved, a wallet is automatically created for the user.'
    }),
    (0, swagger_1.ApiParam)({
        name: 'userId',
        description: 'User ID to review KYC submission for',
        example: 'cuid123'
    }),
    (0, swagger_1.ApiBody)({ type: admin_dto_1.KycReviewDto }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'KYC submission reviewed successfully',
        type: admin_dto_1.KycReviewResponse,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid review data or submission cannot be reviewed',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.NOT_FOUND,
        description: 'User not found',
    }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_dto_1.KycReviewDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "reviewKycSubmission", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map