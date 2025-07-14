import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { RavenKycProvider } from '../providers/raven/raven-kyc.provider';
import { GeminiAiProvider } from '../providers/ai/gemini.provider';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { KycStatus, AiApprovalType, AiApprovalStatus } from '@prisma/client';
import {
  VerifyBvnDto,
  BvnVerificationResponseDto,
  SelfieUploadResponseDto,
  KycStatusResponseDto,
  CompleteKycResponseDto,
} from './dto/kyc.dto';
import * as bcrypt from 'bcrypt';

// Type definition for multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Injectable()
export class KycService {
  private readonly smeplugBaseUrl: string;
  private readonly smeplugApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly ravenKycProvider: RavenKycProvider,
    private readonly geminiAiProvider: GeminiAiProvider,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    this.smeplugBaseUrl = this.configService.get<string>('SMEPLUG_BASE_URL');
    this.smeplugApiKey = this.configService.get<string>('SMEPLUG_API_KEY');
  }

  /**
   * Verify BVN with provider
   */
  async verifyBvn(
    verifyBvnDto: VerifyBvnDto,
    userId: string,
  ): Promise<BvnVerificationResponseDto> {
    try {
      console.log(
        '🔍 [KYC SERVICE] Starting BVN verification for user:',
        userId,
      );
      console.log('📝 [KYC SERVICE] BVN:', verifyBvnDto.bvn);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if user already has verified KYC
      if (user.kycStatus === 'APPROVED') {
        return {
          success: false,
          message: 'KYC already completed for this user',
          error: 'KYC_ALREADY_COMPLETED',
        };
      }

      // Check if BVN already verified
      if (user.bvnVerifiedAt) {
        return {
          success: false,
          message:
            'BVN already verified for this user. Please upload selfie to complete KYC.',
          error: 'BVN_ALREADY_VERIFIED',
        };
      }

      // 🚨 SECURITY CHECK: Prevent BVN duplication across users
      console.log(
        '🔒 [KYC SERVICE] Checking for BVN duplication across users...',
      );
      const existingBvnUser = await this.prisma.user.findFirst({
        where: {
          bvn: verifyBvnDto.bvn,
          id: { not: userId }, // Different user
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
        },
      });

      if (existingBvnUser) {
        console.log(
          '🚨 [KYC SERVICE] BVN already registered to another user:',
          existingBvnUser.email,
        );
        return {
          success: false,
          message:
            'This BVN is already registered with another account. If this is your BVN, please contact support for assistance.',
          error: 'BVN_ALREADY_EXISTS',
        };
      }

      console.log(
        '✅ [KYC SERVICE] BVN duplication check passed - proceeding with verification',
      );

      // Use Raven KYC provider for BVN verification
      const bvnVerificationResult = await this.ravenKycProvider.verifyBvn(
        verifyBvnDto.bvn,
      );

      if (!bvnVerificationResult.success) {
        console.log(
          '❌ [KYC SERVICE] BVN verification failed:',
          bvnVerificationResult.error,
        );
        return {
          success: false,
          message: bvnVerificationResult.message,
          error: bvnVerificationResult.error,
        };
      }

      console.log(
        '🔍 [KYC SERVICE] Starting immediate verification with registration data',
      );

      // Immediate verification: Compare BVN data with user registration data
      const bvnData = bvnVerificationResult.data;
      const verificationErrors = [];

      // Check gender match
      if (bvnData.gender) {
        const userGender = user.gender.toUpperCase();
        const bvnGender = bvnData.gender.toUpperCase();

        if (userGender !== bvnGender) {
          verificationErrors.push(
            `Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`,
          );
        }
        console.log(
          `🔍 [KYC SERVICE] Gender check - User: ${userGender}, BVN: ${bvnGender}`,
        );
      }

      // Check date of birth match (if available)
      if (bvnData.dateOfBirth) {
        const userDob = user.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        // Convert BVN DOB from DD-MM-YYYY to YYYY-MM-DD for comparison
        const bvnDobParts = bvnData.dateOfBirth.split('-');
        const bvnDobFormatted = `${bvnDobParts[2]}-${bvnDobParts[1]}-${bvnDobParts[0]}`;

        if (userDob !== bvnDobFormatted) {
          verificationErrors.push(
            `Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`,
          );
        }
        console.log(
          `🔍 [KYC SERVICE] DOB check - User: ${userDob}, BVN: ${bvnData.dateOfBirth}`,
        );
      }

      // Determine verification status
      let kycStatus: 'UNDER_REVIEW' | 'REJECTED' = 'UNDER_REVIEW';
      let statusMessage = '';
      const walletCreated = false;

      if (verificationErrors.length > 0) {
        kycStatus = 'REJECTED';
        statusMessage = `BVN verification failed: ${verificationErrors.join('; ')}`;
        console.log(
          '❌ [KYC SERVICE] BVN verification failed:',
          verificationErrors,
        );
      } else {
        // BVN verification successful - proceed to selfie upload step
        statusMessage =
          'BVN verification successful! Please upload your selfie to complete KYC verification.';
        console.log(
          '✅ [KYC SERVICE] BVN verification successful - ready for selfie upload',
        );
      }

      // Update user with BVN verification status
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          bvn: verifyBvnDto.bvn,
          kycStatus,
          bvnVerifiedAt: kycStatus === 'UNDER_REVIEW' ? new Date() : null,
          // Update user info from BVN data
          firstName: bvnVerificationResult.data.firstName,
          lastName: bvnVerificationResult.data.lastName,
          // Store the complete Raven API response for audit trail
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
              residentialAddress:
                bvnVerificationResult.data?.residentialAddress || null,
              stateOfOrigin: bvnVerificationResult.data?.stateOfOrigin || null,
            },
            bvn: verifyBvnDto.bvn,
            verification: {
              status: kycStatus,
              errors: verificationErrors,
              walletCreated,
            },
          },
        },
      });

      return {
        success: kycStatus === 'UNDER_REVIEW',
        message: statusMessage,
        bvnData: bvnVerificationResult.data,
        kycStatus,
        walletCreated,
        verificationErrors:
          verificationErrors.length > 0 ? verificationErrors : undefined,
      };
    } catch (error) {
      console.log('🚨 [KYC SERVICE] Error in BVN verification:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error verifying BVN',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload and verify selfie with Gemini AI
   */
  async uploadSelfie(
    file: MulterFile,
    userId: string,
  ): Promise<SelfieUploadResponseDto> {
    try {
      console.log(
        '📸 [KYC SERVICE] Processing selfie upload for user:',
        userId,
      );

      // **VALIDATION 1: Check if file exists and has content**
      if (!file || !file.buffer || file.buffer.length === 0) {
        console.log('❌ [KYC SERVICE] Empty or invalid file uploaded');
        return {
          success: false,
          message:
            'No valid image file was uploaded. Please select a valid image file.',
          error: 'EMPTY_FILE',
        };
      }

      // **VALIDATION 2: Check file size (minimum 1KB, maximum 10MB)**
      const minSize = 1024; // 1KB
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.buffer.length < minSize) {
        console.log(
          '❌ [KYC SERVICE] File too small:',
          file.buffer.length,
          'bytes',
        );
        return {
          success: false,
          message:
            'Image file is too small. Please upload a clear selfie image.',
          error: 'FILE_TOO_SMALL',
        };
      }

      if (file.buffer.length > maxSize) {
        console.log(
          '❌ [KYC SERVICE] File too large:',
          file.buffer.length,
          'bytes',
        );
        return {
          success: false,
          message:
            'Image file is too large. Please upload an image smaller than 10MB.',
          error: 'FILE_TOO_LARGE',
        };
      }

      // **VALIDATION 3: Check file type**
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.mimetype)) {
        console.log('❌ [KYC SERVICE] Invalid file type:', file.mimetype);
        return {
          success: false,
          message: 'Invalid file type. Please upload a JPEG or PNG image.',
          error: 'INVALID_FILE_TYPE',
        };
      }

      console.log(
        '✅ [KYC SERVICE] File validation passed - Size:',
        file.buffer.length,
        'bytes, Type:',
        file.mimetype,
      );

      // Find user with BVN data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          kycStatus: true,
          bvn: true,
          bvnProviderResponse: true,
          bvnVerifiedAt: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Note: Selfie upload can be used for additional verification even for already verified users
      // This provides extra security and AI approval tracking

      // **CLOUDINARY UPLOAD: Upload to Cloudinary instead of local storage**
      const timestamp = Date.now();
      const firstName = user.firstName || 'User';
      const lastName = user.lastName || 'Account';
      const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters
      const cleanLastName = lastName.replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters
      const fileExtension = file.originalname.split('.').pop() || 'jpg';

      // Format: monzi/kyc/FirstnameLastname-timestamp (e.g., "monzi/kyc/GoodnessObaje-1752150022599")
      const publicId = `monzi/kyc/${cleanFirstName}${cleanLastName}-${timestamp}`;

      console.log('📁 [KYC SERVICE] Uploading to Cloudinary with public ID:', publicId);

      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        'monzi/kyc',
        publicId
      );

      if (!uploadResult || !uploadResult.secure_url) {
        console.log('❌ [KYC SERVICE] Cloudinary upload failed:', uploadResult);
        return {
          success: false,
          message: 'Failed to upload image. Please try again.',
          error: 'UPLOAD_FAILED',
        };
      }

      const selfieUrl = uploadResult.secure_url;
      console.log('💾 [KYC SERVICE] Selfie uploaded to Cloudinary:', selfieUrl);

      // Convert image to base64 for Gemini AI analysis
      const imageBase64 = file.buffer.toString('base64');

      // Get BVN data for context (if available)
      let bvnData = null;
      if (
        user.bvnProviderResponse &&
        typeof user.bvnProviderResponse === 'object'
      ) {
        const response = user.bvnProviderResponse as any;
        if (response.data) {
          bvnData = {
            firstName: response.data.firstName || user.firstName,
            lastName: response.data.lastName || user.lastName,
            gender: response.data.gender || user.gender,
          };
        }
      }

      // Check if BVN is verified before proceeding
      if (!user.bvnVerifiedAt) {
        return {
          success: false,
          message: 'Please verify your BVN first before uploading selfie',
          error: 'BVN_NOT_VERIFIED',
        };
      }

      console.log('🤖 [KYC SERVICE] Starting Gemini AI selfie verification');
      console.log(
        '📊 [KYC SERVICE] Image size for AI:',
        imageBase64.length,
        'base64 characters',
      );

      // Verify selfie with Gemini AI
      const aiVerification = await this.geminiAiProvider.verifySelfie({
        imageBase64,
        userId,
        bvnData,
      });

      if (!aiVerification.success) {
        return {
          success: false,
          message: aiVerification.message,
          error: aiVerification.error,
          verificationScore: aiVerification.confidence,
        };
      }

      // Check if AI approved the selfie
      if (!aiVerification.isValidSelfie || aiVerification.confidence < 0.8) {
        console.log(
          '❌ [KYC SERVICE] Gemini AI rejected selfie - storing for admin review',
        );

        // Store rejected image for admin review
        const aiApproval = await this.prisma.aiApproval.create({
          data: {
            userId,
            type: AiApprovalType.KYC_VERIFICATION,
            entityId: userId, // The user ID is the entity being approved
            status: AiApprovalStatus.MANUAL_REVIEW_REQUIRED,
            confidence: aiVerification.confidence,
            reasoning: aiVerification.message,
            // Note: Remove non-schema fields like aiProvider, aiResponse, imageUrl, relatedData
          },
        });

        console.log(
          '📋 [KYC SERVICE] AI rejected image stored for admin review:',
          aiApproval.id,
        );

        return {
          success: false,
          message: `Selfie verification failed: ${aiVerification.message}. Your image has been sent for admin review.`,
          error: 'AI_VERIFICATION_FAILED',
          verificationScore: aiVerification.confidence,
          aiApprovalId: aiApproval.id,
        };
      }

      console.log(
        '✅ [KYC SERVICE] Gemini AI approved selfie - proceeding with auto-approval',
      );

      // Create AI approval record for admin oversight
      const aiApproval = await this.prisma.aiApproval.create({
        data: {
          userId,
          type: AiApprovalType.KYC_VERIFICATION,
          entityId: userId, // The user ID is the entity being approved
          status: AiApprovalStatus.APPROVED,
          confidence: aiVerification.confidence,
          reasoning: aiVerification.message,
          // Note: Remove non-schema fields like aiProvider, aiResponse, imageUrl, relatedData
        },
      });

      console.log(
        '📋 [KYC SERVICE] AI approval record created:',
        aiApproval.id,
      );

      // Auto-approve and create wallet (both BVN and selfie verified)
      let walletCreated = false;
      let statusMessage = '';

      if (user.kycStatus !== KycStatus.APPROVED) {
        try {
          await this.walletService.createWallet(
            userId,
            user.firstName || bvnData?.firstName || 'User',
            user.lastName || bvnData?.lastName || 'Account',
            user.email,
            user.phone,
            user.dateOfBirth?.toISOString().split('T')[0] || '1990-01-01', // Default DOB if not provided
            (user.gender as 'M' | 'F') || 'M', // Default to Male if not provided
            'Lagos, Nigeria', // Default address
            'Lagos', // Default city
            'Lagos State', // Default state
            user.bvn || undefined,
          );
          walletCreated = true;
          statusMessage =
            'KYC completed successfully! Your wallet has been created and is ready to use.';
          console.log(
            '✅ [KYC SERVICE] Wallet created after complete KYC (BVN + Selfie)',
          );
        } catch (walletError) {
          console.log(
            '⚠️ [KYC SERVICE] Wallet creation failed, but KYC completed',
          );
          statusMessage =
            'KYC completed successfully! Your wallet activation is in progress. Please visit the wallet section to activate your account.';
        }

        // Update user status to APPROVED
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            selfieUrl,
            kycStatus: KycStatus.APPROVED,
            kycVerifiedAt: new Date(),
          },
        });
      } else {
        // Already verified, just update selfie URL
        await this.prisma.user.update({
          where: { id: userId },
          data: { selfieUrl },
        });
        statusMessage =
          'Selfie verified successfully by AI! Your account is already fully verified.';
      }

      console.log(
        '✅ [KYC SERVICE] Selfie verification completed with AI auto-approval',
      );

      return {
        success: true,
        message: statusMessage,
        selfieUrl,
        verificationScore: aiVerification.confidence,
        aiApprovalId: aiApproval.id,
        walletCreated,
      };
    } catch (error) {
      console.log('🚨 [KYC SERVICE] Error in selfie upload:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error processing selfie',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get KYC status for user
   */
  async getKycStatus(userId: string): Promise<KycStatusResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          kycStatus: true,
          kycVerifiedAt: true,
          bvnVerifiedAt: true,
          selfieUrl: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return {
        kycStatus: user.kycStatus,
        isVerified: user.kycStatus === 'APPROVED',
        verifiedAt: user.kycVerifiedAt,
        bvnVerified: !!user.bvnVerifiedAt,
        // selfieVerified should be true if user uploaded selfie OR admin approved KYC
        selfieVerified: !!user.selfieUrl || user.kycStatus === 'APPROVED',
        message: this.getKycStatusMessage(user.kycStatus),
      };
    } catch (error) {
      console.log('🚨 [KYC SERVICE] Error getting KYC status:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error getting KYC status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Simulate face verification (replace with actual API)
   */
  private async simulateFaceVerification(
    selfieUrl: string,
    bvn: string,
  ): Promise<number> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock verification score (0.0 to 1.0)
    return 0.95; // High confidence match
  }

  /**
   * Get user-friendly KYC status message
   */
  private getKycStatusMessage(kycStatus: string): string {
    switch (kycStatus) {
      case 'PENDING':
        return 'Please verify your BVN to start KYC process';
      case 'UNDER_REVIEW':
        return 'BVN verified. Please upload your selfie to complete KYC verification.';
      case 'APPROVED':
        return 'KYC completed successfully. Your wallet is ready!';
      case 'REJECTED':
        return 'KYC verification failed due to data mismatch. Please contact support to update your information.';
      default:
        return 'Unknown KYC status';
    }
  }

  // ===== ADMIN METHODS =====

  async getAllKycSubmissions(params: {
    page: number;
    limit: number;
    status?: string;
  }) {
    try {
      const { page, limit, status } = params;
      const skip = (page - 1) * limit;

      const whereClause: any = {};
      if (status) {
        whereClause.kycStatus = status;
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            kycStatus: true,
            kycVerifiedAt: true,
            bvnVerifiedAt: true,
            selfieUrl: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.user.count({ where: whereClause }),
      ]);

      return {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Failed to get KYC submissions:', error);
      throw new HttpException(
        'Failed to retrieve KYC submissions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getKycSubmissionDetails(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          kycStatus: true,
          kycVerifiedAt: true,
          bvn: true,
          bvnVerifiedAt: true,
          bvnProviderResponse: true,
          selfieUrl: true,
          createdAt: true,
          updatedAt: true,
          aiApprovals: {
            where: { type: 'KYC_VERIFICATION' },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Get optimized image URLs for admin viewing
      let selfieUrl = null;
      if (user.selfieUrl) {
        // If it's already a Cloudinary URL, use it directly
        if (user.selfieUrl.includes('cloudinary.com')) {
          selfieUrl = user.selfieUrl;
        } else {
          // For local URLs, we'll need to handle migration later
          selfieUrl = user.selfieUrl;
        }
      }

      return {
        success: true,
        data: {
          ...user,
          selfieUrl,
        },
      };
    } catch (error) {
      console.error('Failed to get KYC submission details:', error);
      throw new HttpException(
        'Failed to retrieve KYC submission details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateKycStatus(
    userId: string,
    status: string,
    reason?: string,
    adminId?: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Validate status
      const validStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        throw new HttpException('Invalid KYC status', HttpStatus.BAD_REQUEST);
      }

      const updateData: any = {
        kycStatus: status,
      };

      if (status === 'APPROVED') {
        updateData.kycVerifiedAt = new Date();
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Log admin action
      if (adminId) {
        await this.prisma.adminActionLog.create({
          data: {
            adminId,
            adminEmail: 'admin@monzi.money', // Will be set by interceptor
            action: 'UPDATE_KYC_STATUS',
            targetType: 'USER',
            targetId: userId,
            targetEmail: user.email,
            details: {
              previousStatus: user.kycStatus,
              newStatus: status,
              reason,
            },
            ipAddress: 'N/A', // Will be set by interceptor
            userAgent: 'N/A', // Will be set by interceptor
          },
        });
      }

      return {
        success: true,
        message: `KYC status updated to ${status}`,
        data: {
          userId,
          status,
          reason,
        },
      };
    } catch (error) {
      console.error('Failed to update KYC status:', error);
      throw new HttpException(
        'Failed to update KYC status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
