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
exports.KycService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const raven_kyc_provider_1 = require("../providers/raven/raven-kyc.provider");
const gemini_provider_1 = require("../providers/ai/gemini.provider");
const prisma_1 = require("../../generated/prisma");
const fs_1 = require("fs");
const path_1 = require("path");
let KycService = class KycService {
    constructor(prisma, configService, walletService, ravenKycProvider, geminiAiProvider) {
        this.prisma = prisma;
        this.configService = configService;
        this.walletService = walletService;
        this.ravenKycProvider = ravenKycProvider;
        this.geminiAiProvider = geminiAiProvider;
        this.smeplugBaseUrl = this.configService.get('SMEPLUG_BASE_URL');
        this.smeplugApiKey = this.configService.get('SMEPLUG_API_KEY');
    }
    async verifyBvn(verifyBvnDto, userId) {
        try {
            console.log('🔍 [KYC SERVICE] Starting BVN verification for user:', userId);
            console.log('📝 [KYC SERVICE] BVN:', verifyBvnDto.bvn);
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (user.kycStatus === 'VERIFIED') {
                return {
                    success: false,
                    message: 'KYC already completed for this user',
                    error: 'KYC_ALREADY_COMPLETED'
                };
            }
            if (user.bvnVerifiedAt) {
                return {
                    success: false,
                    message: 'BVN already verified for this user. Please upload selfie to complete KYC.',
                    error: 'BVN_ALREADY_VERIFIED'
                };
            }
            const bvnVerificationResult = await this.ravenKycProvider.verifyBvn(verifyBvnDto.bvn);
            if (!bvnVerificationResult.success) {
                console.log('❌ [KYC SERVICE] BVN verification failed:', bvnVerificationResult.error);
                return {
                    success: false,
                    message: bvnVerificationResult.message,
                    error: bvnVerificationResult.error
                };
            }
            console.log('🔍 [KYC SERVICE] Starting immediate verification with registration data');
            const bvnData = bvnVerificationResult.data;
            const verificationErrors = [];
            if (bvnData.gender) {
                const userGender = user.gender.toUpperCase();
                const bvnGender = bvnData.gender.toUpperCase();
                if (userGender !== bvnGender) {
                    verificationErrors.push(`Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`);
                }
                console.log(`🔍 [KYC SERVICE] Gender check - User: ${userGender}, BVN: ${bvnGender}`);
            }
            if (bvnData.dateOfBirth) {
                const userDob = user.dateOfBirth.toISOString().split('T')[0];
                const bvnDobParts = bvnData.dateOfBirth.split('-');
                const bvnDobFormatted = `${bvnDobParts[2]}-${bvnDobParts[1]}-${bvnDobParts[0]}`;
                if (userDob !== bvnDobFormatted) {
                    verificationErrors.push(`Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`);
                }
                console.log(`🔍 [KYC SERVICE] DOB check - User: ${userDob}, BVN: ${bvnData.dateOfBirth}`);
            }
            let kycStatus = 'IN_PROGRESS';
            let statusMessage = '';
            let walletCreated = false;
            if (verificationErrors.length > 0) {
                kycStatus = 'REJECTED';
                statusMessage = `BVN verification failed: ${verificationErrors.join('; ')}`;
                console.log('❌ [KYC SERVICE] BVN verification failed:', verificationErrors);
            }
            else {
                statusMessage = 'BVN verification successful! Please upload your selfie to complete KYC verification.';
                console.log('✅ [KYC SERVICE] BVN verification successful - ready for selfie upload');
            }
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    bvn: verifyBvnDto.bvn,
                    kycStatus,
                    bvnVerifiedAt: kycStatus === 'IN_PROGRESS' ? new Date() : null,
                    firstName: bvnVerificationResult.data.firstName,
                    lastName: bvnVerificationResult.data.lastName,
                    bvnProviderResponse: {
                        provider: 'raven',
                        timestamp: new Date().toISOString(),
                        success: bvnVerificationResult.success,
                        message: bvnVerificationResult.message,
                        data: {
                            firstName: bvnVerificationResult.data?.firstName || '',
                            lastName: bvnVerificationResult.data?.lastName || '',
                            phoneNumber: bvnVerificationResult.data?.phoneNumber || null,
                            dateOfBirth: bvnVerificationResult.data?.dateOfBirth || null,
                            gender: bvnVerificationResult.data?.gender || null,
                            lgaOfOrigin: bvnVerificationResult.data?.lgaOfOrigin || null,
                            residentialAddress: bvnVerificationResult.data?.residentialAddress || null,
                            stateOfOrigin: bvnVerificationResult.data?.stateOfOrigin || null
                        },
                        bvn: verifyBvnDto.bvn,
                        verification: {
                            status: kycStatus,
                            errors: verificationErrors,
                            walletCreated
                        }
                    }
                }
            });
            return {
                success: kycStatus === 'IN_PROGRESS',
                message: statusMessage,
                bvnData: bvnVerificationResult.data,
                kycStatus,
                walletCreated,
                verificationErrors: verificationErrors.length > 0 ? verificationErrors : undefined
            };
        }
        catch (error) {
            console.log('🚨 [KYC SERVICE] Error in BVN verification:', error.message);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Error verifying BVN', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async uploadSelfie(file, userId) {
        try {
            console.log('📸 [KYC SERVICE] Processing selfie upload for user:', userId);
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    gender: true,
                    kycStatus: true,
                    bvnProviderResponse: true,
                    bvnVerifiedAt: true
                }
            });
            if (!user) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            const uploadsDir = (0, path_1.join)(process.cwd(), 'uploads', 'kyc');
            if (!(0, fs_1.existsSync)(uploadsDir)) {
                (0, fs_1.mkdirSync)(uploadsDir, { recursive: true });
            }
            const timestamp = Date.now();
            const filename = `${userId}-${timestamp}.${file.originalname.split('.').pop()}`;
            const filepath = (0, path_1.join)(uploadsDir, filename);
            const selfieUrl = `/uploads/kyc/${filename}`;
            (0, fs_1.writeFileSync)(filepath, file.buffer);
            console.log('💾 [KYC SERVICE] Selfie saved to:', selfieUrl);
            const imageBase64 = file.buffer.toString('base64');
            let bvnData = null;
            if (user.bvnProviderResponse && typeof user.bvnProviderResponse === 'object') {
                const response = user.bvnProviderResponse;
                if (response.data) {
                    bvnData = {
                        firstName: response.data.firstName || user.firstName,
                        lastName: response.data.lastName || user.lastName,
                        gender: response.data.gender || user.gender
                    };
                }
            }
            if (!user.bvnVerifiedAt) {
                return {
                    success: false,
                    message: 'Please verify your BVN first before uploading selfie',
                    error: 'BVN_NOT_VERIFIED'
                };
            }
            console.log('🤖 [KYC SERVICE] Starting Gemini AI selfie verification');
            const aiVerification = await this.geminiAiProvider.verifySelfie({
                imageBase64,
                userId,
                bvnData
            });
            if (!aiVerification.success) {
                return {
                    success: false,
                    message: aiVerification.message,
                    error: aiVerification.error,
                    verificationScore: aiVerification.confidence
                };
            }
            if (!aiVerification.isValidSelfie || aiVerification.confidence < 0.8) {
                console.log('❌ [KYC SERVICE] Gemini AI rejected selfie - storing for admin review');
                const aiApproval = await this.prisma.aiApproval.create({
                    data: {
                        userId,
                        approvalType: prisma_1.AiApprovalType.SELFIE_KYC,
                        status: prisma_1.AiApprovalStatus.UNDER_REVIEW,
                        aiProvider: 'gemini',
                        aiResponse: JSON.parse(JSON.stringify(aiVerification)),
                        confidence: aiVerification.confidence,
                        imageUrl: selfieUrl,
                        relatedData: {
                            bvnData,
                            fileInfo: {
                                originalName: file.originalname,
                                size: file.size,
                                mimetype: file.mimetype
                            }
                        }
                    }
                });
                console.log('📋 [KYC SERVICE] AI rejected image stored for admin review:', aiApproval.id);
                return {
                    success: false,
                    message: `Selfie verification failed: ${aiVerification.message}. Your image has been sent for admin review.`,
                    error: 'AI_VERIFICATION_FAILED',
                    verificationScore: aiVerification.confidence,
                    aiApprovalId: aiApproval.id
                };
            }
            console.log('✅ [KYC SERVICE] Gemini AI approved selfie - proceeding with auto-approval');
            const aiApproval = await this.prisma.aiApproval.create({
                data: {
                    userId,
                    approvalType: prisma_1.AiApprovalType.SELFIE_KYC,
                    status: prisma_1.AiApprovalStatus.APPROVED,
                    aiProvider: 'gemini',
                    aiResponse: JSON.parse(JSON.stringify(aiVerification)),
                    confidence: aiVerification.confidence,
                    imageUrl: selfieUrl,
                    relatedData: {
                        bvnData,
                        fileInfo: {
                            originalName: file.originalname,
                            size: file.size,
                            mimetype: file.mimetype
                        }
                    }
                }
            });
            console.log('📋 [KYC SERVICE] AI approval record created:', aiApproval.id);
            let walletCreated = false;
            let statusMessage = '';
            if (user.kycStatus !== prisma_1.KycStatus.VERIFIED) {
                try {
                    await this.walletService.createWallet(userId, user.firstName || bvnData?.firstName || 'User', user.lastName || bvnData?.lastName || 'Account');
                    walletCreated = true;
                    statusMessage = 'KYC completed successfully! Your wallet has been created and is ready to use.';
                    console.log('✅ [KYC SERVICE] Wallet created after complete KYC (BVN + Selfie)');
                }
                catch (walletError) {
                    console.log('⚠️ [KYC SERVICE] Wallet creation failed, but KYC completed');
                    statusMessage = 'KYC completed successfully! Please contact support for wallet activation.';
                }
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        selfieUrl,
                        kycStatus: prisma_1.KycStatus.VERIFIED,
                        kycVerifiedAt: new Date()
                    }
                });
            }
            else {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { selfieUrl }
                });
                statusMessage = 'Selfie verified successfully by AI! Your account is already fully verified.';
            }
            console.log('✅ [KYC SERVICE] Selfie verification completed with AI auto-approval');
            return {
                success: true,
                message: statusMessage,
                selfieUrl,
                verificationScore: aiVerification.confidence,
                aiApprovalId: aiApproval.id,
                walletCreated
            };
        }
        catch (error) {
            console.log('🚨 [KYC SERVICE] Error in selfie upload:', error.message);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Error processing selfie', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getKycStatus(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    kycStatus: true,
                    kycVerifiedAt: true,
                    bvnVerifiedAt: true,
                    selfieUrl: true,
                }
            });
            if (!user) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                kycStatus: user.kycStatus,
                isVerified: user.kycStatus === 'VERIFIED',
                verifiedAt: user.kycVerifiedAt,
                bvnVerified: !!user.bvnVerifiedAt,
                selfieVerified: !!user.selfieUrl,
                message: this.getKycStatusMessage(user.kycStatus)
            };
        }
        catch (error) {
            console.log('🚨 [KYC SERVICE] Error getting KYC status:', error.message);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Error getting KYC status', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async simulateFaceVerification(selfieUrl, bvn) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return 0.95;
    }
    getKycStatusMessage(kycStatus) {
        switch (kycStatus) {
            case 'PENDING':
                return 'Please verify your BVN to start KYC process';
            case 'IN_PROGRESS':
                return 'BVN verified. Please upload your selfie to complete KYC verification.';
            case 'VERIFIED':
                return 'KYC completed successfully. Your wallet is ready!';
            case 'REJECTED':
                return 'KYC verification failed due to data mismatch. Please contact support to update your information.';
            default:
                return 'Unknown KYC status';
        }
    }
};
exports.KycService = KycService;
exports.KycService = KycService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        wallet_service_1.WalletService,
        raven_kyc_provider_1.RavenKycProvider,
        gemini_provider_1.GeminiAiProvider])
], KycService);
//# sourceMappingURL=kyc.service.js.map