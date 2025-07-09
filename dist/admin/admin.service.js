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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const admin_dto_1 = require("./dto/admin.dto");
let AdminService = class AdminService {
    constructor(prisma, walletService) {
        this.prisma = prisma;
        this.walletService = walletService;
    }
    async setFee(setFeeDto) {
        console.log('⚙️ [ADMIN SERVICE] Setting fee configuration');
        console.log('📋 [ADMIN SERVICE] Fee data:', setFeeDto);
        if (!setFeeDto.percentage && !setFeeDto.fixedAmount && !setFeeDto.minimumFee) {
            throw new common_1.BadRequestException('At least one fee parameter (percentage, fixedAmount, or minimumFee) must be provided');
        }
        if (setFeeDto.percentage && setFeeDto.fixedAmount) {
            throw new common_1.BadRequestException('Cannot set both percentage and fixed amount for the same fee');
        }
        if (setFeeDto.minimumFee && setFeeDto.maximumFee && setFeeDto.minimumFee > setFeeDto.maximumFee) {
            throw new common_1.BadRequestException('Minimum fee cannot be greater than maximum fee');
        }
        try {
            const existingFee = await this.prisma.feeConfiguration.findUnique({
                where: { type: setFeeDto.type }
            });
            let feeConfiguration;
            if (existingFee) {
                console.log('🔄 [ADMIN SERVICE] Updating existing fee configuration');
                feeConfiguration = await this.prisma.feeConfiguration.update({
                    where: { type: setFeeDto.type },
                    data: {
                        percentage: setFeeDto.percentage,
                        fixedAmount: setFeeDto.fixedAmount,
                        minimumFee: setFeeDto.minimumFee,
                        maximumFee: setFeeDto.maximumFee,
                        isActive: setFeeDto.isActive ?? true,
                        description: setFeeDto.description,
                    }
                });
            }
            else {
                console.log('➕ [ADMIN SERVICE] Creating new fee configuration');
                feeConfiguration = await this.prisma.feeConfiguration.create({
                    data: {
                        type: setFeeDto.type,
                        percentage: setFeeDto.percentage,
                        fixedAmount: setFeeDto.fixedAmount,
                        minimumFee: setFeeDto.minimumFee,
                        maximumFee: setFeeDto.maximumFee,
                        isActive: setFeeDto.isActive ?? true,
                        description: setFeeDto.description,
                    }
                });
            }
            console.log('✅ [ADMIN SERVICE] Fee configuration saved successfully');
            return {
                success: true,
                message: existingFee ? 'Fee configuration updated successfully' : 'Fee configuration created successfully',
                feeConfiguration: {
                    id: feeConfiguration.id,
                    type: feeConfiguration.type,
                    percentage: feeConfiguration.percentage,
                    fixedAmount: feeConfiguration.fixedAmount,
                    minimumFee: feeConfiguration.minimumFee,
                    maximumFee: feeConfiguration.maximumFee,
                    isActive: feeConfiguration.isActive,
                    description: feeConfiguration.description,
                    createdAt: feeConfiguration.createdAt.toISOString(),
                    updatedAt: feeConfiguration.updatedAt.toISOString(),
                }
            };
        }
        catch (error) {
            console.error('❌ [ADMIN SERVICE] Error setting fee configuration:', error);
            throw new common_1.BadRequestException('Failed to set fee configuration');
        }
    }
    async getFees() {
        console.log('📊 [ADMIN SERVICE] Retrieving all fee configurations');
        try {
            const feeConfigurations = await this.prisma.feeConfiguration.findMany({
                orderBy: { type: 'asc' }
            });
            console.log('✅ [ADMIN SERVICE] Retrieved', feeConfigurations.length, 'fee configurations');
            const fees = feeConfigurations.map(fee => ({
                id: fee.id,
                type: fee.type,
                percentage: fee.percentage,
                fixedAmount: fee.fixedAmount,
                minimumFee: fee.minimumFee,
                maximumFee: fee.maximumFee,
                isActive: fee.isActive,
                description: fee.description,
                createdAt: fee.createdAt.toISOString(),
                updatedAt: fee.updatedAt.toISOString(),
            }));
            return {
                success: true,
                fees,
                total: fees.length
            };
        }
        catch (error) {
            console.error('❌ [ADMIN SERVICE] Error retrieving fee configurations:', error);
            throw new common_1.BadRequestException('Failed to retrieve fee configurations');
        }
    }
    async getFeeByType(type) {
        console.log('🔍 [ADMIN SERVICE] Retrieving fee configuration for type:', type);
        try {
            const feeConfiguration = await this.prisma.feeConfiguration.findUnique({
                where: { type }
            });
            if (!feeConfiguration) {
                console.log('⚠️ [ADMIN SERVICE] No fee configuration found for type:', type);
                return null;
            }
            console.log('✅ [ADMIN SERVICE] Fee configuration found for type:', type);
            return {
                id: feeConfiguration.id,
                type: feeConfiguration.type,
                percentage: feeConfiguration.percentage,
                fixedAmount: feeConfiguration.fixedAmount,
                minimumFee: feeConfiguration.minimumFee,
                maximumFee: feeConfiguration.maximumFee,
                isActive: feeConfiguration.isActive,
                description: feeConfiguration.description,
                createdAt: feeConfiguration.createdAt.toISOString(),
                updatedAt: feeConfiguration.updatedAt.toISOString(),
            };
        }
        catch (error) {
            console.error('❌ [ADMIN SERVICE] Error retrieving fee configuration:', error);
            throw new common_1.BadRequestException('Failed to retrieve fee configuration');
        }
    }
    async deleteFee(type) {
        console.log('🗑️ [ADMIN SERVICE] Deleting fee configuration for type:', type);
        try {
            const existingFee = await this.prisma.feeConfiguration.findUnique({
                where: { type }
            });
            if (!existingFee) {
                throw new common_1.NotFoundException(`Fee configuration for type '${type}' not found`);
            }
            await this.prisma.feeConfiguration.delete({
                where: { type }
            });
            console.log('✅ [ADMIN SERVICE] Fee configuration deleted successfully');
            return {
                success: true,
                message: 'Fee configuration deleted successfully',
                deletedType: type
            };
        }
        catch (error) {
            console.error('❌ [ADMIN SERVICE] Error deleting fee configuration:', error);
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to delete fee configuration');
        }
    }
    async calculateFee(type, amount) {
        const feeConfig = await this.getFeeByType(type);
        if (!feeConfig || !feeConfig.isActive) {
            return 0;
        }
        let calculatedFee = 0;
        if (feeConfig.fixedAmount) {
            calculatedFee = feeConfig.fixedAmount;
        }
        else if (feeConfig.percentage) {
            calculatedFee = amount * feeConfig.percentage;
        }
        if (feeConfig.minimumFee && calculatedFee < feeConfig.minimumFee) {
            calculatedFee = feeConfig.minimumFee;
        }
        if (feeConfig.maximumFee && calculatedFee > feeConfig.maximumFee) {
            calculatedFee = feeConfig.maximumFee;
        }
        return Math.round(calculatedFee * 100) / 100;
    }
    async seedDefaultFees() {
        console.log('🌱 [ADMIN SERVICE] Seeding default fee configurations');
        const defaultFees = [
            {
                type: admin_dto_1.FeeType.TRANSFER,
                percentage: 0.015,
                minimumFee: 25.00,
                maximumFee: 5000.00,
                isActive: true,
                description: 'Transfer fee for wallet-to-bank transfers'
            },
            {
                type: admin_dto_1.FeeType.WITHDRAWAL,
                fixedAmount: 10.00,
                isActive: true,
                description: 'Fixed withdrawal fee'
            },
            {
                type: admin_dto_1.FeeType.FUNDING,
                percentage: 0.005,
                minimumFee: 0,
                maximumFee: 100.00,
                isActive: false,
                description: 'Funding fee for wallet deposits'
            }
        ];
        for (const feeData of defaultFees) {
            try {
                const existingFee = await this.prisma.feeConfiguration.findUnique({
                    where: { type: feeData.type }
                });
                if (!existingFee) {
                    await this.prisma.feeConfiguration.create({
                        data: feeData
                    });
                    console.log('✅ [ADMIN SERVICE] Created default fee for:', feeData.type);
                }
                else {
                    console.log('⚠️ [ADMIN SERVICE] Fee already exists for:', feeData.type);
                }
            }
            catch (error) {
                console.error('❌ [ADMIN SERVICE] Error creating default fee for', feeData.type, ':', error);
            }
        }
        console.log('🌱 [ADMIN SERVICE] Default fee seeding completed');
    }
    async getKycSubmissions() {
        console.log('📋 [ADMIN SERVICE] Retrieving all KYC submissions');
        try {
            const users = await this.prisma.user.findMany({
                where: {
                    OR: [
                        { kycStatus: 'IN_PROGRESS' },
                        { kycStatus: 'VERIFIED' },
                        { kycStatus: 'REJECTED' }
                    ]
                },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    kycStatus: true,
                    bvn: true,
                    bvnVerifiedAt: true,
                    selfieUrl: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: 'desc' }
            });
            const submissions = users.map(user => ({
                userId: user.id,
                email: user.email,
                phone: user.phone,
                fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
                kycStatus: user.kycStatus,
                bvn: user.bvn,
                bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
                selfieUrl: user.selfieUrl,
                submittedAt: user.updatedAt.toISOString(),
                createdAt: user.createdAt.toISOString(),
            }));
            const pending = submissions.filter(s => s.kycStatus === 'IN_PROGRESS').length;
            const verified = submissions.filter(s => s.kycStatus === 'VERIFIED').length;
            const rejected = submissions.filter(s => s.kycStatus === 'REJECTED').length;
            console.log('✅ [ADMIN SERVICE] Retrieved', submissions.length, 'KYC submissions');
            console.log('📊 [ADMIN SERVICE] Stats - Pending:', pending, 'Verified:', verified, 'Rejected:', rejected);
            return {
                success: true,
                submissions,
                total: submissions.length,
                pending,
                verified,
                rejected,
            };
        }
        catch (error) {
            console.error('❌ [ADMIN SERVICE] Error retrieving KYC submissions:', error);
            throw new common_1.BadRequestException('Failed to retrieve KYC submissions');
        }
    }
    async getKycSubmissionDetails(userId) {
        console.log('🔍 [ADMIN SERVICE] Retrieving KYC submission details for user:', userId);
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    kycStatus: true,
                    bvn: true,
                    bvnVerifiedAt: true,
                    selfieUrl: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            const submission = {
                userId: user.id,
                email: user.email,
                phone: user.phone,
                fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
                kycStatus: user.kycStatus,
                bvn: user.bvn,
                bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
                selfieUrl: user.selfieUrl,
                submittedAt: user.updatedAt.toISOString(),
                createdAt: user.createdAt.toISOString(),
            };
            const selfieImageUrl = user.selfieUrl ?
                `http://localhost:3000${user.selfieUrl}` : undefined;
            console.log('✅ [ADMIN SERVICE] KYC submission details retrieved');
            return {
                success: true,
                submission,
                selfieImageUrl,
            };
        }
        catch (error) {
            console.error('❌ [ADMIN SERVICE] Error retrieving KYC submission details:', error);
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to retrieve KYC submission details');
        }
    }
    async reviewKycSubmission(userId, reviewDto) {
        console.log('⚖️ [ADMIN SERVICE] Reviewing KYC submission for user:', userId);
        console.log('📋 [ADMIN SERVICE] Review decision:', reviewDto.decision);
        console.log('💬 [ADMIN SERVICE] Comment:', reviewDto.comment);
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    kycStatus: true,
                    selfieUrl: true,
                }
            });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            if (user.kycStatus !== 'IN_PROGRESS') {
                throw new common_1.BadRequestException(`Cannot review KYC submission. Current status: ${user.kycStatus}`);
            }
            if (!user.selfieUrl) {
                throw new common_1.BadRequestException('No selfie uploaded for this user');
            }
            let newStatus;
            let walletCreated = false;
            let virtualAccountNumber;
            if (reviewDto.decision === admin_dto_1.KycDecision.APPROVE) {
                newStatus = 'VERIFIED';
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        kycStatus: 'VERIFIED',
                        kycVerifiedAt: new Date(),
                    }
                });
                try {
                    const wallet = await this.walletService.createWallet(userId, user.firstName || 'User', user.lastName || '');
                    walletCreated = true;
                    virtualAccountNumber = wallet.virtualAccountNumber;
                    console.log('💳 [ADMIN SERVICE] Wallet created for approved user:', virtualAccountNumber);
                }
                catch (walletError) {
                    console.error('❌ [ADMIN SERVICE] Error creating wallet:', walletError);
                }
                console.log('✅ [ADMIN SERVICE] KYC approved for user:', userId);
            }
            else {
                newStatus = 'REJECTED';
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        kycStatus: 'REJECTED',
                        selfieUrl: null,
                    }
                });
                console.log('❌ [ADMIN SERVICE] KYC rejected for user:', userId);
            }
            const message = reviewDto.decision === admin_dto_1.KycDecision.APPROVE
                ? 'KYC submission approved successfully'
                : 'KYC submission rejected';
            return {
                success: true,
                message,
                newStatus,
                walletCreated,
                virtualAccountNumber,
                userId,
            };
        }
        catch (error) {
            console.error('❌ [ADMIN SERVICE] Error reviewing KYC submission:', error);
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to review KYC submission');
        }
    }
    async getPendingKycSubmissions() {
        console.log('⏳ [ADMIN SERVICE] Retrieving pending KYC submissions');
        try {
            const users = await this.prisma.user.findMany({
                where: {
                    kycStatus: 'IN_PROGRESS'
                },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    kycStatus: true,
                    bvn: true,
                    bvnVerifiedAt: true,
                    selfieUrl: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: 'desc' }
            });
            const submissions = users.map(user => ({
                userId: user.id,
                email: user.email,
                phone: user.phone,
                fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
                kycStatus: user.kycStatus,
                bvn: user.bvn,
                bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
                selfieUrl: user.selfieUrl,
                submittedAt: user.updatedAt.toISOString(),
                createdAt: user.createdAt.toISOString(),
            }));
            console.log('✅ [ADMIN SERVICE] Retrieved', submissions.length, 'pending KYC submissions');
            return {
                success: true,
                submissions,
                total: submissions.length,
                pending: submissions.length,
                verified: 0,
                rejected: 0,
            };
        }
        catch (error) {
            console.error('❌ [ADMIN SERVICE] Error retrieving pending KYC submissions:', error);
            throw new common_1.BadRequestException('Failed to retrieve pending KYC submissions');
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService])
], AdminService);
//# sourceMappingURL=admin.service.js.map