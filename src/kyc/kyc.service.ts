import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { RavenKycProvider } from '../providers/raven/raven-kyc.provider';
import { GeminiAiProvider } from '../providers/ai/gemini.provider';
import { KycStatus, AiApprovalType, AiApprovalStatus } from '@prisma/client';
import { 
  VerifyBvnDto, 
  BvnVerificationResponseDto, 
  SelfieUploadResponseDto,
  KycStatusResponseDto,
  CompleteKycResponseDto
} from './dto/kyc.dto';
import * as bcrypt from 'bcrypt';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

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
  ) {
    this.smeplugBaseUrl = this.configService.get<string>('SMEPLUG_BASE_URL');
    this.smeplugApiKey = this.configService.get<string>('SMEPLUG_API_KEY');
  }

  /**
   * Verify BVN with provider
   */
  async verifyBvn(verifyBvnDto: VerifyBvnDto, userId: string): Promise<BvnVerificationResponseDto> {
    try {
      console.log('🔍 [KYC SERVICE] Starting BVN verification for user:', userId);
      console.log('📝 [KYC SERVICE] BVN:', verifyBvnDto.bvn);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if user already has verified KYC
      if (user.kycStatus === 'VERIFIED') {
        return {
          success: false,
          message: 'KYC already completed for this user',
          error: 'KYC_ALREADY_COMPLETED'
        };
      }

      // Check if BVN already verified
      if (user.bvnVerifiedAt) {
        return {
          success: false,
          message: 'BVN already verified for this user. Please upload selfie to complete KYC.',
          error: 'BVN_ALREADY_VERIFIED'
        };
      }

      // Use Raven KYC provider for BVN verification
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
      
      // Immediate verification: Compare BVN data with user registration data
      const bvnData = bvnVerificationResult.data;
      const verificationErrors = [];

      // Check gender match
      if (bvnData.gender) {
        const userGender = user.gender.toUpperCase();
        const bvnGender = bvnData.gender.toUpperCase();
        
        if (userGender !== bvnGender) {
          verificationErrors.push(`Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`);
        }
        console.log(`🔍 [KYC SERVICE] Gender check - User: ${userGender}, BVN: ${bvnGender}`);
      }

      // Check date of birth match (if available)
      if (bvnData.dateOfBirth) {
        const userDob = user.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        // Convert BVN DOB from DD-MM-YYYY to YYYY-MM-DD for comparison
        const bvnDobParts = bvnData.dateOfBirth.split('-');
        const bvnDobFormatted = `${bvnDobParts[2]}-${bvnDobParts[1]}-${bvnDobParts[0]}`;
        
        if (userDob !== bvnDobFormatted) {
          verificationErrors.push(`Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`);
        }
        console.log(`🔍 [KYC SERVICE] DOB check - User: ${userDob}, BVN: ${bvnData.dateOfBirth}`);
      }

      // Determine verification status
      let kycStatus: 'IN_PROGRESS' | 'REJECTED' = 'IN_PROGRESS';
      let statusMessage = '';
      let walletCreated = false;

      if (verificationErrors.length > 0) {
        kycStatus = 'REJECTED';
        statusMessage = `BVN verification failed: ${verificationErrors.join('; ')}`;
        console.log('❌ [KYC SERVICE] BVN verification failed:', verificationErrors);
      } else {
        // BVN verification successful - proceed to selfie upload step
        statusMessage = 'BVN verification successful! Please upload your selfie to complete KYC verification.';
        console.log('✅ [KYC SERVICE] BVN verification successful - ready for selfie upload');
      }

      // Update user with BVN verification status
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          bvn: verifyBvnDto.bvn,
          kycStatus,
          bvnVerifiedAt: kycStatus === 'IN_PROGRESS' ? new Date() : null,
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

    } catch (error) {
      console.log('🚨 [KYC SERVICE] Error in BVN verification:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error verifying BVN',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Upload and verify selfie with Gemini AI
   */
  async uploadSelfie(file: Express.Multer.File, userId: string): Promise<SelfieUploadResponseDto> {
    try {
      console.log('📸 [KYC SERVICE] Processing selfie upload for user:', userId);

              // Find user with BVN data
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
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

                      // Note: Selfie upload can be used for additional verification even for already verified users
        // This provides extra security and AI approval tracking

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'uploads', 'kyc');
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}-${timestamp}.${file.originalname.split('.').pop()}`;
      const filepath = join(uploadsDir, filename);
      const selfieUrl = `/uploads/kyc/${filename}`;

      // Save file
      writeFileSync(filepath, file.buffer);
      console.log('💾 [KYC SERVICE] Selfie saved to:', selfieUrl);

      // Convert image to base64 for Gemini AI analysis
      const imageBase64 = file.buffer.toString('base64');

      // Get BVN data for context (if available)
      let bvnData = null;
      if (user.bvnProviderResponse && typeof user.bvnProviderResponse === 'object') {
        const response = user.bvnProviderResponse as any;
        if (response.data) {
          bvnData = {
            firstName: response.data.firstName || user.firstName,
            lastName: response.data.lastName || user.lastName,
            gender: response.data.gender || user.gender
          };
        }
      }

      // Check if BVN is verified before proceeding
      if (!user.bvnVerifiedAt) {
        return {
          success: false,
          message: 'Please verify your BVN first before uploading selfie',
          error: 'BVN_NOT_VERIFIED'
        };
      }

      console.log('🤖 [KYC SERVICE] Starting Gemini AI selfie verification');

      // Verify selfie with Gemini AI
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

      // Check if AI approved the selfie
      if (!aiVerification.isValidSelfie || aiVerification.confidence < 0.8) {
        console.log('❌ [KYC SERVICE] Gemini AI rejected selfie - storing for admin review');
        
        // Store rejected image for admin review
        const aiApproval = await this.prisma.aiApproval.create({
          data: {
            userId,
            approvalType: AiApprovalType.SELFIE_KYC,
            status: AiApprovalStatus.UNDER_REVIEW,
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

              // Create AI approval record for admin oversight
        const aiApproval = await this.prisma.aiApproval.create({
          data: {
            userId,
            approvalType: AiApprovalType.SELFIE_KYC,
            status: AiApprovalStatus.APPROVED,
            aiProvider: 'gemini',
            aiResponse: JSON.parse(JSON.stringify(aiVerification)), // Convert to plain JSON object
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

              // Auto-approve and create wallet (both BVN and selfie verified)
        let walletCreated = false;
        let statusMessage = '';

        if (user.kycStatus !== KycStatus.VERIFIED) {
          try {
            await this.walletService.createWallet(
              userId,
              user.firstName || bvnData?.firstName || 'User',
              user.lastName || bvnData?.lastName || 'Account'
            );
            walletCreated = true;
            statusMessage = 'KYC completed successfully! Your wallet has been created and is ready to use.';
            console.log('✅ [KYC SERVICE] Wallet created after complete KYC (BVN + Selfie)');
          } catch (walletError) {
            console.log('⚠️ [KYC SERVICE] Wallet creation failed, but KYC completed');
            statusMessage = 'KYC completed successfully! Please contact support for wallet activation.';
          }

          // Update user status to VERIFIED
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              selfieUrl,
              kycStatus: KycStatus.VERIFIED,
              kycVerifiedAt: new Date()
            }
          });
        } else {
          // Already verified, just update selfie URL
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

    } catch (error) {
      console.log('🚨 [KYC SERVICE] Error in selfie upload:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error processing selfie',
        HttpStatus.INTERNAL_SERVER_ERROR
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
        }
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return {
        kycStatus: user.kycStatus,
        isVerified: user.kycStatus === 'VERIFIED',
        verifiedAt: user.kycVerifiedAt,
        bvnVerified: !!user.bvnVerifiedAt,
        selfieVerified: !!user.selfieUrl,
        message: this.getKycStatusMessage(user.kycStatus)
      };

    } catch (error) {
      console.log('🚨 [KYC SERVICE] Error getting KYC status:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error getting KYC status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }





  /**
   * Simulate face verification (replace with actual API)
   */
  private async simulateFaceVerification(selfieUrl: string, bvn: string): Promise<number> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

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
} 